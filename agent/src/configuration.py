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

from src.solver import TERM_VAR, ConfigSolver, ConflictError, load_model

MODEL_PATH = Path(__file__).parent / "product_model" / "elevator.json"
MODEL = load_model(MODEL_PATH)
SOLVER = ConfigSolver(MODEL)

Source = Literal["user", "agent"]


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


class Configuration(TypedDict):
    choices: dict[str, Choice]
    statuses: dict[str, dict[str, str]]  # var -> value -> chosen|forced|invalid|open
    candidate: Candidate | None
    frames: list[Frame]


class AgentState(BaseAgentState):
    configuration: Configuration


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
    new_config: Configuration = {
        "choices": choices,
        "statuses": statuses,
        "candidate": _keep_candidate(config["candidate"], merged),
        "frames": _frames(config),
    }
    return new_config, newly_forced


def withdraw_choices(config: Configuration, variables: list[str]) -> Configuration:
    unknown = [v for v in variables if v not in MODEL.variables]
    if unknown:
        raise ValueError(f"unknown variables: {unknown}")
    choices = {var: c for var, c in config["choices"].items() if var not in variables}
    remaining = {var: c["value"] for var, c in choices.items()}
    return {
        "choices": choices,
        "statuses": SOLVER.valid_options(remaining),
        "candidate": _keep_candidate(config["candidate"], remaining),
        "frames": _frames(config),
    }


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
    return {
        "choices": {v: {"value": val, "source": "user"} for v, val in assignment.items()},
        "statuses": SOLVER.valid_options(assignment),
        "candidate": candidate,
        "frames": _frames(config),
    }


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
    choices they keep. Present them as choices, not verdicts, and mention they
    can also keep things as they are.
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
    differing variables with the price delta — don't repeat the table in text,
    just comment on the trade-off."""
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
    return Command(update={
        "configuration": new_config,
        "messages": [ToolMessage(
            content=f"Adopted frame {name!r} — agreement replaced, {price} EUR/month.",
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
    lines = ["Choices:"]
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
    return "\n".join(lines)


@tool
def ask_choices(variables: list[str], runtime: ToolRuntime, prompt: str = "") -> str:
    """Show the customer clickable controls in chat for the given variables
    (1-4 related ones at a time). The customer sees each variable's currently
    valid options as chips, a scale, or a detail list, and can pick directly.
    Do not enumerate the options in your own text — the control shows them;
    just ask the question. `prompt` is an optional short caption."""
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
    the footprint assessment assumptions. Call this before your first
    set_choices. Quote footprint figures only from here or from tool results —
    never estimate them yourself."""
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
