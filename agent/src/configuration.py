"""Configuration state and solver-backed agent tools (docs/specs/agent-tools,
ask_choices from docs/specs/configuration-canvas, revision/frames from
docs/specs/nonlinear-interaction)."""

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


# Lifetime kg CO2e (docs/specs/environmental-footprint). Stored on candidates
# and frames; absent on threads persisted before the footprint feature —
# always read with .get.
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


class Frame(TypedDict):
    name: str
    assignment: dict[str, str]
    price: int
    footprint: NotRequired[Footprint]
    objective: NotRequired[Objective]


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


class Configuration(TypedDict):
    choices: dict[str, Choice]
    statuses: dict[str, dict[str, str]]  # var -> value -> chosen|forced|invalid|open
    candidate: Candidate | None
    frames: list[Frame]
    rfq: NotRequired[RFQ]  # only on document-seeded agreements


class AgentState(BaseAgentState):
    configuration: Configuration
    # The workspace this conversation belongs to (docs/specs/agreement-workspace).
    # Seeded by the frontend on attach; absent on legacy threads — read with .get.
    workspace_id: NotRequired[str]
    # Mirror of the workspace's name, updated by name_workspace so the open
    # workspace's UI re-renders with the name immediately. The store is the
    # durable copy; this field is display plumbing.
    workspace_name: NotRequired[str]


def empty_configuration() -> Configuration:
    return {
        "choices": {},
        "statuses": SOLVER.valid_options({}),
        "candidate": None,
        "frames": [],
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


def _frames(config: Configuration) -> list[Frame]:
    # .get: threads persisted before docs/specs/nonlinear-interaction have no frames key
    return config.get("frames", [])


def _carry_rfq(config: Configuration, new_config: Configuration) -> Configuration:
    """Keep the frozen RFQ reference across a transition that rebuilds the
    configuration wholesale. The register is the difference between it and the
    live agreement, so dropping it would erase the document, not the diff."""
    rfq = config.get("rfq")
    if rfq is not None:
        new_config["rfq"] = rfq
    return new_config


def apply_choices(
    config: Configuration, new_choices: dict[str, str], source: Source
) -> tuple[Configuration, dict[str, str]]:
    """Returns (new configuration, newly forced values). Raises ConflictError
    on infeasible combinations (leaving config untouched) and ValueError on
    unknown variables/values."""
    _validate_known(new_choices)
    merged = {**_chosen_values(config), **new_choices}
    statuses = SOLVER.valid_options(merged)  # raises ConflictError if infeasible

    choices = dict(config["choices"])
    for var, val in new_choices.items():
        choices[var] = {"value": val, "source": source}

    newly_forced = {
        var: val for var, val in _forced(statuses).items()
        if _forced(config["statuses"]).get(var) != val
    }
    new_config: Configuration = _carry_rfq(config, {
        "choices": choices,
        "statuses": statuses,
        "candidate": _keep_candidate(config["candidate"], merged),
        "frames": _frames(config),
    })
    return new_config, newly_forced


def withdraw_choices(config: Configuration, variables: list[str]) -> Configuration:
    unknown = [v for v in variables if v not in MODEL.variables]
    if unknown:
        raise ValueError(f"unknown variables: {unknown}")
    choices = {var: c for var, c in config["choices"].items() if var not in variables}
    remaining = {var: c["value"] for var, c in choices.items()}
    return _carry_rfq(config, {
        "choices": choices,
        "statuses": SOLVER.valid_options(remaining),
        "candidate": _keep_candidate(config["candidate"], remaining),
        "frames": _frames(config),
    })


def _state_footprint(assignment: dict[str, str]) -> Footprint:
    """The footprint keys stored in shared state — the decarbonising bookend
    stays in the model data, surfaced by the assumptions panel, not in state."""
    fp = MODEL.footprint(assignment)
    return {"embodied": fp["embodied"], "use_phase": fp["use_phase"], "total": fp["total"]}


def make_candidate(config: Configuration, objective: Objective = "price") -> Configuration:
    assignment, price = SOLVER.complete(_chosen_values(config), objective)
    return {
        **config,
        "candidate": {"assignment": assignment, "price": price,
                      "footprint": _state_footprint(assignment),
                      "objective": objective},
        "frames": _frames(config),
    }


# -- revision and frames (docs/specs/nonlinear-interaction) ---------------------------------------


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


def save_frame(config: Configuration, name: str) -> Configuration:
    """Store the current candidate as a named frame (replacing a same-named
    one). Frames survive later configuration changes."""
    candidate = config["candidate"]
    if not candidate:
        raise ValueError("no candidate to save — call propose_completion first")
    if not name.strip():
        raise ValueError("frame needs a non-empty name")
    frame: Frame = {
        "name": name.strip(),
        "assignment": dict(candidate["assignment"]),
        "price": candidate["price"],
    }
    if "footprint" in candidate:
        frame["footprint"] = candidate["footprint"]
    if "objective" in candidate:
        frame["objective"] = candidate["objective"]
    frames = [f for f in _frames(config) if f["name"] != frame["name"]] + [frame]
    return {**config, "frames": frames}


def _find_frame(config: Configuration, name: str) -> Frame:
    frame = next((f for f in _frames(config) if f["name"] == name), None)
    if frame is None:
        stored = [f["name"] for f in _frames(config)] or ["<none>"]
        raise ValueError(f"no frame named {name!r}; stored frames: {stored}")
    return frame


def frame_comparison(config: Configuration, a: str, b: str | None = None) -> dict:
    """Comparison payload between frame `a` and frame `b` (or the current
    candidate when `b` is omitted): only the differing variables, both values
    with their monthly deltas, and the monthly-price delta. Per-side deltas are
    computed at each side's own term — two agreements may differ precisely in
    term. Data is computed from stored solver results, so both sides are valid
    by construction."""
    side_a = _find_frame(config, a)
    if b is not None:
        side_b: Frame | dict = _find_frame(config, b)
    elif config["candidate"]:
        side_b = {"name": "current", **config["candidate"]}
    else:
        raise ValueError(
            "nothing to compare against — name a second frame or call "
            "propose_completion to create a current candidate"
        )

    months_a = MODEL.months_of(side_a["assignment"].get(TERM_VAR))
    months_b = MODEL.months_of(side_b["assignment"].get(TERM_VAR))

    def _side(var_name: str, val: str | None, months: int) -> dict:
        # val is None when a frame persisted before the service frame lacks an agreement variable
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
        "kind": "frame_comparison",
        "a": {"name": side_a["name"], "price": side_a["price"], "footprint": fp_a},
        "b": {"name": side_b["name"], "price": side_b["price"],
              "isCurrent": b is None, "footprint": fp_b},
        "differences": differences,
        "priceDelta": side_b["price"] - side_a["price"],
        # 0 when either side predates the footprint feature — the card shows "—"
        "footprintDelta": (fp_b["total"] - fp_a["total"]) if fp_a and fp_b else 0,
    }


