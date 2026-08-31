"""Configuration state and solver-backed agent tools (docs/specs/agent-tools,
ask_choices from docs/specs/agreement-document, revision from
docs/specs/nonlinear-interaction, drafts from docs/specs/parallel-drafts)."""

import json
import re
from pathlib import Path
from typing import Literal, NotRequired, TypedDict
from uuid import uuid4

from langchain.agents import AgentState as BaseAgentState
from langchain.messages import ToolMessage
from langchain.tools import ToolRuntime, tool
from langgraph.types import Command

from src import trace, workspace_store
from src.solver import TERM_VAR, ConfigSolver, ConflictError, Seed, load_model

MODEL_PATH = Path(__file__).parent / "product_model" / "elevator.json"
MODEL = load_model(MODEL_PATH)
SOLVER = ConfigSolver(MODEL)

Source = Literal["user", "agent", "document"]


class Choice(TypedDict):
    value: str
    source: Source


# Absent on threads persisted before the footprint feature — read with .get.
class Footprint(TypedDict):
    embodied: int
    use_phase: int
    total: int


Objective = Literal["price", "co2"]


# "price" means EUR/month. The key name is deliberately unchanged: renaming
# would break threads already persisted. `objective` is absent on pre-footprint
# threads, which were always cheapest.
class Candidate(TypedDict):
    assignment: dict[str, str]
    price: int
    footprint: NotRequired[Footprint]
    objective: NotRequired[Objective]


# The id and the model's own label, never a paraphrase (constitution #6).
class Rule(TypedDict):
    id: str
    label: str


class Declined(TypedDict):
    variable: str
    value: str
    rules: list[Rule]


# Which kind a clause is follows from the facts it carries:
#
#   variable and value  a requirement; `reconciliation` is the one field a
#                       tool may move
#   variable, no value  a clause the document leaves to us
#   neither             a clause no product variable carries, with `note`
#
# Immutable after ingestion apart from the mark, which is what lets the register
# be derived rather than stored.
class Clause(TypedDict):
    id: str
    clause: str  # the citation the document gives it — "5.2"
    quote: str
    variable: NotRequired[str]
    value: NotRequired[str]
    note: NotRequired[str]
    reconciliation: NotRequired[Literal["pending", "waived", "revised"]]


def requirement(clause: Clause) -> bool:
    """Whether this clause asks for something — the only kind that seeds a
    choice, enters the register and takes a mark."""
    return bool(clause.get("variable")) and bool(clause.get("value"))


def left_to_us(clause: Clause) -> bool:
    """Whether the document leaves this clause's decision to us."""
    return bool(clause.get("variable")) and not clause.get("value")


class RFQ(TypedDict):
    clauses: list[Clause]
    # Reported against the candidate price as arithmetic, never as a solver
    # constraint: the model has no budget variable.
    budget_cap: NotRequired[int]


# `configuration` below is always the *current* draft's; which one that is
# lives in the store.
class Configuration(TypedDict):
    choices: dict[str, Choice]
    statuses: dict[str, dict[str, str]]  # var -> value -> chosen|forced|invalid|open
    # Computed with each variable's own recorded choice lifted, so presence here
    # means "you cannot swap to this", not "you already chose something else".
    # An empty list means the structural one-value-per-variable, which is not a
    # product rule and is not narrated as one.
    unavailable: dict[str, dict[str, list[Rule]]]
    candidate: Candidate | None
    rfq: NotRequired[RFQ]  # only on document-seeded agreements


# Its own type rather than a reuse of Configuration, because it deliberately
# lacks a required key: `trace.rebuild` returns this shape and `restore`
# validates it back into a whole one.
class Snapshot(TypedDict):
    choices: dict[str, Choice]
    candidate: Candidate | None
    rfq: NotRequired[RFQ]


# Mirrored into agent state so the canvas can offer the controls without
# polling the store.
class HistoryDepths(TypedDict):
    undo: int
    redo: int


# `price` is nullable and routinely null: it lives on the candidate, which
# `_keep_candidate` drops as soon as a choice diverges from it. Solving the
# other drafts to fill the gap would put solver calls behind a render.
class DraftSummary(TypedDict):
    id: str
    name: str
    price: int | None


class AgentState(BaseAgentState):
    configuration: Configuration
    # Seeded by the frontend on attach; absent on legacy threads — read with .get.
    workspace_id: NotRequired[str]
    # The store is the durable copy; this field is display plumbing.
    workspace_name: NotRequired[str]
    # Absent until the first batch of a conversation commits, and seeded by the
    # frontend on attach.
    history: NotRequired[HistoryDepths]
    # Chrome only — the store decides what is current — but `current_draft_id`
    # also rides in the thread checkpoint, where it is half of what tells a
    # reopened conversation its cards refer to another document.
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

    Which options are out is settled; *which* minimal core comes back for one of
    them is not, since an incremental solver can answer with either of two true
    cores. Nothing may depend on getting the same one twice.
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
    """The register is the difference between the frozen block and the live
    agreement, so dropping the block would erase the document, not the diff.
    """
    rfq = config.get("rfq")
    if rfq is not None:
        new_config["rfq"] = rfq
    return new_config


