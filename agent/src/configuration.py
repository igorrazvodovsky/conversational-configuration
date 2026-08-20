"""Configuration state and solver-backed agent tools (docs/specs/agent-tools,
ask_choices from docs/specs/agreement-document, revision from
docs/specs/nonlinear-interaction, drafts from docs/specs/parallel-drafts)."""

import json
from pathlib import Path
from typing import Literal, NotRequired, TypedDict

from langchain.agents import AgentState as BaseAgentState
from langchain.messages import ToolMessage
from langchain.tools import ToolRuntime, tool
from langgraph.types import Command

from src import workspace_store
from src.solver import TERM_VAR, ConfigSolver, ConflictError, Seed, load_model

MODEL_PATH = Path(__file__).parent / "product_model" / "elevator.json"
MODEL = load_model(MODEL_PATH)
SOLVER = ConfigSolver(MODEL)

# "document" is the third provenance source (docs/specs/rfq-reconciliation):
# a value the customer's own requirements document states.
Source = Literal["user", "agent", "document"]


class Choice(TypedDict):
    value: str
    source: Source


# Lifetime kg CO2e (docs/specs/environmental-footprint). Stored on candidates;
# absent on threads persisted before the footprint feature — always read with
# .get.
class Footprint(TypedDict):
    embodied: int
    use_phase: int
    total: int


Objective = Literal["price", "co2"]


# "price" means EUR/month since docs/specs/service-agreement. The key name is
# deliberately unchanged: renaming would break threads persisted by
# docs/specs/nonlinear-interaction thread resumption.
# `objective` names which completion the candidate is, so the canvas header
# never labels a lowest-footprint completion "cheapest"; absent on
# pre-footprint threads, which were always cheapest.
class Candidate(TypedDict):
    assignment: dict[str, str]
    price: int
    footprint: NotRequired[Footprint]
    objective: NotRequired[Objective]


# A product rule as the interface may quote it: the id and the model's own
# label, never a paraphrase (constitution #6).
class Rule(TypedDict):
    id: str
    label: str


# A choice `set_choices` would not record, because it cannot hold with the
# rest, and the rules that say so (docs/specs/agent-tools).
class Declined(TypedDict):
    variable: str
    value: str
    rules: list[Rule]


# The frozen reference an RFQ-seeded agreement diverges from
# (docs/specs/rfq-reconciliation). Requirements are immutable after ingestion —
# variable, value, clause and quote never change — and tools may only move the
# `reconciliation` mark. That is what makes the register derivable: it is
# always the difference between this block and the live agreement, so it
# cannot go stale.
class Requirement(TypedDict):
    variable: str
    value: str
    clause: str
    quote: str
    reconciliation: Literal["pending", "waived", "revised"]


class Unmapped(TypedDict):
    clause: str
    quote: str
    note: str  # why no model variable carries it


class RFQ(TypedDict):
    requirements: list[Requirement]
    unmapped: list[Unmapped]
    # A monthly cap the document states, reported against the candidate price
    # as arithmetic — never a solver constraint (the model has no budget
    # variable). Absent when the document states none.
    budget_cap: NotRequired[int]


# One draft of the agreement (docs/specs/parallel-drafts). `configuration`
# below is always the *current* draft's — every tool acts on that one, and
# which one it is lives in the store.
class Configuration(TypedDict):
    choices: dict[str, Choice]
    statuses: dict[str, dict[str, str]]  # var -> value -> chosen|forced|invalid|open
    # Why every option that cannot be taken cannot be taken: variable -> value
    # -> the named rules that rule it out (constitution #6). Derived, never
    # stored in a snapshot, and rebuilt wherever `statuses` is.
    #
    # Each row is computed with that variable's *own* recorded choice lifted,
    # so it answers the swap the customer is weighing rather than restating
    # what they already chose. Without the lift every alternative to a decided
    # value is invalid by construction, which is what locked the document
    # everywhere the agreement had been decided. An empty list means the only
    # thing separating the value is the structural one-value-per-variable,
    # which is not a product rule and is not narrated as one.
    unavailable: dict[str, dict[str, list[Rule]]]
    candidate: Candidate | None
    rfq: NotRequired[RFQ]  # only on document-seeded agreements


# A configuration as the undo history keeps it (docs/specs/undo): everything
# except `statuses`, which the solver re-derives on restore. Its own type
# rather than a reuse of Configuration, because it deliberately lacks a
# required key.
class Snapshot(TypedDict):
    choices: dict[str, Choice]
    candidate: Candidate | None
    rfq: NotRequired[RFQ]


# How far each way the current draft's history reaches, mirrored into agent
# state so the canvas can offer the controls without polling the store.
class HistoryDepths(TypedDict):
    undo: int
    redo: int


# What the canvas's draft switcher draws a row from (docs/specs/parallel-drafts).
# `price` is nullable and routinely null: it lives on the candidate, which
# `_keep_candidate` drops as soon as a choice diverges from it, so a draft
# edited since its last completion has no price to report and shows by name
# alone. Solving the other drafts to fill the gap would put solver calls behind
# a render.
class DraftSummary(TypedDict):
    id: str
    name: str
    price: int | None


class AgentState(BaseAgentState):
    configuration: Configuration
    # The workspace this conversation belongs to (docs/specs/agreement-workspace).
    # Seeded by the frontend on attach; absent on legacy threads — read with .get.
    workspace_id: NotRequired[str]
    # Mirror of the workspace's name, updated by name_workspace so the open
    # workspace's UI re-renders with the name immediately. The store is the
    # durable copy; this field is display plumbing.
    workspace_name: NotRequired[str]
    # Mirror of the current draft's undo/redo depths (docs/specs/undo), on the
    # same terms: the store holds the history, this is what the canvas renders
    # its controls from. Absent until the first batch of a conversation
    # commits, and seeded by the frontend on attach.
    history: NotRequired[HistoryDepths]
    # Mirrors of the workspace's drafts and which one this conversation is
    # working on (docs/specs/parallel-drafts). Chrome only — the store decides
    # what is current — but `current_draft_id` also rides in the thread
    # checkpoint, where it is half of what tells a reopened conversation that
    # its cards refer to another document.
    current_draft_id: NotRequired[str]
    drafts: NotRequired[list[DraftSummary]]


def empty_configuration() -> Configuration:
    statuses, unavailable = _derived({})
    return {
        "choices": {},
        "statuses": statuses,
        "unavailable": unavailable,
        "candidate": None,
    }


# -- pure state transitions (unit-tested directly) ------------------------


def _chosen_values(config: Configuration) -> dict[str, str]:
    return {var: c["value"] for var, c in config["choices"].items()}


def _validate_known(choices: dict[str, str]) -> None:
    problems = []
    for var, val in choices.items():
        if var not in MODEL.variables:
            problems.append(f"unknown variable {var!r}; valid: {sorted(MODEL.variables)}")
        elif val not in MODEL.variables[var].values:
            problems.append(f"unknown value {val!r} for {var}; valid: {MODEL.variables[var].values}")
    if problems:
        raise ValueError("; ".join(problems))


def _unavailable(
    choices: dict[str, str], statuses: dict[str, dict[str, str]]
) -> dict[str, dict[str, list[Rule]]]:
    """The rules behind every unavailable option, for the `unavailable` field.

    Around 40 ms on the shipped model: one `valid_options` per decided
    variable (the lift), then one `explain` per option that is genuinely out.

    Which options are out is settled; *which* minimal core comes back for one
    of them is not, since an incremental solver can answer the same question
    with either of two true cores. Nothing may depend on getting the same one
    twice.
    """
    out: dict[str, dict[str, list[Rule]]] = {}
    for var in MODEL.variables:
        base = {k: v for k, v in choices.items() if k != var}
        row = SOLVER.valid_options(base)[var] if var in choices else statuses[var]
        for val, status in row.items():
            if status != "invalid":
                continue
            conflict = SOLVER.explain({**base, var: val})
            out.setdefault(var, {})[val] = _rules(conflict) if conflict else []
    return out


def _derived(choices: dict[str, str]) -> tuple[dict[str, dict[str, str]], dict]:
    """The two solver-derived halves of a configuration, always built together
    so neither can go stale behind the other (a restore that rebuilt only
    `statuses` would leave the document explaining an older agreement)."""
    statuses = SOLVER.valid_options(choices)  # raises ConflictError if infeasible
    return statuses, _unavailable(choices, statuses)


