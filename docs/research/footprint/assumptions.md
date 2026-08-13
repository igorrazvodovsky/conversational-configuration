# Footprint assumptions to fix — service life, grid factor, usage profile

Status: evidence memo, 2026-08. Split from the former `docs/environmental-footprint-research.md` §5. Provenance tags as defined in [README.md](../README.md#provenance-tags). These three defaults are what spec [008](../../specs/environmental-footprint/requirements.md)'s assumptions panel has to declare.

Verdict: *all three defaults are retrievable and defensible. The only genuinely contested one is the grid factor, where the EPD convention and the physically-honest answer differ — recommend the EPD convention as the default with a decarbonising scenario as an inspectable alternative.*

## 1. Service life — 25 years

Both KONE EPDs declare a *designed reference service life of 25 years* (*retrieved*). The 300 DX footnotes its basis: the figure is "aligned with the typical service life data published by elevator manufacturers. For elevators, it may take up to 20–30 years before major retrofitting is necessary," citing Sachs, *Opportunities for Elevator Energy Efficiency Improvements*, ACEEE 2005. It also states the maintenance condition attached to that life: rope changes typically every 8 years, and the component change frequency holds for lifts up to 200,000 starts/year.

Recommendation: *25 years*, matching both EPDs, and quotable. The [footprint spec](../../specs/environmental-footprint/requirements.md) already fixes service life independently of the [service pivot](../../specs/eaas-pivot/requirements.md)'s contract term; that separation is right — an EaaS contract length is a commercial fact, service life is a physical assumption, and conflating them would make footprint numbers move for the wrong reason.

## 2. Grid emission factor

Retrieved anchors:

| Source | Figure | Note |
|---|---|---|
| EEA, EU-27 electricity generation intensity, 2023 | *242 g CO₂/kWh* | down 17% from 292 g in 2022 — see provenance caveat below |
| EEA, 2024 | ~*220 g CO₂/kWh* (*derived* from EEA's stated 9% year-on-year fall) | early estimate |
| KONE MonoSpace 700 DX EPD, Belgium | *0.21 kg CO₂/kWh* | the EPD's own use-phase factor |
| KONE MonoSpace 300 DX EPD, Belgium | *0.230 kg CO₂e/kWh* (*derived*) | consistent |

Sources: [EEA GHG emission intensity of electricity generation](https://www.eea.europa.eu/en/analysis/indicators/greenhouse-gas-emission-intensity-of-1/greenhouse-gas-emission-intensity), plus the EPDs above. Provenance caveat: the EEA indicator page renders its figures in an interactive chart backed by a CSV, and neither fetched as text here — the 242 g and the 9% year-on-year fall come from EEA text surfaced in search rather than from a page read directly. Before this default is cited anywhere load-bearing, download `co2-emission-intensity-15.csv` from the EEA and confirm ([gaps.md](../gaps.md#e5)). The two EPD-derived Belgian factors were read directly and independently corroborate the ~0.21–0.23 magnitude.

One trap worth naming. The 700 DX EPD publishes a per-country table for *manufacturing* electricity using *residual or national supplier mixes*: Poland 1.11, Germany 0.80, Czech Republic 0.76, Estonia 0.64, Italy 0.64, Austria 0.22, China 0.95 kg CO₂e/kWh (*retrieved*). These are residual mixes and run far above the corresponding location-based generation intensities — Poland at 1.11 versus an EEA generation intensity roughly half that. Residual-mix and location-based factors are not interchangeable, and mixing them silently is one of the easier ways to produce a number that is defensible-looking and wrong.

The real decision is current-fixed versus projected. A 25-year service life against a grid that fell 17% in a single year means a fixed current factor materially *overstates* lifetime use-phase carbon. EPD practice nonetheless fixes a current factor, which is why the EPDs above show use-phase at only 21–29%.

The [RICS Whole Life Carbon Assessment professional standard, 2nd edition](https://www.rics.org/content/dam/ricsglobal/documents/standards/Whole_life_carbon_assessment_PS_Sept23.pdf) resolves this properly (*retrieved*): use three scenarios — a central "net zero-compatible" factor for the headline, with fully-decarbonised and non-decarbonised runs as bookends to expose the uncertainty; projections should come from government or designated bodies, and where a range exists the conservative scenario applies.

Recommendation: default to a *fixed 0.22 kg CO₂e/kWh European average*, which matches both EPD anchors and the EEA 2024 estimate closely enough, and is the convention a reader will expect. Expose a *decarbonising alternative* in the assumptions panel rather than burying the issue — for a prototype whose subject is how people reason about trade-offs in conversation, "the answer depends on which grid you assume, here is both" is more interesting than any single number. Do not regionalise; 008 rightly puts that out of scope.

## 3. Usage profile by building type

ISO 25745-2's categories map cleanly onto the model's existing `building_type` variable, which is the natural home for this. Category assignments below are *assumed*, interpolated onto the retrieved trips/day table in [use-phase-energy.md](use-phase-energy.md) §2:

| `building_type` | Usage category | Trips/day | Basis |
|---|---|---|---|
| `residential` | 1–2 | 50–125 | E4 found residential dominated by standby (~70%), consistent with UC1–2 |
| `hotel` | 3 | 300 | matches both KONE EPDs' declared UC3 |
| `office` | 4 | 750 | the Schindler UC4 label case is an office-class unit |
| `retail` | 4–5 | 750–1500 | long operating hours, high footfall |
| `hospital` | 4 | 750 | high intensity, but bed/stretcher lifts run heavier and slower |

Also fix *365 operating days/year* (both EPDs declare it, *retrieved*), which matters because the residential/weekend duty pattern in the monitored case in [use-phase-energy.md](use-phase-energy.md) §5 showed weekday and weekend traffic differing by more than 10×. A single trips/day figure per building type is a real simplification, and the assumptions panel should say so.

## Related

- [use-phase-energy.md](use-phase-energy.md) — what these assumptions feed
- [claims-and-vocabulary.md](claims-and-vocabulary.md) — why declaring them is a legal as well as an honesty matter
- [lifecycle.md](lifecycle.md) — the EPD conventions these follow
