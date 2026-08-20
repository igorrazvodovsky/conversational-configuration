"""Scenario harness: drives the real agent graph a turn at a time and reports
per-assertion outcomes (docs/specs/conversation-checks).

The scenarios themselves are discovery notes in docs/discovery/scenarios/; each
definition below plays one of them through and asserts what it claims.

Scenario definitions and assertions live here rather than in `test_scenarios.py`
so that comparison mode can run them against an *older* checkout of the agent:
this module is always the current one, and only `main` / `src.*` come from the
tree under test.

    python scenario_runner.py <agent_dir> [scenario_id]   # JSON on stdout
"""

import importlib.util
import json
import os
import re
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

    def __init__(self, ctx, thread_id, workspace_id=None, messages=None):
        agent, _model, empty_configuration, workspace_store = ctx
        self.ctx = ctx
        self.agent = agent
        self.store = workspace_store
        self.thread_id = thread_id
        if workspace_id is None:
            workspace_id = workspace_store.create_workspace(
                empty_configuration())["id"]
        self.said: list[str] = []
        self.state = {"messages": list(messages or []), **self.hydrate(workspace_id),
                      "workspace_id": workspace_id}

    def hydrate(self, workspace_id=None) -> dict:
        """What `use-workspace-attachment` seeds into agent state on attach: the
        current draft's configuration and the chrome mirrors beside it. The
        mirrors matter here because only a committing tool writes them, so a
        resumed conversation whose first turn only reads state would otherwise
        report no drafts at all — an artifact of the harness, not of the app.
        """
        record = self.store.get_workspace(
            workspace_id or self.state["workspace_id"])
        draft = self.store.current_draft(record)
        return {
            "configuration": draft["configuration"],
            "history": self.store.history_depths(record),
            "current_draft_id": draft["id"],
            "drafts": [{"id": d["id"], "name": d["name"],
                        "price": (d["configuration"].get("candidate") or {})
                        .get("price")}
                       for d in record["drafts"]],
        }

    def resume(self, thread_id: str) -> "Conversation":
        """A new session onto the same agreement, the way the stack provides
        one: a fresh thread whose state carries this transcript's messages and
        the configuration hydrated from the store (docs/specs/conversation-checks
        design, *renewal scenario mechanics*). The drafts come from the store
        rather than the checkpoint, so the workspace id is what carries them.
        """
        return Conversation(self.ctx, thread_id,
                            workspace_id=self.state["workspace_id"],
                            messages=self.state["messages"])

    def say(self, text: str) -> dict:
        """Send one user message; return what the agent did with it."""
        self.said.append(text)
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
        # `drafts` and `current_draft_id` are mirrors on the state root, not
        # inside the configuration — the chrome the canvas head renders from
        # (docs/specs/parallel-drafts), and the only place a scenario can read
        # the name the agent gave a fork.
        return {"calls": calls, "results": results, "text": "\n".join(texts),
                "configuration": self.state["configuration"],
                "drafts": self.state.get("drafts") or [],
                "current_draft_id": self.state.get("current_draft_id")}

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


def agreement(turn) -> tuple[dict[str, str], dict | None]:
    """What the customer would see moved: the recorded choices *and* the priced
    whole beside them. Asserting on choices alone missed a real regression —
    an abandon answered with undo_change left every choice in place and threw
    the candidate away, price and all (docs/specs/conversation-checks)."""
    candidate = turn["configuration"].get("candidate")
    return chosen(turn), candidate and {
        "price": candidate["price"], "assignment": candidate["assignment"]}


def sources(turn) -> dict[str, str]:
    return {v: c["source"] for v, c in turn["configuration"]["choices"].items()}


def called(turn, name: str) -> list[dict]:
    return [call["args"] for call in turn["calls"] if call["name"] == name]


def asked_about(turn) -> set[str]:
    """Every variable the agent put a control in front of the customer for."""
    out = set()
    for args in called(turn, "ask_choices"):
        out |= set(args.get("variables") or [])
    return out


