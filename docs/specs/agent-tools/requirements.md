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
- GIVEN a batch of choices with a collision inside it, WHEN `set_choices` runs, THEN every choice that can hold is recorded and each one that cannot comes back as declined, with its value and the rule ids and labels that separate it. The choices outside the collision are never lost with it: the batch stops being all-or-nothing at the point where all-or-nothing costs the customer things they actually said. A revision aimed at one term keeps the atomic contract — `revise_choices` still applies whole or returns repair options.
- GIVEN an agreement with a priced candidate, WHEN any tool changes a choice and the change invalidates that candidate, THEN the agreement is completed again on the same objective inside the same batch, so the sheet keeps a price and one undo reverses both. An agreement that has never been completed stays unpriced: pricing is asked for, not assumed.
- GIVEN any configuration, WHEN state is written, THEN it carries, for every option that cannot be taken, the named rules that rule it out — computed with that variable's own recorded choice lifted, so it answers "could I take this instead?" rather than "have you already chosen?" (constitution #6). Recording a choice may not make its own alternatives unavailable.
- GIVEN a value the rules force, WHEN `get_configuration` runs, THEN the rules that force it are named in the result, so an answer to "why is this here?" quotes the model instead of composing one.
- GIVEN current choices, WHEN `propose_completion` runs, THEN a full valid assignment plus total price is stored in state as the candidate and returned to the agent.
- GIVEN a choice to withdraw, WHEN `clear_choices` runs, THEN the choices are removed, statuses recomputed, and any stored candidate invalidated if it no longer extends the remaining choices.
- Initial state schema: `configuration = {choices: {var: {value, source}}, statuses: {var: {value: chosen|forced|invalid|open}}, candidate: {assignment, price} | null}` — since extended by later specs (footprint, the candidate's objective, the RFQ block, the `unavailable` rules map) and split across drafts; the current shape is defined in `agent/src/configuration.py`.

Agent behavior (verified by scripted chat smoke test, not unit-asserted):

- The agent elicits needs-first, records anything the user commits to, offers a candidate early, and never states that something is possible or impossible without a tool result backing it. Which of these the system prompt carries and which the tool docstrings carry is a design decision (*Where guidance lives*), not a requirement.

## Out of scope

Canvas rendering, user-initiated state edits from the UI and in-chat generated option controls (all [agreement document](../agreement-document/requirements.md)); multiple named candidates, comparison, and repair suggestions beyond the minimal conflict explanation (all [nonlinear-interaction](../nonlinear-interaction/requirements.md)).
