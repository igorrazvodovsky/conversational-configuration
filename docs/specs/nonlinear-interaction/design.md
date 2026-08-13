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

## Resumption (implemented, not just verified)

The draft assumed reopening a thread "just works" over LangGraph checkpoints. Verification proved otherwise: CopilotKit v2 (1.65.0) switches the active thread but **never fetches its history** — the runtime exposes `GET /api/copilotkit/threads/{id}/messages` and `/threads/{id}/state`, yet no client code calls them, so a reopened thread rendered empty. `useThreadResumption` (`src/hooks/use-thread-resumption.ts`, mounted inside the configuration provider in `page.tsx`) closes the gap: on active-thread change with an empty agent, it fetches both endpoints and hydrates `agent.setMessages` + `agent.setState`. Two traps it handles: the runtime returns LangChain-style tool calls (`{id, name, args}`) which must be converted to the AG-UI shape (`{id, type, function: {name, arguments}}`) or `setMessages` throws; and thread switching fires a `connect` that can wipe the store, so hydration waits for the agent to settle and briefly re-applies if wiped. Display-only — LangGraph resumes runs from its own checkpoint regardless.

## Testing

Solver: unit tests for `repairs` (max-retention ordering, the modernization scenario, blocking produces distinct alternatives, no-conflict passthrough). Agent: pure-function tests for frame save/compare/adopt and revise passthrough/reject. Frontend: browser pass scripted around the three stories.

## Notes from implementation

- `revise_choices` gained a `drop` parameter so a chosen repair (withdraw + change) lands as **one** tool call — the atomicity criterion falls out of `revise()` validating the final choice set as a whole.
- Repair application/abandon/adopt all dispatch structured user messages (`repairMessage`, `abandonMessage`, `adoptMessage` in `src/lib/configurator.ts`) — same single validated path as canvas edits.
- The card staleness/dispatch logic (inert once used or once the conversation moves past; `isRunning` read at click time, never baked into render) is now shared by all three cards via `useCardDispatch` (`src/components/generative-ui/card-dispatch.ts`); ask-choices was refactored onto it.
- The repair card shows per-option ripple with rule labels but deliberately **no aggregate price delta**: summing option prices over drop/ripple overstated the real candidate delta (dropped *proposals* aren't counted), and un-solver-grounded arithmetic shouldn't be presented (constitution #1 in spirit). Real deltas come from `compare_frames`.
- Repair payloads restrict the ripple to values that differ from the current sheet, so cards stay readable.
- In the browser pass the modernization scenario produced exactly one repair (drop modernization *and* 15–30 m travel — 3.0 m/s conflicts with both) plus abandon; the solver correctly found no alternative because keeping either dropped choice is infeasible with 3.0 m/s.
