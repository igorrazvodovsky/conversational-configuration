# Mid-contract revision

Changing something already agreed is an ordinary move. When the change collides with earlier decisions the system doesn't refuse: it computes the ways forward, names the rules behind each, and leaves the customer free to take one or to keep things as they are.

*Grounds* the [mid-contract revision](../jtbd/job-stories.md) job story. Performer: the [building operator](../jtbd/persona-building-operator.md), the primary persona under the service frame.

*Situation.* A 1970s office building is being modernized inside its existing shaft, and the agreement records 1.6 m/s. The building's use has changed and wait times have drawn tenant complaints. The operator asks for 3.0 m/s, which the existing pit and headroom can't carry.

*Goal.* Fix the performance problem by changing the agreement's terms, without a capital project and without starting the configuration again.

*Expected outcome.* Repair options computed by the solver, each naming the choices it gives up, the values that follow, and the rules that made the conflict. Applying one lands as a single change, abandoning leaves the agreement untouched, and undo reverses the whole batch together.

## The walkthrough

1. The customer states the modernization and its current speed.
2. The customer asks for a speed the existing shaft can't carry.
3. Repair options appear, each with its ripple and its rules, alongside the option of changing nothing.
4. The customer abandons. Nothing moves.
5. The customer asks again, this time by changing the speed on the sheet, and applies a repair. It lands atomically, and the pit, headroom, platform and drive follow as consequences. Asking from the sheet reaches the same repair path as asking in words, which is what [one gesture, one action](../../specs/one-gesture-one-action/design.md) settles.
6. Undo reverses the change, what it dropped and what it rippled, together, naming the move it reversed and whose it was; redo restores it.

## What it demonstrates

Principles: [revision is an ordinary move, not a restart](../principles/revision-is-an-ordinary-move.md), [every refusal names the rules that caused it](../principles/refusals-name-their-rules.md), and [the canvas holds the state and the chat explains it](../principles/canvas-holds-state-chat-explains.md).

Assertions it exercises: [ripple at the moment of revision](../assertions/ripple-at-the-moment-of-revision.md), and [unsat cores are sufficient for trust](../assertions/cores-are-sufficient-for-trust.md).

## Working hypotheses

How much of the consequence set to show is a decision taken in the [ripple storyboard](../models/Ripple%20storyboard.md) and not validated with anyone. Minimal core first, with the full set one move away, is one of three levels the storyboard drew. Whether a repair card reads as a negotiating position rather than a refusal is the assertion under it, and it needs users to settle.

The storyboard also faults where the repair set lives. It sits in the transcript, where an undecided artifact scrolls away, which runs against [the canvas is the durable locus of state](../assertions/canvas-is-the-durable-state.md).

Walked in the app on 2026-08-20. Steps 1, 2, 5 and 6 held: the collision produced a repair set with the model's own rule labels, applying it landed as one batch, and undo reversed the change, the drop and the ripple together.

Step 4 was unreliable. Clicking "Keep everything as it is — abandon this change" led the agent to `undo_change` in two of four samples, reversing the previous change and leaving the agreement unpriced, with the second reply claiming the prior priced configuration was back while the sheet showed no price. The two failures shared a conversation, and two fresh conversations answered it correctly. The step this scenario exists to demonstrate — the half a compliance-checking tool doesn't have — was the one that couldn't be relied on.

Three smaller things: the repair path carried no price or footprint, so the choice was made without either objective; the rules named covered the collision and not the nine consequences listed under it; and applying the repair dropped the candidate, so the fee didn't move with it, it disappeared. Two of those were fixed the same day, because abandoning is a tool that can't move state, and applying a repair reprices in the same batch. The disclosure faults — no delta pair on a repair, no rules for the ripple — are the open amendment of the [ripple storyboard](../models/Ripple%20storyboard.md) rather than defects.

## How it is played

It is presenter walkthrough 2 in [docs/demo-scenarios.md](../../demo-scenarios.md), and automated as `mid_contract_revision` by the [conversation checks](../../specs/conversation-checks/requirements.md). It was the first one built, because it is the flow a change to the agent's context had already broken once.

## Related

- [The scenario index and the coverage table](../direction.md)
- [This story decomposed to design-problem grain](../jtbd/micro-job-stories.md)
- [The disclosure decision this scenario performs](../models/Ripple%20storyboard.md)
