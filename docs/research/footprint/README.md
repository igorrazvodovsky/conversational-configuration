# Footprint research

The evidence base for environmental footprint as a decision dimension: the [footprint spec](../../specs/environmental-footprint/requirements.md), [two objectives held as a pair](../../discovery/assertions/two-objectives-as-a-pair.md), and [trade-offs shown as a pair](../../discovery/principles/trade-offs-shown-as-a-pair.md). It holds one note per verdict.

Working question: what does an elevator's life-cycle carbon actually look like, which of it responds to the choices this configurator exposes, and what may we honestly say about illustrative numbers in a UI?

| Note | Verdict, in one line |
|---|---|
| [lifecycle.md](lifecycle.md) | Embodied dominates the EPDs at 58–63%, but only because they assume low traffic and a clean grid; under office duty the ordering reverses |
| [use-phase-energy.md](use-phase-energy.md) | ISO 25745's machinery is documented in the open literature; standby dominates at low usage and is irrelevant at high traffic; the A–G boundaries are paywalled and were not guessed |
| [embodied-carbon.md](embodied-carbon.md) | Option-granular EPDs don't exist; bottom-up plus calibration is the defensible method, and it shows travel height beating every cosmetic choice by an order of magnitude |
| [claims-and-vocabulary.md](claims-and-vocabulary.md) | Estimate, model and illustration are allowed. EPD, declaration, class and verified are not, and from 27 September 2026 some phrasings are unlawful in the EU |
| [assumptions.md](assumptions.md) | 25 years, 0.22 kg CO₂e/kWh, and usage profile by building type are all three defensible, with the grid factor the only contested one |
| [sustainability-prior-art.md](sustainability-prior-art.md) | The configuration community has published the architecture and the metrics but not the interaction design; the carbon-presentation literature has specific findings about what backfires |

Every quantity in these notes carries a provenance tag — *retrieved*, *derived* or *assumed* — defined in the [research index](../README.md#provenance-tags). What the evidence doesn't cover is in the [gap register](../gaps.md). Five of its entries are retrievable, and two aren't: [carbon labelling is all food](../gaps.md#carbon-labelling-is-all-food) and [no component-level embodied data](../gaps.md#no-component-level-embodied-data).

Read [lifecycle.md](lifecycle.md) first. The other notes are its terms, its assumptions, and its constraints on what may be said.