def _forced(statuses: dict[str, dict[str, str]]) -> dict[str, str]:
    return {
        var: val
        for var, vals in statuses.items()
        for val, s in vals.items() if s == "forced"
    }


def _keep_candidate(candidate: Candidate | None, choices: dict[str, str]) -> Candidate | None:
    if candidate and all(candidate["assignment"].get(v) == val for v, val in choices.items()):
        return candidate
    return None


def _rules(conflict) -> list[Rule]:
    return [{"id": rid, "label": label} for rid, label in conflict.rules]


def _carry_rfq(config: Configuration, new_config: Configuration) -> Configuration:
    """Keep the frozen RFQ reference across a transition that rebuilds the
    configuration wholesale. The register is the difference between it and the
    live agreement, so dropping it would erase the document, not the diff."""
    rfq = config.get("rfq")
    if rfq is not None:
        new_config["rfq"] = rfq
    return new_config


def _repriced(config: Configuration, new_config: Configuration) -> Configuration:
    """Keep a priced agreement priced across a change.

    A candidate that no longer matches the choices is invalid and `_keep_candidate`
    drops it, which used to leave the document unpriced after every edit — a
    click on a cabin finish took the sheet from a monthly fee to "no priced
    proposal yet", against [always show a valid whole]. So a change to an
    agreement that *had* a candidate completes again on the same objective,
    inside the same batch, and undo reverses the pair together. An agreement
    that never had one still has none: pricing is asked for, not assumed.
    """
    previous = config.get("candidate")
    if previous is None or new_config["candidate"] is not None:
        return new_config
    return make_candidate(
        new_config,
        previous.get("objective", "price"),
        # Keep what the customer has already read wherever the objective is
        # indifferent: a completion is one of many optima, and re-solving from
        # scratch would flip cost-free values nobody touched.
        prefer=previous["assignment"],
    )


def apply_choices(
    config: Configuration, new_choices: dict[str, str], source: Source
) -> tuple[Configuration, dict[str, str]]:
    """Returns (new configuration, newly forced values). Raises ConflictError
    on infeasible combinations (leaving config untouched) and ValueError on
    unknown variables/values."""
    _validate_known(new_choices)
    merged = {**_chosen_values(config), **new_choices}
    statuses, unavailable = _derived(merged)  # raises ConflictError if infeasible

    choices = dict(config["choices"])
    for var, val in new_choices.items():
        choices[var] = {"value": val, "source": source}

    was_forced = _forced(config["statuses"])
    newly_forced = {
        var: val for var, val in _forced(statuses).items()
        if was_forced.get(var) != val
    }
    new_config: Configuration = _carry_rfq(config, {
        "choices": choices,
        "statuses": statuses,
        "unavailable": unavailable,
        "candidate": _keep_candidate(config["candidate"], merged),
    })
    return _repriced(config, new_config), newly_forced


def record_choices(
    config: Configuration, new_choices: dict[str, str], source: Source
) -> tuple[Configuration, dict[str, str], list[Declined]]:
    """Record what can hold, and say what cannot, rather than losing the lot.

    `apply_choices` is all-or-nothing, which is right for a revision the
    customer aimed at one term and wrong for a batch of things they just
    stated: one collision inside it used to discard the choices that had
    nothing to do with the collision, and the completion that followed filled
    those variables with the agent's own guesses (docs/specs/agent-tools, and
    [the agent proposes and the user decides]). So each round asks the solver
    which choices are in the conflict, declines the ones that came in this
    batch — every member of that minimal set, so nothing arbitrary is picked
    between two things the customer said — and tries again with the rest.
    Declined choices come back with the rules that separate them, for the
    agent to put to the customer.

    The recorded remainder is applied by `apply_choices`, so a batch with no
    conflict in it behaves exactly as before.
    """
    _validate_known(new_choices)
    keep = dict(new_choices)
    existing = _chosen_values(config)
    declined: list[Declined] = []
    while keep:
        conflict = SOLVER.explain({**existing, **keep})
        if conflict is None:
            break
        offenders = [(v, val) for v, val in conflict.choices if v in keep]
        if not offenders:
            # The conflict is entirely among choices already recorded, which
            # the invariant says cannot happen; refuse rather than guess.
            raise ConflictError(conflict, conflict.describe(MODEL))
        rules = _rules(conflict)
        for var, _ in offenders:
            declined.append({"variable": var, "value": keep.pop(var), "rules": rules})
    new_config, newly_forced = apply_choices(config, keep, source)
    return new_config, newly_forced, declined


def withdraw_choices(config: Configuration, variables: list[str]) -> Configuration:
    unknown = [v for v in variables if v not in MODEL.variables]
    if unknown:
        raise ValueError(f"unknown variables: {unknown}")
    choices = {var: c for var, c in config["choices"].items() if var not in variables}
    remaining = {var: c["value"] for var, c in choices.items()}
    statuses, unavailable = _derived(remaining)
    return _repriced(config, _carry_rfq(config, {
        "choices": choices,
        "statuses": statuses,
        "unavailable": unavailable,
        "candidate": _keep_candidate(config["candidate"], remaining),
    }))


def _state_footprint(assignment: dict[str, str]) -> Footprint:
    """The footprint keys stored in shared state — the decarbonising bookend
    stays in the model data, surfaced by the assumptions panel, not in state."""
    fp = MODEL.footprint(assignment)
    return {"embodied": fp["embodied"], "use_phase": fp["use_phase"], "total": fp["total"]}


def make_candidate(
    config: Configuration,
    objective: Objective = "price",
    prefer: dict[str, str] | None = None,
) -> Configuration:
    """`prefer` is passed through to the solver as a tie-break — see
    `SolverService.complete`. Used when repricing, so an edit moves what it
    forced and nothing else."""
    assignment, price = SOLVER.complete(_chosen_values(config), objective, prefer)
    return {
        **config,
        "candidate": {"assignment": assignment, "price": price,
                      "footprint": _state_footprint(assignment),
                      "objective": objective},
    }


# -- revision (docs/specs/nonlinear-interaction) --------------------------


def revise(
    config: Configuration,
    changes: dict[str, str],
    drop: list[str],
    source: Source,
) -> tuple[Configuration, dict[str, str]]:
    """Withdraw `drop` and apply `changes` as one atomic transition: the
    resulting choice set is validated as a whole, so it either fully applies
    or raises (ConflictError / ValueError) leaving config untouched."""
    unknown = [v for v in drop if v not in MODEL.variables]
    if unknown:
        raise ValueError(f"unknown variables: {unknown}")
    base: Configuration = {
        **config,
        "choices": {v: c for v, c in config["choices"].items() if v not in drop},
    }
    return apply_choices(base, changes, source)


# -- drafts (docs/specs/parallel-drafts) ----------------------------------


def _draft_candidate(name: str, config: Configuration) -> Candidate:
    """The priced whole a draft is compared by. A draft whose candidate was
    dropped by an edit has nothing to compare *with* — the choices alone carry
    no price and no footprint — so the fix is named rather than guessed at, and
    never solved for here: the solver answers for the draft being worked on
    (constitution #1)."""
    candidate = config.get("candidate")
    if not candidate:
        raise ValueError(
            f"draft {name!r} has no priced agreement to compare — switch to it "
            "and propose a completion first"
        )
    return candidate


