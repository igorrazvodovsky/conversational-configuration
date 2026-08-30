# Nonlinear interaction — design

Rules revision with ripple and resumption: repair computation in the solver, the repair tools and their cards, and what abandoning a repair may not do. Read it before changing repair or revision behaviour.

## Solver: repair computation

This evolves the [solver service](../solver-service/design.md); reconcile its spec when this lands.

A new `ConfigSolver.repairs(choices, changes, limit=3)` asserts the changed values hard, treats the existing choices as *soft* constraints, and maximizes retention, using Z3 `Optimize` with soft assertions at weight 1 each. The first optimum is the max-retention repair; blocking it and re-solving gives the next-best alternatives, up to `limit`. Each repair reports the dropped choices, the revised values, and the forced ripple, computed with `consequences` over the repaired set. This reuses the vocabulary of the MUS machinery, so a repair is presented with the rule labels that made the dropped choices incompatible.

## Agent state and tools

- `revise_choices(changes)` behaves identically to `set_choices` when the change is feasible. When it isn't, the tool returns repair options as a typed JSON payload, rendered as cards, and changes no state. Repair application happens when the customer picks one: the card dispatches a structured message, "Apply repair: drop installation=modernization, set rated_speed=mps3_0 (…)", applied through one `revise_choices` batch carrying both the drops and the changes — the same single validated path as everything else.
- Frames and their three tools were removed by the [parallel-drafts spec](../parallel-drafts/design.md). What they did — keep a second candidate, compare it, take it up — is done by `fork_draft`, `compare_drafts` and `switch_draft` over whole drafts of the agreement, and the wholesale re-sourcing to "user" that `adopt_frame` performed went with them.

## Frontend

- The `RepairOptions` renderer is fixed-schema against the `revise_choices` tool result: one card per repair — "Keep 3.0 m/s → switch to new build (pit 2100, headroom 4600)" — plus the abandon option, with the same inert-after-use behavior as `ask_choices`.
- The `DraftComparison` renderer takes the `compare_drafts` result, and was `FrameComparison` until [parallel-drafts](../parallel-drafts/design.md). It draws a two-column diff of differing variables with a price footer, joined by a modelled-footprint row and delta since the [environmental-footprint spec](../environmental-footprint/design.md), and a button per side that switches to that draft by dispatching a structured message.
- On the canvas, the frames strip under the price header became the draft switcher at the document's identity ([parallel-drafts](../parallel-drafts/design.md)).

## System prompt

Three additions. Prefer `revise_choices` over `set_choices` whenever the customer tells you to change an already-recorded decision; a dispatched gesture reaches `revise_choices` unconditionally ([one-gesture-one-action](../one-gesture-one-action/design.md)). When repairs come back, present them as choices rather than verdicts. And offer a fork before big exploratory changes — "want me to keep this one and try that on a second draft?" — which was `save_frame` until [parallel-drafts](../parallel-drafts/design.md).

## Resumption

This evolved into the [agreement-workspace spec](../agreement-workspace/design.md).

The draft assumed reopening a thread would work over LangGraph checkpoints. Verification proved otherwise: CopilotKit v2 (1.65.0) switches the active thread but *never fetches its history*. The runtime exposes `GET /api/copilotkit/threads/{id}/messages` and `/threads/{id}/state`, yet no client code calls them, so a reopened thread rendered empty. The hand-rolled hydration that closed the gap has since evolved into `useWorkspaceAttachment`, and what resumption means changed with it: messages hydrate from the thread, and `configuration` from the durable workspace. Every trap of that machinery, including the three this feature discovered, is documented in the [agreement-workspace design](../agreement-workspace/design.md), the hook's owning spec.

## Testing

Solver: unit tests for `repairs` cover max-retention ordering, the modernization scenario, blocking producing distinct alternatives, and no-conflict passthrough. Agent: pure-function tests cover the comparison payload and revise passthrough and rejection. Frontend: a browser pass scripted around the three stories.

## Notes from implementation

