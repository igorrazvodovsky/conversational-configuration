# Constitution

Principles that hold across all features of this prototype. Specs and code must comply; change this file only deliberately and explicitly.

## Product principles

1. *The LLM never decides validity.* The constraint solver is the single source of truth for what is a valid configuration. The agent elicits, translates, narrates, and proposes — it never asserts feasibility on its own.
2. *Product knowledge is declarative data.* The product model (variables, domains, constraints, prices) lives in data files, separate from solver logic and agent logic. Adding a component must not require code changes.
3. *State lives in the agent.* Shared configuration state syncs bidirectionally between agent and UI via CopilotKit v2 agent state — no duplicate frontend state management.
4. *Needs before parameters.* Elicitation starts from the customer's situation (building, traffic, region), not part nomenclature. Technical parameters are derived, shown, and editable on demand.
5. *Critique over interrogation.* Prefer showing a valid candidate configuration the user can react to over long question sequences. Every candidate shown to the user must be solver-valid.
6. *Explanations are grounded.* Every conflict or "option unavailable" message traces to a solver unsat core over named rules (R-ids with human-readable labels). Discretionary defaults follow the same discipline: default heuristics are named rules in the product model (D-ids), and the agent verbalizes them — a reason that traces to no rule may not be given. No hallucinated justifications.
7. *Nonlinear revision is first-class.* Revising an earlier choice, comparing parallel candidates, and resuming mid-configuration are core flows, not edge cases. The canvas, not the chat transcript, is the durable locus of state.

## Engineering principles

8. Python agent code is managed with uv in `agent/`; frontend is Next.js/React/Tailwind at the repo root.
9. Solver and model logic get automated checks (the model validator, unit tests for solver operations). Conversation behavior gets the [conversation checks](conversation-checks/requirements.md) — end-to-end runs against the live agent, asserting on tool calls, payloads and state, never on the agent's prose; it costs money and a provider key, so it is excluded from the default suite and opted into. Everything that runs without a provider key — the agent's tools and store, the frontend logic that is not UI, and the couplings that cross the language boundary — gets the [offline checks](offline-checks/requirements.md), and CI runs them. UI *behavior* is verified by running the app: no check renders a component to assert what it does, and logic worth checking is moved out of components and hooks into modules the offline checks already cover. One property is exempt because it is not behavior and nobody can see it — whether the pages hydrate: the [hydration checks](hydration-checks/requirements.md) load the app's own pages in a browser and fail on any mismatch React reports.
10. Simple over complex: this is a prototype and template; prefer the smallest mechanism that demonstrates the pattern.

## Process: spec-anchored development

11. Feature specs live in `docs/specs/feature-name/` — named, never numbered, and cited by name:
    - `requirements.md` — user stories plus GIVEN/WHEN/THEN acceptance criteria. Persists and evolves with the feature.
    - `design.md` — key technical decisions, their rationale, and notes from implementation. Persists and evolves with the feature.
    - `tasks.md` — the work plan of a change in flight. Exists only while that change is underway; a feature with no change in flight has no tasks file.
12. Workflow: write or update the spec *before* implementing; new features need user approval of `requirements.md` before code is written. After implementation, reconcile: `requirements.md` and `design.md` are brought to match what was actually built and stay truthful as the feature evolves; `tasks.md` is deleted once its durable residue — verification record, known gaps, deviations from the plan — has moved into `design.md`. A plan's history belongs to git, not to the artifact.
13. Right-sizing: bug fixes and mechanical changes need no spec. Anything that changes behavior, adds a capability, or makes an architectural choice does.
14. Specs are concise. A spec that is tedious to review is a defect (see the review-burden critique in the SDD literature this method is based on).