def draft_comparison(
    a_name: str,
    a_config: Configuration,
    b_name: str,
    b_config: Configuration,
    b_is_current: bool = False,
) -> dict:
    """Comparison payload between two drafts: only the differing variables,
    both values with their monthly deltas, and the monthly-price delta.
    Per-side deltas are computed at each side's own term — two agreements may
    differ precisely in term. Each side is its draft's stored solver result, so
    both are valid by construction."""
    side_a = {"name": a_name, **_draft_candidate(a_name, a_config)}
    side_b = {"name": b_name, **_draft_candidate(b_name, b_config)}

    months_a = MODEL.months_of(side_a["assignment"].get(TERM_VAR))
    months_b = MODEL.months_of(side_b["assignment"].get(TERM_VAR))

    def _side(var_name: str, val: str | None, months: int) -> dict:
        # val is None when a draft adapted from a workspace written before the
        # service frame lacks an agreement variable
        if val is None:
            return {"value": None, "label": "—", "price": 0}
        return {"value": val, "label": _label(var_name, val),
                "price": MODEL.monthly_option_delta(var_name, val, months)}

    differences = []
    for var_name, variable in MODEL.variables.items():
        val_a = side_a["assignment"].get(var_name)
        val_b = side_b["assignment"].get(var_name)
        if val_a == val_b:
            continue
        differences.append({
            "variable": var_name,
            "label": variable.label,
            "a": _side(var_name, val_a, months_a),
            "b": _side(var_name, val_b, months_b),
        })
    # Pair-level footprint only — no per-variable co2 column: an option-level
    # column is the badge format decision 6 of docs/specs/environmental-footprint
    # bans, and use-phase is not attributable to single options at all.
    fp_a = side_a.get("footprint")
    fp_b = side_b.get("footprint")
    return {
        "kind": "draft_comparison",
        "a": {"name": side_a["name"], "price": side_a["price"], "footprint": fp_a},
        "b": {"name": side_b["name"], "price": side_b["price"],
              "isCurrent": b_is_current, "footprint": fp_b},
        "differences": differences,
        "priceDelta": side_b["price"] - side_a["price"],
        # 0 when either side predates the footprint feature — the card shows "—"
        "footprintDelta": (fp_b["total"] - fp_a["total"]) if fp_a and fp_b else 0,
        # The same figure already formatted, for the same reason `_format_co2`
        # exists at all: the card renders this string and the agent quotes it,
        # so the sheet and the prose beside it cannot disagree. Left to the two
        # runtimes separately, they did — the card said 1.5 t CO₂e where the
        # agent's sentence said 1,529 kg CO2e, having read the raw delta.
        "footprintDeltaText": _format_co2(
            abs(fp_b["total"] - fp_a["total"])) if fp_a and fp_b else None,
    }


# -- RFQ reconciliation (docs/specs/rfq-reconciliation) -------------------

RegisterStatus = Literal["met", "waived", "revised", "deviation"]
ReconcileMove = Literal["accept", "revise", "open"]


class RegisterEntry(TypedDict):
    variable: str
    requested: str
    offered: str | None  # what the agreement says instead; None while undecided
    clause: str
    quote: str
    status: RegisterStatus


def live_value(config: Configuration, variable: str) -> str | None:
    """What the agreement currently says for a variable: the recorded choice,
    else the value the rules force, else the candidate's — the same precedence
    the canvas renders."""
    choice = config["choices"].get(variable)
    if choice:
        return choice["value"]
    forced = _forced(config["statuses"]).get(variable)
    if forced:
        return forced
    candidate = config["candidate"]
    return candidate["assignment"].get(variable) if candidate else None


def register(config: Configuration) -> list[RegisterEntry]:
    """The deviation register: the document's requirements against the live
    agreement, one entry per requirement (a tender is answered clause by
    clause, so three clauses bearing on one variable are three entries).

    Derived, never stored — recomputed from the frozen block and the live
    assignment on every call, so it cannot go stale.
    """
    rfq = config.get("rfq")
    if not rfq:
        return []
    entries: list[RegisterEntry] = []
    for requirement in rfq["requirements"]:
        offered = live_value(config, requirement["variable"])
        # met first: an agreement that landed back on the document's value
        # complies, whatever mark reconciliation left behind.
        if offered == requirement["value"]:
            status: RegisterStatus = "met"
        elif requirement["reconciliation"] == "waived":
            status = "waived"
        elif requirement["reconciliation"] == "revised":
            status = "revised"
        else:
            status = "deviation"
        entries.append({
            "variable": requirement["variable"],
            "requested": requirement["value"],
            "offered": offered,
            "clause": requirement["clause"],
            "quote": requirement["quote"],
            "status": status,
        })
    return entries


def ingest(
    config: Configuration,
    entries: list[dict],
    unmapped: list[dict],
    budget_cap: int | None = None,
) -> tuple[Configuration, Seed, list[Unmapped]]:
    """Seed an agreement from an extracted requirements document.

    Returns (new configuration, the solver's seeding result, the entries
    demoted to unmapped). Either fully applies or raises, leaving `config`
    untouched — the transition is built as a new value and never mutates.
    """
    if config.get("rfq") is not None:
        raise ValueError(
            "this agreement was already seeded from a document — re-tendering "
            "is not supported; start a new elevator for a new document"
        )
    if config["choices"]:
        raise ValueError(
            "this agreement already has recorded choices — seed a document "
            "into a fresh elevator so the document is the starting position"
        )

    requirements: list[Requirement] = []
    demoted: list[Unmapped] = []
    for entry in entries:
        variable, value = entry.get("variable", ""), entry.get("value", "")
        clause, quote = entry.get("clause", ""), entry.get("quote", "")
        if variable not in MODEL.variables:
            demoted.append({"clause": clause, "quote": quote,
                            "note": f"no product variable {variable!r}"})
        elif value not in MODEL.variables[variable].values:
            demoted.append({"clause": clause, "quote": quote,
                            "note": f"{value!r} is not a value of {variable}"})
        else:
            requirements.append({"variable": variable, "value": value,
                                 "clause": clause, "quote": quote,
                                 "reconciliation": "pending"})
    if not requirements:
        raise ValueError(
            "nothing in this document maps to a product variable — record what "
            "it states in conversation instead of seeding it"
        )

    seeded = SOLVER.seed([(r["variable"], r["value"]) for r in requirements])
    new_config, _ = apply_choices(config, dict(seeded.kept), "document")
    # The candidate is seed's own whole, not a recomputed one: cost-free
    # variables leave several equally cheap completions and complete() picks
    # among them arbitrarily, so re-solving could offer a value the seeding
    # result never named.
    new_config = {**new_config, "candidate": {
        "assignment": dict(seeded.assignment),
        "price": seeded.price,
        "footprint": _state_footprint(seeded.assignment),
        "objective": "price",
    }}
    rfq: RFQ = {
        "requirements": requirements,
        "unmapped": [
            {"clause": u.get("clause", ""), "quote": u.get("quote", ""),
             "note": u.get("note", "")}
            for u in unmapped
        ] + demoted,
    }
    if budget_cap is not None:
        rfq["budget_cap"] = budget_cap
    new_config["rfq"] = rfq
    return new_config, seeded, demoted


def _requirements_on(config: Configuration, variable: str) -> list[Requirement]:
    rfq = config.get("rfq")
    if not rfq:
        raise ValueError("this agreement was not seeded from a document")
    on_variable = [r for r in rfq["requirements"] if r["variable"] == variable]
    if not on_variable:
        raise ValueError(
            f"the document states no requirement on {variable}; "
            f"it states: {sorted({r['variable'] for r in rfq['requirements']})}"
        )
    return on_variable


def _mark(config: Configuration, variable: str, reconciliation: str) -> RFQ:
    rfq = config["rfq"]
    return {
        **rfq,
        "requirements": [
            {**r, "reconciliation": reconciliation} if r["variable"] == variable else r
            for r in rfq["requirements"]
        ],
    }


def reconcile(
    config: Configuration,
    variable: str,
    move: ReconcileMove,
    value: str | None = None,
) -> tuple[Configuration, dict[str, str], str | None]:
    """Reconcile the document's requirements on one variable. Every clause
    bearing on that variable moves together — they are one disagreement,
    answered once.

    Returns (new configuration, newly forced values, the value now recorded).
    Raises ConflictError from the `revise` move exactly as `revise_choices`
    does, so a colliding reconciliation reaches the customer as repair options.
    """
    clauses = _requirements_on(config, variable)

    if move == "open":
        return {**config, "rfq": _mark(config, variable, "pending")}, {}, None

    if move == "accept":
        offered = live_value(config, variable)
        if offered is None:
            raise ValueError(
                f"nothing is offered for {variable} yet — propose a completion "
                "before accepting what it offers"
            )
        if any(r["value"] == offered for r in clauses):
            raise ValueError(
                f"the agreement already meets the document on {variable} — "
                "there is nothing to waive"
            )
        # Pinned as a user choice: waiving is the customer's decision, and
        # pinning stops a later revision silently moving a value they
        # explicitly accepted.
        new_config, newly_forced = revise(config, {variable: offered}, [], "user")
        return {**new_config, "rfq": _mark(new_config, variable, "waived")}, newly_forced, offered

    if move == "revise":
        if value is None:
            raise ValueError("the 'revise' move needs the value to change to")
        new_config, newly_forced = revise(config, {variable: value}, [], "user")
        mark = "revised" if any(r["value"] != value for r in clauses) else "pending"
        return {**new_config, "rfq": _mark(new_config, variable, mark)}, newly_forced, value

    raise ValueError(f"unknown reconciliation move {move!r}; use accept, revise or open")


