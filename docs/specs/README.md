# Specs

This project uses lightweight spec-anchored development, described in the process section of [constitution.md](constitution.md). Each feature directory holds `requirements.md` and `design.md`, which persist and evolve with the feature, plus `tasks.md` while a change is in flight. The work plan is retired at reconciliation, and its durable residue is folded into `design.md`.

Design framing and direction for the whole prototype live in [docs/discovery/](../discovery/) — start with the [discovery brief](../discovery/brief.md). Specs execute against the direction set there, and each new spec cites the principle or assertion it serves.

Research grounding is in [docs/research/](../research/README.md), one note per verdict, with what is still missing collected in [gaps.md](../research/gaps.md). User and journey grounding is the [JTBD analysis](../discovery/jtbd/).

## Features

They are listed in dependency order, each building on the ones above it. Nothing else depends on the order, and specs are cited by name rather than by position.

The Status column carries a state and nothing more. What was verified, what deviated from the plan and what gaps remain are the feature's own to state: every `requirements.md` opens on a `Status:` line, and `design.md` holds the verification record and the known gaps.

Every `design.md` opens instead on one line saying what it rules and the change that should send you to it, so the third line of each is a router over the whole design layer. Keep both ledes on the third line when adding a spec.

| Feature | What it covers | Status |
|---|---|---|
| [product-model](product-model/) | Mock elevator product model and validator | Implemented |
| [solver-service](solver-service/) | Interactive Z3 solver service | Implemented |
| [agent-tools](agent-tools/) | Configuration state and solver-backed agent tools | Implemented |
| [nonlinear-interaction](nonlinear-interaction/) | Revision with ripple, parallel candidates, resumption | Implemented |
| [conversation-checks](conversation-checks/) | The [demo scenarios](../discovery/scenarios/) as executable checks on conversation behavior | Implemented |
| [offline-checks](offline-checks/) | Everything that runs without a provider key: the agent's tools and store, the frontend logic that is not UI, the couplings that cross the language boundary, and the CI that runs them | Implemented |
| [service-agreement](service-agreement/) | Elevator as a service: outcome terms, monthly price, derived hardware | Implemented |
| [environmental-footprint](environmental-footprint/) | Environmental footprint as a decision dimension | Implemented |
| [agreement-workspace](agreement-workspace/) | Durable workspace per installation; conversations decoupled from the agreement | Implemented |
| [ui-component-library](ui-component-library/) | shadcn/ui as the component vocabulary; zinc palette, Lyra style | Implemented |
| [chat-pane](chat-pane/) | What the chat is made of: the transcript, rows, composer and attachments, composed from `CopilotChat`'s slots | Implemented |
| [chat-attachments](chat-attachments/) | A file attached in chat becomes text the agent can read, and nothing attachable can break a conversation | Implemented |
| [rfq-reconciliation](rfq-reconciliation/) | RFQ-seeded agreements: document ingestion, deviation register, reconciliation moves | Implemented |
| [choice-provenance](choice-provenance/) | The customer's words frozen onto prose-stated choices; the badge popover answers "why is this value here?" in those words | Draft — awaiting approval |
| [agreement-document](agreement-document/) | The canvas whole: the agreement as a layered document — recitals, operative terms, schedules — the edit grammar every value on it uses, and the in-chat generated controls that share that grammar | Implemented |
| [chat-surface](chat-surface/) | The chat's *geometry* as a user-chosen mode: sidebar, floating, full screen, hidden — where chat-pane covers what it is made of. Carries the conversation list in the pane's own header, so the workspace has two surfaces and no navigation column | Implemented |
| [shared-attention](shared-attention/) | The agent reads what the operator has open, and the document reveals what the agent just changed. One transient channel each way, no configuration and nothing durable | Implemented |
| [suggested-moves](suggested-moves/) | What the suggestion pills say: entry prompts on an empty agreement, moves available on this one thereafter | Implemented |
| [undo](undo/) | One-move reversal of any applied batch, the agent's included | Implemented |
| [parallel-drafts](parallel-drafts/) | The workspace holds several drafts of its agreement, one current — each a full configuration with its own provenance and history, replacing the lossy frames | Implemented |
| [open-points](open-points/) | The agreement's open points — the questions still awaiting an answer, derived from the workspace record and never stored — and acceptance as the recorded fact that closes the last of them | Draft — awaiting approval |
| [interface-checks](interface-checks/) | The third tier of checks: the frontend's stateful middle — a conversation attaching to a workspace, the agreement it lands on, card staleness — rendered against a mocked AG-UI stream, with no provider key and no agent process | Implemented |
| [visual-configuration](visual-configuration/) | The configured car drawn from the configuration — procedural geometry, several viewpoints, the schedules said in the building's terms rather than the catalogue's | Implemented |
| [accessible-surface](accessible-surface/) | How a state and a reason are expressed: what may carry meaning, what inertness and unavailability look like, the floor under text size, and the focus indicator | Implemented |
| [ontology-of-phenomena](ontology-of-phenomena/) | One vocabulary for what the prototype does: the individuals, values, actions and facts every artifact names it by, and where the artifacts currently disagree | Implemented |
| [one-gesture-one-action](one-gesture-one-action/) | A change the customer clicks applies whole or comes back with repair paths, decided term or not — so a gesture reaches one action instead of the one the agent judges | Implemented |
| [action-log](action-log/) | The durable record holds moves as well as states: a per-draft append-only log of typed actions over named facts, replacing the undo snapshots and walked by undo and redo | Implemented |
| [document-clauses](document-clauses/) | The customer's document held as one kind of thing: clauses with identity, told apart by the facts they carry, so a clause left to us has somewhere to live and a mark lands on the clause it answers | Implemented |
| [code-of-conduct](code-of-conduct/) | The actions partitioned into concepts, and the rules over them declared as reactions a check can fail on — so constitution #1, #5 and #6 bind by mechanism rather than by wording | Draft — awaiting approval |