def _completable(choices: dict[str, str]) -> bool:
    """[always show a valid whole] made checkable: whatever the conversation
    has recorded, the solver can still extend it to a full valid agreement."""
    from src.configuration import SOLVER
    try:
        SOLVER.complete(choices, "price")
        return True
    except Exception:
        return False


# -- needs, not nomenclature -----------------------------------------------
# docs/discovery/scenarios/needs-not-nomenclature.md. Every user turn is prose: the scenario's own claim is that
# the customer never types a variable name or an option code, so the structured
# grammar — which spells both — is barred from it, setup included.


def scenario_needs_not_nomenclature(ctx) -> Checks:
    agent, MODEL, empty_configuration, workspace_store = ctx
    c = Checks()
    convo = Conversation(ctx, "scenario-needs")

    turn = convo.say(
        "We're planning a new wing for a district hospital in Germany. The "
        "lift serves the ward block — six floors above ground, about twenty "
        "metres from the bottom landing to the top one, and it has to take a "
        "bed with a nurse walking either side of it. It runs all day and it "
        "has to be usable by patients on their own.")
    c.that("needs_turn_recorded_something", bool(chosen(turn)),
           f"choices after the needs turn: {chosen(turn)}")
    c.that("needs_turn_stays_completable", _completable(chosen(turn)),
           "the solver could not complete what the needs turn recorded")

    # Hand the finishes to the agent, so there is an agent-picked value to
    # override later — [the agent proposes and the user decides] needs a
    # proposal before it can have a decision.
    turn = convo.say(
        "You choose the cabin — the wall finish and the floor — whatever "
        "suits a ward block that gets cleaned every night.")
    picked = {v: s for v, s in sources(turn).items() if s == "agent"}
    c.that("agent_picked_the_cabin", "wall_finish" in picked,
           f"agent-sourced choices: {sorted(picked)}")

    turn = convo.say("That's fine. Put the whole agreement together for us.")
    candidate = turn["configuration"]["candidate"]
    c.that("candidate_produced", candidate is not None, "no candidate stored")
    if candidate:
        c.that("candidate_is_priced", bool(candidate.get("price")),
               f"price: {candidate.get('price')}")
        assignment = candidate["assignment"]
        # The hospital cascade, read off the priced whole rather than the
        # recorded choices: R15 (bed-depth car), R16 (stretcher doors), R17
        # (accessibility). Which values satisfy them is asked of the model, not
        # copied from it.
        bed_cars = {o.value for o in MODEL.variables["car_size"].options
                    if _depth_mm(o.value) >= 2300}
        c.that("cascade_forces_a_bed_car",
               assignment.get("car_size") in bed_cars,
               f"car_size: {assignment.get('car_size')}, bed-depth cars: "
               f"{sorted(bed_cars)}")
        c.that("cascade_forces_accessibility",
               assignment.get("accessibility") not in (None, "none"),
               f"accessibility: {assignment.get('accessibility')}")
        c.that("cascade_forces_wide_doors",
               _width_mm(assignment.get("door_width", "d0")) >= 1100,
               f"door_width: {assignment.get('door_width')}")

    c.that("every_choice_carries_a_source",
           all(s in ("user", "agent", "document")
               for s in sources(turn).values()),
           f"sources: {sources(turn)}")

    # The override: one turn, in the customer's words, against whatever the
    # agent picked — and a value the rules still allow, so the turn tests the
    # override rather than the solver's refusal.
    before = chosen(turn)
    target = _other_valid_value(MODEL, before, "wall_finish")
    if not c.that("an_alternative_wall_finish_exists", target is not None,
                  f"wall_finish was {before.get('wall_finish')}"):
        return c
    turn = convo.say(
        f"One change: the car walls should be {_option_label(MODEL, 'wall_finish', target).lower()}.")
    after = chosen(turn)
    c.that("override_took_one_turn", after.get("wall_finish") == target,
           f"wall_finish: {before.get('wall_finish')} -> {after.get('wall_finish')}, "
           f"asked for {target}")
    c.that("override_changed_nothing_else",
           {v: val for v, val in after.items() if v != "wall_finish"}
           == {v: val for v, val in before.items() if v != "wall_finish"},
           f"{before} -> {after}")
    c.that("override_is_user_sourced", sources(turn).get("wall_finish") == "user",
           f"source: {sources(turn).get('wall_finish')}")

    # The scenario's own claim, checked over every user turn at once and
    # against the live model rather than a list of codes written down here.
    leaked = sorted({f"{word} in turn {i + 1}"
                     for word in _internal_vocabulary(MODEL)
                     for i, text in enumerate(convo.said)
                     if re.search(rf"(?<![\w.]){re.escape(word)}(?![\w])",
                                  text, re.IGNORECASE)})
    c.that("no_user_turn_named_a_variable_or_a_code", not leaked,
           f"leaked into the customer's words: {leaked}")
    return c


