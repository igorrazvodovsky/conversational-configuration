# Constitution

Principles that hold across all features of this prototype. Specs and code must comply; change this file only deliberately and explicitly.

## Product principles

1. *The LLM never decides validity.* The constraint solver is the single source of truth for what is a valid configuration. The agent elicits, translates, narrates, and proposes — it never asserts feasibility on its own.
2. *Product knowledge is declarative data.* The product model (variables, domains, constraints, prices) lives in data files, separate from solver logic and agent logic. Adding a component must not require code changes.
3. *State lives in the agent.* Shared configuration state syncs bidirectionally between agent and UI via CopilotKit v2 agent state — no duplicate frontend state management.
4. *Needs before parameters.* Elicitation starts from the customer's situation (building, traffic, region), not part nomenclature. Technical parameters are derived, shown, and editable on demand.
5. *Critique over interrogation.* Prefer showing a valid candidate configuration the user can react to over long question sequences. Every candidate shown to the user must be solver-valid.
6. *Explanations are grounded.* Every conflict or "option unavailable" message traces to a solver unsat core over named rules (R-ids with human-readable labels). No hallucinated justifications.
7. *Nonlinear revision is first-class.* Revising an earlier choice, comparing parallel candidates, and resuming mid-configuration are core flows, not edge cases. The canvas, not the chat transcript, is the durable locus of state.

## Engineering principles

8. Python agent code is managed with uv in `agent/`; frontend is Next.js/React/Tailwind at the repo root.
9. Solver and model logic get automated checks (the model validator, unit tests for solver operations). UI is verified by running the app.
10. Simple over complex: this is a prototype and template; prefer the smallest mechanism that demonstrates the pattern.

## Process: spec-anchored development

11. Feature specs live in `specs/NNN-feature-name/` with three files:
    - `requirements.md` — user stories plus GIVEN/WHEN/THEN acceptance criteria.
    - `design.md` — key technical decisions and their rationale.
    - `tasks.md` — implementation checklist, kept current.
12. Workflow: write or update the spec *before* implementing; new features need user approval of `requirements.md` before code is written. After implementation, reconcile the spec with what was actually built — specs persist and stay truthful as features evolve.
13. Right-sizing: bug fixes and mechanical changes need no spec. Anything that changes behavior, adds a capability, or makes an architectural choice does.
14. Specs are concise. A spec that is tedious to review is a defect (see the review-burden critique in the SDD literature this method is based on).
