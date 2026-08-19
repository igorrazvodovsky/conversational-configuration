# Needs, not nomenclature

A customer who knows their building and nothing about elevators reaches a priced, valid agreement without learning the product's vocabulary. They describe beds, wards and floors; the agent translates that into choices, announces what the rules then force, and keeps the last word with the customer over anything it picked itself.

*Grounds* the [needs, not nomenclature](../jtbd/job-stories.md) job story. Performers: the [design specifier](../jtbd/persona-design-specifier.md), who embodies the articulation barrier, with the [delivery lead](../jtbd/persona-delivery-lead.md) beside them.

*Situation.* A hospital wing is being planned. The specifier can state what the lift has to do — carry a bed with a nurse either side, serve six floors, run all day, be usable by a patient alone — and cannot state a rated load, a car code or a door width. Nothing has been configured yet; the workspace is empty.

*Goal.* Lock shaft dimensions early enough for the building's structural design, without becoming an elevator expert to do it.

*Expected outcome.* A solver-valid priced agreement in which the hospital cascade is present and traceable — a bed-depth car, stretcher-width doors, an accessibility package, each carrying the rule that put it there — every value attributable to whoever chose it, and no part code anywhere in what the customer said.

## The walkthrough

1. The customer states the building and what the lift must do, in building terms.
2. The agent records what that settles and announces what the rules force from it, rather than asking about each consequence.
3. The customer hands the cabin finishes to the agent, which picks them and marks them as its own.
4. The customer asks for the whole agreement; a priced valid candidate appears with the cascade visible in the schedules.
5. The customer overrides one of the agent's picks in a single turn, in their own words. Nothing else moves.

## What it demonstrates

Principles: [elicitation uses the building's vocabulary](../principles/elicit-in-the-buildings-vocabulary.md), [always show a valid whole](../principles/always-show-a-valid-whole.md), [the agent proposes and the user decides](../principles/agent-proposes-user-decides.md).

Assertions it exercises: [showing a candidate works better than asking a sequence of questions](../assertions/candidate-works-better-than-questions.md), [generated in-chat controls work better than free text](../assertions/generated-controls-work-better-than-free-text.md), [outcome-level elicitation works](../assertions/outcome-level-elicitation.md), and — through step 3 and step 5 together — [choices that quote their source](../assertions/choices-that-quote-their-source.md).

## Working hypotheses

The opening turn is constructed prose, not an observed utterance: whether a hospital planner volunteers this much in one message is unknown, and if they volunteer less the scenario becomes several turns of elicitation rather than one. Step 3 assumes the agent will pick when asked to; that is the one step whose outcome depends on the model rather than the solver.

## How it is played

Presenter walkthrough 1 in [docs/demo-scenarios.md](../../demo-scenarios.md). Automated as `needs_not_nomenclature` by the [conversation checks](../../specs/conversation-checks/requirements.md); it is the one scenario the harness may not steer with the structured message grammar — that grammar spells the codes this scenario claims are never needed.

## Related

- [../direction.md](../direction.md) §4 — the scenario index and the coverage table
- [../jtbd/job-map.md](../jtbd/job-map.md) — the job stage this sits in
