# Comparing agreements

Two whole agreements can be held at once and read side by side. What separates them is shown as a pair of figures — monthly fee and modelled lifetime footprint — never resolved into one score, and moving between them costs nothing and loses nothing.

*Grounds* the [comparing agreements](../jtbd/job-stories.md) job story. Performer: the [building operator](../jtbd/persona-building-operator.md), choosing what to commit to.

*Situation.* An office agreement is priced and reasonable. The customer wants to see what a premium direction would cost before deciding, and does not want to give up the one they have in order to look.

*Goal.* Make the trade-off explicit enough to choose from, in terms of what actually differs rather than a summary judgement.

*Expected outcome.* Two drafts of the same agreement, each whole and each with its own provenance and history. A comparison listing only the variables that differ, each side priced at its own contract term, with the monthly delta and the footprint delta standing beside each other. Switching to either leaves the other intact.

## The walkthrough

1. The customer states an office building and asks for the agreement to be put together.
2. The customer asks to keep this one and see a premium version beside it. The agent forks rather than revising, and names the new draft itself from the conversation.
3. The customer states the premium direction and asks for it to be priced.
4. The comparison is opened from the draft the customer is not on.
5. The card lists what differs and both deltas. The regenerative drive costs more per month and carries a lower modelled footprint; the card states both rather than resolving them.
6. The customer switches back. The whole document changes with it, and the draft left behind keeps its own values, sources and history.

## What it demonstrates

Principles: [trade-offs are shown as a pair, not collapsed into a score](../principles/trade-offs-shown-as-a-pair.md), [always show a valid whole](../principles/always-show-a-valid-whole.md).

Assertions it exercises: [two objectives held as a pair](../assertions/two-objectives-as-a-pair.md), [showing a candidate works better than asking a sequence of questions](../assertions/candidate-works-better-than-questions.md).

## Working hypotheses

The comparison's *layout* is unexplored, and so is where on the page it belongs: [direction.md](../direction.md) §3 records the comparison view as built in chat with both deltas and with no alternatives yet sketched against the principle it serves. A pair of figures read in a scrolling transcript may not be a pair the reader can hold.

Whether a reader can say which options differ and what each costs after seeing it — the principle's own test — has not been asked of anyone.

## How it is played

Presenter walkthrough 3 in [docs/demo-scenarios.md](../../demo-scenarios.md). Automated as `comparing_agreements` by the [conversation checks](../../specs/conversation-checks/requirements.md), which read the fork's name from the tool call rather than guessing it: the agent names the draft and is forbidden from announcing that it did.

## Related

- [../direction.md](../direction.md) §4 — the scenario index and the coverage table
- [../direction.md](../direction.md) §3 — the comparison view, still an unexplored model