# -- undo (docs/specs/undo) -----------------------------------------------


def snapshot(config: Configuration) -> Snapshot:
    """What history keeps of a configuration. Delegates to the store, which is
    what actually writes the snapshots — two copies of the filter could
    diverge, and the tests here would not see it."""
    return workspace_store.snapshot(config)  # type: ignore[return-value]


def restore(snap: Snapshot) -> Configuration:
    """Rebuild a configuration from a history snapshot.

    A restore is a move, not a bypass: the snapshot's choices are re-validated
    against the product model and their statuses re-derived from the solver,
    so a state the current model no longer admits raises rather than landing.
    Raises ValueError on a value the model no longer has — the reachable
    failure once `elevator.json` is edited (constitution #2) — and
    ConflictError on a choice set the rules no longer allow together.
    """
    values = {var: c["value"] for var, c in snap["choices"].items()}
    _validate_known(values)
    statuses, unavailable = _derived(values)
    config: Configuration = {
        "choices": dict(snap["choices"]),
        "statuses": statuses,
        "unavailable": unavailable,
        # The candidate cannot be recomputed faithfully (see `ingest`), so it
        # is restored as it was — but only if it still extends these choices.
        "candidate": _keep_candidate(snap.get("candidate"), values),
    }
    rfq = snap.get("rfq")
    if rfq is not None:
        # From the snapshot, never carried from the live configuration:
        # reconciliation marks move with a batch, so restoring them is most of
        # what undoing a reconciliation means.
        config["rfq"] = rfq
    return config


def describe_restoration(before: Configuration, after: Configuration) -> str:
    """What a restore changed, in the customer's terms — the tool message the
    agent says back in one sentence.

    Derived by diffing the two configurations rather than labelling each batch
    at its call site: a diff cannot describe a batch it does not know about,
    and it stays truthful when a tool changes. The cost is that it names the
    effect ("Rated speed: 3.0 m/s → 1.6 m/s") rather than the move that caused
    it.
    """
    parts = []
    for var in MODEL.variables:
        was, now = live_value(before, var), live_value(after, var)
        if was != now:
            parts.append(
                f"{MODEL.variables[var].label}: "
                f"{_label(var, was) if was else 'not decided'} → "
                f"{_label(var, now) if now else 'not decided'}"
            )
    before_price = (before["candidate"] or {}).get("price")
    after_price = (after["candidate"] or {}).get("price")
    if before_price != after_price:
        parts.append(
            f"{after_price} EUR/month" if after_price is not None
            else "no priced candidate — propose a completion to price it again"
        )
    # Requirements are immutable after ingestion and only their mark moves, so
    # the two lists line up by position wherever both agreements have one.
    before_reqs = (before.get("rfq") or {}).get("requirements", [])
    after_reqs = (after.get("rfq") or {}).get("requirements", [])
    for was_req, now_req in zip(before_reqs, after_reqs):
        if was_req["reconciliation"] != now_req["reconciliation"]:
            parts.append(f"clause {now_req['clause']} {now_req['reconciliation']}")
    if before_reqs and not after_reqs:
        parts.append("the document's requirements are no longer seeded into this agreement")
    return "; ".join(parts) or "nothing the sheet shows"


# -- ask_choices payload (docs/specs/agreement-document) ----------------------------------------

# Control selection is a UI heuristic and deliberately not part of the
# product model (docs/specs/agreement-document design). Ordered groups render as scales;
# consequence-heavy variables always render as detail lists.
_ORDERED_GROUPS = {"performance", "dimensions"}
_FORCE_LIST = {"car_size", "wall_finish", "floor"}
_CHIP_MAX_OPTIONS = 6


def _control_for(var_name: str) -> str:
    var = MODEL.variables[var_name]
    if var_name in _FORCE_LIST:
        return "list"
    if var.group in _ORDERED_GROUPS:
        return "scale"
    return "chips" if len(var.options) <= _CHIP_MAX_OPTIONS else "list"


def _months_in_effect(config: Configuration) -> int:
    """Amortization months for display: the chosen term, else the candidate's,
    else the default term (docs/specs/service-agreement)."""
    chosen = config["choices"].get(TERM_VAR)
    if chosen:
        return MODEL.months_of(chosen["value"])
    candidate = config["candidate"]
    if candidate:
        return MODEL.months_of(candidate["assignment"].get(TERM_VAR))
    return MODEL.months_of(None)


def build_ask_payload(config: Configuration, variables: list[str]) -> dict:
    """Typed payload for in-chat controls: per variable, its control type and
    every option with validity status (from the solver), its monthly delta at
    the term in effect, and a marker on the cheapest-monthly-completion value.
    Raises ValueError on unknown variables."""
    unknown = [v for v in variables if v not in MODEL.variables]
    if unknown:
        raise ValueError(f"unknown variables: {unknown}; valid: {sorted(MODEL.variables)}")

    cheapest, _ = SOLVER.complete(_chosen_values(config))
    months = _months_in_effect(config)
    payload = []
    for var_name in variables:
        var = MODEL.variables[var_name]
        statuses = config["statuses"][var_name]
        # An option the customer cannot take says which rules say so, so the
        # card can name them rather than greying the row out (constitution #6).
        unavailable = config.get("unavailable", {}).get(var_name, {})
        options = [
            {
                "value": o.value,
                "label": o.label,
                "price": MODEL.monthly_option_delta(var_name, o.value, months),
                "status": "valid" if statuses[o.value] == "open" else statuses[o.value],
                "cheapest": cheapest[var_name] == o.value,
                "rules": unavailable.get(o.value, []),
            }
            for o in var.options
        ]
        payload.append({
            "name": var_name,
            "label": var.label,
            "group": var.group,
            "control": _control_for(var_name),
            "options": options,
        })
    return {"variables": payload}


# -- repair payload (docs/specs/nonlinear-interaction) --------------------------------------------


def _described(pairs) -> list[dict]:
    return [
        {"variable": var, "label": MODEL.variables[var].label,
         "value": val, "valueLabel": _label(var, val)}
        for var, val in pairs
    ]


def build_repair_payload(config: Configuration, changes: dict[str, str]) -> dict:
    """Typed payload for the RepairOptions renderer: the requested revision
    plus solver-computed repair options ordered by retention. Each option
    lists the choices to give up, the resulting forced ripple (only what
    differs from the current sheet), and the rules involved."""
    current = {**_forced(config["statuses"]), **_chosen_values(config)}
    repairs = SOLVER.repairs(_chosen_values(config), changes)
    options = []
    for r in repairs:
        ripple = [
            (var, val) for var, val in r.forced
            if current.get(var) != val and changes.get(var) != val
        ]
        options.append({
            "drop": _described(r.dropped),
            "keepCount": len(r.kept),
            "ripple": _described(ripple),
            "rules": [{"id": rid, "label": label} for rid, label in r.rules],
        })
    return {
        "kind": "repairs",
        "changes": _described(changes.items()),
        "repairs": options,
    }


# -- helpers for tool messages -------------------------------------------


def _label(var: str, val: str) -> str:
    return next(o.label for o in MODEL.variables[var].options if o.value == val)


def _format_co2(kg: int) -> str:
    """kg CO₂e → "12.4 t CO₂e", or "540 kg CO₂e" below a tonne.

    Tenths round half away from zero, in integer arithmetic, because that is
    what `formatCO2` in `src/lib/configurator.ts` does — the canvas and the
    agent's prose quote the same lifetime total, and Python's own `:.1f`
    rounds half to even, so 1250 kg read 1.2 t in chat beside 1.3 t on the
    sheet. Reimplementing rather than sharing is unavoidable across the two
    runtimes; agreeing on the rule is not. The two still part above 1000 t,
    where the frontend's locale formatter groups thousands and this does not —
    a figure one elevator cannot reach.
    """
    if abs(kg) < 1000:
        return f"{kg} kg CO₂e"
    tenths = (abs(kg) + 50) // 100
    return f"{'-' if kg < 0 else ''}{tenths // 10}.{tenths % 10} t CO₂e"


def _signed_co2(kg: int) -> str:
    return ("+" if kg >= 0 else "−") + _format_co2(abs(kg))