def _repriced(config: Configuration, new_config: Configuration) -> Configuration:
    """Keep a priced agreement priced across a change: a candidate that no longer
    matches the choices is dropped, which would otherwise leave the document
    unpriced after every edit. An agreement that never had one still has none.
    """
    previous = config.get("candidate")
    if previous is None or new_config["candidate"] is not None:
        return new_config
    return make_candidate(
        new_config,
        previous.get("objective", "price"),
        # A completion is one of many optima, and re-solving from scratch would
        # flip cost-free values nobody touched.
        prefer=previous["assignment"],
    )


def apply_choices(
    config: Configuration, new_choices: dict[str, str], source: Source
) -> tuple[Configuration, dict[str, str]]:
    """Returns (new configuration, newly forced values). Raises ConflictError on
    infeasible combinations, leaving config untouched, and ValueError on unknown
    variables or values.
    """
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

    `apply_choices` is all-or-nothing, which is wrong for a batch of things the
    customer just stated. Each round asks the solver which choices are in the
    conflict and declines the ones that came in this batch.
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
            # The invariant says this cannot happen; refuse rather than guess.
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
    """`prefer` is a tie-break passed to the solver, so a reprice moves what the
    edit forced and nothing else.
    """
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
    """Withdraw `drop` and apply `changes` as one atomic transition: it either
    fully applies or raises, leaving config untouched.
    """
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
    """A draft whose candidate an edit dropped has nothing to compare with. Never
    solved for here: the solver answers for the draft being worked on
    (constitution #1).
    """
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
    """Only the differing variables. Per-side deltas are computed at each side's own
    term, since two agreements may differ precisely in term.
    """
    side_a = {"name": a_name, **_draft_candidate(a_name, a_config)}
    side_b = {"name": b_name, **_draft_candidate(b_name, b_config)}

    months_a = MODEL.months_of(side_a["assignment"].get(TERM_VAR))
    months_b = MODEL.months_of(side_b["assignment"].get(TERM_VAR))

    def _side(var_name: str, val: str | None, months: int) -> dict:
        # val is None when a draft adapted from a pre-service-frame workspace
        # lacks an agreement variable
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
        # Pair-level only: an option-level co2 column is the badge format
        # decision 6 bans, and use-phase is not attributable to single options.
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
        # Formatted once here, because the card renders this string and the
        # agent quotes it. Left to the two runtimes separately they disagreed.
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
    choice = config["choices"].get(variable)
    if choice:
        return choice["value"]
    forced = _forced(config["statuses"]).get(variable)
    if forced:
        return forced
    candidate = config["candidate"]
    return candidate["assignment"].get(variable) if candidate else None


def requirements(config: Configuration) -> list[Clause]:
    """The clauses of the document that ask for something. A clause that asks
    nothing — left to us, or carried by no variable — is not one of them."""
    rfq = config.get("rfq")
    return [c for c in rfq["clauses"] if requirement(c)] if rfq else []


def clauses_left_to_us(config: Configuration) -> list[Clause]:
    """The clauses the document leaves to us to decide."""
    rfq = config.get("rfq")
    return [c for c in rfq["clauses"] if left_to_us(c)] if rfq else []


def unmapped_clauses(config: Configuration) -> list[Clause]:
    """The clauses no product variable carries — recorded, never dropped, and
    answered in conversation rather than on the agreement."""
    rfq = config.get("rfq")
    if not rfq:
        return []
    return [c for c in rfq["clauses"]
            if not requirement(c) and not left_to_us(c)]


def register(config: Configuration) -> list[RegisterEntry]:
    """Derived, never stored: recomputed from the frozen block and the live
    assignment on every call. A tender is answered clause by clause, so three
    clauses bearing on one variable are three entries.
    """
    entries: list[RegisterEntry] = []
    for clause in requirements(config):
        offered = live_value(config, clause["variable"])
            # met first: an agreement back on the document's value complies,
            # whatever mark reconciliation left behind.
        if offered == clause["value"]:
            status: RegisterStatus = "met"
        elif clause.get("reconciliation") == "waived":
            status = "waived"
        elif clause.get("reconciliation") == "revised":
            status = "revised"
        else:
            status = "deviation"
        entries.append({
            "variable": clause["variable"],
            "requested": clause["value"],
            "offered": offered,
            "clause": clause["clause"],
            "quote": clause["quote"],
            "status": status,
        })
    return entries