def adopt_frame(config: Configuration, name: str) -> Configuration:
    """Atomically replace the current choices with the frame's full assignment
    (source 'user' — adopting is the customer's decision). The frame stays
    stored."""
    frame = _find_frame(config, name)
    assignment = dict(frame["assignment"])
    candidate: Candidate = {"assignment": assignment, "price": frame["price"]}
    if "footprint" in frame:
        candidate["footprint"] = frame["footprint"]
    if "objective" in frame:
        candidate["objective"] = frame["objective"]
    # Every choice becomes source "user": adopting is the customer's decision,
    # so a frame adopted over a document-seeded agreement clears the document
    # badges. The register still derives correctly from the frozen block —
    # the provenance of the *current* values is genuinely the adoption.
    return _carry_rfq(config, {
        "choices": {v: {"value": val, "source": "user"} for v, val in assignment.items()},
        "statuses": SOLVER.valid_options(assignment),
        "candidate": candidate,
        "frames": _frames(config),
    })


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


# -- ask_choices payload (docs/specs/configuration-canvas) --------------------------------------

# Control selection is a UI heuristic and deliberately not part of the
# product model (docs/specs/configuration-canvas design). Ordered groups render as scales;
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
        options = [
            {
                "value": o.value,
                "label": o.label,
                "price": MODEL.monthly_option_delta(var_name, o.value, months),
                "status": "valid" if statuses[o.value] == "open" else statuses[o.value],
                "cheapest": cheapest[var_name] == o.value,
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
    return f"{kg / 1000:.1f} t CO₂e" if abs(kg) >= 1000 else f"{kg} kg CO₂e"


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


def _commit(runtime: ToolRuntime, config: Configuration) -> None:
    """Write-through to the durable workspace (docs/specs/agreement-workspace):
    the thread checkpoint keeps its own copy as the historical record of what
    this conversation saw. A missing workspace must not break the conversation."""
    workspace_id = runtime.state.get("workspace_id")
    if not workspace_id:
        return  # legacy thread — nothing durable to update
    try:
        workspace_store.save_configuration(workspace_id, config)
    except KeyError:
        print(f"workspace {workspace_id!r} not found — configuration not persisted")


# -- tools ----------------------------------------------------------------


@tool
def set_choices(choices: dict[str, str], source: Source, runtime: ToolRuntime) -> Command:
    """Record configuration choices after validating them against the product rules.

    `choices` maps variable names to option value codes (from describe_product),
    e.g. {"building_type": "hospital", "rated_load": "kg2000"}.
    Use source="user" for things the customer stated, source="agent" for values
    you derived or proposed. If the combination violates product rules it is
    rejected and you get an explanation of which choices conflict and why.
    """
    config = _get_config(runtime)
    try:
        new_config, newly_forced = apply_choices(config, choices, source)
    except ValueError as e:
        return Command(update={"messages": [
            ToolMessage(content=f"ERROR: {e}", tool_call_id=runtime.tool_call_id)
        ]})
    except ConflictError as e:
        return Command(update={"messages": [
            ToolMessage(content=_conflict_payload(e), tool_call_id=runtime.tool_call_id)
        ]})

    lines = ["Recorded: " + ", ".join(f"{v}={val}" for v, val in choices.items())]
    if newly_forced:
        lines.append(
            "Now forced by the rules (announce these to the customer): "
            + ", ".join(f"{_label(v, val)} ({v})" for v, val in newly_forced.items())
        )
    if new_config["candidate"] is None and config["candidate"] is not None:
        lines.append("The previous candidate no longer fits and was discarded.")
    _commit(runtime, new_config)
    return Command(update={
        "configuration": new_config,
        "messages": [ToolMessage(content="\n".join(lines), tool_call_id=runtime.tool_call_id)],
    })


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
        return Command(update={"messages": [
            ToolMessage(content=f"ERROR: {e}", tool_call_id=runtime.tool_call_id)
        ]})
    except ConflictError:
        try:
            payload = build_repair_payload(config, changes)
        except ConflictError as e:
            # the requested changes are contradictory on their own — no repair
            # to the *other* choices can help
            return Command(update={"messages": [
                ToolMessage(content=_conflict_payload(e), tool_call_id=runtime.tool_call_id)
            ]})
        return Command(update={"messages": [
            ToolMessage(content=json.dumps(payload), tool_call_id=runtime.tool_call_id)
        ]})

    lines = ["Revised: " + ", ".join(f"{v}={val}" for v, val in changes.items())]
    if drop:
        lines.append("Withdrew: " + ", ".join(drop))
    if newly_forced:
        lines.append(
            "Now forced by the rules (announce these to the customer): "
            + ", ".join(f"{_label(v, val)} ({v})" for v, val in newly_forced.items())
        )
    if new_config["candidate"] is None and config["candidate"] is not None:
        lines.append("The previous candidate no longer fits and was discarded.")
    _commit(runtime, new_config)
    return Command(update={
        "configuration": new_config,
        "messages": [ToolMessage(content="\n".join(lines), tool_call_id=runtime.tool_call_id)],
    })


@tool
def clear_choices(variables: list[str], runtime: ToolRuntime) -> Command:
    """Withdraw previously recorded choices for the given variable names."""
    config = _get_config(runtime)
    try:
        new_config = withdraw_choices(config, variables)
    except ValueError as e:
        return Command(update={"messages": [
            ToolMessage(content=f"ERROR: {e}", tool_call_id=runtime.tool_call_id)
        ]})
    _commit(runtime, new_config)
    return Command(update={
        "configuration": new_config,
        "messages": [ToolMessage(
            content=f"Withdrew: {', '.join(variables)}", tool_call_id=runtime.tool_call_id
        )],
    })


@tool
def propose_completion(runtime: ToolRuntime, objective: Objective = "price") -> Command:
    """Compute a complete valid service agreement extending the current
    choices and store it as the candidate, with its monthly fee and modelled
    lifetime footprint. objective="price" (the default) minimizes the monthly
    fee; objective="co2" minimizes the modelled lifetime CO2e. The other
    objective is always solved too — when the two disagree, the result says
    how many variables differ and both deltas; offer to show the pair
    (save_frame the first, propose the other, compare_frames)."""
    config = _get_config(runtime)
    new_config = make_candidate(config, objective)
    other: Objective = "co2" if objective == "price" else "price"
    other_assignment, other_price = SOLVER.complete(_chosen_values(config), other)
    content = completion_message(new_config["candidate"], objective,
                                 other_assignment, other_price)
    _commit(runtime, new_config)
    return Command(update={
        "configuration": new_config,
        "messages": [ToolMessage(content=content, tool_call_id=runtime.tool_call_id)],
    })


@tool("save_frame")
def save_frame_tool(name: str, runtime: ToolRuntime) -> Command:
    """Store the current candidate as a named frame so the customer can keep
    exploring and compare or return to it later. Offer this before big
    exploratory changes. Requires a candidate (propose_completion first)."""
    config = _get_config(runtime)
    try:
        new_config = save_frame(config, name)
    except ValueError as e:
        return Command(update={"messages": [
            ToolMessage(content=f"ERROR: {e}", tool_call_id=runtime.tool_call_id)
        ]})
    frame = new_config["frames"][-1]
    _commit(runtime, new_config)
    return Command(update={
        "configuration": new_config,
        "messages": [ToolMessage(
            content=f"Saved frame {frame['name']!r} at {frame['price']} EUR/month.",
            tool_call_id=runtime.tool_call_id,
        )],
    })


@tool
def compare_frames(a: str, runtime: ToolRuntime, b: str | None = None) -> str:
    """Compare two saved frames (or frame `a` against the current candidate if
    `b` is omitted). The customer sees a side-by-side card of only the
    differing variables with the price delta."""
    config = _get_config(runtime)
    try:
        return json.dumps(frame_comparison(config, a, b))
    except ValueError as e:
        return f"ERROR: {e}"


@tool("adopt_frame")
def adopt_frame_tool(name: str, runtime: ToolRuntime) -> Command:
    """Replace the current configuration with a saved frame's full assignment
    (atomic; the frame stays stored). Use when the customer picks a compared
    frame to continue from."""
    config = _get_config(runtime)
    try:
        new_config = adopt_frame(config, name)
    except ValueError as e:
        return Command(update={"messages": [
            ToolMessage(content=f"ERROR: {e}", tool_call_id=runtime.tool_call_id)
        ]})
    price = new_config["candidate"]["price"]
    _commit(runtime, new_config)
    return Command(update={
        "configuration": new_config,
        "messages": [ToolMessage(
            content=f"Adopted frame {name!r} — agreement replaced, {price} EUR/month.",
            tool_call_id=runtime.tool_call_id,
        )],
    })


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
        return Command(update={"messages": [
            ToolMessage(content=f"ERROR: {e}", tool_call_id=runtime.tool_call_id)
        ]})

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

    forced = _forced(new_config["statuses"])
    undecided = [
        var for var in MODEL.variables
        if var not in new_config["choices"] and var not in forced
    ]
    lines.append(
        "The document leaves these open — ask about these and nothing else: "
        + (", ".join(undecided) or "nothing; the document settles everything")
    )
    _commit(runtime, new_config)
    workspace_id = runtime.state.get("workspace_id")
    if workspace_id:
        try:
            workspace_store.attach_rfq(workspace_id, document_text)
        except KeyError:
            print(f"workspace {workspace_id!r} not found — RFQ text not persisted")
    return Command(update={
        "configuration": new_config,
        "messages": [ToolMessage(content="\n".join(lines), tool_call_id=runtime.tool_call_id)],
    })


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
        return Command(update={"messages": [
            ToolMessage(content=f"ERROR: {e}", tool_call_id=runtime.tool_call_id)
        ]})
    except ConflictError as conflict:
        # Only "revise" can collide — "accept" pins a value the agreement
        # already holds — so only it has a revision to build repairs for.
        if value is None:
            return Command(update={"messages": [
                ToolMessage(content=_conflict_payload(conflict),
                            tool_call_id=runtime.tool_call_id)
            ]})
        try:
            payload = build_repair_payload(config, {variable: value})
        except ConflictError as e:
            return Command(update={"messages": [
                ToolMessage(content=_conflict_payload(e), tool_call_id=runtime.tool_call_id)
            ]})
        return Command(update={"messages": [
            ToolMessage(content=json.dumps(payload), tool_call_id=runtime.tool_call_id)
        ]})

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
    if newly_forced:
        lines.append(
            "Now forced by the rules (announce these to the customer): "
            + ", ".join(f"{_label(v, val)} ({v})" for v, val in newly_forced.items())
        )
    if new_config["candidate"] is None and config["candidate"] is not None:
        lines.append("The previous candidate no longer fits and was discarded — "
                     "propose a completion to price the reconciled agreement.")
    lines += _register_lines(new_config)
    _commit(runtime, new_config)
    return Command(update={
        "configuration": new_config,
        "messages": [ToolMessage(content="\n".join(lines), tool_call_id=runtime.tool_call_id)],
    })


@tool
def name_workspace(name: str, runtime: ToolRuntime) -> Command:
    """Name (or rename) this elevator's entry — a short identifying name like
    "Riverside Tower — north lift", or a short description of the installation
    when no explicit identity has emerged yet. The entry starts unnamed; call
    this as soon as the conversation reveals which installation this is, and
    again whenever a better identity emerges."""
    workspace_id = runtime.state.get("workspace_id")
    if not workspace_id:
        return Command(update={"messages": [ToolMessage(
            content="No workspace attached to this conversation — nothing to name.",
            tool_call_id=runtime.tool_call_id,
        )]})
    try:
        workspace_store.rename_workspace(workspace_id, name)
    except (KeyError, ValueError) as e:
        return Command(update={"messages": [
            ToolMessage(content=f"ERROR: {e}", tool_call_id=runtime.tool_call_id)
        ]})
    return Command(update={
        "workspace_name": name.strip(),
        "messages": [ToolMessage(
            content=f"Named the elevator {name.strip()!r}.",
            tool_call_id=runtime.tool_call_id,
        )],
    })


@tool
def get_configuration(runtime: ToolRuntime) -> str:
    """Current configuration: recorded choices, rule-forced values, candidate,
    and which variables are still undecided."""
    config = _get_config(runtime)
    forced = _forced(config["statuses"])
    undecided = [
        var for var in MODEL.variables
        if var not in config["choices"] and var not in forced
    ]
    lines = []
    workspace_id = runtime.state.get("workspace_id")
    if workspace_id:
        try:
            name = workspace_store.get_workspace(workspace_id)["name"]
            lines.append(f"Elevator: {name}" if name
                         else "Elevator: unnamed — call name_workspace once you "
                              "know which installation this is.")
        except KeyError:
            pass
    lines.append("Choices:")
    for var, c in config["choices"].items():
        lines.append(f"- {var} = {c['value']} (source: {c['source']})")
    if forced:
        lines.append("Forced by rules: " + ", ".join(f"{v}={val}" for v, val in forced.items()))
    lines.append("Undecided: " + (", ".join(undecided) or "none"))
    if config["candidate"]:
        line = f"Candidate agreement at {config['candidate']['price']} EUR/month"
        fp = config["candidate"].get("footprint")
        if fp:
            line += f", modelled lifetime footprint {_format_co2(fp['total'])}"
        lines.append(line + " is stored.")
    if _frames(config):
        lines.append("Saved frames: " + ", ".join(
            f"{f['name']} ({f['price']} EUR/month)" for f in _frames(config)
        ))
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
    save_frame_tool,
    compare_frames,
    adopt_frame_tool,
    get_configuration,
    describe_product,
    ask_choices,
]