def completion_message(candidate: Candidate, objective: Objective,
                       other_assignment: dict[str, str], other_price: int) -> str:
    """Tool message for propose_completion: the candidate under its objective,
    plus — whenever the two objectives disagree — a one-line teaser for the
    other completion, so the trade-off is disclosed at the moment of proposal
    (docs/specs/environmental-footprint design)."""
    term = _label(TERM_VAR, candidate["assignment"][TERM_VAR])
    objective_name = ("cheapest monthly completion" if objective == "price"
                      else "lowest-footprint completion")
    fp = candidate["footprint"]
    lines = [
        f"Candidate service agreement, {candidate['price']} EUR/month over the "
        f"{term} term ({objective_name} of the current choices), modelled "
        f"lifetime footprint {_format_co2(fp['total'])} (embodied "
        f"{_format_co2(fp['embodied'])}, use-phase {_format_co2(fp['use_phase'])}):\n"
        + _describe_assignment(candidate["assignment"])
    ]
    differing = [v for v, val in other_assignment.items()
                 if candidate["assignment"].get(v) != val]
    if differing:
        other_fp = MODEL.footprint(other_assignment)
        other_name = "lowest-footprint" if objective == "price" else "cheapest-monthly"
        lines.append(
            f"A {other_name} completion differs in {len(differing)} "
            f"variable{'s' if len(differing) != 1 else ''}: "
            f"{_signed_co2(other_fp['total'] - fp['total'])}, "
            f"{other_price - candidate['price']:+d} EUR/month — offer to show the pair."
        )
    return "\n".join(lines)


def _describe_assignment(assignment: dict[str, str]) -> str:
    return "\n".join(
        f"- {MODEL.variables[var].label}: {_label(var, val)}"
        for var, val in assignment.items()
    )


def _conflict_payload(e: ConflictError) -> str:
    c = e.conflict
    return (
        "REJECTED — configuration unchanged. "
        + c.describe(MODEL)
        + " Relay this to the customer and negotiate which choice to change."
    )


def _get_config(runtime: ToolRuntime) -> Configuration:
    return runtime.state.get("configuration") or empty_configuration()


def _current_thread_id() -> str | None:
    """The running conversation's id, so the write-through can stamp which
    conversation moved the agreement. Returns None outside a run (unit tests)."""
    try:
        from langgraph.config import get_config

        return ((get_config() or {}).get("configurable") or {}).get("thread_id")
    except Exception:  # no active runnable context
        return None


def _mirrors(record: dict) -> dict:
    """The chrome the canvas renders from, read off the record that was just
    written: how far the current draft's history reaches, which draft is
    current, and what other drafts exist with their prices
    (docs/specs/parallel-drafts). Every path that moves the workspace goes
    through here, structural moves included — a switch that left the history
    depths behind would offer an undo belonging to the other document."""
    return {
        "history": workspace_store.history_depths(record),
        "current_draft_id": workspace_store.current_draft(record)["id"],
        "drafts": [
            {
                "id": d["id"],
                "name": d["name"],
                "price": (d["configuration"].get("candidate") or {}).get("price"),
            }
            for d in record["drafts"]
        ],
    }


def _commit(runtime: ToolRuntime, config: Configuration) -> dict | None:
    """Write-through to the durable workspace (docs/specs/agreement-workspace):
    the thread checkpoint keeps its own copy as the historical record of what
    this conversation saw. The write lands on the current draft
    (docs/specs/parallel-drafts) and no other. A missing workspace must not
    break the conversation.

    Returns the state mirrors after the write — None when there is no workspace
    and so nothing to mirror."""
    workspace_id = runtime.state.get("workspace_id")
    if not workspace_id:
        return None  # legacy thread — nothing durable to update
    try:
        record = workspace_store.save_configuration(
            workspace_id, config, _current_thread_id())
    except KeyError:
        print(f"workspace {workspace_id!r} not found — configuration not persisted")
        return None
    return _mirrors(record)


def _undecided(config: Configuration) -> list[str]:
    """Variables neither recorded as a choice nor forced by the rules."""
    forced = _forced(config["statuses"])
    return [
        var for var in MODEL.variables
        if var not in config["choices"] and var not in forced
    ]


# -- tool returns ---------------------------------------------------------
#
# Every tool answers with a ToolMessage the agent reads, optionally alongside
# the state it changed. The wording of those messages is what the LLM acts on
# and no automated check sees it (the default suite exercises the transitions
# above, and the conversation checks assert on tool calls, never prose), so these
# helpers carry the shapes and leave every sentence to the call site.


def _reply(runtime: ToolRuntime, content: str, **update) -> Command:
    return Command(update={
        **update,
        "messages": [ToolMessage(content=content, tool_call_id=runtime.tool_call_id)],
    })


def _error(runtime: ToolRuntime, e: Exception) -> Command:
    return _reply(runtime, f"ERROR: {e}")


def _rejected(runtime: ToolRuntime, e: ConflictError) -> Command:
    return _reply(runtime, _conflict_payload(e))


def _committed(runtime: ToolRuntime, config: Configuration, lines: list[str]) -> Command:
    """A tool that moved the agreement: write through to the workspace, then
    report. The write-through precedes the reply everywhere, so a message the
    agent has read always describes a durable agreement."""
    mirrors = _commit(runtime, config)
    return _reply(runtime, "\n".join(lines), configuration=config, **(mirrors or {}))


def _repair_options(
    runtime: ToolRuntime, config: Configuration, changes: dict[str, str]
) -> Command:
    """A revision that collides with recorded choices comes back as
    solver-computed repair options, rendered as clickable cards. When the
    requested changes are contradictory on their own, no repair to the *other*
    choices can help, so the conflict itself is what the agent gets."""
    try:
        payload = build_repair_payload(config, changes)
    except ConflictError as e:
        return _rejected(runtime, e)
    return _reply(runtime, json.dumps(payload))


def _consequence_lines(
    config: Configuration,
    new_config: Configuration,
    newly_forced: dict[str, str],
    discarded: str = "The previous candidate no longer fits and was discarded.",
) -> list[str]:
    """What a transition did beyond what was asked: the values the rules now
    force, and what happened to the standing candidate — repriced, in the
    ordinary case, since a priced agreement stays priced across a change
    (`_repriced`)."""
    lines = []
    if newly_forced:
        lines.append(
            "Now forced by the rules (announce these to the customer): "
            + ", ".join(f"{_label(v, val)} ({v})" for v, val in newly_forced.items())
        )
    before, after = config["candidate"], new_config["candidate"]
    if after is None and before is not None:
        lines.append(discarded)
    elif before is not None and after is not None and after["price"] != before["price"]:
        # Stated, not narrated: the consideration line on the sheet carries the
        # new fee, so a canvas edit that only moved the price has nothing the
        # sheet cannot explain by itself and ends in silence.
        lines.append(
            f"Repriced: {after['price']} EUR/month (was {before['price']}). "
            "The sheet shows this."
        )
    return lines


# -- tools ----------------------------------------------------------------


@tool
def set_choices(choices: dict[str, str], source: Source, runtime: ToolRuntime) -> Command:
    """Record configuration choices after validating them against the product rules.

    `choices` maps variable names to option value codes (from describe_product),
    e.g. {"building_type": "hospital", "rated_load": "kg2000"}.
    Use source="user" for things the customer stated, source="agent" for values
    you derived or proposed. Everything in the batch that can hold is recorded;
    anything that cannot comes back as NOT RECORDED with the rules that
    separate it, for you to put to the customer.
    """
    config = _get_config(runtime)
    try:
        new_config, newly_forced, declined = record_choices(config, choices, source)
    except ValueError as e:
        return _error(runtime, e)
    except ConflictError as e:
        return _rejected(runtime, e)

    refused = {d["variable"] for d in declined}
    kept = {v: val for v, val in choices.items() if v not in refused}
    lines = ["Recorded: " + (", ".join(f"{v}={val}" for v, val in kept.items()) or "nothing")]
    if declined:
        lines.append(
            "NOT recorded, they cannot hold together: "
            + ", ".join(f"{d['variable']}={d['value']}" for d in declined)
            + ". Rules: "
            + "; ".join(dict.fromkeys(
                f"{r['id']}: {r['label']}" for d in declined for r in d["rules"]))
            + ". Tell the customer which of these has to give, naming the rule, "
            "and record their answer. If they want one of them and it collides "
            "with something already agreed, call revise_choices instead — that "
            "returns repair paths."
        )
    lines += _consequence_lines(config, new_config, newly_forced)
    return _committed(runtime, new_config, lines)


