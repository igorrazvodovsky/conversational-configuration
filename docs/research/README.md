# Research

The evidence base for the prototype: what is *known*, as distinct from what design problem we are solving ([../discovery/](../discovery/README.md)) and what gets built ([../../specs/README.md](../../specs/README.md)).

Two memos used to hold all of this — `research-and-outline.md` and `environmental-footprint-research.md`. They are now decomposed into one note per verdict, on the same principle as [../discovery/jtbd/](../discovery/jtbd/README.md): a note holds a model of what the evidence says, and its strength is stated at the top rather than left for the reader to infer. Decisions live in the discovery artifacts and the specs, not here.

The point of the decomposition is [gaps.md](gaps.md): with each verdict in its own note, what is missing stops being a paragraph at the end of a long document and becomes a register you can act on.

## The notes

| Note | What it holds | What it grounds | Evidence |
|---|---|---|---|
| [interaction-literature.md](interaction-literature.md) | Five HCI/CRS/configuration threads and the gap at their intersection | The novelty claim; assertions A1–A5; specs 004, 005 | Published, peer-reviewed. Solid |
| [configuration-field.md](configuration-field.md) | Configuration as a research field, the elevator benchmark, industry CPQ practice | Propose-check-repair framing; model scale in spec 001 | Solid; the CPQ half is vendor material read critically |
| [elevator-domain.md](elevator-domain.md) | Real decisions, dimensions and coupled constraints | The variable set of spec 001 | Manufacturer planning data. Solid for illustrative modelling |
| [solver-choice.md](solver-choice.md) | Why Z3, and what its three operations license the interface to claim | Spec 002; principle P4 | Evaluated, then verified by implementation |
| [architecture-consensus.md](architecture-consensus.md) | The layer diagram the research and the repo agree on | Specs 001–005, as built | Synthesis of the notes above |
| [gaps.md](gaps.md) | The register: literature gaps, retrievable gaps, gaps reading cannot close | Deciding what is worth reading next — usually nothing | — |

### [footprint/](footprint/README.md) — the sustainability thread

Six notes, kept together because they answer one question and share one provenance discipline; the [subfolder index](footprint/README.md) carries their verdicts in one line each.

| Note | What it holds | What it grounds | Evidence |
|---|---|---|---|
| [lifecycle.md](footprint/lifecycle.md) | Two verified EPDs module by module; how the embodied/use split moves with traffic | Spec 008's two-term structure | Strong: two third-party-verified EPDs. High-traffic column is derived ([E2](gaps.md#e2)) |
| [use-phase-energy.md](footprint/use-phase-energy.md) | ISO 25745 machinery, load factor, standby, regenerative drives | The energy model in 008 | Structure well documented in open literature; class boundaries missing ([E1](gaps.md#e1)) |
| [embodied-carbon.md](footprint/embodied-carbon.md) | Bottom-up per-option carbon, calibrated against the EPD anchor | Per-option `co2` values; the price-carbon decorrelation finding | *Thin.* Mostly assumed masses; §6 is the weakest thing in the folder ([E4](gaps.md#e4), [L5](gaps.md#l5)) |
| [claims-and-vocabulary.md](footprint/claims-and-vocabulary.md) | EPD/EN 15804 vocabulary and what counts as greenwashing | Every footprint string in the UI; 008's assumptions panel | Solid: standards texts and Directive (EU) 2024/825 |
| [assumptions.md](footprint/assumptions.md) | Service life, grid factor, usage profile per building type | The three defaults 008 must declare | Solid, one figure unverified ([E5](gaps.md#e5)) |
| [sustainability-prior-art.md](footprint/sustainability-prior-art.md) | Configurator prior art, carbon-presentation evidence, and what backfires | Assertion A7; principle P7; 008's comparison view | Prior art solid; presentation evidence is all food labelling ([L4](gaps.md#l4)) |

## Provenance tags

The footprint notes tag every quantity, and the discipline is worth keeping for anything added here. The prototype's own acceptance criteria say every footprint number must trace to model data or a solver computation and never to the LLM — grounding documentation full of confident but unsourced figures would poison that at the root.

| Tag | Meaning |
|-----|---------|
| *retrieved* | Taken from a source fetched while writing the note; URL given inline. |
| *derived* | Arithmetic performed in the note on retrieved values; the inputs are cited so the step is checkable. |
| *assumed* | An engineering placeholder chosen for plausible magnitude. No source. Fair game to change. |

Where evidence is thin, the note says so rather than papering over it. [embodied-carbon.md](footprint/embodied-carbon.md) is thin by nature and says so throughout.

## What is not here

The source memos also carried six design principles and a six-step plan of first steps. Those were decisions, not evidence, and they have been superseded rather than moved:

- the design principles → [../discovery/direction.md](../discovery/direction.md) §2, restated as eight interaction principles with tests. Five map one-to-one (needs-based → P2, critiquing → P1, mixed initiative → P8 and P5, nonlinear revision → P6, cores not hallucination → P4); the sixth, generated in-chat controls, became assertion A3 in [../discovery/problem-framing.md](../discovery/problem-framing.md) §4, which is the right home for it — it is a claim to test, not a rule to decide by
- the six first steps → the spec sequence 001–006, and [../discovery/phase-plan.md](../discovery/phase-plan.md) for what comes next

The layer diagram that accompanied them survives as [architecture-consensus.md](architecture-consensus.md), since it is the only drawing of how the pieces fit and the built system still matches it.

Reading order for a newcomer: [../discovery/brief.md](../discovery/brief.md) first for the standing position, then whichever note the current work touches, then [gaps.md](gaps.md) before proposing more research.
