# Specs

This project uses lightweight spec-anchored development (see [constitution.md](constitution.md), process section). Each feature directory holds `requirements.md`, `design.md`, and `tasks.md`; specs persist and evolve with their features.

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
| [demo-scenarios](demo-scenarios/) | Scripted walkthroughs as definition of done | Draft — awaiting approval (to be recast for the service pivot) |
| [eaas-pivot](eaas-pivot/) | Elevator-as-a-service pivot | Draft — awaiting approval |
| [environmental-footprint](environmental-footprint/) | Environmental footprint as a decision dimension | Draft — awaiting approval |