def _internal_vocabulary(MODEL) -> set[str]:
    """The model's names for things that the customer has no way to arrive at.

    Not every code is one: `hospital` and `laminate` are the words on their own
    labels, and a customer saying them is speaking the building's vocabulary,
    which is the point rather than a violation of it. A code the customer could
    not have read off a label — `brushed_ss`, `kg1600`, `t1_1800x1700`,
    `car_size` — is the thing this scenario claims never has to be typed, so
    the test is whether the token is a word of the label it belongs to.
    """
    def opaque(token: str, label: str) -> bool:
        return not re.search(rf"(?<![\w.]){re.escape(token)}(?![\w])",
                             label, re.IGNORECASE)

    # A token is judged over every label it appears under, not the first: the
    # value `none` is the whole of "None" on one variable and buried in "No
    # fire rating" on another, and one opaque use must not make the word
    # itself off limits.
    opaque_tokens, transparent = set(), set()
    for name, var in MODEL.variables.items():
        for token, label in ([(name, var.label)]
                             + [(o.value, o.label) for o in var.options]):
            (opaque_tokens if opaque(token, label) else transparent).add(token)
    return opaque_tokens - transparent


def _depth_mm(car_size: str) -> int:
    """The depth half of a c<width>x<depth> car code. The scenario asserts the
    hospital cascade in millimetres because that is what R15 is about."""
    return int(car_size.split("x")[-1])


def _width_mm(door_width: str) -> int:
    return int(door_width.lstrip("d") or 0)


def _option_label(MODEL, variable: str, value: str) -> str:
    return next(o.label for o in MODEL.variables[variable].options
                if o.value == value)


def _other_valid_value(MODEL, choices: dict[str, str], variable: str):
    """A different value of `variable` the rules still allow beside everything
    else recorded — so an override turn is about the override."""
    current = choices.get(variable)
    for option in MODEL.variables[variable].options:
        if option.value == current:
            continue
        if _completable({**choices, variable: option.value}):
            return option.value
    return None


# -- mid-contract revision -------------------------------------------------
# docs/discovery/scenarios/mid-contract-revision.md. Deliberately the first one
# implemented: it is the flow a prompt change already broke once, when the
# agent recorded a revision with set_choices and the repair cards never
# appeared (docs/specs/agent-tools design, *revise over record*).

def scenario_mid_contract_revision(ctx) -> Checks:
    agent, MODEL, empty_configuration, workspace_store = ctx
    c = Checks()
    convo = Conversation(ctx, "scenario-revision")

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

    # Abandon leaves the agreement exactly as it was — the priced whole
    # included, and with no state-changing tool called at all.
    before = agreement(turn)
    turn = convo.say(grammar.ABANDON_MESSAGE)
    c.that("abandon_changes_nothing", agreement(turn) == before,
           f"{before[0]} -> {agreement(turn)[0]}, "
           f"candidate {before[1] and before[1]['price']} -> "
           f"{agreement(turn)[1] and agreement(turn)[1]['price']}")
    moved = [name for name in ("undo_change", "redo_change", "set_choices",
                               "revise_choices", "clear_choices",
                               "propose_completion")
             if called(turn, name)]
    c.that("abandon_calls_no_state_tool", not moved, f"called: {moved}")

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


