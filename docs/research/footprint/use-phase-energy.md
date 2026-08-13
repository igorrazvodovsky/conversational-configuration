# Use-phase energy — ISO 25745 structure, and what it says about drive and standby

Status: evidence memo, 2026-08. Split from the former `docs/environmental-footprint-research.md` §2. Provenance tags as defined in [README.md](../README.md#provenance-tags). Grounds the energy model of spec [008](../../specs/environmental-footprint/requirements.md).

Verdict: *the standard's machinery is fully documented in open literature even though the standard itself is paywalled. Running and standby energy are computed separately and summed; standby dominates for low-usage lifts (44–90% of the total) and is nearly irrelevant at high traffic. Class boundaries A–G could not be retrieved and should not be invented* ([gaps.md](../gaps.md#e1)).

## 1. Structure of the standard

ISO 25745 is in three parts: Part 1 (measurement methods), Part 2 (energy calculation and classification for lifts), Part 3 (escalators and moving walks). [ISO 25745-2:2015](https://www.iso.org/standard/60951.html) covers passenger and goods-passenger lifts above 0.15 m/s, and considers *only* the operational portion of the life cycle — running, idle and standby. It is the B6 input to an EPD, not an LCA in itself. Amendment 1 (2023) adds express zones. (*retrieved*)

Daily energy is the sum of two independently computed terms:

    E_d = E_rd (running) + E_sd (standing: idle + standby)

## 2. Usage categories

*Retrieved* from Barney & Lorente, [*Simplified Energy Calculations for Lifts Based on ISO/DIS 25745-2*](https://liftescalatorlibrary.org/paper_indexing/papers/00000048.pdf), 3rd Symposium on Lift and Escalator Technologies — which reproduces the standard's tables:

| Usage category | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Usage intensity | very low | low | medium | high | very high |
| Trips per day (n_d) | 50 | 125 | 300 | 750 | 1500 |
| Typical range | <75 | 75–200 | 200–500 | 500–1000 | 1000–2000 |

Category 6 exists in the published standard for >2,000 trips/day. The values were derived from over 4,500 simulations of typical installations by ISO/TC 178/WG10 (*retrieved*).

Three lookup tables feed the running calculation: percentage average travel distance %S (100% at 2 stops, 67% at 3, 44% above 3 stops for categories 1–4, dropping to 33% for category 5); percentage average car load %Q (from 7.5% of rated load for a ≤800 kg lift at low usage down to 2.0% for a >2,000 kg lift, rising to 16.0% for small lifts at category 5); and idle/standby time ratios R_id / R_st, which move from 0.13/0.87 at category 1 to 0.42/0.58 at category 5. All *retrieved*.

## 3. The load factor — where drive type enters the physics

The load factor k_L is where hydraulic and traction diverge, and it is worth stating because it is counter-intuitive (*retrieved*, same source):

- traction, 50% counterbalanced: k_L = 1 − (%Q × 0.0164), range 0.97–0.74
- traction, 40% counterbalanced: k_L = 1 − (%Q × 0.0192), range 0.96–0.69
- hydraulic, no counterbalance: k_L = 1 + (%Q × 0.0071), range 1.02–1.11
- hydraulic, 70% counterbalanced: k_L = 1 + (%Q × 0.0187), range 1.04–1.30

*A load in a traction lift reduces energy usage; in a hydraulic lift it increases it.* The counterweight does the work. This is the mechanism behind the drive-type difference and it is a genuinely good explanation for the agent to be able to give.

## 4. Worked examples — the standby story

Both *retrieved* verbatim from Barney & Lorente:

| | Office traction, UC5 | Residential hydraulic, UC1 |
|---|---|---|
| Lift | 1,600 kg, 2.5 m/s, 75 m, 20 stops, 50% CB | 500 kg, 0.6 m/s, 13 m, 5 stops, 0% CB |
| Idle power / standby power | 500 W / 120 W | 50 W / 31 W |
| Daily trips | 1,500 | 30 |
| Daily running energy | 37,447 Wh | 631 Wh |
| Daily standing energy | 4,229 Wh | 797 Wh |
| *Total* | *41.7 kWh/day* | *1.4 kWh/day* |
| *Standby share* (*derived*) | *10%* | *56%* |

A 30× spread in daily energy between two perfectly ordinary lifts, and a complete inversion of which term matters.

Field evidence agrees and widens the range. The EU E4 project (Almeida et al.), reported at [ACEEE 2010](https://www.aceee.org/files/proceedings/2010/data/papers/1981.pdf) (*retrieved*): standby consumption varied from *11% to 95%* across audited tertiary-sector lifts; measured standby power ranged *60 W to 490 W*; the project's summary figure is that standby accounts for 5–90% of total consumption, averaging around 70% in residential buildings, and that standby energy could be cut by ~80% with best-available technology. E4 monitored 81 installations across five countries and estimated EU lift electricity at 18.4 TWh/year (6.7 residential, 10.9 tertiary).

Implication for the model: an "eco lighting + standby" package is a *large* lever on a residential low-rise unit and a *small* one on a busy office unit. If the model's energy tables do not reproduce that reversal, they are not capturing the one thing this literature is unanimous about.

## 5. Classification A–G — structure retrieved, boundaries not

The overall class is composed, not measured directly: a running-mode performance level and a standby-mode performance level are assigned separately and combined into one A–G class. Confirmed by a worked case (*retrieved*, [Advances in Science and Technology Research Journal 12(3), 2018](https://pdfs.semanticscholar.org/bd19/fe92a99994eff9614f536942f8b2596d3ddb.pdf)) where a monitored lift scored ISO 25745-2 running level 5, standby level 2, overall class C — and under VDI 4707, running class D, standby class B, overall class C.

The same paper compares predicted daily consumption against measurement for that lift: E4 predicted 3,470 Wh/day, VDI 4707 predicted 4,016, ISO 25745-2 predicted 3,053, and measurement gave 3,068 Wh/day (Monday–Sunday average). ISO 25745-2 was closest. Useful as a sanity bound on how accurate any of this can be: roughly ±30%.

Real measured labels, *retrieved* from the Schindler brochure: a Schindler 3300 AP (1,000 kg, 1.75 m/s, UC4) — standby demand 71 W (class B), specific travel demand 0.537 mWh/kg·m (class A), 4,246 kWh/year; a second unit at UC5 — standby 294 W (class D), specific travel 0.462 mWh/kg·m (class A).

*I could not retrieve the numeric A–G boundary tables for ISO 25745-2.* The standard is paywalled and the derivative literature quotes classes without thresholds. Search results offered VDI 4707 boundaries (2.21 mWh/kg·m and similar) that are inconsistent with the measured Schindler values above, so I have not reproduced them. If the prototype needs boundaries, either buy the standard or — better, and consistent with 008 — treat `energy_class` as a declared model enum determined by table constraints and label it in the UI as *ISO 25745-flavoured*, never as a certified class. The two datapoints above are enough to calibrate plausible-looking annual kWh per class.

## 6. Regenerative drives

Verdict: *savings are real but conditional, and the published range is wide and mostly vendor-sourced. 20–40% is the commonly quoted band; the honest modelling position is that regeneration pays with travel height and traffic and pays nothing on a low-rise low-traffic unit.*

The physics is unambiguous: a regenerative drive recovers energy only when the machine is overhauled — heavy car travelling down, light car travelling up. Deep travel, high traffic and heavy loads all increase that fraction; a hydraulic lift cannot regenerate at all, and a short low-traffic traction lift spends most of its energy on standby, which regeneration does not touch.

Retrieved figures, all *weak evidence* and flagged as such: measured studies report ~36% consumption reduction in one installation and "up to 30%" versus a non-regenerative converter; a comparison of a geared 18.5 kW induction machine against a gearless PMSM found 0.68 kW versus 6.65 kW of regenerated power per cycle. That last figure is the most useful qualitative point — *regeneration and gearless PM machines are a package*, which supports 008's proposed constraint that a regenerative drive requires the gearless traction platform. Schindler's own brochure concedes the conditionality: "the threshold where regenerative drives are calculated to produce a lower overall environmental impact will vary depending on the type and usage of the lift" (*retrieved*).

Recommendation for the model: make the regenerative option's benefit depend on drive, travel band and usage profile through the energy-class table, not as a flat percentage. A flat "−25%" would be the wrong shape, and the wrong shape is what a research prototype is supposed to get right even when the magnitudes are illustrative.

## Related

- [lifecycle.md](lifecycle.md) — how B6 sits against embodied carbon
- [assumptions.md](assumptions.md) — usage profile per building type, grid factor, service life
- [claims-and-vocabulary.md](claims-and-vocabulary.md) — why the class must never be shown as a rating