@tool
def revise_choices(
    changes: dict[str, str],
    source: Source,
    runtime: ToolRuntime,
    drop: list[str] | None = None,
) -> Command:
    """Change already-recorded decisions. Prefer this over set_choices whenever
    the customer revises something they (or you) decided earlier.

    `changes` maps variable names to new option value codes; `drop` optionally
    lists variables to withdraw in the same atomic step (used when applying a
    repair the customer picked). If the revision conflicts with other recorded
    choices, nothing changes and you get solver-computed repair options —
    rendered to the customer as clickable cards, ordered by how many existing
    choices they keep.
    """
    config = _get_config(runtime)
    try:
        new_config, newly_forced = revise(config, changes, drop or [], source)
    except ValueError as e:
        return _error(runtime, e)
    except ConflictError:
        return _repair_options(runtime, config, changes)

    lines = ["Revised: " + ", ".join(f"{v}={val}" for v, val in changes.items())]
    if drop:
        lines.append("Withdrew: " + ", ".join(drop))
    lines += _consequence_lines(config, new_config, newly_forced)
    return _committed(runtime, new_config, lines)


@tool
def clear_choices(variables: list[str], runtime: ToolRuntime) -> Command:
    """Withdraw previously recorded choices for the given variable names."""
    config = _get_config(runtime)
    try:
        new_config = withdraw_choices(config, variables)
    except ValueError as e:
        return _error(runtime, e)
    return _committed(runtime, new_config, [f"Withdrew: {', '.join(variables)}"])


@tool
def propose_completion(runtime: ToolRuntime, objective: Objective = "price") -> Command:
    """Compute a complete valid service agreement extending the current
    choices and store it as the candidate, with its monthly fee and modelled
    lifetime footprint. objective="price" (the default) minimizes the monthly
    fee; objective="co2" minimizes the modelled lifetime CO2e. The other
    objective is always solved too — when the two disagree, the result says
    how many variables differ and both deltas; offer to show the pair
    (fork_draft, propose the other objective on the fork, compare_drafts)."""
    config = _get_config(runtime)
    new_config = make_candidate(config, objective)
    other: Objective = "co2" if objective == "price" else "price"
    other_assignment, other_price = SOLVER.complete(_chosen_values(config), other)
    content = completion_message(new_config["candidate"], objective,
                                 other_assignment, other_price)
    return _committed(runtime, new_config, [content])


# -- draft tools (docs/specs/parallel-drafts) -----------------------------
#
# Structural moves over whole documents. None of them writes a configuration
# through `_committed`: forking copies one, switching moves a pointer, and
# discarding removes one, so none of the three is a change to a document and
# none of them lands in a document's history.


def _no_drafts(runtime: ToolRuntime) -> Command:
    return _reply(runtime, "This conversation is not attached to an elevator, "
                           "so it has no drafts.")


@tool("fork_draft")
def fork_draft_tool(name: str, runtime: ToolRuntime) -> Command:
    """Keep the agreement as it stands and start a second draft of it to work
    on, under the name you give it. Both drafts stay whole and editable, and
    the customer can switch between them.

    Offer this whenever the customer wants to try something without giving up
    what they have ("what would a premium version look like?", "keep this one
    but show me…") — it is the alternative to changing the agreement and
    relying on undo. `name` is yours to choose from the conversation, short and
    descriptive of what this draft is for ("Premium service", "Without the
    modernization"). Never ask the customer to name it.
    """
    workspace_id = runtime.state.get("workspace_id")
    if not workspace_id:
        return _no_drafts(runtime)
    try:
        record = workspace_store.fork_draft(workspace_id, name, _current_thread_id())
    except (KeyError, ValueError) as e:
        return _error(runtime, e)
    draft = workspace_store.current_draft(record)
    source = next(
        (d["name"] for d in record["drafts"] if d["id"] == draft["forkedFrom"]), None
    )
    return _reply(
        runtime,
        f"Forked into a new draft {draft['name']!r}, which is now the one being "
        f"worked on; it holds everything "
        + (f"{source!r}" if source else "the previous draft")
        + " holds, and that draft is unchanged and still open to return to.",
        **_mirrors(record),
    )


@tool("switch_draft")
def switch_draft_tool(name: str, runtime: ToolRuntime) -> Command:
    """Work on another draft of this agreement. Everything after this — every
    change, the candidate, undo — applies to that draft, and the one being left
    keeps its choices and their sources exactly as they are. Nothing is
    replaced and nothing is re-attributed."""
    workspace_id = runtime.state.get("workspace_id")
    if not workspace_id:
        return _no_drafts(runtime)
    try:
        record = workspace_store.switch_draft(workspace_id, name, _current_thread_id())
    except (KeyError, ValueError) as e:
        return _error(runtime, e)
    draft = workspace_store.current_draft(record)
    price = (draft["configuration"].get("candidate") or {}).get("price")
    return _reply(
        runtime,
        f"Now working on draft {draft['name']!r}"
        + (f", {price} EUR/month." if price is not None
           else " — it has no priced candidate; propose a completion to price it.")
        + " The sheet already shows it: say in one sentence what this draft "
          "reads, and stop.",
        configuration=draft["configuration"],
        **_mirrors(record),
    )


@tool("discard_draft")
def discard_draft_tool(name: str, runtime: ToolRuntime) -> Command:
    """Remove a draft the customer has decided against. Only a draft that is
    not the one being worked on can go, and it does not come back — offer it
    when they say they are done with an alternative, never on your own
    initiative."""
    workspace_id = runtime.state.get("workspace_id")
    if not workspace_id:
        return _no_drafts(runtime)
    try:
        record = workspace_store.discard_draft(workspace_id, name, _current_thread_id())
    except (KeyError, ValueError) as e:
        return _error(runtime, e)
    return _reply(
        runtime,
        f"Discarded the draft {name.strip()!r}. Remaining: "
        + ", ".join(d["name"] for d in record["drafts"])
        + ".",
        **_mirrors(record),
    )


@tool
def compare_drafts(a: str, runtime: ToolRuntime, b: str | None = None) -> str:
    """Compare two drafts of this agreement (or draft `a` against the one being
    worked on, if `b` is omitted). The customer sees a side-by-side card of
    only the differing variables with the monthly-price delta and the footprint
    delta. Both drafts need a priced candidate.

    The card already shows every row, both totals and both footprints. Say what
    the trade-off is in one or two sentences — which direction each objective
    moves and what the customer is trading for what — and stop. Do not walk the
    rows back, and do not offer to show the drafts side by side: you just did.
    Quote `footprintDeltaText` verbatim for the footprint difference rather than
    restating the raw `footprintDelta`, so your sentence and the card agree."""
    workspace_id = runtime.state.get("workspace_id")
    if not workspace_id:
        return ("ERROR: this conversation is not attached to an elevator, so it "
                "has no drafts to compare.")
    try:
        record = workspace_store.get_workspace(workspace_id)
        current = workspace_store.current_draft(record)
        side_a = workspace_store.draft_named(record, a)
        side_b = current if b is None else workspace_store.draft_named(record, b)
        if side_a["id"] == side_b["id"]:
            raise ValueError(
                f"{side_a['name']!r} is one draft, not two — name the other one"
            )

        # The current side comes from the run's own state rather than the
        # record, so the column labelled current is the sheet the customer is
        # looking at; the other side can only come from the store.
        def _config(draft: dict) -> Configuration:
            return (_get_config(runtime) if draft["id"] == current["id"]
                    else draft["configuration"])

        return json.dumps(draft_comparison(
            side_a["name"], _config(side_a),
            side_b["name"], _config(side_b),
            side_b["id"] == current["id"],
        ))
    except (KeyError, ValueError) as e:
        return f"ERROR: {e}"


# -- undo tools (docs/specs/undo) -----------------------------------------