# -- the shared office setup ----------------------------------------------
# Comparing agreements and renewal as revision both need an agreement that exists before their own move
# begins. Both build it the same way and state-critically, so neither spends
# assertions on getting there.

def _office_essentials(rated_load: str) -> list[tuple[str, str]]:
    """The rated load is the parameter because it is the one variable the two
    scenarios need to differ on: R01 and R02 tie load to car and car to shaft,
    so it decides whether the renewal's bare shaft statement lands or collides.
    """
    return [
        ("building_type", "office"), ("region", "europe"),
        ("installation", "new_build"), ("travel", "mid_15_30"),
        ("stops", "s7_12"), ("usage_profile", "medium"),
        ("rated_load", rated_load),
    ]


PREMIUM_DIRECTION = [
    ("service_level", "premium"), ("connectivity_package", "connected"),
    ("energy_package", "regen"), ("wall_finish", "brushed_ss"),
]


def _priced_office(convo, MODEL, c, prefix: str, essentials) -> dict:
    """Record the essentials and price them. Returns the completion turn."""
    convo.say(grammar.choice_message(MODEL, essentials))
    turn = convo.say("That's the picture. Put the agreement together.")
    c.that(f"{prefix}_is_priced", bool((turn["configuration"]["candidate"] or {})
                                       .get("price")),
           f"candidate: {turn['configuration']['candidate']}")
    return turn


def _fork_name(turn, fallback_names: list[str]) -> str | None:
    """The name the agent gave the fork. Never guessed: the prompt forbids
    asking the customer for one and forbids announcing it, so the call's own
    argument is where it is written down."""
    for args in called(turn, "fork_draft"):
        if args.get("name"):
            return args["name"]
    fresh = [d["name"] for d in turn["drafts"]
             if d["name"] not in fallback_names]
    return fresh[0] if fresh else None


# -- comparing agreements --------------------------------------------------
# docs/discovery/scenarios/comparing-agreements.md. The turn order matters and is not incidental: a draft
# is compared by its stored candidate, and any edit after a completion drops
# it, so the premium draft has to be priced again before the comparison can
# see it at all.


