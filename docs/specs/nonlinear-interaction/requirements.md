# Nonlinear interaction: revision, candidates, resumption

Status: implemented (approved 2026-08-13; browser-verified same day).

The prototype's actual research contribution ([docs/research/interaction-literature.md](../../research/interaction-literature.md), thread E): revising constrained choices with ripple explanation and repair, comparing parallel candidate configurations, and resuming mid-configuration. Everything before this made revision *safe* (atomic rejection); this feature makes it *productive*.

## Stories

- As a customer, when I change an earlier decision and it collides with later ones, I'm not just told no — I see what the change would cost: which of my other choices would have to give, and concrete repair options I can pick with one tap (constitution #7).
- As a customer, I can keep two candidate configurations alive — "the practical one" and "the premium one" — see them side by side with their differences and price delta, and adopt one to continue from.
- As a customer, when I reopen yesterday's thread, the spec sheet is exactly as I left it and I can ask "where were we?" and get a faithful summary of what's decided, what's forced, and what's still open.

## Acceptance criteria

Revision with repair:

- GIVEN recorded choices that conflict with a requested change, WHEN the new `revise_choices` tool runs, THEN it returns repair options computed by the solver — each option being a minimal set of existing choices to drop or change that makes the revision feasible, with the resulting forced ripple listed — ordered by how many existing choices they keep. At least two options are returned when two exist (including "keep things as they are and abandon the revision" as the always-present last option).
- GIVEN the modernization scenario (modernization + 1.6 m/s recorded, customer asks for 3.0 m/s), WHEN repairs are computed, THEN dropping modernization (i.e. switching to new build) appears as a repair, with the pit/headroom ripple attached.
- GIVEN a repair option is chosen (in chat or via its rendered card), WHEN it is applied, THEN the revision and the repair land as one atomic solver-validated batch — never a half-applied state.
- GIVEN a requested change that does NOT conflict, WHEN `revise_choices` runs, THEN it behaves exactly like `set_choices` (no ceremony for the easy case).

Candidate frames:

- GIVEN a current candidate, WHEN the customer asks to keep it (e.g. "save this as the practical one"), THEN it is stored as a named frame in agent state; frames survive further configuration changes.
- GIVEN two frames (or a frame and the current candidate), WHEN compared, THEN a comparison card renders in chat: only the variables that differ, each with both values and the price delta, plus total prices — data computed backend-side, valid by construction.
- GIVEN a comparison, WHEN the customer adopts one side, THEN its assignment replaces the current choices atomically and the spec sheet reflects it; the other frame remains stored.

Resumption:

- GIVEN an existing thread reopened from the threads drawer, WHEN the canvas mounts, THEN choices, statuses, provenance badges, candidate, and frames render exactly as they were. (The draft assumed this only needed verification; it needed implementation — CopilotKit's drawer switches threads without restoring history, so `useThreadResumption` hydrates from the runtime's thread endpoints. See design.)
- GIVEN a resumed thread, WHEN the customer asks what's left, THEN the agent answers from `get_configuration` — decided (with who decided), forced, and undecided variables — without re-eliciting anything already settled.

## Out of scope

Comparing more than two frames at once; automatic frame naming; canvas-side ripple animation or diff visualization (comparison lives in chat for now); persistence beyond LangGraph thread checkpoints; enumerating every possible repair (top-N by retention suffices).