def _restore_step(runtime: ToolRuntime, direction: str) -> Command:
    """One step through the current draft's history, in either direction.

    The history belongs to the agreement, not to this transcript: the store is
    read fresh, so the batch reversed is the last one applied to this draft
    whoever applied it and from whichever conversation — and never one applied
    to another draft (docs/specs/parallel-drafts). Nothing is written until the
    solver has re-validated the restored state.
    """
    workspace_id = runtime.state.get("workspace_id")
    if not workspace_id:
        return _reply(runtime, "This conversation is not attached to an elevator, "
                               "so there is no history to move through.")
    try:
        record = workspace_store.get_workspace(workspace_id)
    except KeyError:
        return _reply(runtime, f"ERROR: workspace {workspace_id!r} not found — "
                               "nothing to restore.")
    snap = workspace_store.history_head(record, direction)
    if snap is None:
        return _reply(runtime, (
            "Nothing to undo — this agreement is at its earliest recorded state."
            if direction == "undo" else
            "Nothing to redo — nothing has been undone since the last change."
        ))
    before = workspace_store.current_draft(record)["configuration"]
    try:
        restored = restore(snap)
    except ValueError as e:
        return _error(runtime, e)
    except ConflictError as e:
        return _rejected(runtime, e)

    record = workspace_store.commit_restore(
        workspace_id, direction, restored, _current_thread_id())
    verb = ("Reversed the last change applied to this agreement"
            if direction == "undo" else
            "Reapplied the change that had been undone")
    lines = [
        f"{verb}. What moved, old value to new: "
        f"{describe_restoration(before, restored)}.",
        "The sheet already shows this. Say in one sentence what the agreement "
        "now reads, and stop; do not list it back to the customer.",
    ]
    return _reply(runtime, "\n".join(lines), configuration=restored, **_mirrors(record))


@tool
def undo_change(runtime: ToolRuntime) -> Command:
    """Reverse the last change applied to this agreement — whoever made it,
    you or the customer, and whether it came from this conversation or another
    one. The whole batch goes back together: the change, whatever it forced,
    and any fill that came with it. Call this whenever the customer takes
    something back ("undo that", "put it back", "never mind") instead of
    reconstructing older values from the transcript."""
    return _restore_step(runtime, "undo")


@tool
def redo_change(runtime: ToolRuntime) -> Command:
    """Put back the change undo_change reversed. Use when the customer changes
    their mind about an undo ("actually keep it", "redo that")."""
    return _restore_step(runtime, "redo")


@tool
def keep_as_is(runtime: ToolRuntime) -> Command:
    """The customer declined a change: confirm that nothing moved.

    Call this — and nothing else — when a revision is abandoned ("keep
    everything as it is", "leave it", "forget that one"). It is not undo:
    undo_change reverses a change that was applied, while this one answers a
    change that never was. Nothing is recorded and nothing is reversed."""
    # Deliberately routed through _reply rather than _committed: this tool
    # holds no `configuration` in its update and writes no history entry, so
    # declining a change cannot move the agreement whatever the model intends
    # by calling it (docs/specs/nonlinear-interaction).
    return _reply(runtime, "Nothing changed — the agreement stands as it was.")


# -- RFQ tools (docs/specs/rfq-reconciliation) ----------------------------


def _register_lines(config: Configuration) -> list[str]:
    """The register as the agent should read it: pending deviations first,
    then what was reconciled and how — so "where do we stand" answers from
    state, with waived requirements still named."""
    entries = register(config)
    if not entries:
        return []
    lines = []
    pending = [e for e in entries if e["status"] == "deviation"]
    if pending:
        lines.append(f"Open deviations from the document ({len(pending)}):")
        lines += [
            f"- clause {e['clause']}: asked {_label(e['variable'], e['requested'])}"
            f" ({e['variable']}={e['requested']}), offers "
            + (_label(e["variable"], e["offered"]) if e["offered"] else "nothing yet")
            for e in pending
        ]
    else:
        lines.append("No open deviations — the agreement is clean against the document.")
    for status, heading in (("waived", "Waived (still listed, never forgotten)"),
                            ("revised", "Revised by the customer")):
        marked = [e for e in entries if e["status"] == status]
        if marked:
            lines.append(f"{heading}: " + ", ".join(
                f"clause {e['clause']} asked {_label(e['variable'], e['requested'])}"
                f", agreement says "
                + (_label(e["variable"], e["offered"]) if e["offered"] else "—")
                for e in marked
            ))
    met = sum(1 for e in entries if e["status"] == "met")
    lines.append(f"Met: {met} of {len(entries)} requirements.")
    return lines


def _budget_lines(config: Configuration) -> list[str]:
    """The document's monthly cap against the candidate — arithmetic on a
    solver-computed price and a figure the document states, never a rule."""
    rfq = config.get("rfq")
    candidate = config["candidate"]
    if not rfq or "budget_cap" not in rfq or not candidate:
        return []
    cap, price = rfq["budget_cap"], candidate["price"]
    if price <= cap:
        return [f"The document caps the charge at {cap} EUR/month; this candidate "
                f"is {price} — within it."]
    return [f"The document caps the charge at {cap} EUR/month; this candidate is "
            f"{price} — {price - cap} over. The model has no budget variable, so "
            "this is a commercial pressure to raise, not a rule violation."]


@tool
def ingest_rfq(
    requirements: list[dict],
    unmapped: list[dict],
    document_text: str,
    runtime: ToolRuntime,
    budget_cap: int | None = None,
) -> Command:
    """Seed this agreement from the customer's requirements document (an RFQ,
    tender or specification they pasted or attached). Call describe_product
    first, then call this ONCE with everything the document states.

    `requirements` is one entry per numbered clause that maps to a product
    variable: {"variable": "rated_speed", "value": "mps3_0", "clause": "3.1",
    "quote": "Rated speed shall be 3.0 m/s"}. Map only what the document
    actually states — never a requirement it does not make, and never a
    priority it does not express. Several clauses may bear on the same
    variable; list each one, with its own clause number.

    `unmapped` is every requirement the document makes that no product
    variable carries: {"clause": "5.3", "quote": "...", "note": "handover
    date"}. Nothing is silently dropped — if you cannot map it, list it here.

    `budget_cap` is a monthly ceiling the document states, in EUR/month, if it
    states one.

    The solver seeds a complete valid agreement satisfying as many
    requirements as can hold together; each one it cannot meet comes back as a
    deviation with the offered value and the rules that separate them.
    """
    config = _get_config(runtime)
    try:
        new_config, seeded, demoted = ingest(config, requirements, unmapped, budget_cap)
    except ValueError as e:
        return _error(runtime, e)

    rfq = new_config["rfq"]
    lines = [
        f"Seeded from the document: {len(seeded.kept)} of "
        f"{len(rfq['requirements'])} requirements recorded, candidate at "
        f"{new_config['candidate']['price']} EUR/month."
    ]
    if seeded.deviations:
        lines.append(
            f"{len(seeded.deviations)} requirement(s) the rules cannot meet — "
            "present each as a negotiable position, never a verdict, and offer "
            "the three moves (accept what is offered, change the requirement, "
            "leave it open):"
        )
        for d in seeded.deviations:
            clauses = ", ".join(
                r["clause"] for r in rfq["requirements"]
                if r["variable"] == d.variable and r["value"] == d.requested
            )
            rules = ("; ".join(f"{rid}: {label}" for rid, label in d.rules)
                     or "the document asks for two different values of this term")
            lines.append(
                f"- {MODEL.variables[d.variable].label} (clause {clauses}): asked "
                f"{_label(d.variable, d.requested)}, offered "
                f"{_label(d.variable, d.offered)}. Because {rules}"
            )
    else:
        lines.append("Every requirement is met — no deviations to reconcile.")

    if demoted:
        lines.append("Could not be mapped as given, listed as unmapped: " + "; ".join(
            f"clause {u['clause']} ({u['note']})" for u in demoted
        ))
    if rfq["unmapped"]:
        lines.append(
            f"{len(rfq['unmapped'])} clause(s) no product variable carries "
            "(say so plainly if the customer asks about them): "
            + ", ".join(u["clause"] for u in rfq["unmapped"] if u["clause"])
        )
    lines += _budget_lines(new_config)
    lines.append(
        "The document leaves these open — ask about these and nothing else: "
        + (", ".join(_undecided(new_config))
           or "nothing; the document settles everything")
    )
    workspace_id = runtime.state.get("workspace_id")
    if workspace_id:
        try:
            workspace_store.attach_rfq(workspace_id, document_text)
        except KeyError:
            print(f"workspace {workspace_id!r} not found — RFQ text not persisted")
    return _committed(runtime, new_config, lines)