def scenario_comparing_agreements(ctx) -> Checks:
    agent, MODEL, empty_configuration, workspace_store = ctx
    c = Checks()
    convo = Conversation(ctx, "scenario-drafts")
    original = workspace_store.current_draft(
        workspace_store.get_workspace(convo.state["workspace_id"]))["name"]

    turn = _priced_office(convo, MODEL, c, "practical_draft",
                          _office_essentials("kg1000"))
    practical = chosen(turn)
    practical_price = turn["configuration"]["candidate"]["price"]

    turn = convo.say("Keep this one as the practical option — I'd like to see "
                     "a premium version beside it without losing this.")
    c.that("fork_not_revision", "fork_draft" in [x["name"] for x in turn["calls"]],
           f"calls: {[x['name'] for x in turn['calls']]}")
    premium_name = _fork_name(turn, [original])
    if not c.that("the_fork_is_named", premium_name is not None,
                  f"drafts: {turn['drafts']}"):
        return c
    c.that("both_drafts_exist", len(turn["drafts"]) == 2,
           f"drafts: {[d['name'] for d in turn['drafts']]}")

    convo.say(grammar.choice_message(MODEL, PREMIUM_DIRECTION))
    turn = convo.say("Price this one too.")
    premium = chosen(turn)
    premium_sources = sources(turn)
    premium_price = turn["configuration"]["candidate"]["price"]

    turn = convo.say(grammar.compare_draft_message(original))
    comparison = payload(turn, "draft_comparison")
    if not c.that("comparison_payload_produced", comparison is not None,
                  "no draft_comparison payload"):
        return c

    c.that("each_side_named_by_its_draft",
           {comparison["a"]["name"], comparison["b"]["name"]}
           == {original, premium_name}
           and comparison["b"]["isCurrent"],
           f"a={comparison['a']['name']}, b={comparison['b']['name']}, "
           f"b is current: {comparison['b'].get('isCurrent')}")
    c.that("only_differing_variables_listed",
           all(d["a"]["value"] != d["b"]["value"]
               for d in comparison["differences"]),
           f"{len(comparison['differences'])} differences, "
           f"{[d['variable'] for d in comparison['differences'] if d['a']['value'] == d['b']['value']]} equal")
    c.that("price_delta_is_the_two_prices",
           comparison["priceDelta"]
           == comparison["b"]["price"] - comparison["a"]["price"]
           == premium_price - practical_price,
           f"delta {comparison['priceDelta']}, sides "
           f"{comparison['a']['price']}/{comparison['b']['price']}, "
           f"drafts {practical_price}/{premium_price}")

    # [trade-offs are shown as a pair]: the footprint delta stands beside the
    # price delta and is never folded into one score with it.
    fp_a = (comparison["a"] or {}).get("footprint")
    fp_b = (comparison["b"] or {}).get("footprint")
    c.that("footprint_delta_beside_the_price_delta",
           bool(fp_a and fp_b)
           and comparison["footprintDelta"] == fp_b["total"] - fp_a["total"],
           f"footprints {fp_a and fp_a.get('total')}/{fp_b and fp_b.get('total')}, "
           f"delta {comparison.get('footprintDelta')}")
    c.that("the_two_deltas_are_never_one_score",
           {"priceDelta", "footprintDelta"} <= set(comparison)
           and not [k for k in comparison
                    if "score" in k.lower() or "combined" in k.lower()],
           f"payload keys: {sorted(comparison)}")

    turn = convo.say(grammar.switch_draft_message(original))
    c.that("switch_restores_the_other_agreement", chosen(turn) == practical,
           f"{practical} -> {chosen(turn)}")

    # Whole, not a snapshot: the draft that is no longer current still holds
    # its own choices, who chose them, and its own history.
    record = workspace_store.get_workspace(convo.state["workspace_id"])
    aside = next((d for d in record["drafts"] if d["name"] == premium_name), None)
    if not c.that("the_other_draft_survives_the_switch", aside is not None,
                  f"drafts in store: {[d['name'] for d in record['drafts']]}"):
        return c
    kept = {v: ch["value"] for v, ch in aside["configuration"]["choices"].items()}
    c.that("it_keeps_its_own_choices", kept == premium,
           f"{premium} -> {kept}")
    # Not a type check: `adopt_frame` used to re-source a whole document to
    # `user` on the way across, and switching is what replaced it
    # (docs/specs/parallel-drafts). The comparison is against who chose what on
    # this draft before the switch, so that regression would fail here.
    c.that("it_keeps_its_own_sources",
           {v: ch["source"] for v, ch in aside["configuration"]["choices"].items()}
           == premium_sources,
           f"{premium_sources} -> "
           f"{ {v: ch['source'] for v, ch in aside['configuration']['choices'].items()} }")
    c.that("it_keeps_its_own_history", bool(aside["history"]["past"]),
           f"history depths: past {len(aside['history']['past'])}, "
           f"future {len(aside['history']['future'])}")
    return c


# -- renewal as revision ---------------------------------------------------
# docs/discovery/scenarios/renewal-as-revision.md.
# The browser cannot be reloaded here, so the session break is simulated the
# way the stack actually provides one — see `Conversation.resume`.


