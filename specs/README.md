# Specs

This project uses lightweight spec-anchored development (see [constitution.md](constitution.md), process section). Each feature directory holds `requirements.md`, `design.md`, and `tasks.md`; specs persist and evolve with their features.

Design framing and direction for the whole prototype: [docs/discovery/](../docs/discovery/) — start with the [discovery brief](../docs/discovery/brief.md). Specs execute against the direction set there; each new spec should cite the principle or assertion it serves.

Research grounding: [docs/research/](../docs/research/README.md) — one note per verdict, with what is still missing collected in [gaps.md](../docs/research/gaps.md). User and journey grounding (JTBD): [docs/discovery/jtbd/](../docs/discovery/jtbd/).

## Features

| Spec | Feature | Status |
|------|---------|--------|
| [001-product-model](001-product-model/) | Mock elevator product model + validator | Implemented |
| [002-solver-service](002-solver-service/) | Interactive Z3 solver service | Implemented |
| [003-agent-tools](003-agent-tools/) | Configuration state + solver-backed agent tools | Implemented |
| [004-configuration-canvas](004-configuration-canvas/) | Spec-sheet canvas + in-chat generated controls | Implemented |
| [005-nonlinear-interaction](005-nonlinear-interaction/) | Revision with ripple, candidate frames, resumption | Implemented |
| [006-demo-scenarios](006-demo-scenarios/) | Scripted walkthroughs as definition of done | Draft — awaiting approval (to be recast per 007) |
| [007-eaas-pivot](007-eaas-pivot/) | Elevator-as-a-service pivot | Draft — awaiting approval |
| [008-environmental-footprint](008-environmental-footprint/) | Environmental footprint as a decision dimension | Draft — awaiting approval |