def ingest(
    config: Configuration,
    entries: list[dict],
    budget_cap: int | None = None,
) -> tuple[Configuration, Seed, list[Clause]]:
    """Seed an agreement from an extracted requirements document.

    An entry naming a variable or value the model does not declare keeps its
    citation, its quote and a note saying so, rather than moving to another list.

    Returns (new configuration, the solver's seeding result, the clauses that lost
    facts). Either fully applies or raises.
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

    clauses: list[Clause] = []
    unmappable: list[Clause] = []
    for entry in entries:
        variable, value = entry.get("variable", ""), entry.get("value", "")
        clause: Clause = {
            "id": str(uuid4()),
            "clause": entry.get("clause", ""),
            "quote": entry.get("quote", ""),
        }
        if variable and variable not in MODEL.variables:
            lost = f"no product variable {variable!r}"
        elif value and not variable:
            lost = f"{value!r} is stated with no variable to carry it"
        elif value and value not in MODEL.variables[variable].values:
            lost = f"{value!r} is not a value of {variable}"
        else:
            lost = ""
            if variable:
                clause["variable"] = variable
            if value:
                clause["value"] = value
                clause["reconciliation"] = "pending"
        if lost:
            clause["note"] = lost
            unmappable.append(clause)
        elif entry.get("note"):
            clause["note"] = entry["note"]
        clauses.append(clause)
    asked = [c for c in clauses if requirement(c)]
    if not asked:
        raise ValueError(
            "nothing in this document maps to a product variable — record what "
            "it states in conversation instead of seeding it"
        )

    seeded = SOLVER.seed([(c["variable"], c["value"]) for c in asked])
    new_config, _ = apply_choices(config, dict(seeded.kept), "document")
    # seed's own whole, not a recomputed one: cost-free variables leave several
    # equally cheap completions, so re-solving could offer a value the seeding
    # result never named.
    new_config = {**new_config, "candidate": {
        "assignment": dict(seeded.assignment),
        "price": seeded.price,
        "footprint": _state_footprint(seeded.assignment),
        "objective": "price",
    }}
    rfq: RFQ = {"clauses": clauses}
    if budget_cap is not None:
        rfq["budget_cap"] = budget_cap
    new_config["rfq"] = rfq
    return new_config, seeded, unmappable


def _requirements_on(config: Configuration, variable: str) -> list[Clause]:
    if config.get("rfq") is None:
        raise ValueError("this agreement was not seeded from a document")
    asked = requirements(config)
    on_variable = [c for c in asked if c["variable"] == variable]
    if not on_variable:
        raise ValueError(
            f"the document states no requirement on {variable}; "
            f"it states: {sorted({c['variable'] for c in asked})}"
        )
    return on_variable


def _mark(config: Configuration, answered: dict[str, str]) -> RFQ:
    """A clause the move leaves nothing to answer keeps the mark it had, which is why
    the caller decides per clause rather than per variable.
    """
    rfq = config["rfq"]
    return {
        **rfq,
        "clauses": [
            {**c, "reconciliation": answered[c["id"]]} if c["id"] in answered else c
            for c in rfq["clauses"]
        ],
    }


def reconcile(
    config: Configuration,
    variable: str,
    move: ReconcileMove,
    value: str | None = None,
) -> tuple[Configuration, dict[str, str], str | None]:
    """Every clause bearing on the variable is answered by the one move, but the mark
    lands per clause: a clause asking for the value the agreement lands on keeps
    its pending mark.

    Returns (new configuration, newly forced values, the value now recorded).
    Raises ConflictError so a colliding reconciliation reaches the customer as
    repair options.
    """
    clauses = _requirements_on(config, variable)

    def answered(landing: str | None, mark: str) -> dict[str, str]:
        return {c["id"]: mark for c in clauses if c["value"] != landing}

    if move == "open":
        return {**config, "rfq": _mark(config, answered(None, "pending"))}, {}, None

    if move == "accept":
        offered = live_value(config, variable)
        if offered is None:
            raise ValueError(
                f"nothing is offered for {variable} yet — propose a completion "
                "before accepting what it offers"
            )
        # Every clause, not any: a document asking two values of one term has
        # one clause the agreement meets and one to waive.
        if all(c["value"] == offered for c in clauses):
            raise ValueError(
                f"the agreement already meets the document on {variable} — "
                "there is nothing to waive"
            )
        # Pinned as a user choice, so a later revision cannot silently move a
        # value they explicitly accepted.
        new_config, newly_forced = revise(config, {variable: offered}, [], "user")
        marks = _mark(new_config, answered(offered, "waived"))
        return {**new_config, "rfq": marks}, newly_forced, offered

    if move == "revise":
        if value is None:
            raise ValueError("the 'revise' move needs the value to change to")
        new_config, newly_forced = revise(config, {variable: value}, [], "user")
        marks = _mark(new_config, answered(value, "revised"))
        return {**new_config, "rfq": marks}, newly_forced, value

    raise ValueError(f"unknown reconciliation move {move!r}; use accept, revise or open")


# -- reversal (docs/specs/undo, docs/specs/action-log) --------------------


def cursor_move(entry: dict, direction: str) -> dict:
    """Running an entry backwards is swapping what it asserted for what it retracted,
    which is why no tool needs an inverse of its own.
    """
    return trace.invert(entry) if direction == "undo" else trace.change_of(entry)


def restore(snap: Snapshot) -> Configuration:
    """Validate a reconstructed state back into a whole configuration.

    Raises ValueError on a value the model no longer has — reachable once
    `elevator.json` is edited (constitution #2) — and ConflictError on a choice set
    the rules no longer allow together.
    """
    values = {var: c["value"] for var, c in snap["choices"].items()}
    _validate_known(values)
    statuses, unavailable = _derived(values)
    config: Configuration = {
        "choices": dict(snap["choices"]),
        "statuses": statuses,
        "unavailable": unavailable,
        # The candidate cannot be recomputed faithfully (see `ingest`), so it is
        # restored as the delta recorded it, and only if it still extends these
        # choices.
        "candidate": _keep_candidate(snap.get("candidate"), values),
    }
    rfq = snap.get("rfq")
    if rfq is not None:
        # From the reconstruction, never the live configuration: reconciliation
        # marks move with a batch.
        config["rfq"] = rfq
    return config


# How each action reads in the customer's terms, and whose move it was. The log
# records an action's name, so a reversal can say which move it reverses.
_POSSESSIVE = {"user": "your", "agent": "the assistant\'s",
               "document": "the document\'s"}

_MOVE_PHRASE = {
    "set_choices": "recording of {terms}",
    "revise_choices": "revision of {terms}",
    "clear_choices": "withdrawal of {terms}",
    "propose_completion": "completion of the agreement",
    # No "from the document": the possessive above supplies it, and this
    # action's source is always `document`.
    "ingest_rfq": "seeding of the agreement",
    "reconcile_requirement": "answer to the deviation on {terms}",
    "keep_as_is": "declining of a change",
}


def variables_by_clause(change: dict, *configs: dict) -> dict[str, str]:
    """A `reconciled` fact carries the clause and the mark and nothing else, so naming
    the term it answers means looking the clause up. Two sources, because neither
    answers alone: an ingestion's delta carries `carries` facts and describes
    itself, a reconciliation's does not.
    """
    out: dict[str, str] = {}
    for config in configs:
        for clause in ((config or {}).get("rfq") or {}).get("clauses", []):
            if clause.get("variable"):
                out[clause["id"]] = clause["variable"]
    for fact in change["asserted"] + change["retracted"]:
        if fact[0] == "carries":
            out[fact[1]] = fact[2]
    return out


def _terms_named(entry: dict, variables: dict[str, str] | None = None) -> list[str]:
    """In the model's order, so two readings of one entry name them the same way.
    `variables` maps a clause to its term, without which a move whose whole content
    is a mark names no term at all.
    """
    variables = variables or {}
    named = set()
    for fact in entry["asserted"] + entry["retracted"]:
        if fact[0] == "chose":
            named.add(fact[1])
        elif fact[0] == "reconciled" and fact[1] in variables:
            named.add(variables[fact[1]])
    return [MODEL.variables[v].label for v in MODEL.variables if v in named]


def name_action(entry: dict, variables: dict[str, str] | None = None) -> str:
    """One log entry as a move: whose it was and what it was. "your revision of
    Rated speed", "the assistant\'s completion of the agreement"."""
    phrase = _MOVE_PHRASE.get(entry["action"], entry["action"])
    if "{terms}" in phrase:
        terms = _terms_named(entry, variables)
        phrase = phrase.format(terms=", ".join(terms) if terms else "the agreement")
    return f"{_POSSESSIVE.get(entry['source'], 'the')} {phrase}"


def describe_delta(change: dict, variables: dict[str, str] | None = None) -> str:
    """Read off the facts rather than by diffing two configurations. A reversal passes
    the inverted delta, so the sentence is what the customer is about to see.
    """
    variables = variables or {}
    parts = []
    was = {f[1]: f[2] for f in change["retracted"] if f[0] == "chose"}
    now = {f[1]: f[2] for f in change["asserted"] if f[0] == "chose"}
    for var in MODEL.variables:
        if var in was or var in now:
            parts.append(
                f"{MODEL.variables[var].label}: "
                f"{_label(var, was[var]) if var in was else 'not decided'} → "
                f"{_label(var, now[var]) if var in now else 'not decided'}"
            )
    price = next((f[1] for f in change["asserted"] if f[0] == "candidate_price"), None)
    if price is not None:
        parts.append(f"{price} EUR/month")
    elif any(f[0] == "candidate_price" for f in change["retracted"]):
        parts.append("no priced candidate — propose a completion to price it again")
    # Only a mark that moved: an ingestion asserts one for every requirement it
    # creates, and listing those would report the document rather than the move.
    marked = {f[1] for f in change["retracted"] if f[0] == "reconciled"}
    for fact in change["asserted"]:
        if fact[0] != "reconciled" or fact[1] not in marked:
            continue
        # Two .gets, unlike the loop above: an edited model (constitution #2) can
        # leave a requirement on a variable the model no longer declares, and
        # describing a reversal must not raise — it runs after the write.
        variable = MODEL.variables.get(variables.get(fact[1], ""))
        if variable is not None:
            parts.append(f"the deviation on {variable.label} {fact[2]}")
    if any(f[0] == "requires" for f in change["asserted"]):
        parts.append("the document\'s requirements are seeded into this agreement")
    elif any(f[0] == "requires" for f in change["retracted"]):
        parts.append("the document\'s requirements are no longer seeded into "
                     "this agreement")
    return "; ".join(parts) or "nothing the sheet shows"


# -- ask_choices payload (docs/specs/agreement-document) ----------------------------------------

# A UI heuristic, deliberately not part of the product model. Ordered groups
# render as scales; consequence-heavy variables always as detail lists.
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
    """Per variable: its control type, every option with solver validity, its monthly
    delta at the term in effect, and a marker on the cheapest-completion value.
    """
    unknown = [v for v in variables if v not in MODEL.variables]
    if unknown:
        raise ValueError(f"unknown variables: {unknown}; valid: {sorted(MODEL.variables)}")

    cheapest, _ = SOLVER.complete(_chosen_values(config))
    months = _months_in_effect(config)
    payload = []
    for var_name in variables:
        var = MODEL.variables[var_name]
        statuses = config["statuses"][var_name]
        # So the card can name the rules rather than greying the row out.
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
    """The requested revision plus solver-computed repair options ordered by
    retention. Each lists the choices to give up, the forced ripple that differs
    from the current sheet, and the rules involved.
    """
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
    """Tenths round half away from zero, in integer arithmetic, because that is what
    `formatCO2` in `src/lib/configurator.ts` does. Python's `:.1f` rounds half to
    even, so 1250 kg read 1.2 t in chat beside 1.3 t on the sheet. The two still
    part above 1000 t, which one elevator cannot reach.
    """
    if abs(kg) < 1000:
        return f"{kg} kg CO₂e"
    tenths = (abs(kg) + 50) // 100
    return f"{'-' if kg < 0 else ''}{tenths // 10}.{tenths % 10} t CO₂e"


def _signed_co2(kg: int) -> str:
    return ("+" if kg >= 0 else "−") + _format_co2(abs(kg))


def completion_message(candidate: Candidate, objective: Objective,
                       other_assignment: dict[str, str], other_price: int) -> str:
    """Whenever the two objectives disagree, a one-line teaser for the other
    completion, so the trade-off is disclosed at the moment of proposal.
    """
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
    """The configuration this tool acts on, brought up to shape on the way in.

    Lifting must not mint identity: the workspace record has already minted these
    clauses once, and a second set would hand the store a document it does not
    recognise (docs/specs/document-clauses/design.md decision 3).
    """
    config = runtime.state.get("configuration") or empty_configuration()
    rfq = config.get("rfq")
    if rfq is None or "clauses" in rfq:
        return config
    workspace_id = runtime.state.get("workspace_id")
    if workspace_id:
        try:
            record = workspace_store.get_workspace(workspace_id)
        except KeyError:
            record = None
        if record is not None:
            stored = workspace_store.current_draft(record)["configuration"]
            if (stored.get("rfq") or {}).get("clauses"):
                return {**config, "rfq": stored["rfq"]}
    return workspace_store.lifted(config)


def _current_thread_id() -> str | None:
    """The running conversation's id, so the write-through can stamp which
    conversation moved the agreement. Returns None outside a run (unit tests)."""
    try:
        from langgraph.config import get_config

        return ((get_config() or {}).get("configurable") or {}).get("thread_id")
    except Exception:  # no active runnable context
        return None


def _mirrors(record: dict) -> dict:
    """Every path that moves the workspace goes through here, structural moves
    included: a switch that left the history depths behind would offer an undo
    belonging to the other document.
    """
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


# The runtime carries no tool name, so the name is an argument each tool passes
# for itself; this set is what makes it checkable rather than trusted.
CONTENT_ACTIONS = frozenset({
    "set_choices", "revise_choices", "clear_choices", "propose_completion",
    "ingest_rfq", "reconcile_requirement", "keep_as_is",
})


def _logged(action: str) -> str:
    if action not in CONTENT_ACTIONS:
        raise ValueError(
            f"{action!r} is not an action the log knows; add it to "
            "CONTENT_ACTIONS and to the ontology in the same change")
    return action


def _commit(
    runtime: ToolRuntime, config: Configuration, action: str, source: str
) -> dict | None:
    """Write-through to the durable workspace. `action` and `source` are not
    defaulted: a call site that omits one raises rather than logging anonymously.
    The source is not always who the facts are attributed to.

    Returns the state mirrors after the write, or None when there is no workspace.
    """
    workspace_id = runtime.state.get("workspace_id")
    if not workspace_id:
        return None  # legacy thread — nothing durable to update
    try:
        record = workspace_store.save_configuration(
            workspace_id, config, _logged(action), source, _current_thread_id())
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
# The wording of a tool message is what the LLM acts on and no automated check
# sees it, so these helpers carry the shapes and leave every sentence to the
# call site.


def _reply(runtime: ToolRuntime, content: str, **update) -> Command:
    return Command(update={
        **update,
        "messages": [ToolMessage(content=content, tool_call_id=runtime.tool_call_id)],
    })


def _error(runtime: ToolRuntime, e: Exception) -> Command:
    return _reply(runtime, f"ERROR: {e}")


# The agent's copy of the card grammar. `src/lib/configurator.ts` mints the
# sentences and `agent/main.py` teaches them, so routing is a fact about the
# message rather than a request to the model.
#
# The `Set` form is matched on shape, not on its first word: "Set up an elevator
# for a hospital" opens a prose turn. "Canvas edit: " needs no such care.
CANVAS_EDIT_PREFIX = "Canvas edit: "
_SET_LINE = re.compile(r"^Set .+ to .+ \([a-z][a-z0-9_]*=[a-z0-9_]+\)$")


def is_gesture(content: str) -> bool:
    """Whether this message is the customer setting a value themselves, rather
    than telling the agent something."""
    body = content[len(CANVAS_EDIT_PREFIX):] if content.startswith(
        CANVAS_EDIT_PREFIX) else content
    lines = [line for line in body.splitlines() if line.strip()]
    return (content.startswith(CANVAS_EDIT_PREFIX)
            or bool(lines) and all(_SET_LINE.match(line) for line in lines))


def _is_gesture(runtime: ToolRuntime) -> bool:
    """Read from the last human message, because that is the whole of what a gesture
    is. Asking the model to notice was measurably not enough: on the opening turn
    of a fresh conversation it reached for `set_choices` on four runs across three
    strengthenings of the rule.
    """
    for message in reversed((runtime.state or {}).get("messages") or []):
        kind = getattr(message, "type", None) or (
            "human" if isinstance(message, dict) and message.get("role") == "user"
            else None)
        if kind != "human":
            continue
        content = getattr(message, "content", None)
        if content is None and isinstance(message, dict):
            content = message.get("content")
        return isinstance(content, str) and is_gesture(content)
    return False


def _rejected(runtime: ToolRuntime, e: ConflictError) -> Command:
    return _reply(runtime, _conflict_payload(e))


def _committed(
    runtime: ToolRuntime,
    config: Configuration,
    lines: list[str],
    *,
    action: str,
    source: Source,
) -> Command:
    """The write-through precedes the reply everywhere, so a message the agent has
    read always describes a durable agreement.
    """
    mirrors = _commit(runtime, config, action, source)
    return _reply(runtime, "\n".join(lines), configuration=config, **(mirrors or {}))


def _repair_options(
    runtime: ToolRuntime, config: Configuration, changes: dict[str, str]
) -> Command:
    """When the requested changes are contradictory on their own, no repair to the
    other choices can help, so the conflict itself is what the agent gets.
    """
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
    """What a transition did beyond what was asked."""
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
        # The consideration line on the sheet carries the new fee, so a canvas
        # edit that only moved the price ends in silence.
        lines.append(
            f"Repriced: {after['price']} EUR/month (was {before['price']}). "
            "The sheet shows this."
        )
    return lines


# -- tools ----------------------------------------------------------------


@tool
def set_choices(choices: dict[str, str], source: Source, runtime: ToolRuntime) -> Command:
    """Record choices you read out of what the customer said or proposed
    yourself, after validating them against the product rules. Never for a
    message beginning "Set " or "Canvas edit: " — that is the customer setting
    a value in a control or on the sheet, and it goes to revise_choices
    however many terms it names and however empty the agreement is.

    `choices` maps variable names to option value codes (from describe_product),
    e.g. {"building_type": "hospital", "rated_load": "kg2000"}.
    Use source="user" for things the customer stated, source="agent" for values
    you derived or proposed. Everything in the batch that can hold is recorded;
    anything that cannot comes back as NOT RECORDED with the rules that
    separate it, for you to put to the customer — so the rest of what they
    said survives a collision between two of the values.
    """
    if _is_gesture(runtime):
        return _reply(
            runtime,
            "REFUSED: this message is the customer setting a value themselves, "
            "in a control or on the sheet. That is one revise_choices call with "
            "the same terms and source=\"user\" — it applies whole or comes back "
            "with repair paths. Call revise_choices now; nothing was recorded.",
        )
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
    return _committed(runtime, new_config, lines,
                      action="set_choices", source=source)


@tool
def revise_choices(
    changes: dict[str, str],
    source: Source,
    runtime: ToolRuntime,
    drop: list[str] | None = None,
) -> Command:
    """Set values on the agreement atomically. Use this for anything the
    customer changed through a control or the agreement sheet, whether or not
    that term was decided before, and whenever they tell you to change
    something they (or you) decided earlier.

    `changes` maps variable names to new option value codes; `drop` optionally
    lists variables to withdraw in the same atomic step (used when applying a
    repair the customer picked). The whole batch applies or none of it does. If
    it conflicts with other recorded choices, nothing changes and you get
    solver-computed repair options — rendered to the customer as clickable
    cards, ordered by how many existing choices they keep.
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
    return _committed(runtime, new_config, lines,
                      action="revise_choices", source=source)


@tool
def clear_choices(variables: list[str], runtime: ToolRuntime) -> Command:
    """Withdraw previously recorded choices for the given variable names."""
    config = _get_config(runtime)
    try:
        new_config = withdraw_choices(config, variables)
    except ValueError as e:
        return _error(runtime, e)
    return _committed(runtime, new_config, [f"Withdrew: {', '.join(variables)}"],
                      action="clear_choices", source="user")


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
    return _committed(runtime, new_config, [content],
                      action="propose_completion", source="agent")


# -- draft tools (docs/specs/parallel-drafts) -----------------------------
#
# None of these writes a configuration through `_committed`, so none of them is
# a change to a document and none lands in a document's history.


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

    # The current side comes from the run's own state, so the column labelled
    # current is the sheet the customer is looking at.
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


# -- reversal tools (docs/specs/undo, docs/specs/action-log) --------------


def _restore_step(runtime: ToolRuntime, direction: str) -> Command:
    """The log belongs to the agreement, not to this transcript: the store is read
    fresh, so the action reversed is the last one taken on this draft whoever took
    it. Nothing is written until the solver has re-validated it.
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
    entry = workspace_store.reversal_target(record, direction)
    if entry is None:
        if direction == "redo":
            return _reply(runtime, "Nothing to redo — nothing has been undone "
                                   "since the last change.")
        if workspace_store.beyond_reach(record):
            return _reply(runtime, (
                "This agreement has been walked back as far as undo reaches. "
                "Earlier states are in the record and no longer reversible — "
                "tell the customer that, and offer to set the values they want "
                "directly."))
        return _reply(runtime, "Nothing to undo — this agreement is at its "
                               "earliest recorded state.")
    config = workspace_store.current_draft(record)["configuration"]
    change = cursor_move(entry, direction)
    try:
        restored = restore(trace.apply(config, change))  # type: ignore[arg-type]
    except ValueError as e:
        return _error(runtime, e)
    except ConflictError as e:
        return _rejected(runtime, e)

    record = workspace_store.commit_reversal(
        workspace_id, direction, restored, _current_thread_id())
    verb = "Reversed" if direction == "undo" else "Reapplied"
    # Both sides of the step: a reversal that drops the document leaves the
    # clauses only in `config`, and one that puts it back only in `restored`.
    named = variables_by_clause(change, config, restored)
    lines = [
        f"{verb} {name_action(entry, named)}. What moved, old value to new: "
        f"{describe_delta(change, named)}.",
        f"The sheet already shows this. Name the move you "
        f"{'reversed' if direction == 'undo' else 'put back'} and whose it was, "
        "in one sentence, and stop; do not list the agreement back to the "
        "customer.",
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
    change that never was. The agreement does not move."""
    # Routed through `append_action` rather than `_committed`: this tool holds no
    # `configuration` in its update, so declining a change cannot move the
    # agreement whatever the model intends by calling it.
    workspace_id = runtime.state.get("workspace_id")
    mirrors = None
    if workspace_id:
        try:
            record = workspace_store.append_action(
                workspace_id, _logged("keep_as_is"), "user", _current_thread_id())
            mirrors = _mirrors(record)
        except KeyError:
            print(f"workspace {workspace_id!r} not found — decline not recorded")
    return _reply(runtime, "Nothing changed — the agreement stands as it was.",
                  **(mirrors or {}))


# -- RFQ tools (docs/specs/rfq-reconciliation) ----------------------------


def _register_lines(config: Configuration) -> list[str]:
    """Pending deviations first, then what was reconciled and how."""
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
    clauses: list[dict],
    document_text: str,
    runtime: ToolRuntime,
    budget_cap: int | None = None,
) -> Command:
    """Seed this agreement from the customer's requirements document (an RFQ,
    tender or specification they pasted or attached). Call describe_product
    first, then call this ONCE with everything the document states.

    `clauses` is one entry per clause of the document, each with its number
    and a short quote, and nothing is left out. What varies is how much of the
    clause a product variable can carry:

    - it states a value of a term the model has — give both:
      {"variable": "rated_speed", "value": "mps3_0", "clause": "3.1",
       "quote": "Rated speed shall be 3.0 m/s"}
    - it leaves the decision to us ("open to proposal", "state your
      assumption", "subject to confirmation") — give the variable it bears on
      and NO value: {"variable": "contract_term", "clause": "5.2", "quote":
      "Term open to proposal"}. Never put your own assumption in `value`; the
      tool reports these back for you to raise.
    - no product variable carries it — give neither, and say why in `note`:
      {"clause": "5.3", "quote": "...", "note": "handover date"}

    Map only what the document actually states — never a requirement it does
    not make, and never a priority it does not express. Several clauses may
    bear on the same variable; list each one, with its own number.

    `budget_cap` is a monthly ceiling the document states, in EUR/month, if it
    states one.

    The solver seeds a complete valid agreement satisfying as many
    requirements as can hold together; each one it cannot meet comes back as a
    deviation with the offered value and the rules that separate them.
    """
    config = _get_config(runtime)
    try:
        new_config, seeded, unmappable = ingest(config, clauses, budget_cap)
    except ValueError as e:
        return _error(runtime, e)

    rfq = new_config["rfq"]
    asked = requirements(new_config)
    lines = [
        f"Seeded from the document: {len(seeded.kept)} of "
        f"{len(asked)} requirements recorded, candidate at "
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
            cited = ", ".join(
                c["clause"] for c in asked
                if c["variable"] == d.variable and c["value"] == d.requested
            )
            rules = ("; ".join(f"{rid}: {label}" for rid, label in d.rules)
                     or "the document asks for two different values of this term")
            lines.append(
                f"- {MODEL.variables[d.variable].label} (clause {cited}): asked "
                f"{_label(d.variable, d.requested)}, offered "
                f"{_label(d.variable, d.offered)}. Because {rules}"
            )
    else:
        lines.append("Every requirement is met — no deviations to reconcile.")

    if unmappable:
        lines.append("Recorded with what the model cannot carry dropped: " + "; ".join(
            f"clause {c['clause']} ({c['note']})" for c in unmappable
        ))
    carried_by_none = unmapped_clauses(new_config)
    if carried_by_none:
        lines.append(
            f"{len(carried_by_none)} clause(s) no product variable carries "
            "(say so plainly if the customer asks about them): "
            + ", ".join(c["clause"] for c in carried_by_none if c["clause"])
        )
    to_us = clauses_left_to_us(new_config)
    if to_us:
        lines.append(
            "The document leaves these to us — raise each one and ask what "
            "they want, naming the clause: " + "; ".join(
                f"clause {c['clause']} on {MODEL.variables[c['variable']].label}"
                for c in to_us
            )
        )
    lines += _budget_lines(new_config)
    lines.append(
        "The document settles nothing on these — ask about these and nothing "
        "else: " + (", ".join(_undecided(new_config))
                    or "nothing; the document settles everything")
    )
    workspace_id = runtime.state.get("workspace_id")
    if workspace_id:
        try:
            workspace_store.attach_rfq(workspace_id, document_text)
        except KeyError:
            print(f"workspace {workspace_id!r} not found — RFQ text not persisted")
    return _committed(runtime, new_config, lines,
                      action="ingest_rfq", source="document")


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

    One move answers the whole disagreement on that variable, but the mark
    lands per clause: a clause asking for the value the agreement ends on has
    nothing to answer and keeps the mark it had.
    """
    config = _get_config(runtime)
    try:
        new_config, newly_forced, applied = reconcile(config, variable, move, value)
    except ValueError as e:
        return _error(runtime, e)
    except ConflictError as conflict:
        # Only "revise" can collide — "accept" pins a value the agreement already
        # holds.
        if value is None:
            return _rejected(runtime, conflict)
        return _repair_options(runtime, config, {variable: value})

    # On a document asking two values of one term this is not every clause on
    # it: one of them is now met.
    on_variable = [c for c in requirements(new_config) if c["variable"] == variable]
    answered = [c["clause"] for c in on_variable if c["value"] != applied]
    met = [c["clause"] for c in on_variable if c["value"] == applied]
    if move == "open":
        every = ", ".join(c["clause"] for c in on_variable)
        lines = [f"Clause {every} left open — still an unreconciled deviation."]
    elif not answered:
        # Every clause asked for the value just applied, so nothing was waived or
        # revised, and "clause revised" would name a move that did not happen.
        lines = [f"Clause {', '.join(met)} is now met: "
                 f"{MODEL.variables[variable].label} is "
                 f"{_label(variable, applied)}. Nothing was waived or revised."]
    elif move == "accept":
        lines = [f"Waived clause {', '.join(answered)}: the agreement's "
                 f"{_label(variable, applied)} stands, and the requirement stays "
                 "listed as waived."]
    else:
        lines = [f"Clause {', '.join(answered)} revised: "
                 f"{MODEL.variables[variable].label} is now "
                 f"{_label(variable, applied)}."]
    if met and answered and move != "open":
        lines.append(f"Clause {', '.join(met)} asked for that value and is now "
                     "met — it was not waived or revised along with the rest.")
    lines += _consequence_lines(
        config, new_config, newly_forced,
        discarded="The previous candidate no longer fits and was discarded — "
                  "propose a completion to price the reconciled agreement.",
    )
    lines += _register_lines(new_config)
    return _committed(runtime, new_config, lines,
                      action="reconcile_requirement", source="user")


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
            # Everything below describes the current draft and no other.
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
            # With the rules that force them, so "why is this here?" is answered
            # by quoting the model (constitution #6).
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
    figure or an assumption behind one. Call this before you first record or
    change anything."""
    # All prices are EUR/month: the LLM never sees a capex figure it could leak.
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
        # Quoted after the fabrication multiplier so per-option figures reconcile
        # with candidate totals.
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
        "Variables (these value codes are what the tools take):",
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
