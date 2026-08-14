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
| [configuration-canvas](configuration-canvas/) | Spec-sheet canvas + in-chat generated controls | Implemented |
| [nonlinear-interaction](nonlinear-interaction/) | Revision with ripple, candidate frames, resumption | Implemented |
| [demo-scenarios](demo-scenarios/) | Scripted walkthroughs as definition of done | Approved; harness and scenario 2 built. Remaining: scenarios 1, 3, 4, the presenter document, and scenario 5 (now unblocked — rfq-reconciliation is built). Still to be recast to the service frame's job stories |
| [service-agreement](service-agreement/) | Elevator as a service: outcome terms, monthly price, derived hardware | Implemented |
| [environmental-footprint](environmental-footprint/) | Environmental footprint as a decision dimension | Implemented |
| [agreement-workspace](agreement-workspace/) | Durable workspace per installation; conversations decoupled from the agreement | Implemented |
| [ui-component-library](ui-component-library/) | shadcn/ui as the component vocabulary; zinc palette, Lyra style | Implemented |
| [chat-pane](chat-pane/) | What the chat is made of: the transcript, rows, composer and attachments, composed from `CopilotChat`'s slots | Implemented |
| [chat-attachments](chat-attachments/) | A file attached in chat becomes text the agent can read; nothing attachable can break a conversation | Implemented |
| [rfq-reconciliation](rfq-reconciliation/) | RFQ-seeded agreements: document ingestion, deviation register, reconciliation moves | Built and verified against both fixtures. Stage one only — prescriptive hardware-parameter RFQs are a separate spec |
| [choice-provenance](choice-provenance/) | The customer's words frozen onto prose-stated choices; the badge popover answers "why is this value here?" in those words | Draft — awaiting approval |
| [agreement-document](agreement-document/) | Canvas recast in the agreement's genre: recitals, operative terms, schedules; editable in place | Built and walked through. The move mix the genre change predicts is not yet measured |
| [chat-surface](chat-surface/) | The chat's *geometry* as a user-chosen mode: sidebar, floating, full screen, hidden — where chat-pane covers what it is made of. Carries the conversation list in the pane's own header, so the workspace has two surfaces and no navigation column | Implemented; the transcript-behaviour half of the verification is still outstanding (see its `tasks.md`) |
| [undo](undo/) | One-move reversal of any applied move, the agent's included | Seed — research ([gaps E6](../research/gaps.md#e6)) before a first draft |
