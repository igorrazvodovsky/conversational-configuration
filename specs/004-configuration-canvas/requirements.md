# 004 — Configuration canvas and in-chat controls

Status: implemented.

Replaces the todo canvas with a configuration spec sheet synced to `agent.state.configuration`, and gives the agent a way to ask questions as clickable, solver-valid option controls in chat. After this feature the prototype is the full chat+canvas hybrid the research argues for ([docs/research/interaction-literature.md](../../docs/research/interaction-literature.md), thread D).

## Stories

- As a customer, I can always see the whole configuration at a glance beside the chat: decisions grouped as on a spec sheet, what's been chosen (and by whom), what the rules forced, what's still open, and the current total price — the canvas, not the transcript, is where I orient (constitution #7).
- As a customer, I can change any decision directly on the canvas without asking the agent — and I physically cannot select an invalid option, because options ruled out by my other choices are greyed out (constitution #5).
- As a customer, when the agent asks me something in chat, I get an input control fitted to the question — chips for a quick either/or, a scale for load or speed, a detail list for cars and finishes, a compact form when several things are asked at once — instead of having to type part nomenclature (constitution #4; the articulation barrier). Typing a free-text answer always remains possible; controls are accelerators, not gates.
- As the agent, I see canvas edits the same way I see chat commitments, so I can react to them — announce new forced values, warn about consequences, update the candidate.

## Acceptance criteria

Canvas (read):

- GIVEN agent state with choices, statuses, and a candidate, WHEN the canvas renders, THEN every variable appears under its group with its current value and a status badge distinguishing: chosen by user, chosen/derived by agent, forced by rules, and open; open variables show the candidate's proposed value (visually distinct) when a candidate exists.
- GIVEN a candidate in state, WHEN the canvas renders, THEN the total price is prominently visible; GIVEN no candidate, THEN the canvas indicates none has been proposed yet.
- GIVEN an empty configuration, WHEN the canvas renders, THEN all groups show as undecided with a hint to describe the project in chat.

Canvas (write):

- GIVEN a variable's editor is open, WHEN statuses mark options invalid, THEN those options are visibly disabled and unselectable; selectable options show labels and price deltas.
- GIVEN the user selects a valid option on the canvas, WHEN the edit is dispatched, THEN it is recorded through the same solver-validated `set_choices` path as chat input (source "user"), and the canvas subsequently reflects refreshed statuses — including any newly forced cascade — without further user action.
- GIVEN the agent is mid-run, WHEN the canvas renders, THEN editing is disabled and the running state is indicated.

In-chat controls — the agent asks via one tool (`ask_choices`), and the control type is selected per variable:

- Control vocabulary: *chips* for short unordered domains (roughly ≤6 options: building type, door type, installation); *scale* (segmented, ordered) for ordered domains (load, speed, travel, stops, door width, dimensions), where invalid segments render greyed in place so the user sees the valid range narrow; *detail list* for long or consequence-heavy domains (car sizes with dimensions, finishes with prices) showing label, description, and price delta per row.
- GIVEN the agent asks about several related variables at once (e.g. "tell me about the building"), WHEN the message renders, THEN a single form card composes the per-variable controls with one submit, and submitting records all filled fields as one `set_choices` batch (unfilled fields stay open).
- GIVEN any control, WHEN it renders, THEN it offers only options valid at call time (computed server-side from solver statuses), greys out invalid values in place rather than hiding them, shows price deltas, and marks the cheapest-completion value.
- GIVEN the user activates a control (chip tap, scale selection, list pick, form submit), WHEN the choice is submitted, THEN it lands in state via the validated path and the agent acknowledges it in its next message.
- GIVEN the user ignores a control and instead types an answer (or asks something else), WHEN the conversation continues, THEN earlier controls become inert history — no stale submission is possible.

## Out of scope

Multiple named candidates, comparison view, and revision-ripple visualization (005); session resumption/persistence (005); deleting the legacy todo/a2ui example components (housekeeping later); mobile layout.