def scenario_renewal_as_revision(ctx) -> Checks:
    agent, MODEL, empty_configuration, workspace_store = ctx
    c = Checks()
    convo = Conversation(ctx, "scenario-renewal")
    original = workspace_store.current_draft(
        workspace_store.get_workspace(convo.state["workspace_id"]))["name"]

    # A 630 kg car so that the bare shaft statement below is a choice the
    # rules allow. Mid-contract revision is where a colliding revision is exercised;
    # this scenario is about an unmediated entry point landing on the right
    # variable at all, and a manufactured collision would test that instead.
    _priced_office(convo, MODEL, c, "yesterdays_agreement",
                   _office_essentials("kg630"))
    turn = convo.say("Before we stop — keep this and put a premium version on "
                     "a second draft, so we can look at both next time.")
    second = _fork_name(turn, [original])
    convo.say(grammar.choice_message(MODEL, PREMIUM_DIRECTION))
    convo.say("Price that one as well.")
    turn = convo.say(grammar.switch_draft_message(original))

    before = {"choices": turn["configuration"]["choices"],
              "statuses": turn["configuration"]["statuses"],
              "drafts": sorted(d["name"] for d in turn["drafts"])}
    settled = set(chosen(turn))

    # -- the interruption ---------------------------------------------------
    convo = convo.resume("scenario-renewal-next-day")
    # "What's left" is the question the transcript cannot answer: the undecided
    # list is computed from the agreement, and yesterday's conversation never
    # stated it. Asking only "where were we?" is answered from the restored
    # messages, which the checkpoint carries too — a true answer, and not the
    # one this criterion is about.
    turn = convo.say("Where were we, and what's still open on this one?")
    names = [x["name"] for x in turn["calls"]]
    c.that("whats_left_comes_from_state", "get_configuration" in names,
           f"calls: {names}")
    c.that("restored_choices_equal_the_interrupted_state",
           turn["configuration"]["choices"] == before["choices"],
           f"{before['choices']} -> {turn['configuration']['choices']}")
    c.that("restored_statuses_equal_the_interrupted_state",
           turn["configuration"]["statuses"] == before["statuses"],
           "statuses differ after the resume")
    c.that("restored_drafts_equal_the_interrupted_state",
           sorted(d["name"] for d in turn["drafts"]) == before["drafts"],
           f"{before['drafts']} -> {sorted(d['name'] for d in turn['drafts'])} "
           f"(the second draft was named {second!r})")
    c.that("nothing_settled_is_re_elicited", not (asked_about(turn) & settled),
           f"re-asked: {sorted(asked_about(turn) & settled)}")

    # -- the unusual entry point --------------------------------------------
    # A bare dimension statement, free-form on purpose: an unmediated entry is
    # what [configuration can start from any variable, in any order] claims,
    # and the structured grammar would mediate it. Against this agreement the
    # statement collides (R01/R02 put a 1000 kg car in a wider shaft), so the
    # turn is a revision with repairs — never a restart either way.
    turn = convo.say("The shaft is 1800 by 1700.")
    repairs = payload(turn, "repairs")
    landed = chosen(turn).get("shaft") == "t1_1800x1700"
    c.that("the_bare_statement_lands_on_the_shaft",
           landed or repairs is not None,
           f"shaft: {chosen(turn).get('shaft')}, repairs: {repairs is not None}, "
           f"calls: {[x['name'] for x in turn['calls']]}")
    c.that("the_statement_is_a_revision_not_a_restart",
           set(chosen(turn)) >= settled - {"shaft", "rated_load"},
           f"settled {sorted(settled)}, now {sorted(chosen(turn))}")
    c.that("nothing_settled_is_re_elicited_after_the_statement",
           not (asked_about(turn) & settled),
           f"re-asked: {sorted(asked_about(turn) & settled)}")

    if repairs:
        c.that("the_collision_names_its_rules",
               all(option["rules"] for option in repairs["repairs"]),
               f"rules per option: {[len(o['rules']) for o in repairs['repairs']]}")
        top = repairs["repairs"][0]
        turn = convo.say(grammar.repair_message(
            MODEL,
            drop=[(d["variable"], d["value"]) for d in top["drop"]],
            changes=[(ch["variable"], ch["value"]) for ch in repairs["changes"]]))
        c.that("the_repaired_agreement_carries_the_shaft",
               chosen(turn).get("shaft") == "t1_1800x1700",
               f"shaft: {chosen(turn).get('shaft')}")
    c.that("the_shaft_is_the_customers_own_choice",
           sources(turn).get("shaft") == "user",
           f"source: {sources(turn).get('shaft')}")
    c.that("the_agreement_is_still_completable", _completable(chosen(turn)),
           f"choices: {chosen(turn)}")
    return c


