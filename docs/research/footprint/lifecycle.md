# Elevator life-cycle profile — where the carbon actually is

Status: evidence memo, 2026-08. Split from the former `docs/environmental-footprint-research.md` §1. Provenance tags (*retrieved* / *derived* / *assumed*) as defined in [README.md](../README.md#provenance-tags). Grounds the [environmental-footprint spec](../../specs/environmental-footprint/requirements.md).

Working question for this note and the four that follow it: what does an elevator's life-cycle carbon actually look like, which of it responds to the choices our configurator exposes, and what may we honestly say about illustrative numbers in a UI?

Verdict: *embodied (A1–A3) dominates the manufacturer EPDs, at 58–63% of cradle-to-grave GWP, with use-phase energy at only 21–29% — but this is an artefact of the low-traffic usage category and clean grid those EPDs assume. Under high-traffic office duty the ordering reverses and use-phase plausibly reaches ~70–80%. Both the "embodied dominates" and the "use-phase is 80%" industry claims are true, of different elevators.*

## 1. Two verified EPDs, module by module

Two KONE EPDs give full EN 15804 module breakdowns. Both are third-party verified Type III declarations; both assume ISO 25745-2 usage category 3 and a Belgian grid.

*Retrieved* — [KONE MonoSpace 300 DX EPD](https://www.kone.com/en/Images/KONE_MonoSpace_300_DX_EPD_22-03_tcm17-96394.pdf) (RTS programme, reg. RTS_69_20). Declared product: gearless traction, 630 kg, 1.0 m/s, 5 stops, 12 m travel, car 1.1 × 1.4 × 2.1 m, total mass 2,803 kg, 365 operating days/year, usage category 3, designed reference service life 25 years, installed in Brussels, 669 kWh/year.

*Retrieved* — [KONE MonoSpace 700 DX EPD](https://www.kone.se/Images/KONE-MonoSpace-700-EPD_tcm27-94408.pdf) (International EPD® System, EN 15804+A2, EF 3.1, Ecoinvent 3.10, manufacturing data 2021–2023). Declared product: 1,600 kg, 1 m/s, 5 stops, 14 m travel, usage category 3, RSL 25 years, Belgium, 1,457 kWh/year at a stated average grid factor of 0.21 kg CO₂/kWh.

| Module | MonoSpace 300 DX (kg CO₂e) | share of A–C | MonoSpace 700 DX (kg CO₂e) | share of A–C |
|---|---|---|---|---|
| A1 raw materials | 7,920 | | — | |
| A2 transport to mfr | 217 | | — | |
| A3 manufacturing | 340 | | — | |
| *A1–A3 subtotal* | *8,477* | *63.1%* | *21,000* | *58.2%* |
| A4 transport to site | 444 | 3.3% | 1,290 | 3.6% |
| A5 installation | 129 | 1.0% | 1,830 | 5.1% |
| B2 maintenance | not declared | — | 3,790 | 10.5% |
| B4 replacement | 309 | 2.3% | included in B2 | — |
| B6 operational energy | 3,840 | 28.6% | 7,580 | 21.0% |
| C1–C4 end of life | 232 | 1.7% | 611 | 1.7% |
| *Total A–C* | *13,431* | | *36,101* | |
| D net benefits | −1,700 | | −5,810 | |
| *Headline figure in the EPD* | *11.7 t* (A–C **net of D**) | | *36 t* (A–C, **D excluded**) | |

Module rows are *retrieved*; subtotals, shares and the reconciliation of headline figures are *derived*.

## 2. Three findings that matter for the model

*Headline totals are not comparable between EPDs.* The 300 DX headline of 11.7 t nets module D against A–C; the 700 DX headline of 36 t does not (36.1 t is the A–C sum on its own; netting D would give 30.3 t). The two documents also sit on different PCR generations — the 300 DX on the Finnish RTS programme, the 700 DX on EN 15804+A2 with EF 3.1 characterisation. Any "our elevator emits X vs. their Y" comparison across manufacturers is unsound unless module scope and PCR version match. This is the single most useful piece of vocabulary discipline for the UI (see [claims-and-vocabulary.md](claims-and-vocabulary.md)).

*Steel is the embodied story.* The 300 DX EPD attributes 65% of A1–A3 impact to steel production; the 700 DX says over 75%. Everything else — finishes, electronics, magnets — competes for the remaining quarter. This is why [embodied-carbon.md](embodied-carbon.md) concludes that travel height beats every cosmetic option by an order of magnitude.

*The EPDs' own use-phase share is low because of what they assume.* Both declare usage category 3 (300 trips/day) on a Belgian grid at ~0.21–0.23 kg CO₂e/kWh — a genuinely clean grid. *Derived*: the 300 DX implies 3,840 / (669 × 25) = 0.230 kg CO₂e/kWh; the 700 DX implies 7,580 / (1,457 × 25) = 0.208, matching its stated 0.21.

By contrast, [Schindler's VDI 4707 brochure](https://www.schindler.co.uk/content/dam/website/uk/docs/lifts/schindler-vdi-4707-energy-lift-brochure.pdf/_jcr_content/renditions/original./schindler-vdi-4707-energy-lift-brochure.pdf) states (*retrieved*) that "power consumption of an elevator during its usage phase over a life cycle of 20 to 30 years is responsible for 80% of the environmental impact." That is not a contradiction of the EPDs — it is a different elevator on a different duty, and probably a different grid.

## 3. How the split shifts with traffic

The two ISO 25745-2 worked examples in [use-phase-energy.md](use-phase-energy.md) §4 bracket the range. Taking the residential example (1.4 kWh/day) and the office example (41.7 kWh/day), at 365 days, 25 years, and 0.22 kg CO₂e/kWh:

| | low-traffic residential | high-traffic office |
|---|---|---|
| Annual energy (*derived*) | ~520 kWh | ~15,200 kWh |
| Lifetime B6 (*derived*) | ~2.9 t CO₂e | ~84 t CO₂e |
| Embodied A1–A3 (*assumed*, anchored on §1) | ~8.5 t | ~30 t |
| *Use-phase share of A1–A3 + B6* | *~25%* | *~74%* |

The office example is a 1,600 kg / 2.5 m/s / 75 m / 20-stop lift, so its embodied figure is scaled up from the 700 DX's 21 t (14 m travel) to allow for rails and roping over 75 m — that scaling is *assumed*, and [embodied-carbon.md](embodied-carbon.md) §5 explains the per-metre basis.

One mismatch to note, since it runs against the headline: the residential row pairs a *hydraulic* 500 kg lift (Barney & Lorente's example) with an embodied anchor from the *gearless traction* MonoSpace 300 DX. A hydraulic lift has no counterweight — ~1,200 kg for this duty by [embodied-carbon.md](embodied-carbon.md) §6 — so its true embodied figure is likely lower and its use-phase share correspondingly higher than the 25% shown. The bracket is therefore conservative at the low end, which is the safe direction for it to be wrong.

Answering the research question directly: total lifetime is roughly *12–40 t CO₂e for a mid-rise passenger elevator on the EPDs' own low-traffic assumptions*, and can plausibly exceed *100 t for a high-traffic high-rise office unit*, where use-phase carries the majority. The use-phase share is not a property of the product; it is a property of the product *and* the building's traffic *and* the grid. That is exactly why 008 treats use-phase as derived from a usage profile rather than as an additive per-option scalar — the evidence supports that modelling choice.

Both EPDs found are usage category 3; no high-traffic (UC4–6) declaration was retrieved, so the right-hand column above is derived rather than declared ([gaps.md](../gaps.md#e2)).

## Related

- [use-phase-energy.md](use-phase-energy.md) — the B6 machinery
- [embodied-carbon.md](embodied-carbon.md) — the A1–A3 breakdown, bottom-up
- [assumptions.md](assumptions.md) — service life and grid factor, which set both columns above
