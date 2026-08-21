# Embodied carbon by component and option — a bottom-up derivation

Status: evidence memo, 2026-08. *The thinnest section of the footprint research*: most masses are *assumed*, and *Drive, counterweight and platform* is the weakest part of it. Provenance tags as defined in the [research index](../README.md#provenance-tags).

Verdict: *option-granular EPDs don't exist. The defensible method is bottom-up — assumed component mass times published material factor — with a calibration step against the whole-product EPD anchor. Doing that yields a result worth designing around: price and carbon are only weakly correlated across this option set, and travel height dominates every cosmetic choice by an order of magnitude.*

This is the thin section. There is no panoramic-glass-car-wall EPD, and there won't be one. Everything here is a transparent derivation from stated masses, so any number can be argued with by arguing with its mass.

## 1. Material factors

*Retrieved* second-hand, from a [summary of ICE Database v4.1](https://greencalculus.com/standards/ice-database-embodied-carbon/) — Circular Ecology's Inventory of Carbon and Energy, the free canonical UK dataset, whose primary source is [circularecology.com](https://circularecology.com/embodied-carbon-footprint-database.html). Figures are cradle-to-gate A1–A3, in kg CO₂e/kg.

| Material | Factor | Provenance |
|---|---|---|
| Steel, EU and world average blend | 1.55 | retrieved (ICE v4.1 summary) |
| Steel, primary BF-BOF | 2.46 | retrieved |
| Steel, secondary EAF | 0.45 | retrieved |
| Glass, float | 0.85 | retrieved |
| Glass, toughened | 1.35 | retrieved |
| Concrete, RC30 | 0.13 | retrieved |
| Aluminium, EU average | 6.67 | retrieved |
| Granite and natural stone | 0.11–0.70 | retrieved, but sources disagree by 6× |
| Stainless steel | ~5.5 | *assumed* — not retrieved; commonly cited in the 5–6.5 range |
| Rubber flooring | ~3.2 | *assumed* — not retrieved |
| PVC flooring | ~3.1 | *assumed* — not retrieved |
| NdFeB magnet | ~20–80 | *assumed* — very uncertain, wide published spread |

The four assumed factors are the folder's highest-value open gap ([the assumed material factors](../gaps.md#assumed-material-factors)).

The granite spread is real and worth noting: one source gives 0.70 kg CO₂e/kg, another 107 kg CO₂e per tonne cradle-to-site, which is 0.107 kg/kg. Stone's footprint is dominated by quarrying energy and transport distance, so a single generic factor is genuinely poor practice. The conservative 0.7 is used throughout this note.

*Access note.* Closing the three assumed factors means getting ICE itself rather than a summary of it, and that is now less straightforward than it was. The current release is *ICE Database Educational V5.0, June 2026*, available only behind a registration form, and Circular Ecology states that non-educational use of ICE data won't be permitted after *30 September 2026*. V5.0's release notes also record that the Stone, Soil and Lime category was removed outright, so it won't close the granite gap at all. For a prototype that may be published, check the licence terms before embedding ICE-derived values in the model file, and consider [Ökobaudat](https://www.oekobaudat.de/) — EN 15804-compliant, freely usable, German — as the alternative for the factors that matter here.

## 2. The calibration step — and why raw material factors are not enough

*Derived*: the MonoSpace 300 DX declares 8,477 kg CO₂e of A1–A3 for a 2,803 kg elevator, an implied *3.02 kg CO₂e per kg of finished elevator*. A naive mass-times-steel-average calculation on the same 2,803 kg gives about 4,340 kg CO₂e, roughly half the declared figure.

The gap is real and explicable. The EPD includes copper cabling, electronics, magnets, plastics, paints and packaging alongside the steel; it includes A2 and A3 fabrication energy and material losses; and fabricated components carry more than the raw stock they are cut from.

Recommendation: build the model's per-option `co2` values bottom-up, then apply a *fabrication multiplier of about 1.8–2.0*, so that a fully specified reference configuration reconciles to about 8.5 t A1–A3 for a 630 kg and 12 m unit, and about 21 t for a 1,600 kg and 14 m unit. That makes the model's totals defensible against a published anchor while keeping every option delta traceable to a mass assumption. The relative deltas in the sections that follow are stated *before* the multiplier, so scale them if you apply it.

## 3. Car finishes — the counter-intuitive result

The reference car is 1,100 × 1,400 × 2,100 mm, the model's `c1100x1400`: a back wall of 2.31 m², two side walls of 2.94 m² each, and 8.19 m² of panel in total. Panel masses are *assumed*: 1.5 mm steel at about 12 kg/m², stainless likewise 12 kg/m², and laminated safety glass at 16–21 mm at about 40–52 kg/m².

| `wall_finish` option | Price delta | Embodied delta against painted steel (*derived*) |
|---|---|---|
| `painted_steel` | €0 | baseline, about 150 kg CO₂e for the three walls |
| `laminate` | €1,200 | about +5 kg CO₂e — negligible |
| `brushed_ss` | €2,400 | *+350 to +400 kg CO₂e* |
| `glass_panoramic`, back wall only | €9,500 | *+100 to +200 kg CO₂e* |

This is the finding worth building the interaction design around: *the most expensive finish option isn't the highest-carbon one.* Stainless steel across three walls carries roughly twice the embodied delta of a panoramic glass back wall, at a quarter of the price.

*Important caveat.* This entire comparison rests on the assumed stainless factor of about 5.5 kg CO₂e/kg in *Material factors*, which wasn't retrieved. High-recycled-content stainless EPDs run well below that, and at about 2.5 the decorrelation shrinks substantially and could invert. Treat "stainless emits more than glass" as a *hypothesis the model encodes* rather than an established fact, until the factor is sourced. That is why [the assumed material factors](../gaps.md#assumed-material-factors) is the highest-value entry in the register. The travel-height finding under *Guide rails and travel height* doesn't share this dependency, and should carry any argument that needs to be robust. Two further caveats: a panoramic car usually implies a glazed shaft and structural changes outside the car, which this per-panel derivation doesn't capture, and heavier laminated build-ups push glass toward the top of its range.

For the floor, the car area is 1.54 m², with *assumed* masses of rubber at 4 kg/m², PVC at 3 kg/m², and granite composite at 20 mm, about 54 kg/m².

| `floor` option | Price delta | Embodied delta (*derived*) |
|---|---|---|
| `rubber` | €0 | baseline, about 20 kg CO₂e |
| `pvc` | €400 | about −6 kg CO₂e, slightly *lower* |
| `granite` | €2,200 | about +38 kg CO₂e |

All three flooring options are carbon-trivial, at tens of kilograms against a whole-product total in the tens of tonnes. A configurator that shows a carbon number next to the flooring choice is showing noise, and [sustainability prior art](sustainability-prior-art.md), *What backfires*, says something about what that does to users.

## 4. Doors

Door sets scale with `stops`, which makes them a structural rather than a cosmetic term. *Assumed*: a landing door set at about 90 kg of steel, and a car door at about 60 kg. At the EU-average steel factor that is about 140 kg CO₂e per landing, so about 700 kg for a 5-stop building and about 1,700 kg at 12 stops.

| Option | Embodied delta (*derived*, per 5-stop building) |
|---|---|
| `door_finish`: painted to `brushed_ss` | about +330 kg CO₂e |
| `door_finish`: painted to `glass` | about +230 kg CO₂e |
| `fire_rating`: none to E120 or EI60 | about +200 to +350 kg CO₂e (*assumed* +30–50% door mass) |

The pattern is the same as the car walls: stainless costs the most carbon, and glass costs the most money.

## 5. Guide rails and travel height — the dominant embodied term

*Assumed* rail masses: two car rails at about 17 kg/m and two counterweight rails at about 8 kg/m, plus brackets at about 5 kg/m, giving about 55 kg of steel per metre of shaft. Adding travelling cable, roping and shaft wiring, call it *about 85–100 kg CO₂e per metre of travel* (*derived* at the EU-average steel factor).

| `travel` band | Approximate rail and shaft embodied (*derived*) |
|---|---|
| `low_0_15` (≤15 m) | ~1.3 t CO₂e |
| `mid_15_30` | ~2.6 t |
| `high_30_50` | ~4.3 t |
| `very_high_50_75` | ~6.4 t |
| `tower_75_100` | ~8.5 t |

Two claims follow, kept separate because they have different strengths. Both are *derived* against the option deltas in *Car finishes* and *Doors*, whose maximum combined total is about 1.1 t: stainless walls at 388, stainless doors at 330, fire rating at about 350, and a granite floor at 38.

- Stepping *one* travel band adds about 1.3–2.1 t, which is roughly *1.5 to 2×* every finish option in the model combined.
- Spanning the *full* travel range, `low_0_15` to `tower_75_100`, adds about 7 t, which is roughly *6×* that same total.

Either way the direction is unambiguous, and it rests on the retrieved steel factor rather than on the assumed ones, so it survives the *Material factors* uncertainties that *Car finishes* doesn't. The clearest didactic point the prototype can make about elevator footprint is this: the building's geometry decides the embodied number, and the customer's taste barely moves it. It also supports the decision in the [footprint spec](../../specs/environmental-footprint/requirements.md) to make footprint a whole-configuration readout rather than a per-option badge.

## 6. Drive, counterweight and platform

This is the thinnest evidence in these notes, and all of it should be treated as *assumed* ([no component-level embodied data](../gaps.md#no-component-level-embodied-data)).

A 630 kg traction lift's counterweight is roughly the car mass plus 50% of rated load, about 1,200 kg. Filled with concrete in a steel frame, that is about 460 kg CO₂e; as cast iron it is about 2,300 kg. That is a factor of five on a single component nobody ever sees, and it is invisible in every EPD retrieved for these notes.

A hydraulic platform trades the counterweight for a ram, cylinder, power unit and 150–250 litres of mineral oil, and pays for it in the use phase through k_L greater than 1 ([use-phase energy](use-phase-energy.md), *The load factor*) and no regeneration. A gearless PM machine for this duty is perhaps 150–250 kg, including a few kilograms of NdFeB magnet, and at the wide factors in *Material factors* the magnets contribute on the order of 100–400 kg CO₂e — material, but not decisive, and the uncertainty band is wider than the quantity.

For `platform`, covering S300, M500, M700 and H900, no basis was found for differentiating embodied carbon beyond what load, travel and drive type already imply. Recommendation: derive platform footprint from those, rather than inventing a platform-level scalar that pretends to knowledge nobody has.

## Related

- [The EPD anchor these derivations calibrate against](lifecycle.md)
- [The variables the deltas are attached to](../elevator-domain.md)
- [Why per-option numbers should not be badges](sustainability-prior-art.md)
