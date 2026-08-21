# Conversation checks — design

## What runs what

The five scenarios are discovery notes in [docs/discovery/scenarios/](../../discovery/scenarios/). Each becomes two things, and this spec owns one of them.

- `agent/tests/scenario_runner.py` is the harness that runs them. It reuses the sequential-turn pattern proven in the [nonlinear-interaction](../nonlinear-interaction/design.md) offline smoke: feed `graph.invoke` the accumulated state plus one user message per turn, then assert on `result["configuration"]`, the tool calls, and tool-message payloads. `agent/tests/test_scenarios.py` is a thin pytest wrapper, one test per scenario.
- `docs/demo-scenarios.md` is the presenter document, which isn't specified here. Per scenario it gives the claim, the setup, a numbered turn list, and the observable outcome per turn.

Both encode the walkthrough their scenario note prescribes, so they stay aligned through it rather than to each other. A disagreement between the three is a bug in whichever two have drifted (constitution #12).

The division of labour between them is the checking-versus-testing one, and it is why the presenter document survives the harness existing. A check applies a decision rule to an observation. A person walking the same scenario is doing something else, and the known gap recorded at the end of this document — an agent that grew vaguer over twenty turns — is precisely the part no decision rule reaches.

## Robustness against LLM nondeterminism

There are two turn classes.

- *Steering turns*, in free-form English, assert only state invariants afterwards: some choices recorded, none invalid, and after every turn the solver can still complete the current choices into a valid candidate, meaning `complete` succeeds. That last invariant is [always show a valid whole](../../discovery/principles/always-show-a-valid-whole.md) made checkable at every moment rather than only at the scenario's end. The agent may ask a clarifying question or call `ask_choices`, and the harness answers through the structured grammar rather than failing.
- *State-critical turns* are dispatched as structured messages — `choice_message`, `repair_message`, and the draft-move and reconciliation grammar, mirrored in Python in `scenario_grammar.py` — so the expected tool call is near-deterministic. Postconditions assert exact choice sets, forced values and payload contents.

Assertions never match assistant prose. Where a scenario needs the repairs payload or the comparison payload, the harness reads the ToolMessage JSON, of kind `repairs` or `draft_comparison`, which is solver-derived and stable.

This position is measured rather than assumed. A scripted A/B over the [agent-tools](../agent-tools/design.md) prompt de-duplication ran prose assertions beside tool-call ones across two arms of eighteen conversations. The prose checks — options enumerated in text, a naming announced, prohibited vocabulary, an untraceable figure — passed identically on both sides and found nothing, while a tool-call assertion caught the one real regression: the agent recording a revision with `set_choices` instead of `revise_choices`, losing the repair cards. The one prose-adjacent check, whether an agent repeats a card's figures in text, produced only false positives, failing on both arms because the agent wrote "15–30 m travel band" in ordinary explanation.

*[Needs, not nomenclature](../../discovery/scenarios/needs-not-nomenclature.md) is barred from the structured grammar, setup included.* The policy for steering turns answers an `ask_choices` through `choice_message`, which spells the variable name and the option code, and that scenario's own claim is that no user turn contains either. So it steers in prose throughout and pays for it in determinism. It is the one place where the harness can't fall back on the validated path, and the claim it buys is checked over every turn at once, against the live model rather than a list of codes written into the test.

Not every code counts as one. `hospital` and `laminate` are the words on their own labels, and a customer saying them is speaking the building's vocabulary, which is what the scenario is *for*. `brushed_ss`, `kg1600`, `t1_1800x1700` and `car_size` are names the customer has no way to arrive at. `_internal_vocabulary` draws the line by asking whether the token appears in the label it belongs to, judged over every label it appears under: the value `none` is the whole of "None" on one variable and buried in "No fire rating" on another, and one opaque use must not put the English word off limits.

*One thing looks like a prose assertion and isn't.* The canvas-edit rule specifies silence: on a clean apply the agent's text has to be empty. Asserting `text == ""` tests presence against absence rather than wording, so it survives every rewording the spec's own rule survives. Assertions of that shape are allowed; assertions about what the text *says* aren't.

## What the scenarios share, and where they deliberately differ

[Comparing agreements](../../discovery/scenarios/comparing-agreements.md) and [renewal as revision](../../discovery/scenarios/renewal-as-revision.md) both need a priced office agreement before their own move begins, and both build it state-critically through `choice_message` so neither spends assertions on getting there. They differ in one variable, and the reason is worth stating because it looks arbitrary: the rated load. R01 ties load to car size and R02 ties car size to shaft, so the load decides whether the renewal's bare "the shaft is 1800 by 1700" lands or collides. The renewal uses 630 kg so that it lands.

A 1000 kg car makes the statement collide, and the collision is instructive. The agent records it with `set_choices` rather than `revise_choices`, because the shaft wasn't previously decided, and a conflicting `set_choices` is refused with its rules rather than answered with repair options. That is correct against the built tool contract, where repairs belong to revisions ([nonlinear-interaction](../nonlinear-interaction/design.md)), and it is a dead end the customer has to be talked out of. Manufacturing that collision here would test the tool contract instead of what the renewal scenario is for, which is an unmediated entry point landing on the right variable at all, and [mid-contract revision](../../discovery/scenarios/mid-contract-revision.md) already exercises the repair path from a revision. The conditional branch stays in the scenario, so a model change that makes the statement collide is still asserted rather than skipped.

## Keeping scripts aligned with the model

Scenario expectations reference the product model through `load_model` — labels, prices and cheapest completions computed live — rather than literal copies. There are two deliberate exceptions, both where a scenario *is about* the thing pinned. Mid-contract revision pins the modernization and 3.0 m/s rule chain, R03, R04, R27 and R28. Renewal as revision pins the shaft option behind "1800 by 1700", `t1_1800x1700`, because the unusual-entry turn is about that mapping existing. If the model drops either, the scenario should fail loudly.

Comparing agreements asserts both halves of the pair: the price delta against the two drafts' own candidate prices, the footprint delta against the two sides' stored totals, and that the payload carries no key combining them. [Environmental footprint](../environmental-footprint/requirements.md) is built, so the deferral that once stood here is discharged.

## Where the scenarios live

The original design put the harness in `agent/tests/test_scenarios.py`. In the built shape, scenario definitions and their assertions live in `agent/tests/scenario_runner.py`, and `test_scenarios.py` is a thin pytest wrapper, one test per scenario that runs a definition and asserts every check passed. Comparison mode needs the same definitions without pytest and against a checkout that may not contain them, so they can't live in a test module. `scenario_runner.py` loads its own siblings by file path for the same reason: the tree under test goes first on `sys.path`, which is right for `main` and `src` and wrong for the harness's own code. The RFQ fixture is read from beside the harness rather than from the tree under test, so both arms of a comparison ingest the same document even if one of them predates the fixture.

Assertions are recorded rather than raised, through `Checks.that(name, passed, detail)`, so one run reports every outcome instead of stopping at the first failure. The pytest wrapper turns the collected failures into one assertion error, and comparison mode joins them by name across arms.

`load_agent` is once-per-process by design. It chdirs, prepends to `sys.path`, and claims a temp store, all of which are process-global and all of which are guarded so a second call is a no-op rather than a second chdir. Adding scenarios means adding definitions and thin wrappers, never a second `load_agent` per test expecting a fresh environment. Every scenario in one process shares the store and the graph, and gets its isolation from a fresh `Conversation`, with its own workspace and thread id.

Both commands assume `agent/` as the working directory, matching the rest of the Python tooling.

## Comparison mode

The same scenarios, two trees, one report. A ref is materialized with `git worktree add` into a temp directory and driven in a subprocess with that tree first on `sys.path`, because both trees define `main` and `src.configuration` and a single process can't import both. Each subprocess emits its per-assertion outcomes as JSON, and the parent joins them by scenario and assertion name.

Everything the arms don't share is a confound, so the arms run *sequentially*. A parallel first attempt put both arms over the account's tokens-per-minute ceiling and lost ten conversations from one arm and eight from the other, leaving two columns scored over different surviving subsets.

Rate limits are therefore treated as a first-class failure: retry with exponential backoff, and if a conversation still can't complete, fail the run naming the scenario. The turn cost makes this a routine risk rather than bad luck, because `describe_product` puts the whole catalog in the transcript, so a single conversational turn costs about 16k prompt tokens and a full sweep of one arm runs to several hundred thousand.

A scenario can report nothing on one side — the older tree doesn't define it, or it stopped before its first check — so the report guards the column-width computation rather than ending in a traceback over an empty set of keys.

## Isolation

`workspace_store` computed its directory from `__file__`, so a harness run landed in `agent/data/workspaces` beside the developer's own agreements: the prototype run for the A/B wrote 61 records there. The store gained `data_dir()`, honouring `WORKSPACE_STORE_DIR`, which the harness points at a temp directory. The frontend and `langgraph dev` are unaffected, because neither sets it.

*It is resolved per call, never at import.* The first implementation read the variable into a module constant and still leaked a workspace into the real store: pytest imports every test module during collection, including the ones that touch the store, so `workspace_store` was already loaded by the time a scenario set the variable. The unit test that used to monkeypatch the constant sets the environment variable instead, which exercises the real mechanism.

## Pytest wiring

The module carries `@pytest.mark.scenario`. `pytest -m scenario` runs it, and plain `uv run pytest` deselects it through `addopts = -m "not scenario"` in the pytest config. A module-level skip fires when `OPENAI_API_KEY` is missing, mirroring how the agent is invoked: `uv run --env-file ../.env pytest -m scenario`. Each scenario is one test function, so failures name the broken demo.

## Renewal scenario mechanics

[Renewal as revision](../../discovery/scenarios/renewal-as-revision.md) can't reload a browser, so it simulates resumption the way the stack actually provides it. `Conversation.resume` opens a fresh thread carrying this transcript's messages and rehydrates from the *store* rather than from the captured state, which is what `use-workspace-attachment` does on attach, and it has to include the chrome mirrors as well as the configuration. Only a committing tool writes `drafts` and `current_draft_id`, so a resumed conversation whose first turn merely reads state would report no drafts at all. That is an artifact of the harness rather than a fact about the app, and seeding them is what removes it. The browser-side restore path stays covered by the [nonlinear-interaction](../nonlinear-interaction/design.md) verification and the presenter document.

The resumption turn asks two things — "where were we, and what's still open on this one?" — and the second half is what carries the assertion. Asking only where things stood is answered from the restored messages, truthfully and without a tool call, because the checkpoint carries the transcript too. What is still *open* is the undecided list, computed from the agreement and never stated in the conversation, so it can only come from `get_configuration`. The criterion is that the answer derives from state, and the question has to be one the transcript can't answer for that to be worth asserting.

## What is built, and what is verified

All five scenarios are built, and the presenter document with them. Mid-contract revision came first, because it is the flow a context change had already broken once ([agent-tools](../agent-tools/design.md), *revise over record*). Tender as entrance waited on [rfq-reconciliation](../rfq-reconciliation/requirements.md), and the footprint half of comparing agreements on [environmental-footprint](../environmental-footprint/requirements.md).

Verified 2026-08-19: `uv run pytest` passes the unit suite and deselects the scenarios, and `uv run --env-file ../.env pytest -m scenario` passes all five against the live agent in one process, in a little over two minutes. Comparison mode was verified against one scenario on 2026-08-14 — `python tests/compare_refs.py HEAD` creates and cleans its worktree, runs both arms sequentially, and reported every assertion equal across the two trees, reproducing through the harness the conclusion the throwaway A/B reached about the de-duplicated prompt. Its mechanics didn't change with the four scenarios added since, so it wasn't re-run over the full sweep, which costs five times as much per arm.

*The tender check is deliberately sensitive to extraction, and says so when it fires.* Whether the office-tower fixture is over-constrained is a property of the document and the rules; whether the register shows it is a claim about what the agent read. The two are asserted separately, so a run where the agent never mapped clause 1.2 reports a missing requirement rather than a missing deviation, and reads as an extraction miss instead of a model change. It does fire: the omission was observed once in seven runs ([rfq-reconciliation](../rfq-reconciliation/design.md)), which is the check doing its job and also the reason a single green run isn't evidence about ingestion reliability.

Known gaps. Nothing here covers a whole conversation's arc: every assertion is about a single move, so an agent that grew vaguer or more repetitive over twenty turns would pass. That remains a reading job against the presenter document.

A second gap the task 6 walkthrough exposed on 2026-08-20, since closed: the assertions read recorded choices where the customer sees the whole document. `abandon_changes_nothing` compared `chosen(turn)`, which is `configuration["choices"]` alone, so the failure it should have caught passed — abandon answered with `undo_change`, every choice intact, the candidate and its 35 assigned values gone with the price. It now compares `agreement(turn)`, choices and priced candidate together, and a second assertion checks that the abandon turn called no state-changing tool at all. The general form of the blind spot is worth keeping in mind when writing new assertions: a regression that drops or replaces the candidate while leaving the recorded choices alone is invisible to anything that reads only `choices`, and that is most of what a customer would notice.

A third: a conflicting `set_choices` on a variable the conversation hadn't yet decided is refused with its rules rather than answered with repair options. That is correct against the tool contract, a dead end in the conversation, and the thing the renewal scenario's 630 kg car steps around rather than papers over.

More fundamentally, the harness reaches the principles a scenario demonstrates and not the assertions it exercises. A principle is a rule about the artifact and is checkable in it; an assertion is a bet about people, and needs users this prototype doesn't evaluate with. Each scenario note carries its own unsettled half under *working hypotheses*, and a green run says nothing about any of them.
