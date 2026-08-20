# Renewal as revision

The agreement outlives the conversation. Coming back to it answers "where were we" from the agreement rather than by asking again, and the next change lands wherever the customer chooses to start — including on a term nobody has mentioned yet.

*Grounds* the [renewal as revision](../jtbd/job-stories.md) job story. Performer: the [building operator](../jtbd/persona-building-operator.md), returning rather than arriving.

*Situation.* An agreement was configured in an earlier session and left in some state, with more than one draft on it. Renewal is approaching and the building is used differently than when the terms were set. The customer returns to a document already in progress, not to a blank start.

*Goal.* Adjust a live agreement to how the building is actually used, so that renewal is a revision rather than a new sale.

*Expected outcome.* Values, forced values, provenance and drafts restore exactly. What is still open is answered from the agreement, which is the only place it is computed. The next change is a bare dimension statement, and it lands on the right term without re-eliciting anything settled.

## The walkthrough

1. The customer returns to the workspace. The document, its drafts and their prices come back as they were left.
2. The customer asks where things stood and what is still open. The answer to the second half exists only in the agreement, never in the transcript.
3. The customer states a shaft dimension flatly, with no control clicked and no question pending.
4. It is recorded against the shaft as the customer's own choice. If it collides with what is recorded, the repair path of [mid-contract revision](mid-contract-revision.md) opens here, with its rules — and the turn is a revision either way, never a restart.

## What it demonstrates

Principles: [configuration can start from any variable, in any order](../principles/start-from-any-variable.md), [revision is an ordinary move, not a restart](../principles/revision-is-an-ordinary-move.md), [the canvas holds the state and the chat explains it](../principles/canvas-holds-state-chat-explains.md).

Assertions it exercises: [the canvas is the durable locus of state](../assertions/canvas-is-the-durable-state.md), [ripple at the moment of revision](../assertions/ripple-at-the-moment-of-revision.md).

## Working hypotheses

This scenario is standing in for a model that does not exist. [direction.md](../direction.md) §3 lists the session map — entry points, resumption, mid-contract revision, renewal — as missing, so how a returning operator re-enters a live agreement is being demonstrated without having been designed. The walkthrough is one path through territory nobody has mapped.

Step 3 assumes an unmediated statement is a natural way to re-enter. It is the principle's own test sentence, chosen because it is the hardest case rather than because anyone was observed doing it.

Walked in the app on 2026-08-20. Step 1 holds exactly: a browser reload restored values, forced values, provenance, both drafts with their prices and the transcript, with nothing re-elicited. Step 3 holds too — the bare dimension landed on the shaft as the customer's own choice and forced the car and the load from it — with the caveat that it also dropped the priced candidate, leaving the sheet unpriced until a completion is asked for again. That caveat was fixed the same day: a change to a priced agreement completes again in the same batch, so the shaft statement reprices the agreement rather than emptying it. Step 2 is the weak one, and expectedly so while the [open-points spec](../../specs/open-points/requirements.md) is unbuilt: the answer came from the agreement rather than the transcript, but at category grain ("the finish and package choices: energy, dispatching, doors, cabin"), naming no term, although the tool hands the agent the list of undecided variables.

## How it is played

Presenter walkthrough 4 in [docs/demo-scenarios.md](../../demo-scenarios.md). Automated as `renewal_as_revision` by the [conversation checks](../../specs/conversation-checks/requirements.md); the harness cannot reload a browser, and rebuilds the session break the way the stack provides one.

## Related

- [../direction.md](../direction.md) §4 — the scenario index and the coverage table
- [../jtbd/consumption-journey.md](../jtbd/consumption-journey.md) — where renewal sits in the journey
