# Demo scenarios — design

## Two artifacts, one scenario source

- `docs/demo-scenarios.md` — the presenter document, not yet written. Per scenario: research claim, setup (which suggestion chip or fresh thread), a numbered turn list (type this / click this), and the expected observable outcome per turn (canvas rows, cards, prices). Written against the running app.
- `agent/tests/test_scenarios.py` — the automated harness. Reuses the sequential-turn pattern proven in the [nonlinear-interaction](../nonlinear-interaction/design.md) offline smoke: feed `graph.invoke` the accumulated state plus one user message per turn, then assert on `result["configuration"]` and tool-message payloads.

The two stay aligned by construction: the harness encodes the same turns the document prescribes, and both cite the scenario numbering from requirements. Divergence between them is a spec bug (constitution #12).

## Robustness against LLM nondeterminism

Two turn classes:

- *Steering turns* (free-form English): assert only state invariants afterwards — e.g. "some choices recorded, none invalid, no part codes were needed", and after every turn the solver can still complete the current choices into a valid candidate (`complete` succeeds). That last invariant is [always show a valid whole](../../discovery/principles/always-show-a-valid-whole.md) made checkable at every moment, not just at the scenario's end. The agent may ask a clarifying question or call ask_choices; the harness answers via the structured grammar rather than failing.
- *State-critical turns*: dispatched as structured messages (`choiceMessage` / `repairMessage` / the draft-move grammar, mirrored in Python) so the expected tool call is near-deterministic. Postconditions assert exact choice sets, forced values, frame contents.

Assertions never match assistant prose. Where a scenario needs the *repairs payload* or *comparison payload*, the harness reads the ToolMessage JSON (kind: "repairs" / "draft_comparison") — solver-derived, stable.

This position is now measured rather than assumed. A scripted A/B over the [agent-tools](../agent-tools/design.md) prompt de-duplication ran prose assertions beside tool-call ones across two arms of eighteen conversations: the prose checks (options enumerated in text, a naming announced, prohibited vocabulary, an untraceable figure) passed identically on both sides and found nothing, while a tool-call assertion caught the one real regression — the agent recording a revision with `set_choices` instead of `revise_choices`, losing the repair cards. The one prose-adjacent check, whether an agent repeats a card's figures in text, produced only false positives, failing on both arms for the agent writing "15–30 m travel band" in ordinary explanation.

*One thing that looks like a prose assertion and is not.* The canvas-edit rule specifies silence: on a clean apply the agent's text must be empty. Asserting `text == ""` tests presence against absence, not wording, so it survives every rewording the spec's own rule survives. Assertions of that shape are allowed; assertions about what the text *says* are not.

## Keeping scripts aligned with the model

Scenario expectations reference the product model through `load_model` (labels, prices, cheapest completions computed live), not literal copies. The one deliberate exception: scenario 2 pins the modernization/3.0 m/s rule chain (R03/R04/R27/R28) because that scenario *is about* those rules; if the model drops them, the scenario should fail loudly. Scenario 4 similarly pins the shaft option behind "1800 by 1700" (`t1_1800x1700`) — the unusual-entry turn is about that mapping existing.

The footprint-delta assertion in scenario 3 is deferred, not dropped: the [environmental-footprint spec](../environmental-footprint/requirements.md) is a draft, so the harness asserts the price half of the pair now and gains the footprint half in the change that implements it. Landing footprint without extending scenario 3 is a spec bug.

## Where the scenarios live

The design above put the harness in `agent/tests/test_scenarios.py`. Built shape, and the reason it moved: scenario definitions and their assertions live in `agent/tests/scenario_runner.py`, and `test_scenarios.py` is a thin pytest wrapper — one test per scenario that runs a definition and asserts every check passed. Comparison mode needs the same definitions without pytest and against a checkout that may not contain them, so they cannot live in a test module. `scenario_runner.py` loads its own siblings by file path for the same reason: the tree under test goes first on `sys.path`, which is right for `main` and `src` and wrong for the harness's own code.

Assertions are recorded rather than raised — `Checks.that(name, passed, detail)` — so one run reports every outcome instead of stopping at the first failure. The pytest wrapper turns the collected failures into one assertion error; comparison mode joins them by name across arms.

`load_agent` is once-per-process by design: it chdirs, prepends to `sys.path`, and claims a temp store, all of which are process-global and all of which are guarded so a second call is a no-op rather than a second chdir. Adding scenarios means adding definitions and thin wrappers, never a second `load_agent` per test expecting a fresh environment — every scenario in one process shares the store and the graph, and gets its isolation from a fresh `Conversation` (its own workspace and thread id) instead.

Both commands assume `agent/` as the working directory, matching the rest of the Python tooling.

## Comparison mode

The same scenarios, two trees, one report. A ref is materialized with `git worktree add` into a temp directory and driven in a subprocess with that tree first on `sys.path`, because both trees define `main` and `src.configuration` and a single process cannot import both. Each subprocess emits its per-assertion outcomes as JSON; the parent joins them by scenario and assertion name. Everything the arms do not share is a confound, so the arms run *sequentially* — a parallel first attempt at this put both arms over the account's tokens-per-minute ceiling and lost ten conversations from one arm and eight from the other, leaving two columns scored over different surviving subsets.

Rate limits are therefore treated as a first-class failure: retry with exponential backoff, and if a conversation still cannot complete, fail the run naming the scenario. The turn cost makes this a routine risk rather than bad luck: `describe_product` puts the whole catalog in the transcript, so a single conversational turn costs ~16k prompt tokens and a six-scenario sweep runs to roughly half a million.

## Isolation

`workspace_store` computed its directory from `__file__`, so a harness run landed in `agent/data/workspaces` beside the developer's own agreements — the prototype run for the A/B above wrote 61 records there. The store gained `data_dir()`, honouring `WORKSPACE_STORE_DIR`, which the harness points at a temp directory; the frontend and `langgraph dev` are unaffected because neither sets it.

*Resolved per call, never at import.* The first implementation read the variable into a module constant and still leaked a workspace into the real store: pytest imports every test module during collection, including the ones that touch the store, so `workspace_store` was already loaded by the time a scenario set the variable. The unit test that used to monkeypatch the constant now sets the environment variable, which exercises the real mechanism.

## Pytest wiring

`@pytest.mark.scenario` on the module; `pytest -m scenario` runs it, plain `uv run pytest` deselects it via `addopts = -m "not scenario"` in the pytest config. Module-level skip when OPENAI_API_KEY is missing (mirrors how the agent is invoked: `uv run --env-file ../.env pytest -m scenario`). Each scenario is one test function so failures name the broken demo.

## Built so far, and what is verified

The harness and scenario 2 are built; scenarios 1, 3, 4 and 5 and the presenter document are not — scenario 5 unblocked once [rfq-reconciliation](../rfq-reconciliation/requirements.md) was built. Scenario 2 came first because it is the flow a context change had already broken once ([agent-tools](../agent-tools/design.md), *revise over record*).

Verified 2026-08-14: `uv run pytest` runs 89 unit tests and deselects the scenario; `pytest -m scenario` passes scenario 2's ten assertions against the live agent in ~16s; `python tests/compare_refs.py HEAD` creates and cleans its worktree, runs both arms sequentially, and reports all ten assertions equal across the two trees — which reproduces, through the harness, the conclusion the throwaway A/B reached about the de-duplicated prompt.

Known gap: nothing here covers a whole conversation's arc. Every assertion is about a single move, so an agent that grew vaguer or more repetitive over twenty turns would pass. That remains a reading job against the presenter document.

## Renewal scenario mechanics

Scenario 4 cannot reload a browser; it simulates resumption the way the stack actually provides it: run scenario-3-like turns, capture the final `configuration`, then start a fresh invoke whose state carries only messages + that configuration (what LangGraph's checkpoint restores) and assert the what's-left answer used get_configuration and re-elicited nothing (no ask_choices for already-settled variables). The browser-side restore path stays covered by the [nonlinear-interaction](../nonlinear-interaction/design.md) verification and the presenter document.

The renewal turn that follows is the deliberate exercise of [configuration can start from any variable, in any order](../../discovery/principles/start-from-any-variable.md): the harness sends the free-form sentence "the shaft is 1800 by 1700" — not a structured message, because an unmediated entry point is what the scenario tests — then asserts a user-sourced choice landed on `shaft` (`t1_1800x1700`) and that no settled variable was re-asked. If the statement conflicts with the restored state, the repairs path is asserted exactly as in scenario 2; either way the turn is a revision, never a restart.
