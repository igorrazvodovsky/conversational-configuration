# Footprint research

The evidence base for environmental footprint as a decision dimension — spec [008](../../../specs/008-environmental-footprint/requirements.md), assertion A7, principle P7. Split out of `docs/environmental-footprint-research.md`, one note per verdict.

Working question: what does an elevator's life-cycle carbon actually look like, which of it responds to the choices our configurator exposes, and what may we honestly say about illustrative numbers in a UI?

| Note | Verdict, in one line |
|---|---|
| [lifecycle.md](lifecycle.md) | Embodied dominates the EPDs at 58–63%, but only because they assume low traffic and a clean grid; under office duty the ordering reverses |
| [use-phase-energy.md](use-phase-energy.md) | ISO 25745's machinery is documented in the open literature; standby dominates at low usage and is irrelevant at high traffic; the A–G boundaries are paywalled and were not guessed |
| [embodied-carbon.md](embodied-carbon.md) | Option-granular EPDs do not exist; bottom-up plus calibration is the defensible method, and it shows travel height beating every cosmetic choice by an order of magnitude |
| [claims-and-vocabulary.md](claims-and-vocabulary.md) | Estimate, model, illustration — yes. EPD, declaration, class, verified — no, and since 27 September 2026 some phrasings are unlawful in the EU |
| [assumptions.md](assumptions.md) | 25 years, 0.22 kg CO₂e/kWh, usage profile by building type — all three defensible, with the grid factor the only contested one |
| [sustainability-prior-art.md](sustainability-prior-art.md) | The configuration community has published the architecture and the metrics but not the interaction design; the carbon-presentation literature has specific findings about what backfires |

Every quantity in these notes carries a provenance tag — *retrieved*, *derived* or *assumed*, defined in [../README.md](../README.md#provenance-tags). What the evidence does not cover is in [../gaps.md](../gaps.md): [E1](../gaps.md#e1)–[E5](../gaps.md#e5) are retrievable and [L4](../gaps.md#l4)–[L5](../gaps.md#l5) are not.

Read [lifecycle.md](lifecycle.md) first — the other notes are its terms, its assumptions, and its constraints on what may be said.
