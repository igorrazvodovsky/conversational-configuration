# Use-phase energy — ISO 25745 structure, and what it says about drive and standby

Status: evidence memo, 2026-08. Provenance tags as defined in the [research index](../README.md#provenance-tags). Grounds the energy model of the [environmental-footprint spec](../../specs/environmental-footprint/requirements.md).

Verdict: *the standard's machinery is fully documented in open literature even though the standard itself is paywalled. Running and standby energy are computed separately and summed. Standby dominates for low-usage lifts, at 44–90% of the total, and is nearly irrelevant at high traffic. The A–G class boundaries couldn't be retrieved and should not be invented* ([the paywalled class boundaries](../gaps.md#paywalled-class-boundaries)).

## 1. Structure of the standard

ISO 25745 is in three parts: part 1 covers measurement methods, part 2 covers energy calculation and classification for lifts, and part 3 covers escalators and moving walks. [ISO 25745-2:2015](https://www.iso.org/standard/60951.html) covers passenger and goods-passenger lifts above 0.15 m/s, and considers *only* the operational portion of the life cycle — running, idle and standby. It is the B6 input to an EPD rather than an LCA in itself. Amendment 1, from 2023, adds express zones. (*retrieved*)

Daily energy is the sum of two independently computed terms:

    E_d = E_rd (running) + E_sd (standing: idle + standby)

## 2. Usage categories

*Retrieved* from Barney and Lorente, [*Simplified Energy Calculations for Lifts Based on ISO/DIS 25745-2*](https://liftescalatorlibrary.org/paper_indexing/papers/00000048.pdf), 3rd Symposium on Lift and Escalator Technologies, which reproduces the standard's tables:

| Usage category | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Usage intensity | very low | low | medium | high | very high |
| Trips per day (n_d) | 50 | 125 | 300 | 750 | 1500 |
| Typical range | <75 | 75–200 | 200–500 | 500–1000 | 1000–2000 |

Category 6 exists in the published standard for more than 2,000 trips per day. The values were derived from over 4,500 simulations of typical installations by ISO/TC 178/WG10 (*retrieved*).

Three lookup tables feed the running calculation, all *retrieved*. Percentage average travel distance %S is 100% at 2 stops, 67% at 3, and 44% above 3 stops for categories 1–4, dropping to 33% for category 5. Percentage average car load %Q runs from 7.5% of rated load for a lift of 800 kg or less at low usage, down to 2.0% for a lift over 2,000 kg, and up to 16.0% for small lifts at category 5. And the idle and standby time ratios, R_id and R_st, move from 0.13 and 0.87 at category 1 to 0.42 and 0.58 at category 5.

## 3. The load factor — where drive type enters the physics

The load factor k_L is where hydraulic and traction diverge, and it is worth stating because it is counter-intuitive (*retrieved*, same source):

- Traction, 50% counterbalanced: k_L = 1 − (%Q × 0.0164), range 0.97–0.74
- Traction, 40% counterbalanced: k_L = 1 − (%Q × 0.0192), range 0.96–0.69
- Hydraulic, no counterbalance: k_L = 1 + (%Q × 0.0071), range 1.02–1.11
- Hydraulic, 70% counterbalanced: k_L = 1 + (%Q × 0.0187), range 1.04–1.30

*A load in a traction lift reduces energy usage, and in a hydraulic lift it increases it.* The counterweight does the work. This is the mechanism behind the drive-type difference, and it is a genuinely good explanation for the agent to be able to give.

## 4. Worked examples — the standby story

Both *retrieved* verbatim from Barney and Lorente:

| | Office traction, UC5 | Residential hydraulic, UC1 |
|---|---|---|
| Lift | 1,600 kg, 2.5 m/s, 75 m, 20 stops, 50% CB | 500 kg, 0.6 m/s, 13 m, 5 stops, 0% CB |
| Idle power / standby power | 500 W / 120 W | 50 W / 31 W |
| Daily trips | 1,500 | 30 |
| Daily running energy | 37,447 Wh | 631 Wh |
| Daily standing energy | 4,229 Wh | 797 Wh |
| *Total* | *41.7 kWh/day* | *1.4 kWh/day* |
| *Standby share* (*derived*) | *10%* | *56%* |

That is a 30× spread in daily energy between two perfectly ordinary lifts, and a complete inversion of which term matters.

Field evidence agrees and widens the range. The EU E4 project (Almeida et al.), reported at [ACEEE 2010](https://www.aceee.org/files/proceedings/2010/data/papers/1981.pdf) (*retrieved*), found standby consumption varying from *11% to 95%* across audited tertiary-sector lifts, with measured standby power ranging from *60 W to 490 W*. The project's summary figure is that standby accounts for 5–90% of total consumption, averaging around 70% in residential buildings, and that standby energy could be cut by about 80% with best-available technology. E4 monitored 81 installations across five countries and estimated EU lift electricity at 18.4 TWh/year: 6.7 residential, 10.9 tertiary.

The implication for the model is that an eco lighting and standby package is a *large* lever on a residential low-rise unit and a *small* one on a busy office unit. If the model's energy tables don't reproduce that reversal, they aren't capturing the one thing this literature is unanimous about.

## 5. Classification A–G — structure retrieved, boundaries not

The overall class is composed rather than measured directly: a running-mode performance level and a standby-mode performance level are assigned separately and combined into one A–G class. A worked case confirms it (*retrieved*, [Advances in Science and Technology Research Journal 12(3), 2018](https://pdfs.semanticscholar.org/bd19/fe92a99994eff9614f536942f8b2596d3ddb.pdf)), where a monitored lift scored ISO 25745-2 running level 5, standby level 2 and overall class C, and under VDI 4707 running class D, standby class B and overall class C.

The same paper compares predicted daily consumption against measurement for that lift. E4 predicted 3,470 Wh/day, VDI 4707 predicted 4,016, and ISO 25745-2 predicted 3,053, against a measurement of 3,068 Wh/day averaged Monday to Sunday. ISO 25745-2 was closest. It is useful as a sanity bound on how accurate any of this can be: roughly ±30%.

Real measured labels, *retrieved* from the Schindler brochure: a Schindler 3300 AP at 1,000 kg, 1.75 m/s and UC4 has a standby demand of 71 W in class B, a specific travel demand of 0.537 mWh/kg·m in class A, and 4,246 kWh/year. A second unit at UC5 has a standby demand of 294 W in class D and a specific travel demand of 0.462 mWh/kg·m in class A.

*The numeric A–G boundary tables for ISO 25745-2 could not be retrieved.* The standard is paywalled and the derivative literature quotes classes without thresholds. Search results offered VDI 4707 boundaries, such as 2.21 mWh/kg·m, that are inconsistent with the measured Schindler values, so they aren't reproduced here. If the prototype needs boundaries, either buy the standard or — better, and consistent with the [footprint spec](../../specs/environmental-footprint/requirements.md) — treat `energy_class` as a declared model enum determined by table constraints, and label it in the UI as *ISO 25745-flavoured*, never as a certified class. The two datapoints are enough to calibrate plausible-looking annual kWh per class.

## 6. Regenerative drives

Verdict: *savings are real but conditional, and the published range is wide and mostly vendor-sourced. 20–40% is the commonly quoted band, and the honest modelling position is that regeneration pays with travel height and traffic, and pays nothing on a low-rise, low-traffic unit.*

The physics is unambiguous. A regenerative drive recovers energy only when the machine is overhauled — a heavy car travelling down, a light car travelling up. Deep travel, high traffic and heavy loads all increase that fraction. A hydraulic lift can't regenerate at all, and a short low-traffic traction lift spends most of its energy on standby, which regeneration doesn't touch.

The retrieved figures are all *weak evidence*, and flagged as such. Measured studies report about 36% consumption reduction in one installation, and "up to 30%" against a non-regenerative converter. A comparison of a geared 18.5 kW induction machine against a gearless PMSM found 0.68 kW against 6.65 kW of regenerated power per cycle. That last figure is the most useful qualitative point: *regeneration and gearless PM machines are a package*, which supports the constraint the [footprint spec](../../specs/environmental-footprint/requirements.md) proposes, that a regenerative drive requires the gearless traction platform. Schindler's own brochure concedes the conditionality: "the threshold where regenerative drives are calculated to produce a lower overall environmental impact will vary depending on the type and usage of the lift" (*retrieved*).

Recommendation for the model: make the regenerative option's benefit depend on drive, travel band and usage profile through the energy-class table, rather than as a flat percentage. A flat "−25%" would be the wrong shape, and the wrong shape is what a research prototype is supposed to get right even when the magnitudes are illustrative.

## Related

- [How B6 sits against embodied carbon](lifecycle.md)
- [Usage profile per building type, grid factor, service life](assumptions.md)
- [Why the class must never be shown as a rating](claims-and-vocabulary.md)
