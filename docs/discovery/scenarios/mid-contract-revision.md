# Mid-contract revision

Changing something already agreed is an ordinary move. When the change collides with earlier decisions the system does not refuse: it computes the ways forward, names the rules behind each, and leaves the customer free to take one or to keep things as they are.

*Grounds* the [mid-contract revision](../jtbd/job-stories.md) job story. Performer: the [building operator](../jtbd/persona-building-operator.md), the primary persona under the service frame.

*Situation.* A 1970s office building is being modernized inside its existing shaft, and the agreement records 1.6 m/s. The building's use has changed and wait times have drawn tenant complaints. The operator asks for 3.0 m/s, which the existing pit and headroom cannot carry.

*Goal.* Fix the performance problem by changing the agreement's terms, without a capital project and without starting the configuration again.

*Expected outcome.* Repair options computed by the solver, each naming the choices it gives up, the values that follow, and the rules that made the conflict. Applying one lands as a single change; abandoning leaves the agreement untouched; undo reverses the whole batch together.

## The walkthrough

1. The customer states the modernization and its current speed.
2. The customer asks for a speed the existing shaft cannot carry.
3. Repair options appear, each with its ripple and its rules, alongside the option of changing nothing.
4. The customer abandons. Nothing moves.
5. The customer asks again and applies a repair. It lands atomically, and the pit, headroom, platform and drive follow as consequences.
6. Undo reverses the change, what it dropped and what it rippled, together; redo restores it.

## What it demonstrates

Principles: [revision is an ordinary move, not a restart](../principles/revision-is-an-ordinary-move.md), [every refusal names the rules that caused it](../principles/refusals-name-their-rules.md), [the canvas holds the state and the chat explains it](../principles/canvas-holds-state-chat-explains.md).

Assertions it exercises: [ripple at the moment of revision](../assertions/ripple-at-the-moment-of-revision.md), [unsat cores are sufficient for trust](../assertions/cores-are-sufficient-for-trust.md).

## Working hypotheses

How much of the consequence set to show is a decision taken in the [ripple storyboard](../models/Ripple%20storyboard.md) and not validated with anyone: minimal core first, with the full set one move away, is one of three levels the storyboard drew. Whether a repair card reads as a negotiating position rather than a refusal is the assertion under it, and needs users to settle.

The storyboard also faults where the repair set lives. It sits in the transcript, where an undecided artifact scrolls away, which runs against [the canvas is the durable locus of state](../assertions/canvas-is-the-durable-state.md).

## How it is played

Presenter walkthrough 2 in [docs/demo-scenarios.md](../../demo-scenarios.md). Automated as `mid_contract_revision` by the [conversation checks](../../specs/conversation-checks/requirements.md) — the first one built, because it is the flow a change to the agent's context had already broken once.

## Related

- [../direction.md](../direction.md) §4 — the scenario index and the coverage table
- [../jtbd/micro-job-stories.md](../jtbd/micro-job-stories.md) — this story decomposed to design-problem grain
- [../models/Ripple storyboard.md](../models/Ripple%20storyboard.md) — the disclosure decision this scenario performs
