# Conversation checks: the demo scenarios, run against the live agent

Status: approved 2026-08-14 as *demo-scenarios*, re-scoped 2026-08-19 to the checks alone. Built: all five scenarios run against the live agent.

The five scenarios themselves are discovery, not a feature. They are situated walkthroughs that make the direction concrete, one per job story, in [docs/discovery/scenarios/](../../discovery/scenarios/). This spec covers the software that runs them: a harness that drives the real agent graph a turn at a time and reports per-assertion outcomes, and a comparison mode that runs the same scenarios against two git refs. Constitution #9 assigns conversation behavior to exactly this.

*Checks, not tests, and the word is doing work.* These apply decision rules to observations — did this tool get called, does this payload hold this value — which is what a machine can do with a nondeterministic agent, and all it can do. What a machine can't do is notice that the agent grew vaguer over twenty turns, or that a repair card reads as a refusal. That is the presenter's job, walking the same scenarios, and it is why the two artifacts aren't redundant.

What the checks serve is therefore reached through what they run. Each scenario note carries the principles it demonstrates and the assertions it exercises. This spec's obligation under constitution #3 is discharged by keeping the checks faithful to those notes rather than by citing a principle of its own: verification infrastructure serves the method, and the design claims live one link away.

The presenter document, [docs/demo-scenarios.md](../../demo-scenarios.md), is the other thing the scenarios become. It is a performance of the same notes and isn't specified here. Where it and the checks disagree, one of them has drifted from the scenario note, and both are discovery's problem.

## Stories

- As a developer changing the model, solver, or agent, I can run the scenarios as automated checks and learn immediately when a demonstrated behavior regressed, without eyeballing five manual demos.
- As a developer changing the agent's context — the system prompt, a tool docstring, the model — I can run the scenarios against two git refs and read a per-assertion comparison, so the behavioral cost of a context change is measured rather than argued. A prompt edit is cheap to make, invisible to every other check in the repo, and can silently cost a whole interaction flow.

## Acceptance criteria

### How assertions are made

- GIVEN the checks, WHEN a scenario runs against the real agent graph, THEN assertions target solver-backed outcomes — recorded choices, forced values, candidate validity, payload kinds, draft contents — never the LLM's prose, so runs survive wording variation.
- GIVEN a state-critical step — a commitment, a repair application, a switch between drafts, a reconciliation move — WHEN the harness dispatches it, THEN it uses the same structured message grammar as the UI cards and canvas: "Set … (var=value)", "Apply repair: …", 'Switch to draft "…"', "Reconcile deviation: …". That keeps one validated path and makes the step deterministic.
- GIVEN a scenario whose own claim is that no variable name or option code is needed, WHEN the harness steers it, THEN it steers in prose throughout, because the structured grammar spells both.
- GIVEN a product-model change that alters a value or price a scenario references, WHEN the checks run, THEN the affected scenario fails rather than drifting silently, because the scripts assert against the live model rather than hardcoded copies of it.

### What each scenario must establish

Each criterion here is the expected outcome of the [discovery scenario](../../discovery/scenarios/) of the same name, expressed at the grain the harness can check. A criterion that no longer matches its note is a bug in one of the two.

- GIVEN [needs, not nomenclature](../../discovery/scenarios/needs-not-nomenclature.md), WHEN it completes, THEN no user turn contained a variable name or option code the customer couldn't have read off a label, the final candidate is solver-valid with the hospital cascade present — bed-depth car, stretcher-width doors, accessibility — every recorded choice carries its source, and the customer's override of one agent-picked value took a single turn and changed nothing else.
- GIVEN [mid-contract revision](../../discovery/scenarios/mid-contract-revision.md), WHEN the revision is requested, THEN a repairs payload is produced whose top option drops the modernization with the pit and headroom ripple attached and names its rules; applying it yields exactly the repaired choice set; the abandon path leaves state untouched; and undo reverses the whole batch together.
- GIVEN [comparing agreements](../../discovery/scenarios/comparing-agreements.md), WHEN it completes, THEN two drafts existed concurrently, the comparison payload listed only differing variables with a correct price delta and named each side by its draft, and switching to one left the other whole, with its own choices, their sources and its own history.
- GIVEN [comparing agreements](../../discovery/scenarios/comparing-agreements.md), WHEN the comparison payload is produced, THEN it holds the footprint delta beside the price delta, and carries no key that combines them into a single score.
- GIVEN [renewal as revision](../../discovery/scenarios/renewal-as-revision.md), WHEN a new session resumes the agreement, THEN restored choices, statuses, and drafts equal the pre-interruption state, and the what's-left answer derives from `get_configuration`, which requires asking something the restored transcript can't answer.
- GIVEN [renewal as revision](../../discovery/scenarios/renewal-as-revision.md), WHEN the customer's next turn is the bare dimension statement "the shaft is 1800 by 1700", with no canvas control and no pending question, THEN it is recorded as a user-sourced choice on the shaft variable — with repairs offered as in mid-contract revision if it conflicts — and no already-settled variable is re-elicited.
- GIVEN [tender as entrance](../../discovery/scenarios/tender-as-entrance.md), WHEN the fixture is ingested, THEN every seeded choice carries source `document` with its clause, the deviation register equals the solver's seed partition rather than the LLM's reading, the candidate is solver-valid, no document-settled variable is re-elicited, each reconciliation move applies atomically through the structured message grammar, and the waived requirement still appears in the closing state summary.

### Running it

- GIVEN two git refs, WHEN the checks run in comparison mode, THEN each scenario runs against both trees from identical inputs and the report gives per-assertion outcomes side by side, so a difference names the assertion that moved rather than a score that fell.
- GIVEN a run that a provider rate limit interrupts, WHEN a conversation can't complete after backoff, THEN the run fails loudly and names the affected scenarios, and never drops them silently. A comparison missing different cells on each side isn't a weaker result, it is a false one.
- GIVEN any harness run, WHEN it creates workspaces, THEN they are written to a throwaway store and never to `agent/data/workspaces`, so a test run can't pollute or overwrite the developer's own agreements.
- The checks run behind an explicit pytest marker, skip cleanly when `OPENAI_API_KEY` is absent, and stay out of the default `uv run pytest`.

## Out of scope

The scenarios themselves, their framing and their coverage of principles, which are [discovery](../../discovery/scenarios/). The presenter document. Browser automation of the demos: the checks drive the agent graph, on-screen behavior was verified per feature when the canvas and nonlinear interaction landed, and it stays a presenter concern. Performance or load evaluation. Formal user studies. Scenario recordings or videos. And CI wiring for these LLM-dependent runs.
