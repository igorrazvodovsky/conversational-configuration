# Configuration state and agent tools

Status: implemented.

Replaces the todo demo pattern in the LangGraph agent with solver-backed configuration state and tools. Backend only: after this feature the agent can run a valid configuration dialogue in plain chat; the canvas and in-chat controls come with [agreement-document](../agreement-document/requirements.md).

## Stories

- As a customer in chat, I can describe my situation in my own words ("hospital in Munich, six floors") and the agent records the choices that follow from it — validated by the solver, never guessed (constitution #1, #4).
- As a customer, when I ask for something impossible, the agent tells me *which of my requirements* collide and *which rules* make them collide, using the solver's explanation (constitution #6).
- As a customer, I can at any point ask "what would that cost?" and get a complete, priced, solver-valid candidate configuration extending my choices so far (constitution #5).
- As the canvas (downstream, [agreement document](../agreement-document/requirements.md)), I can read everything I need to render from agent state: the choices with provenance, the status of every option, and the current candidate — without calling the backend myself.

## Acceptance criteria

Tool level (unit-testable):

- GIVEN a consistent choice set, WHEN `set_choices` runs, THEN agent state holds the choices with provenance (`user` or `agent`), refreshed option statuses, and the tool reports any *newly forced* values so the agent can announce them.
- GIVEN a choice set that conflicts with existing choices, WHEN `set_choices` runs, THEN state is left unchanged and the tool returns the structured explanation (conflicting choices + rule ids/labels + human-readable sentence). No partial application.
- GIVEN current choices, WHEN `propose_completion` runs, THEN a full valid assignment plus total price is stored in state as the candidate and returned to the agent.
- GIVEN a choice to withdraw, WHEN `clear_choices` runs, THEN the choices are removed, statuses recomputed, and any stored candidate invalidated if it no longer extends the remaining choices.
- Initial state schema: `configuration = {choices: {var: {value, source}}, statuses: {var: {value: chosen|forced|invalid|open}}, candidate: {assignment, price} | null}` — since extended by later specs (frames, footprint, the candidate's objective); the current shape is defined in `agent/src/configuration.py`.

Agent behavior (verified by scripted chat smoke test, not unit-asserted):

- The agent elicits needs-first, records anything the user commits to, offers a candidate early, and never states that something is possible or impossible without a tool result backing it. Which of these the system prompt carries and which the tool docstrings carry is a design decision (*Where guidance lives*), not a requirement.

## Out of scope

Canvas rendering, user-initiated state edits from the UI and in-chat generated option controls (all [agreement document](../agreement-document/requirements.md)); multiple named candidates, comparison, and repair suggestions beyond the minimal conflict explanation (all [nonlinear-interaction](../nonlinear-interaction/requirements.md)).
