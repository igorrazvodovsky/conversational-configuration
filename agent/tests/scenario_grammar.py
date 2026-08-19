"""Python mirror of the structured message grammar in `src/lib/configurator.ts`.

The cards and the canvas dispatch these strings; the harness dispatches the same
ones, so a state-critical turn takes the one validated path rather than hoping
the model parses an improvised sentence (docs/specs/conversation-checks design).

Divergence from the TypeScript is a bug in both directions — the agent is
prompted against this exact wording (docs/specs/agent-tools design).
"""

CANVAS_EDIT_PREFIX = "Canvas edit: "
ABANDON_MESSAGE = "Abandon the revision — keep the configuration as it is."


def _labels(model, variable: str, value: str) -> tuple[str, str]:
    var = model.variables[variable]
    option = next(o for o in var.options if o.value == value)
    return var.label, option.label


def choice_message(model, selections: list[tuple[str, str]]) -> str:
    """The control-activation message: labels for the human, codes for the LLM."""
    return "\n".join(
        f"Set {var_label} to {opt_label} ({variable}={value})"
        for variable, value in selections
        for var_label, opt_label in [_labels(model, variable, value)]
    )


def canvas_edit_message(model, selections: list[tuple[str, str]]) -> str:
    return CANVAS_EDIT_PREFIX + choice_message(model, selections)


def repair_message(model, drop: list[tuple[str, str]],
                   changes: list[tuple[str, str]]) -> str:
    change_part = "; ".join(
        f"set {var_label} to {opt_label} ({variable}={value})"
        for variable, value in changes
        for var_label, opt_label in [_labels(model, variable, value)]
    )
    drop_part = ", ".join(f"{variable}={value}" for variable, value in drop)
    return (f"Apply repair: drop {drop_part}; {change_part}" if drop_part
            else f"Apply repair: {change_part}")


FORK_DRAFT_MESSAGE = "Keep this draft and start another from it"


def switch_draft_message(draft_name: str) -> str:
    return f'Switch to draft "{draft_name}"'


def discard_draft_message(draft_name: str) -> str:
    return f'Discard draft "{draft_name}"'


def compare_draft_message(draft_name: str) -> str:
    return f'Compare draft "{draft_name}" with the current one'


UNDO_MESSAGE = "Undo the last change"
REDO_MESSAGE = "Redo the undone change"


# Reconciliation moves (docs/specs/rfq-reconciliation). Visible messages, like
# the draft moves and unlike a canvas edit: answering a requirement of the
# customer's own document is negotiation and belongs in the record.

RECONCILE_PREFIX = "Reconcile deviation: "


def accept_offered_message(model, variable: str, offered: str) -> str:
    var_label, opt_label = _labels(model, variable, offered)
    return (f"{RECONCILE_PREFIX}accept the offered {var_label}, "
            f"{opt_label} ({variable}={offered})")


def revise_requirement_message(model, variable: str, value: str) -> str:
    var_label, opt_label = _labels(model, variable, value)
    return (f"{RECONCILE_PREFIX}change {var_label} to "
            f"{opt_label} ({variable}={value})")


def leave_open_message(model, variable: str) -> str:
    var_label = model.variables[variable].label
    return f"{RECONCILE_PREFIX}leave {var_label} ({variable}) open"
