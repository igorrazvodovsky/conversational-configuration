# Nonlinear interaction — design

## Solver: repair computation (evolves the [solver service](../solver-service/design.md) — reconcile its spec when this lands)

New `ConfigSolver.repairs(choices, changes, limit=3)`: assert the changed values hard, treat the existing choices as *soft* constraints, and maximize retention (Z3 `Optimize` with soft assertions, weight 1 each). The first optimum is the max-retention repair; block it and re-solve for the next-best alternatives up to `limit`. Each repair reports: dropped choices, the revised values, and the forced ripple (via `consequences` on the repaired set). This reuses the MUS machinery's vocabulary — a repair is presented with the rule labels that made the dropped choices incompatible.

## Agent state and tools

- State gains `frames: list[{name, assignment, price}]`.
- `revise_choices(changes)` — feasible → identical to `set_choices`; infeasible → returns repair options as a typed JSON payload (rendered as cards) and does NOT change state. Repair application happens when the customer picks: the card dispatches a structured message ("Apply repair: drop installation=modernization, set rated_speed=mps3_0 (…)"), recorded via one `set_choices`/`clear_choices` batch — same single validated path as everything else.
- `save_frame(name)` (stores current candidate), `compare_frames(a, b?)` (b defaults to current candidate; returns diff payload), `adopt_frame(name)` (atomic replace of choices with the frame's assignment, source "user").

## Frontend

- `RepairOptions` renderer (fixed-schema, `revise_choices` tool result): one card per repair — "Keep 3.0 m/s → switch to new build (pit 2100, headroom 4600)" — plus the abandon option; same inert-after-use behavior as `ask_choices`.
- `FrameComparison` renderer (`compare_frames` result): two-column diff of differing variables with price footer (joined by a modelled-footprint row and delta since the [environmental-footprint spec](../environmental-footprint/design.md)) and an "adopt" button per side (dispatches structured message).
- Canvas: a small frames strip under the price header (name chips; active candidate unnamed). No other canvas changes.

## System prompt

Additions: prefer `revise_choices` over `set_choices` whenever the customer changes an already-recorded decision; when repairs come back, present them as choices rather than verdicts; offer `save_frame` before big exploratory changes ("want me to keep the current one to compare?").

## Resumption (evolved into the [agreement-workspace spec](../agreement-workspace/design.md))

The draft assumed reopening a thread "just works" over LangGraph checkpoints. Verification proved otherwise: CopilotKit v2 (1.65.0) switches the active thread but **never fetches its history** — the runtime exposes `GET /api/copilotkit/threads/{id}/messages` and `/threads/{id}/state`, yet no client code calls them, so a reopened thread rendered empty. The hand-rolled hydration that closed the gap has since evolved into `useWorkspaceAttachment`, and what resumption means changed with it: messages hydrate from the thread, `configuration` from the durable workspace. Every trap of that machinery — including the three this feature discovered — is documented in the [agreement-workspace design](../agreement-workspace/design.md), the hook's owning spec.

## Testing

Solver: unit tests for `repairs` (max-retention ordering, the modernization scenario, blocking produces distinct alternatives, no-conflict passthrough). Agent: pure-function tests for frame save/compare/adopt and revise passthrough/reject. Frontend: browser pass scripted around the three stories.

## Notes from implementation

- `revise_choices` gained a `drop` parameter so a chosen repair (withdraw + change) lands as **one** tool call — the atomicity criterion falls out of `revise()` validating the final choice set as a whole.
- Repair application/abandon/adopt all dispatch structured user messages (`repairMessage`, `abandonMessage`, `adoptMessage` in `src/lib/configurator.ts`) — same single validated path as canvas edits.
- The card staleness/dispatch logic (inert once used or once the conversation moves past; `isRunning` read at click time, never baked into render) is now shared by all three cards via `useCardDispatch` (`src/components/generative-ui/card-dispatch.ts`); ask-choices was refactored onto it.
- Their *shape* is shared too, in `card-shell.tsx`: `CardProps` (what CopilotKit hands a tool renderer), `CardPending` for the wait, `CardShell` for the card box and its inert dimming, and `parsePayload` for the check that what arrived is this card's payload rather than a plain "Revised: …" or an "ERROR: …". Each card keeps what it says while waiting, what it does with a passthrough (repair options fall back to a tool row, the other two render nothing), and what it draws. Every tool result reaches its renderer as a string, which is why the check belongs to each card rather than to the registration.
- The repair card shows per-option ripple with rule labels but deliberately **no aggregate price delta**: summing option prices over drop/ripple overstated the real candidate delta (dropped *proposals* aren't counted), and un-solver-grounded arithmetic shouldn't be presented (constitution #1 in spirit). Real deltas come from `compare_frames`.
- Repair payloads restrict the ripple to values that differ from the current sheet, so cards stay readable.
- In the browser pass the modernization scenario produced exactly one repair (drop modernization *and* 15–30 m travel — 3.0 m/s conflicts with both) plus abandon; the solver correctly found no alternative because keeping either dropped choice is infeasible with 3.0 m/s.

## Pending amendment, from discovery

The [ripple storyboard](../../discovery/models/Ripple%20storyboard.md) §2–§3 and [surface architecture](../../discovery/models/Surface%20architecture.md) §2 fault the built disclosure on two counts: the repair set lives in the transcript, where an undecided artifact scrolls away ([the canvas is the durable locus of state](../../discovery/assertions/canvas-is-the-durable-state.md)), and repairs carry no delta pair — the no-aggregate-price-delta note above predates the storyboard's ruling that each repair carries *both* deltas, with its full consequence set one move away. The realignment is spec work still to be written, though no longer blocked: the [agreement-document spec](../agreement-document/design.md) has built the target surface, the operative-terms layer. Until that work is done the built level stands as recorded here.