# -- tender as entrance ----------------------------------------------------
# docs/discovery/scenarios/tender-as-entrance.md. The fixture is loaded from beside the harness rather
# than from the tree under test, so both arms of a comparison ingest the same
# document even if one of them predates the fixture.

RFQ_FIXTURE = _HERE.parent / "fixtures" / "rfq" / "office-tower-modernization.txt"


def scenario_tender_as_entrance(ctx) -> Checks:
    agent, MODEL, empty_configuration, workspace_store = ctx
    from src.configuration import SOLVER
    c = Checks()
    convo = Conversation(ctx, "scenario-tender")

    turn = convo.say(
        "We've issued an RFQ for the lift package. Here it is in full — can "
        "you tell me what you can do against it?\n\n"
        + RFQ_FIXTURE.read_text())

    c.that("the_document_is_ingested_once",
           len(called(turn, "ingest_rfq")) == 1,
           f"ingest_rfq calls: {len(called(turn, 'ingest_rfq'))}, "
           f"all calls: {[x['name'] for x in turn['calls']]}")
    # Controls do appear on this turn, and correctly: the deviations are what
    # the agent puts in front of the customer. What must not appear is a
    # question about something the document already settled.
    c.that("nothing_the_document_settled_is_asked_again",
           not (asked_about(turn) & set(chosen(turn))),
           f"asked about: {sorted(asked_about(turn))}, "
           f"settled: {sorted(chosen(turn))}")

    rfq = turn["configuration"].get("rfq")
    if not c.that("the_agreement_is_seeded_from_the_document", bool(rfq),
                  "no rfq on the configuration"):
        return c

    c.that("every_seeded_choice_is_document_sourced",
           set(sources(turn).values()) == {"document"},
           f"sources: {sources(turn)}")
    c.that("every_requirement_carries_its_clause",
           all(r["clause"] and r["quote"] for r in rfq["requirements"]),
           f"clauseless: {[r['variable'] for r in rfq['requirements'] if not r['clause']]}")

    candidate = turn["configuration"]["candidate"]
    c.that("the_seed_is_a_priced_valid_whole",
           bool(candidate) and _completable(chosen(turn)),
           f"candidate: {bool(candidate)}, choices: {chosen(turn)}")

    # The register is the solver's partition of what the agent read, not the
    # agent's own account of what it could meet. Re-seeding the recorded
    # requirements has to reproduce it exactly.
    requested = [(r["variable"], r["value"]) for r in rfq["requirements"]]
    seeded = SOLVER.seed(requested)
    c.that("the_register_is_the_solvers_partition",
           chosen(turn) == dict(seeded.kept),
           f"recorded {chosen(turn)}, solver kept {dict(seeded.kept)}")
    # Two claims, deliberately separated. That the fixture cannot be satisfied
    # whole is a property of the document and the rules — clause 1.2 keeps the
    # existing shaft, clause 3.1 asks 3.0 m/s, and R04 with R28 will not have
    # both. That the register shows it is a claim about what the agent read out
    # of the document. Separated so a failure says which one moved: a run where
    # the agent simply never mapped one of the two clauses is an extraction
    # miss, not a model change, and reads as one here.
    read = {(r["variable"], r["value"]) for r in rfq["requirements"]}
    conflicting = {("installation", "modernization"), ("rated_speed", "mps3_0")}
    c.that("the_conflicting_clauses_were_read", conflicting <= read,
           f"missing from the register: {sorted(conflicting - read)}; "
           f"read: {sorted(read)}")
    c.that("the_document_is_over_constrained", bool(seeded.deviations),
           f"deviations: {[d.variable for d in seeded.deviations]}, "
           f"over requirements: {sorted(read)}")
    c.that("every_deviation_names_its_rules",
           all(d.rules for d in seeded.deviations),
           f"ruleless: {[d.variable for d in seeded.deviations if not d.rules]}")
    if not seeded.deviations:
        return c

    # -- accept one deviation's offered value -------------------------------
    accepted = seeded.deviations[0]
    turn = convo.say(grammar.accept_offered_message(
        MODEL, accepted.variable, accepted.offered))
    moves = called(turn, "reconcile_requirement")
    c.that("accepting_is_one_reconcile_call",
           [m.get("move") for m in moves] == ["accept"]
           and moves[0].get("variable") == accepted.variable,
           f"calls: {moves}")
    waived = [r for r in (turn["configuration"].get("rfq") or {}).get("requirements", [])
              if r["variable"] == accepted.variable]
    c.that("the_accepted_requirement_is_waived_not_dropped",
           bool(waived) and all(r["reconciliation"] == "waived" for r in waived),
           f"entries on {accepted.variable}: "
           f"{[(r['clause'], r['reconciliation']) for r in waived]}")

    # -- revise another requirement, through the ordinary repair flow -------
    # A requirement, not necessarily a deviation: the customer changing their
    # own mind about a clause the agreement already meets is the same move on
    # the same path, and this document deviates on too few variables to pick a
    # second one from.
    revisable, target = _revisable_requirement(
        MODEL, turn["configuration"]["rfq"], chosen(turn), skip=accepted.variable)
    if c.that("a_revisable_requirement_exists", target is not None,
              "no requirement in the register has an alternative value"):
        turn = convo.say(grammar.revise_requirement_message(
            MODEL, revisable, target))
        moves = called(turn, "reconcile_requirement")
        repairs = payload(turn, "repairs")
        c.that("revising_is_one_reconcile_call",
               [m.get("move") for m in moves] == ["revise"],
               f"calls: {moves}")
        c.that("the_revision_lands_or_offers_repairs",
               chosen(turn).get(revisable) == target or repairs is not None,
               f"{revisable}: {chosen(turn).get(revisable)}, "
               f"asked {target}, repairs: {repairs is not None}")
        if repairs:
            top = repairs["repairs"][0]
            turn = convo.say(grammar.repair_message(
                MODEL,
                drop=[(d["variable"], d["value"]) for d in top["drop"]],
                changes=[(ch["variable"], ch["value"])
                         for ch in repairs["changes"]]))
            c.that("the_repaired_agreement_carries_the_revision",
                   chosen(turn).get(revisable) == target,
                   f"{revisable}: {chosen(turn).get(revisable)}")

    # -- the gaps, and the closing state ------------------------------------
    settled = set(chosen(turn))
    turn = convo.say("What's still open at your end?")
    c.that("gap_questions_are_only_about_gaps",
           not (asked_about(turn) & settled),
           f"re-asked what the document settled: "
           f"{sorted(asked_about(turn) & settled)}")
    state = "\n".join(turn["results"])
    c.that("the_waived_requirement_is_still_in_the_state_summary",
           "waived" in state.lower(),
           f"no waived entry in the state the agent read: {state[:400]}")
    c.that("the_agreement_is_still_completable", _completable(chosen(turn)),
           f"choices: {chosen(turn)}")
    return c


def _revisable_requirement(MODEL, rfq, choices, skip):
    """A requirement of the document the customer could change their mind
    about, and a value to change it to. Prefers one the rules still allow, so
    the turn is about the reconciliation move; falls back to any alternative,
    which reaches the same tool through its repair path."""
    fallback = (None, None)
    for r in rfq["requirements"]:
        variable = r["variable"]
        if variable == skip or variable not in choices:
            continue
        target = _other_valid_value(MODEL, choices, variable)
        if target:
            return variable, target
        other = next((o.value for o in MODEL.variables[variable].options
                      if o.value != choices[variable]), None)
        if other and fallback == (None, None):
            fallback = (variable, other)
    return fallback


SCENARIOS = {
    "needs_not_nomenclature": scenario_needs_not_nomenclature,
    "mid_contract_revision": scenario_mid_contract_revision,
    "comparing_agreements": scenario_comparing_agreements,
    "renewal_as_revision": scenario_renewal_as_revision,
    "tender_as_entrance": scenario_tender_as_entrance,
}


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
