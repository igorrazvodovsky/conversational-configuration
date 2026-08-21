# Comparing agreements

Two whole agreements can be held at once and read side by side. What separates them is shown as a pair of figures — monthly fee and modelled lifetime footprint — never resolved into one score, and moving between them costs nothing and loses nothing.

*Grounds* the [comparing agreements](../jtbd/job-stories.md) job story. Performer: the [building operator](../jtbd/persona-building-operator.md), choosing what to commit to.

*Situation.* An office agreement is priced and reasonable. The customer wants to see what a premium direction would cost before deciding, and doesn't want to give up the one they have to do it.

*Goal.* Make the trade-off explicit enough to choose from, in terms of what actually differs rather than a summary judgement.

*Expected outcome.* Two drafts of the same agreement, each whole and each with its own provenance and history. A comparison listing only the variables that differ, each side priced at its own contract term, with the monthly delta and the footprint delta standing beside each other. Switching to either leaves the other intact.

## The walkthrough

1. The customer states an office building and asks for the agreement to be put together.
2. The customer asks to keep this one and see a premium version beside it. The agent forks rather than revising, and names the new draft itself from the conversation.
3. The customer states the premium direction and asks for it to be priced.
4. The comparison is opened from the draft the customer isn't on.
5. The card lists what differs and both deltas. The regenerative drive costs more per month and carries a lower modelled footprint, and the card states both rather than resolving them.
6. The customer switches back. The whole document changes with it, and the draft left behind keeps its own values, sources and history.

## What it demonstrates

Principles: [trade-offs are shown as a pair, not collapsed into a score](../principles/trade-offs-shown-as-a-pair.md), and [always show a valid whole](../principles/always-show-a-valid-whole.md).

Assertions it exercises: [two objectives held as a pair](../assertions/two-objectives-as-a-pair.md), and [showing a candidate works better than asking a sequence of questions](../assertions/candidate-works-better-than-questions.md).

## Working hypotheses

The doubt that a pair of figures read in a scrolling transcript may not be a pair the reader can hold is discharged, against this scenario's own drafts. At fourteen differences the card doesn't fit its pane, and the header naming the columns and the totals they come to can't be seen at once ([Comparison view](../models/Comparison%20view.md), *Candidate one*). The comparison moves to a canvas mode, and step 5 of this walkthrough describes the card that is being replaced.

Whether a reader can say which options differ and what each costs after seeing the chosen layout — the principle's own test — has still not been asked of anyone.

Walked in the app on 2026-08-20. Forking, editing the fork, comparing and switching all behave as the expected outcome describes, and the card's figures and the agent's sentence agree. The card's placement failed earlier than the model measured: with five differences in a 715 px pane, the header naming the two columns had already scrolled out of view by the time the totals and footprints were visible, so the fourteen-difference measurement in [Comparison view](../models/Comparison%20view.md), *Candidate one*, is the extreme rather than the threshold.

The walkthrough also found the scenario's opening fragile for a reason that has nothing to do with comparison. A batch of choices rejected by the solver was discarded whole, so the agreement both drafts were forked from held one recorded choice and a completion that had invented the rest. That has since been fixed, because a batch records what fits and names what it declines, so the scenario's opening no longer depends on the agent getting every clause of it past the solver at once.

## How it is played

It is presenter walkthrough 3 in [docs/demo-scenarios.md](../../demo-scenarios.md), and automated as `comparing_agreements` by the [conversation checks](../../specs/conversation-checks/requirements.md), which read the fork's name from the tool call rather than guessing it: the agent names the draft and is forbidden from announcing that it did.

## Related

- [The scenario index and the coverage table](../direction.md)
- [The layout and placement this scenario walks](../models/Comparison%20view.md), chosen 2026-08-20