@tool
def reconcile_requirement(
    variable: str,
    move: ReconcileMove,
    runtime: ToolRuntime,
    value: str | None = None,
) -> Command:
    """Reconcile the document's requirement on one variable — the customer's
    answer to a deviation.

    move="accept": the customer takes what the agreement offers. The
    requirement is waived — recorded as waived, never forgotten, and still
    listed when you summarize.
    move="revise": the customer changes their requirement; `value` is the new
    option code. If it collides with other recorded choices you get repair
    options back instead, exactly as revise_choices does.
    move="open": put it back to pending, changing nothing else.

    Every clause of the document bearing on that variable moves together.
    """
    config = _get_config(runtime)
    try:
        new_config, newly_forced, applied = reconcile(config, variable, move, value)
    except ValueError as e:
        return _error(runtime, e)
    except ConflictError as conflict:
        # Only "revise" can collide — "accept" pins a value the agreement
        # already holds — so only it has a revision to build repairs for.
        if value is None:
            return _rejected(runtime, conflict)
        return _repair_options(runtime, config, {variable: value})

    clauses = ", ".join(
        r["clause"] for r in new_config["rfq"]["requirements"] if r["variable"] == variable
    )
    if move == "accept":
        lines = [f"Waived clause {clauses}: the agreement's "
                 f"{_label(variable, applied)} stands, and the requirement stays "
                 "listed as waived."]
    elif move == "revise":
        lines = [f"Clause {clauses} revised: {MODEL.variables[variable].label} is "
                 f"now {_label(variable, applied)}."]
    else:
        lines = [f"Clause {clauses} left open — still an unreconciled deviation."]
    lines += _consequence_lines(
        config, new_config, newly_forced,
        discarded="The previous candidate no longer fits and was discarded — "
                  "propose a completion to price the reconciled agreement.",
    )
    lines += _register_lines(new_config)
    return _committed(runtime, new_config, lines)


@tool
def name_workspace(name: str, runtime: ToolRuntime) -> Command:
    """Name (or rename) this elevator's entry — a short identifying name like
    "Riverside Tower — north lift", or a short description of the installation
    when no explicit identity has emerged yet. The entry starts unnamed; call
    this as soon as the conversation reveals which installation this is, and
    again whenever a better identity emerges."""
    workspace_id = runtime.state.get("workspace_id")
    if not workspace_id:
        return _reply(
            runtime,
            "No workspace attached to this conversation — nothing to name.",
        )
    try:
        workspace_store.rename_workspace(workspace_id, name)
    except (KeyError, ValueError) as e:
        return _error(runtime, e)
    return _reply(
        runtime,
        f"Named the elevator {name.strip()!r}.",
        workspace_name=name.strip(),
    )


@tool
def get_configuration(runtime: ToolRuntime) -> str:
    """Current configuration: recorded choices, rule-forced values, candidate,
    and which variables are still undecided."""
    config = _get_config(runtime)
    forced = _forced(config["statuses"])
    lines = []
    drafts_line = None
    workspace_id = runtime.state.get("workspace_id")
    if workspace_id:
        try:
            record = workspace_store.get_workspace(workspace_id)
            name = record["name"]
            lines.append(f"Elevator: {name}" if name
                         else "Elevator: unnamed — call name_workspace once you "
                              "know which installation this is.")
            current = workspace_store.current_draft(record)
            # Which document this state belongs to, and what else exists beside
            # it (docs/specs/parallel-drafts) — everything below describes the
            # current draft and no other.
            if len(record["drafts"]) > 1:
                drafts_line = "Drafts: " + ", ".join(
                    f"{d['name']}"
                    + (" (this one)" if d["id"] == current["id"] else "")
                    + (f" {price} EUR/month" if (price := (
                        d["configuration"].get("candidate") or {}).get("price"))
                       else "")
                    for d in record["drafts"]
                )
            else:
                lines.append(f"Draft: {current['name']} (the only one)")
        except KeyError:
            pass
    lines.append("Choices:")
    for var, c in config["choices"].items():
        lines.append(f"- {var} = {c['value']} (source: {c['source']})")
    if forced:
        lines.append("Forced by rules: " + ", ".join(f"{v}={val}" for v, val in forced.items()))
        # With the rules that force them, so "why is this here?" is answered by
        # quoting the model rather than by reasoning about it (constitution #6).
        for var, val in forced.items():
            named = dict.fromkeys(
                f"{r['id']}: {r['label']}"
                for rules in config.get("unavailable", {}).get(var, {}).values()
                for r in rules
            )
            if named:
                lines.append(
                    f"- {var}={val} because every alternative is ruled out by "
                    + "; ".join(named)
                )
    lines.append("Undecided: " + (", ".join(_undecided(config)) or "none"))
    if config["candidate"]:
        line = f"Candidate agreement at {config['candidate']['price']} EUR/month"
        fp = config["candidate"].get("footprint")
        if fp:
            line += f", modelled lifetime footprint {_format_co2(fp['total'])}"
        lines.append(line + " is stored.")
    if drafts_line:
        lines.append(drafts_line)
    lines += _register_lines(config)
    lines += _budget_lines(config)
    return "\n".join(lines)


@tool
def ask_choices(variables: list[str], runtime: ToolRuntime, prompt: str = "") -> str:
    """Show the customer clickable controls in chat for the given variables
    (1-4 related ones at a time). The customer sees each variable's currently
    valid options as chips, a scale, or a detail list, and can pick directly.
    `prompt` is an optional short caption."""
    config = _get_config(runtime)
    try:
        payload = build_ask_payload(config, variables)
    except ValueError as e:
        return f"ERROR: {e}"
    payload["prompt"] = prompt
    return json.dumps(payload)


@tool
def describe_product() -> str:
    """The service catalog: every variable, its option value codes, labels,
    monthly prices and modelled embodied CO2e deltas, the product rules, and
    the footprint assessment assumptions — the only source for a footprint
    figure or an assumption behind one. Call this before your first
    set_choices."""
    # All prices shown are EUR/month — the LLM never sees a capex figure it
    # could leak (docs/specs/service-agreement).
    default_months = MODEL.months_of(None)
    default_label = _label(TERM_VAR, MODEL.pricing.default_term)
    fb = MODEL.footprint_block

    def _price_note(var_name: str, o) -> str:
        if o.monthly_price:
            return f", +{o.monthly_price} EUR/month"
        if o.price:
            delta = MODEL.monthly_option_delta(var_name, o.value, default_months)
            return f", ≈+{delta} EUR/month"
        return ""

    def _co2_note(o) -> str:
        # Quoted after the fabrication multiplier so per-option figures
        # reconcile with candidate totals (docs/specs/environmental-footprint).
        if not o.co2:
            return ""
        kg = round(o.co2 * fb.fabrication_multiplier)
        return f", ≈{'+' if kg >= 0 else ''}{kg} kg CO₂e embodied"

    lines = [
        f"Product: {MODEL.name} — offered as a service agreement, priced per month.",
        "",
        f"Hardware option deltas are amortized at the default {default_label} term; "
        "the actual fee is derived from the chosen contract term.",
        "",
        "Variables (use the value codes with set_choices):",
    ]
    group = None
    for var in MODEL.variables.values():
        if var.group != group:
            group = var.group
            lines.append(f"\n[{group}]")
        opts = ", ".join(
            f"{o.value} ({o.label}{_price_note(var.name, o)}{_co2_note(o)})"
            for o in var.options
        )
        lines.append(f"- {var.name} — {var.label}: {opts}")
    lines.append("\nRules:")
    for c in MODEL.constraints:
        lines.append(f"- {c.id}: {c.label}")
    lines += [
        "",
        "Assessment assumptions (all footprint figures are modelled, illustrative "
        "estimates from this data — not a verified assessment, and the energy "
        "class is never a certified rating):",
        f"- Service life {fb.service_life_years} years, {fb.operating_days} operating days/year",
        f"- Grid factor {fb.grid_factor} kg CO₂e/kWh (European average); "
        f"decarbonising-scenario bookend {fb.grid_factor_decarbonising} kg CO₂e/kWh",
        f"- Embodied values carry a fabrication multiplier of ×{fb.fabrication_multiplier}",
        f"- Module scope: {fb.module_scope}",
        "- Use-phase energy is looked up by (energy class, usage profile, travel "
        "band) — it is a property of the building's usage as much as of the product.",
    ]
    return "\n".join(lines)


configuration_tools = [
    name_workspace,
    ingest_rfq,
    reconcile_requirement,
    set_choices,
    revise_choices,
    clear_choices,
    propose_completion,
    fork_draft_tool,
    switch_draft_tool,
    discard_draft_tool,
    compare_drafts,
    undo_change,
    redo_change,
    keep_as_is,
    get_configuration,
    describe_product,
    ask_choices,
]