- `revise_choices` gained a `drop` parameter so a chosen repair, which withdraws and changes together, lands as *one* tool call. The atomicity criterion falls out of `revise()` validating the final choice set as a whole.
- Repair application, abandon and adopt all dispatch structured user messages — `repairMessage`, `abandonMessage` and `adoptMessage` in `src/lib/configurator.ts` — the same single validated path as canvas edits.
- The card staleness and dispatch logic — inert once used or once the conversation moves past, with `isRunning` read at click time and never baked into render — is shared by all three cards through `useCardDispatch` in `src/components/generative-ui/card-dispatch.ts`. `ask-choices` was refactored onto it.
- Their *shape* is shared too, in `card-shell.tsx`: `CardProps` for what CopilotKit hands a tool renderer, `CardPending` for the wait, `CardShell` for the card box and its inert dimming, and `parsePayload` for the check that what arrived is this card's payload rather than a plain "Revised: …" or an "ERROR: …". Each card keeps what it says while waiting, what it does with a passthrough — repair options fall back to a tool row, and the other two render nothing — and what it draws. Every tool result reaches its renderer as a string, which is why the check belongs to each card rather than to the registration.
- The card owns the inert dimming alone. A disabled button fades itself, every repair is disabled the moment the card goes inert, and the two fades over the same text left the rule labels close to unreadable — a spent repair is still the record of what was offered, so the buttons give up their own `disabled:opacity`. The same holds for the comparison card's draft buttons. Ruled-out options in `ask-choices` keep their fade, which says something the card's state does not.
- The repair card shows per-option ripple with rule labels and deliberately *no aggregate price delta*. Summing option prices over the drop and the ripple overstated the real candidate delta, because dropped *proposals* aren't counted, and arithmetic that isn't solver-grounded shouldn't be presented (constitution #1 in spirit). Real deltas come from the comparison.
- Repair payloads restrict the ripple to values that differ from the current sheet, so cards stay readable.
- In the browser pass the modernization scenario produced exactly one repair — drop modernization *and* the 15–30 m travel band, because 3.0 m/s conflicts with both — plus abandon. The solver correctly found no alternative, because keeping either dropped choice is infeasible with 3.0 m/s.
- Abandoning a repair is a tool call that can't move anything. The prototype walkthrough of 2026-08-20 found the model answering `abandonMessage` with `undo_change` in two of four samples, reversing the change *before* the one the customer declined, taking the priced candidate with it, and once reporting the prior priced configuration as restored while the sheet showed no price. Prompt wording alone couldn't be verified, because two of the four samples were already clean, so the fix is structural. `keep_as_is` holds no `configuration` in its update and reaches no door that could write one, routed through `_reply` rather than `_committed`, and the prompt maps the abandon sentence onto it and nothing else. It does record that the change was declined, through a store door of its own that appends an entry with no facts and touches no configuration ([action-log](../action-log/design.md)) — which is the same structural claim, since what makes the tool safe is that no path from it reaches the agreement. A unit test asserts the update carries messages only, which is an assertion about what the tool *can* do rather than about what the model chose this time. The scenario check widened with it: `abandon_changes_nothing` compared recorded choices, which the failure left untouched, and now compares the priced whole too and asserts that no state-changing tool was called at all ([conversation checks](../conversation-checks/design.md)).
- Applying a repair moves the fee rather than removing it. `_repriced`, in the [agent-tools design](../agent-tools/design.md), completes again inside the same batch, so the fee moves with the repair. The same walkthrough had found the sheet unpriced after every repair, with half its terms back at "not yet decided".

## Pending amendment, from discovery

The [ripple storyboard](../../discovery/models/Ripple%20storyboard.md), under *The divergence* and *The decision*, and [surface architecture](../../discovery/models/Surface%20architecture.md), under *What follows from the choice*, fault the built disclosure on two counts. The repair set lives in the transcript, where an undecided artifact scrolls away ([the canvas is the durable locus of state](../../discovery/assertions/canvas-is-the-durable-state.md)). And repairs carry no delta pair: the no-aggregate-price-delta note in *Notes from implementation* predates the storyboard's ruling that each repair carries *both* deltas, with its full consequence set one move away.

The realignment is spec work still to be written, though no longer blocked, because the [agreement-document spec](../agreement-document/design.md) has built the target surface, the operative-terms layer. Until that work is done, the built level stands as recorded here.
