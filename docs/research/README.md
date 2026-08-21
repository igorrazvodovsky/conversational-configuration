# Research

The evidence base for the prototype: what is *known*, as distinct from what design problem is being solved ([discovery](../discovery/README.md)) and what gets built ([specs](../specs/README.md)).

The folder holds one note per verdict, on the same principle as the [JTBD analysis](../discovery/jtbd/README.md): a note holds a model of what the evidence says, and its strength is stated at the top rather than left for the reader to infer. Decisions live in the discovery artifacts and the specs, not here.

The point of that decomposition is [gaps.md](gaps.md). With each verdict in its own note, what is missing stops being a paragraph at the end of a long document and becomes a register you can act on.

## The notes

| Note | What it holds | What it grounds | Evidence |
|---|---|---|---|
| [interaction-literature.md](interaction-literature.md) | Five HCI, CRS and configuration threads, and the gap at their intersection | The novelty claim; several of the [assertions](../discovery/assertions/); the [canvas](../specs/agreement-document/requirements.md) and [nonlinear-interaction](../specs/nonlinear-interaction/requirements.md) specs | Published, peer-reviewed. Solid |
| [configuration-field.md](configuration-field.md) | Configuration as a research field, the elevator benchmark, industry CPQ practice | Propose-check-repair framing; the scale of the [product model](../specs/product-model/requirements.md) | Solid; the CPQ half is vendor material read critically |
| [elevator-domain.md](elevator-domain.md) | Real decisions, dimensions and coupled constraints | The variable set of the [product model](../specs/product-model/requirements.md) | Manufacturer planning data. Solid for illustrative modelling |
| [solver-choice.md](solver-choice.md) | Why Z3, and what its three operations license the interface to claim | The [solver service](../specs/solver-service/requirements.md); [every refusal names the rules that caused it](../discovery/principles/refusals-name-their-rules.md) | Evaluated, then verified by implementation |
| [architecture-consensus.md](architecture-consensus.md) | The layer diagram the research and the repo agree on | Every implemented spec, as built | Synthesis of the other notes |
| [copilotkit-surface.md](copilotkit-surface.md) | What the platform offers at this tier, what the repo uses, and what each unused piece was rejected for | [shared attention](../specs/shared-attention/requirements.md), [suggested moves](../specs/suggested-moves/requirements.md), the state transport in [parallel drafts](../specs/parallel-drafts/design.md), and the removal of the starter's MCP configuration | Read out of the installed packages rather than the docs. Solid, with the unrun questions listed under *What this note does not establish* |
| [living-document-undo.md](living-document-undo.md) | How the shipped living-document tools reverse accepted AI proposals | The [undo spec](../specs/undo/requirements.md); the undo half of [the living-document teardown](gaps.md#living-document-teardown) | Vendor docs and help pages read remotely; inferences marked. No hands-on use |
| [branching-in-ai-uis.md](branching-in-ai-uis.md) | Branching as an AI and agentic pattern — what forks, where the fork is taken, and the pre-LLM evidence for holding alternatives in parallel | [parallel drafts](../specs/parallel-drafts/requirements.md), read against the pattern; [no unpinned document branching](gaps.md#no-unpinned-document-branching) | Mixed, and it says so: two pattern libraries and one starter kit on the AI side, two peer-reviewed empirical results on the pre-LLM side |
| [gaps.md](gaps.md) | The register: literature gaps, retrievable gaps, gaps reading cannot close | Deciding what is worth reading next | — |

### [footprint/](footprint/README.md) — the sustainability thread

Six notes, kept together because they answer one question and share one provenance discipline. The [subfolder index](footprint/README.md) carries their verdicts in one line each.

| Note | What it holds | What it grounds | Evidence |
|---|---|---|---|
| [lifecycle.md](footprint/lifecycle.md) | Two verified EPDs module by module; how the embodied and use split moves with traffic | The footprint spec's two-term structure | Strong: two third-party-verified EPDs. The high-traffic column is derived ([no high-traffic EPD](gaps.md#no-high-traffic-epd)) |
| [use-phase-energy.md](footprint/use-phase-energy.md) | ISO 25745 machinery, load factor, standby, regenerative drives | The footprint spec's energy model | Structure well documented in open literature; class boundaries missing ([the paywalled class boundaries](gaps.md#paywalled-class-boundaries)) |
| [embodied-carbon.md](footprint/embodied-carbon.md) | Bottom-up per-option carbon, calibrated against the EPD anchor | Per-option `co2` values; the price-carbon decorrelation finding | *Thin.* Mostly assumed masses, and *Drive, counterweight and platform* is the weakest thing in the folder ([the assumed material factors](gaps.md#assumed-material-factors), [no component-level embodied data](gaps.md#no-component-level-embodied-data)) |
| [claims-and-vocabulary.md](footprint/claims-and-vocabulary.md) | EPD and EN 15804 vocabulary, and what counts as greenwashing | Every footprint string in the UI; the footprint spec's assumptions panel | Solid: standards texts and Directive (EU) 2024/825 |
| [assumptions.md](footprint/assumptions.md) | Service life, grid factor, usage profile per building type | The three defaults the footprint spec has to declare | Solid, one figure unverified ([the unread grid factor](gaps.md#unread-grid-factor)) |
| [sustainability-prior-art.md](footprint/sustainability-prior-art.md) | Configurator prior art, carbon-presentation evidence, and what backfires | [two objectives held as a pair](../discovery/assertions/two-objectives-as-a-pair.md); [trade-offs shown as a pair](../discovery/principles/trade-offs-shown-as-a-pair.md); the footprint spec's comparison view | Prior art solid; presentation evidence is all food labelling ([carbon labelling is all food](gaps.md#carbon-labelling-is-all-food)) |

## Provenance tags

The footprint notes tag every quantity, and the discipline is worth keeping for anything added here. The prototype's own acceptance criteria say every footprint number has to trace to model data or a solver computation and never to the LLM, and grounding documentation full of confident but unsourced figures would undermine that from the start.

| Tag | Meaning |
|-----|---------|
| *retrieved* | Taken from a source fetched while writing the note; the URL is given inline. |
| *derived* | Arithmetic performed in the note on retrieved values; the inputs are cited so the step is checkable. |
| *assumed* | An engineering placeholder chosen for plausible magnitude. No source, and fair game to change. |

Where evidence is thin, the note says so rather than papering over it. [Bottom-up embodied carbon](footprint/embodied-carbon.md) is thin by nature, and says so throughout.

## What is not here

Design principles and plans of first steps are decisions rather than evidence, so they live elsewhere.

- The principles are in [docs/discovery/principles/](../discovery/principles/), one note each with its test. One of them, generated in-chat controls, became [generated in-chat controls work better than free text](../discovery/assertions/generated-controls-work-better-than-free-text.md), which is the right home for it: a claim to test rather than a rule to decide by.
- What comes next is the spec sequence from the [product model](../specs/product-model/requirements.md) through the [conversation checks](../specs/conversation-checks/requirements.md) that run the [demo scenarios](../discovery/scenarios/), plus the [phase plan](../discovery/phase-plan.md).

Reading order for a newcomer: the [brief](../discovery/brief.md) first, for the standing position, then whichever note the current work touches, then [gaps.md](gaps.md) before proposing more research.
