"""Configuration state and solver-backed agent tools (docs/specs/agent-tools,
ask_choices from docs/specs/configuration-canvas, revision/frames from
docs/specs/nonlinear-interaction)."""

import json
from pathlib import Path
from typing import Literal, TypedDict

from langchain.agents import AgentState as BaseAgentState
from langchain.messages import ToolMessage
from langchain.tools import ToolRuntime, tool
from langgraph.types import Command

from src.solver import ConfigSolver, ConflictError, load_model

MODEL_PATH = Path(__file__).parent / "product_model" / "elevator.json"
MODEL = load_model(MODEL_PATH)
SOLVER = ConfigSolver(MODEL)

Source = Literal["user", "agent"]


class Choice(TypedDict):
    value: str
    source: Source


class Candidate(TypedDict):
    assignment: dict[str, str]
    price: int


class Frame(TypedDict):
    name: str
    assignment: dict[str, str]
    price: int


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


def make_candidate(config: Configuration) -> Configuration:
    assignment, price = SOLVER.complete(_chosen_values(config))
    return {
        **config,
        "candidate": {"assignment": assignment, "price": price},
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
    with prices, and the price delta. Data is computed from stored solver
    results, so both sides are valid by construction."""
    side_a = _find_frame(config, a)
    if b is not None:
        side_b: Frame | dict = _find_frame(config, b)
    elif config["candidate"]:
        side_b = {"name": "current", "assignment": config["candidate"]["assignment"],
                  "price": config["candidate"]["price"]}
    else:
        raise ValueError(
            "nothing to compare against — name a second frame or call "
            "propose_completion to create a current candidate"
        )

    differences = []
    for var_name, variable in MODEL.variables.items():
        val_a = side_a["assignment"].get(var_name)
        val_b = side_b["assignment"].get(var_name)
        if val_a == val_b:
            continue
        differences.append({
            "variable": var_name,
            "label": variable.label,
            "a": {"value": val_a, "label": _label(var_name, val_a),
                  "price": MODEL.price_of(var_name, val_a)},
            "b": {"value": val_b, "label": _label(var_name, val_b),
                  "price": MODEL.price_of(var_name, val_b)},
        })
    return {
        "kind": "frame_comparison",
        "a": {"name": side_a["name"], "price": side_a["price"]},
        "b": {"name": side_b["name"], "price": side_b["price"],
              "isCurrent": b is None},
        "differences": differences,
        "priceDelta": side_b["price"] - side_a["price"],
    }


def adopt_frame(config: Configuration, name: str) -> Configuration:
    """Atomically replace the current choices with the frame's full assignment
    (source 'user' — adopting is the customer's decision). The frame stays
    stored."""
    frame = _find_frame(config, name)
    assignment = dict(frame["assignment"])
    return {
        "choices": {v: {"value": val, "source": "user"} for v, val in assignment.items()},
        "statuses": SOLVER.valid_options(assignment),
        "candidate": {"assignment": assignment, "price": frame["price"]},
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


def build_ask_payload(config: Configuration, variables: list[str]) -> dict:
    """Typed payload for in-chat controls: per variable, its control type and
    every option with validity status (from the solver), price, and a marker
    on the cheapest-completion value. Raises ValueError on unknown variables."""
    unknown = [v for v in variables if v not in MODEL.variables]
    if unknown:
        raise ValueError(f"unknown variables: {unknown}; valid: {sorted(MODEL.variables)}")

    cheapest, _ = SOLVER.complete(_chosen_values(config))
    payload = []
    for var_name in variables:
        var = MODEL.variables[var_name]
        statuses = config["statuses"][var_name]
        options = [
            {
                "value": o.value,
                "label": o.label,
                "price": o.price,
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
def propose_completion(runtime: ToolRuntime) -> Command:
    """Compute the cheapest complete valid configuration extending the current
    choices. Stores it as the candidate and returns it with the total price."""
    config = _get_config(runtime)
    new_config = make_candidate(config)
    candidate = new_config["candidate"]
    content = (
        f"Candidate configuration, total {candidate['price']} EUR "
        f"(cheapest valid completion of the current choices):\n"
        + _describe_assignment(candidate["assignment"])
    )
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
            content=f"Saved frame {frame['name']!r} at {frame['price']} EUR.",
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
            content=f"Adopted frame {name!r} — configuration replaced, total {price} EUR.",
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
        lines.append(f"Candidate priced at {config['candidate']['price']} EUR is stored.")
    if _frames(config):
        lines.append("Saved frames: " + ", ".join(
            f"{f['name']} ({f['price']} EUR)" for f in _frames(config)
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
    """The product catalog: every variable, its option value codes, labels and
    prices, and the product rules. Call this before your first set_choices."""
    lines = [f"Product: {MODEL.name}", "", "Variables (use the value codes with set_choices):"]
    group = None
    for var in MODEL.variables.values():
        if var.group != group:
            group = var.group
            lines.append(f"\n[{group}]")
        opts = ", ".join(
            f"{o.value} ({o.label}{f', +{o.price} EUR' if o.price else ''})"
            for o in var.options
        )
        lines.append(f"- {var.name} — {var.label}: {opts}")
    lines.append("\nRules:")
    for c in MODEL.constraints:
        lines.append(f"- {c.id}: {c.label}")
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
