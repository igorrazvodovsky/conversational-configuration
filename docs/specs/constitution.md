# Constitution

Principles that hold across all features of this prototype. Specs and code have to comply, and this file changes only deliberately and explicitly.

## Product principles

1. *The agent never decides validity.* The constraint solver is the single source of truth for what is a valid configuration: `status`, `separates`, `undecided` and the candidate are derived facts, and nothing but the solver may write one. The agent elicits, translates, narrates and proposes; it never asserts a derived fact on its own.
2. *Product knowledge is declarative data.* The product model — every variable, its options, the rules over them and their prices — lives in data files, separate from solver logic and agent logic. Adding a component must not require a code change.
3. *State lives in the agent.* Shared configuration state syncs bidirectionally between agent and UI through CopilotKit v2 agent state, with no duplicate frontend state management.
4. *Needs before parameters.* Elicitation starts from the customer's situation (building, traffic, region), not part nomenclature. Technical variables are derived, shown and editable on demand.
5. *Critique over interrogation.* Prefer showing a valid candidate configuration the user can react to, rather than long question sequences. Every candidate shown to the user must be solver-valid.
6. *Explanations are grounded.* Every conflict or ruled-out option traces to a solver unsat core over named rules: the derived fact `separates`, carried in state as `unavailable`, quoted by the model's own R-ids and labels. Discretionary defaults follow the same discipline: default heuristics are named rules in the product model (D-ids), and the agent verbalizes them — a reason that traces to no rule may not be given, and no justification may be invented. And a citation the customer is given is recorded as an action naming the rule it cited, so the record holds what was quoted and not only the utterance.
7. *Nonlinear revision is first-class.* Revising an earlier choice, comparing drafts and resuming mid-configuration are core flows, not edge cases. The durable locus of state is the workspace record; the agreement document and the chat transcript are two views onto it, and the document is the one the agreement is read from.

## Engineering principles

8. Python agent code is managed with uv in `agent/`; frontend is Next.js/React/Tailwind at the repo root.
9. Solver and model logic get automated checks (the model validator, unit tests for solver operations). Conversation behavior gets the [conversation checks](conversation-checks/requirements.md) — end-to-end runs against the live agent, asserting on tool calls, payloads and state, never on the agent's prose. It costs money and a provider key, so it is excluded from the default suite and opted into. Everything that runs without a provider key — the agent's tools and store, the frontend logic that is not UI, and the couplings that cross the language boundary — gets the [offline checks](offline-checks/requirements.md), and CI runs them. The frontend's stateful middle — attachment, the agreement a conversation lands on, a card going inert — gets the [interface checks](interface-checks/requirements.md), which render against a mocked AG-UI stream and so cost nothing to run. CI runs them too. What renders nowhere else is verified by running the app: no check sees hydration, layout, or the WebGL render.
10. Simple over complex: this is a prototype and a template, so prefer the smallest mechanism that demonstrates the pattern.

## Process: spec-anchored development

11. Feature specs live in `docs/specs/feature-name/` — named, never numbered, and cited by name:
    - `requirements.md` — user stories plus GIVEN/WHEN/THEN acceptance criteria. Persists and evolves with the feature.
    - `design.md` — key technical decisions, their rationale, and notes from implementation. Persists and evolves with the feature.
    - `tasks.md` — the work plan of a change in flight. Exists only while that change is underway; a feature with no change in flight has no tasks file.
12. Workflow: write or update the spec *before* implementing, and new features need user approval of `requirements.md` before code is written. After implementation, reconcile: `requirements.md` and `design.md` are brought to match what was actually built and stay truthful as the feature evolves; `tasks.md` is deleted once its durable residue — verification record, known gaps, deviations from the plan — has moved into `design.md`. A plan's history belongs to git, not to the artifact.
13. Right-sizing: bug fixes and mechanical changes need no spec. Anything that changes behavior, adds a capability or makes an architectural choice does.
14. Specs are concise. A spec that is tedious to review is a defect, per the review-burden critique in the SDD literature this method is based on.

## Meaning: one vocabulary

15. *Behavior is named once.* The individuals, values, actions and facts of the prototype are enumerated in the [ontology of phenomena](ontology-of-phenomena/ontology.md), and every artifact that names a happening of the software — this constitution, a spec, a paragraph of the agent's prompt, a tool signature, a card sentence, a check — names it by the ontology's name. A name that appears nowhere in the ontology is a defect in one or the other: if the ontology mis-describes what is built, the ontology is reconciled to the code under #12; if the code names one meaning two ways, the ontology records the finding. The vocabulary describes rather than renames — a name already persisted in the workspace store, the product model or a thread checkpoint stays as it is, and realigning one is its own change with its own migration.

## Expression: meaning needs a channel that survives

16. *A state or a reason is carried by a token or by a sentence.* Not by an opacity, which composes multiplicatively down the tree so that no call site can see what its fade will be multiplied by. Not by hover, which a touch screen does not have and a disabled control never gets. Not by a line style, and not by colour, which are the ordinary forms of the rule. Every explanation the interface owes somebody — above all the named rules of #6, which reach a keyboard user or reach nobody — is on the page, and a control that cannot be focused points at the sentence rather than hiding it in a `title`. Reading matter is 14px and chrome is 12px, with nothing below. This is a rule about expression, so it binds at every call site rather than in one feature: there is no spec that owns it and none that is exempt from it.
