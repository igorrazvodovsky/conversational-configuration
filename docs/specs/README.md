# Specs

This project uses lightweight spec-anchored development (see [constitution.md](constitution.md), process section). Each feature directory holds `requirements.md` and `design.md`, which persist and evolve with the feature, plus `tasks.md` while a change is in flight — the work plan is retired at reconciliation, its durable residue folded into `design.md`.

Design framing and direction for the whole prototype: [docs/discovery/](../discovery/) — start with the [discovery brief](../discovery/brief.md). Specs execute against the direction set there; each new spec should cite the principle or assertion it serves.

Research grounding: [docs/research/](../research/README.md) — one note per verdict, with what is still missing collected in [gaps.md](../research/gaps.md). User and journey grounding (JTBD): [docs/discovery/jtbd/](../discovery/jtbd/).

## Features

Listed in dependency order — each builds on the ones above it. Nothing else depends on the order, and specs are cited by name, never by position.

| Feature | What it covers | Status |
|---|---|---|
| [product-model](product-model/) | Mock elevator product model + validator | Implemented |
| [solver-service](solver-service/) | Interactive Z3 solver service | Implemented |
| [agent-tools](agent-tools/) | Configuration state + solver-backed agent tools | Implemented |
| [nonlinear-interaction](nonlinear-interaction/) | Revision with ripple, parallel candidates, resumption | Implemented; the parallel-candidates half now lives in [parallel-drafts](parallel-drafts/) |
| [conversation-checks](conversation-checks/) | The [demo scenarios](../discovery/scenarios/) as executable checks on conversation behavior | Implemented; all five run against the live agent. The scenarios themselves are discovery, and the presenter document is [docs/demo-scenarios.md](../demo-scenarios.md), not yet walked in a browser |
| [service-agreement](service-agreement/) | Elevator as a service: outcome terms, monthly price, derived hardware | Implemented |
| [environmental-footprint](environmental-footprint/) | Environmental footprint as a decision dimension | Implemented |
| [agreement-workspace](agreement-workspace/) | Durable workspace per installation; conversations decoupled from the agreement | Implemented, with one criterion added 2026-08-16 and not yet built: a card made inert because the agreement moved on must say so, where the shipped card only dims |
| [ui-component-library](ui-component-library/) | shadcn/ui as the component vocabulary; zinc palette, Lyra style | Implemented |
| [chat-pane](chat-pane/) | What the chat is made of: the transcript, rows, composer and attachments, composed from `CopilotChat`'s slots | Implemented |
| [chat-attachments](chat-attachments/) | A file attached in chat becomes text the agent can read; nothing attachable can break a conversation | Implemented |
| [rfq-reconciliation](rfq-reconciliation/) | RFQ-seeded agreements: document ingestion, deviation register, reconciliation moves | Built and verified against both fixtures. Stage one only — prescriptive hardware-parameter RFQs are a separate spec |
| [choice-provenance](choice-provenance/) | The customer's words frozen onto prose-stated choices; the badge popover answers "why is this value here?" in those words | Draft — awaiting approval |
| [agreement-document](agreement-document/) | The canvas whole: the agreement as a layered document — recitals, operative terms, schedules — the edit grammar every value on it uses, and the in-chat generated controls that share that grammar | Implemented; the move mix the genre change predicts is not yet measured |
| [chat-surface](chat-surface/) | The chat's *geometry* as a user-chosen mode: sidebar, floating, full screen, hidden — where chat-pane covers what it is made of. Carries the conversation list in the pane's own header, so the workspace has two surfaces and no navigation column | Implemented; the transcript-behaviour half of the verification is still outstanding (see its `tasks.md`) |
| [shared-attention](shared-attention/) | The agent reads what the operator has open; the document reveals what the agent just changed. One transient channel each way, no configuration and nothing durable | Implemented; the conversation move inventory amendment is applied. One measured gap: a stale transcript containing the agent's own contradicting answer can still anchor it (see design) |
| [suggested-moves](suggested-moves/) | What the suggestion pills say: entry prompts on an empty agreement, moves available on this one thereafter | Implemented, with four families of the move inventory offered. *Accept* and *fork and compare* wait for a mechanism and a surface respectively (see design) |
| [undo](undo/) | One-move reversal of any applied batch, the agent's included | Implemented and run in the app. The scenario turns are written but not yet billed; one inherited gap, a dispatch lost in the seconds after a conversation switch (see design) |
| [parallel-drafts](parallel-drafts/) | The workspace holds several drafts of its agreement, one current — each a full configuration with its own provenance and history, replacing the lossy frames | Implemented 2026-08-17 and run in the app. One known gap: a fork taken from the canvas in a conversation with nothing in it gets a name with nothing behind it (see design) |
| [open-points](open-points/) | The agreement's open points — the questions still awaiting an answer, derived from the workspace record, never stored — and acceptance as the recorded fact that closes the last of them | Draft — awaiting approval |
| [visual-configuration](visual-configuration/) | The configured car drawn from the configuration — procedural geometry, several viewpoints, the schedules said in the building's terms rather than the catalogue's | Implemented 2026-08-19 and run in the app. One known gap: the first entry into the render waits several seconds on the environment map, behind a loading line (see design) |
