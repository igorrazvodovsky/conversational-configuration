"""Scenario harness: drives the real agent graph a turn at a time and reports
per-assertion outcomes (docs/specs/demo-scenarios).

Scenario definitions and assertions live here rather than in `test_scenarios.py`
so that comparison mode can run them against an *older* checkout of the agent:
this module is always the current one, and only `main` / `src.*` come from the
tree under test.

    python scenario_runner.py <agent_dir> [scenario_id]   # JSON on stdout
"""

import importlib.util
import json
import os
import sys
import tempfile
import time
from pathlib import Path

_HERE = Path(__file__).resolve().parent


def _load_sibling(name):
    """Load a module from *this* directory by path.

    Comparison mode puts the tree under test first on `sys.path`, which is what
    we want for `main` and `src` and emphatically not for the harness's own
    modules — an older checkout may define them differently or not at all.
    """
    spec = importlib.util.spec_from_file_location(name, _HERE / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


grammar = _load_sibling("scenario_grammar")


class ScenarioError(RuntimeError):
    """A run that could not complete. Never swallowed: a comparison missing
    different cells on each side is a false result, not a weaker one."""


def load_agent(agent_dir: Path):
    """Import the graph from a given checkout, with its workspaces isolated.

    Once per process: everything here is process-global, so a second call is a
    no-op rather than a second chdir. Scenarios get their isolation from a
    fresh `Conversation`, not from reloading the agent.
    """
    if not os.environ.get("WORKSPACE_STORE_DIR"):
        os.environ["WORKSPACE_STORE_DIR"] = tempfile.mkdtemp(
            prefix="scenario-workspaces-")
    os.chdir(agent_dir)
    sys.path.insert(0, str(agent_dir))
    import main
    from src import workspace_store
    from src.configuration import MODEL, empty_configuration
    return main.agent, MODEL, empty_configuration, workspace_store


# -- turn driver -----------------------------------------------------------


class Conversation:
    """One conversation against the graph. Accumulates state the way the
    frontend does: messages plus the configuration the tools returned."""

    def __init__(self, agent, empty_configuration, workspace_store, thread_id):
        self.agent = agent
        self.thread_id = thread_id
        record = workspace_store.create_workspace(empty_configuration())
        self.state = {"messages": [], "configuration": empty_configuration(),
                      "workspace_id": record["id"]}

    def say(self, text: str) -> dict:
        """Send one user message; return what the agent did with it."""
        self.state["messages"] = self.state["messages"] + [
            {"role": "user", "content": text}]
        out = self._invoke()
        self.state = {**self.state, **out}

        msgs = out["messages"]
        cut = max(i for i, m in enumerate(msgs)
                  if getattr(m, "type", None) == "human"
                  or (isinstance(m, dict) and m.get("role") == "user"))
        calls, results, texts = [], [], []
        for m in msgs[cut + 1:]:
            if getattr(m, "type", None) == "ai":
                calls += [{"name": c["name"], "args": c["args"]}
                          for c in (m.tool_calls or [])]
                if isinstance(m.content, str) and m.content.strip():
                    texts.append(m.content)
            elif getattr(m, "type", None) == "tool":
                results.append(m.content if isinstance(m.content, str)
                               else str(m.content))
        return {"calls": calls, "results": results, "text": "\n".join(texts),
                "configuration": self.state["configuration"]}

    def _invoke(self, tries=6):
        """A turn costs ~16k prompt tokens (describe_product puts the whole
        catalog in the transcript), so a sweep meets the account's per-minute
        ceiling. Back off; if it still cannot finish, fail loudly."""
        delay = 8
        for attempt in range(tries):
            try:
                return self.agent.invoke(
                    self.state,
                    {"configurable": {"thread_id": self.thread_id},
                     "recursion_limit": 30})
            except Exception as e:
                if "rate_limit" not in str(e).lower():
                    raise ScenarioError(f"turn failed: {type(e).__name__}: {e}") from e
                if attempt == tries - 1:
                    raise ScenarioError(
                        f"rate-limited after {tries} attempts: {e}") from e
                print(f"    rate limited, sleeping {delay}s", file=sys.stderr)
                time.sleep(delay)
                delay *= 2


# -- assertion recording ---------------------------------------------------


class Checks:
    def __init__(self):
        self.results: dict[str, dict] = {}

    def that(self, name: str, passed: bool, detail: str = "") -> bool:
        self.results[name] = {"passed": bool(passed), "detail": detail}
        return bool(passed)


def payload(turn, kind: str) -> dict | None:
    """The typed card payload a tool returned this turn, if any."""
    for raw in turn["results"]:
        text = raw.strip()
        if text.startswith("{"):
            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                continue
            if data.get("kind") == kind:
                return data
    return None


def chosen(turn) -> dict[str, str]:
    return {v: c["value"] for v, c in turn["configuration"]["choices"].items()}


# -- scenario 2: revision with repair --------------------------------------
# The modernization case (requirements scenario 2). Deliberately the first one
# implemented: it is the flow a prompt change already broke once, when the
# agent recorded a revision with set_choices and the repair cards never
# appeared (docs/specs/agent-tools design, *revise over record*).

def scenario_revision_with_repair(ctx) -> Checks:
    agent, MODEL, empty_configuration, workspace_store = ctx
    c = Checks()
    convo = Conversation(agent, empty_configuration, workspace_store,
                         "scenario-revision")

    # Setup, state-critical: pin the modernization at 1.6 m/s through the same
    # grammar the canvas uses, so the starting point is not the model's guess.
    turn = convo.say(grammar.choice_message(MODEL, [
        ("installation", "modernization"), ("building_type", "office"),
        ("region", "europe"), ("travel", "mid_15_30"),
        ("rated_speed", "mps1_6")]))
    start = chosen(turn)
    c.that("setup_recorded",
           start.get("installation") == "modernization"
           and start.get("rated_speed") == "mps1_6",
           f"choices: {start}")

    # The revision, free-form: this turn is about the agent framing a change to
    # something already decided as a revision at all.
    turn = convo.say("Actually I need 3.0 m/s.")
    names = [call["name"] for call in turn["calls"]]
    c.that("revision_uses_revise_choices", "revise_choices" in names,
           f"calls: {names}")
    repairs = payload(turn, "repairs")
    c.that("repairs_payload_produced", repairs is not None,
           "no repairs payload" if repairs is None
           else f"{len(repairs['repairs'])} options")
    if not repairs:
        return c

    top = repairs["repairs"][0]
    dropped = {d["variable"] for d in top["drop"]}
    c.that("top_repair_drops_modernization", "installation" in dropped,
           f"drops: {sorted(dropped)}")
    rippled = {r["variable"] for r in top["ripple"]}
    c.that("top_repair_ripples_into_shaft_geometry",
           bool(rippled & {"pit_depth", "headroom", "platform", "drive"}),
           f"ripple: {sorted(rippled)}")
    c.that("repair_options_name_their_rules",
           all(option["rules"] for option in repairs["repairs"]),
           f"rules per option: {[len(o['rules']) for o in repairs['repairs']]}")

    # Abandon leaves the agreement exactly as it was.
    before = chosen(turn)
    turn = convo.say(grammar.ABANDON_MESSAGE)
    c.that("abandon_changes_nothing", chosen(turn) == before,
           f"{before} -> {chosen(turn)}")

    # Ask again, then apply the top repair through the card's own grammar.
    turn = convo.say("On reflection, let's do 3.0 m/s after all.")
    repairs = payload(turn, "repairs")
    if not c.that("repairs_offered_again", repairs is not None,
                  "no repairs payload on the second request"):
        return c
    top = repairs["repairs"][0]
    before_repair = chosen(turn)
    turn = convo.say(grammar.repair_message(
        MODEL,
        drop=[(d["variable"], d["value"]) for d in top["drop"]],
        changes=[(ch["variable"], ch["value"]) for ch in repairs["changes"]]))

    after = chosen(turn)
    c.that("repair_applied_atomically",
           after.get("rated_speed") == "mps3_0"
           and not (dropped & set(after)),
           f"choices: {after}")
    c.that("agreement_still_completable",
           _completable(after),
           "solver could not complete the repaired choices")

    # Undo (docs/specs/undo). This is the storyboard's F7 case, so the
    # reversal is asserted here rather than in a scenario of its own: the
    # customer's change, what it dropped and what it rippled go back together.
    # Both assertions assume the repair turn committed exactly one batch. If
    # the agent also proposed a completion in that turn — which the prompt
    # encourages once the essentials are known — the undo reverses that
    # instead, the choices do not move, and the failure detail below says so
    # rather than reading as a broken undo.
    turn = convo.say(grammar.UNDO_MESSAGE)
    names = [call["name"] for call in turn["calls"]]
    c.that("undo_uses_undo_change", "undo_change" in names, f"calls: {names}")
    undone = chosen(turn)
    c.that("undo_reverses_the_whole_batch", undone == before_repair,
           f"{before_repair} -> {undone}"
           + ("" if undone != after
              else " (choices unmoved: the repair turn committed more than one batch)"))

    turn = convo.say(grammar.REDO_MESSAGE)
    names = [call["name"] for call in turn["calls"]]
    c.that("redo_uses_redo_change", "redo_change" in names, f"calls: {names}")
    c.that("redo_returns_the_repaired_state", chosen(turn) == after,
           f"{undone} -> {chosen(turn)}, repaired was {after}")
    return c


def _completable(choices: dict[str, str]) -> bool:
    """[always show a valid whole] made checkable: whatever the conversation
    has recorded, the solver can still extend it to a full valid agreement."""
    from src.configuration import SOLVER
    try:
        SOLVER.complete(choices, "price")
        return True
    except Exception:
        return False


SCENARIOS = {"revision_with_repair": scenario_revision_with_repair}


def run(agent_dir: Path, only: str | None = None) -> dict:
    ctx = load_agent(agent_dir)
    out = {}
    for name, fn in SCENARIOS.items():
        if only and name != only:
            continue
        print(f"  running {name}", file=sys.stderr)
        out[name] = fn(ctx).results
    return out


if __name__ == "__main__":
    directory = Path(sys.argv[1]).resolve()
    scenario = sys.argv[2] if len(sys.argv) > 2 else None
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    print(json.dumps(run(directory, scenario), indent=1))
