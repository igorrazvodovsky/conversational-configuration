# Embodied carbon by component and option — a bottom-up derivation

Status: evidence memo, 2026-08. *The thinnest section of the footprint research* — most masses are *assumed*, and §6 below is the weakest part of it. Split from the former `docs/environmental-footprint-research.md` §3. Provenance tags as defined in [README.md](../README.md#provenance-tags).

Verdict: *option-granular EPDs do not exist. The defensible method is bottom-up — assumed component mass × published material factor — with a calibration step against the whole-product EPD anchor. Doing this yields a result worth designing around: price and carbon are only weakly correlated across our option set, and travel height dominates every cosmetic choice by an order of magnitude.*

This section is the thin one. There is no "panoramic glass car wall EPD," and there will not be one. Everything below is a transparent derivation from stated masses, so any number can be argued with by arguing with its mass.

## 1. Material factors

*Retrieved* second-hand — a [summary of ICE Database v4.1](https://greencalculus.com/standards/ice-database-embodied-carbon/) (Circular Ecology's Inventory of Carbon and Energy, the free canonical UK dataset; the primary source is [circularecology.com](https://circularecology.com/embodied-carbon-footprint-database.html)). Cradle-to-gate A1–A3, kg CO₂e/kg:

| Material | Factor | Provenance |
|---|---|---|
| Steel, EU/world average blend | 1.55 | retrieved (ICE v4.1 summary) |
| Steel, primary BF-BOF | 2.46 | retrieved |
| Steel, secondary EAF | 0.45 | retrieved |
| Glass, float | 0.85 | retrieved |
| Glass, toughened | 1.35 | retrieved |
| Concrete, RC30 | 0.13 | retrieved |
| Aluminium, EU average | 6.67 | retrieved |
| Granite / natural stone | 0.11–0.70 | retrieved, but sources disagree by 6× |
| Stainless steel | ~5.5 | *assumed* — not retrieved; commonly cited in the 5–6.5 range |
| Rubber flooring | ~3.2 | *assumed* — not retrieved |
| PVC flooring | ~3.1 | *assumed* — not retrieved |
| NdFeB magnet | ~20–80 | *assumed* — very uncertain, wide published spread |

The four assumed factors are the folder's highest-value open gap ([gaps.md](../gaps.md#e4)).

The granite spread is real and worth noting: one source gives 0.70 kg CO₂e/kg, another 107 kg CO₂e/tonne cradle-to-site (0.107 kg/kg). Stone's footprint is dominated by quarrying energy and transport distance, so a single generic factor is genuinely poor practice. I used 0.7 (conservative) below.

*Access note.* Closing the three assumed factors means getting ICE itself rather than a summary of it, and that is now less straightforward than it was: the current release is *ICE Database Educational V5.0 (June 2026)*, available only behind a registration form, and Circular Ecology states that non-educational use of ICE data will not be permitted after *30 September 2026*. V5.0's release notes also record that the Stone/Soil/Lime category was removed outright, so it will not close the granite gap at all. For a prototype that may be published, check the licence terms before embedding ICE-derived values in the model file, and consider [Ökobaudat](https://www.oekobaudat.de/) — EN 15804-compliant, freely usable, German — as the alternative for the factors that matter here.

## 2. The calibration step — and why raw material factors are not enough

*Derived*: the MonoSpace 300 DX declares 8,477 kg CO₂e of A1–A3 for a 2,803 kg elevator — an implied *3.02 kg CO₂e per kg of finished elevator*. A naive mass × steel-average calculation on the same 2,803 kg gives ~4,340 kg CO₂e, about half the declared figure.

The gap is real and explicable: the EPD includes copper cabling, electronics, magnets, plastics, paints and packaging alongside the steel; it includes A2 and A3 fabrication energy and material losses; and fabricated components carry more than the raw stock they are cut from.

Recommendation: build the model's per-option `co2` values bottom-up, then apply a *fabrication multiplier of ~1.8–2.0* so that a fully-specified reference configuration reconciles to ~8.5 t A1–A3 for a 630 kg / 12 m unit and ~21 t for a 1,600 kg / 14 m unit. This makes the model's totals defensible against a published anchor while keeping every option delta traceable to a mass assumption. The relative deltas below are stated *before* the multiplier, so scale them if you apply it.

## 3. Car finishes — the counter-intuitive result

Reference car 1,100 × 1,400 × 2,100 mm (the model's `c1100x1400`): back wall 2.31 m², two side walls 2.94 m² each, 8.19 m² of panel. Panel masses *assumed*: 1.5 mm steel ≈ 12 kg/m²; stainless likewise 12 kg/m²; laminated safety glass 16–21 mm ≈ 40–52 kg/m².

| `wall_finish` option | Price delta | Embodied delta vs. painted steel (*derived*) |
|---|---|---|
| `painted_steel` | €0 | baseline (~150 kg CO₂e for the three walls) |
| `laminate` | €1,200 | ~ +5 kg CO₂e — negligible |
| `brushed_ss` | €2,400 | *+350 to +400 kg CO₂e* |
| `glass_panoramic` (back wall only) | €9,500 | *+100 to +200 kg CO₂e* |

This is the finding worth building the interaction design around: *the most expensive finish option is not the highest-carbon one.* Stainless steel across three walls carries roughly twice the embodied delta of a panoramic glass back wall at a quarter of the price.

*Load-bearing caveat.* This entire comparison rests on the assumed stainless factor of ~5.5 kg CO₂e/kg from §1, which was not retrieved. High-recycled-content stainless EPDs run well below that; at ~2.5 the decorrelation shrinks substantially and could invert. Treat "stainless emits more than glass" as a *hypothesis the model encodes*, not an established fact, until the factor is sourced — it is the highest-value entry in [gaps.md](../gaps.md#e4) for exactly this reason. The travel-height finding in §5 does not share this dependency and should carry any argument that needs to be robust. Two further honest caveats: a panoramic car usually implies a glazed shaft and structural changes outside the car, which this per-panel derivation does not capture, and heavier laminated build-ups push glass toward the top of its range.

Floor, car area 1.54 m² (*assumed* masses: rubber 4 kg/m², PVC 3 kg/m², granite composite 20 mm ≈ 54 kg/m²):

| `floor` option | Price delta | Embodied delta (*derived*) |
|---|---|---|
| `rubber` | €0 | baseline ~20 kg CO₂e |
| `pvc` | €400 | ~ −6 kg CO₂e (slightly *lower*) |
| `granite` | €2,200 | ~ +38 kg CO₂e |

All three flooring options are carbon-trivial — tens of kilograms against a whole-product total in the tens of tonnes. A configurator that shows a carbon number next to the flooring choice is showing noise, and [sustainability-prior-art.md](sustainability-prior-art.md) §3 says something about what that does to users.

## 4. Doors

Door sets scale with `stops`, which makes them a structural rather than a cosmetic term. *Assumed*: a landing door set ≈ 90 kg steel, car door ≈ 60 kg. At the EU-average steel factor that is ~140 kg CO₂e per landing, so ~700 kg for a 5-stop building and ~1,700 kg at 12 stops.

| Option | Embodied delta (*derived*, per 5-stop building) |
|---|---|
| `door_finish`: painted → `brushed_ss` | ~ +330 kg CO₂e |
| `door_finish`: painted → `glass` | ~ +230 kg CO₂e |
| `fire_rating`: none → E120 / EI60 | ~ +200 to +350 kg CO₂e (*assumed* +30–50% door mass) |

Same pattern as the car walls: stainless costs the most carbon, glass costs the most money.

## 5. Guide rails and travel height — the dominant embodied term

*Assumed* rail masses: two car rails at ~17 kg/m and two counterweight rails at ~8 kg/m, plus brackets at ~5 kg/m, giving ~55 kg of steel per metre of shaft. Adding travelling cable, roping and shaft wiring, call it *~85–100 kg CO₂e per metre of travel* (*derived* at the EU-average steel factor).

| `travel` band | Approximate rail + shaft embodied (*derived*) |
|---|---|
| `low_0_15` (≤15 m) | ~1.3 t CO₂e |
| `mid_15_30` | ~2.6 t |
| `high_30_50` | ~4.3 t |
| `very_high_50_75` | ~6.4 t |
| `tower_75_100` | ~8.5 t |

Two claims, kept separate because they have different strengths (*derived*, against the option deltas in §3–§4, whose maximum combined total is ~1.1 t: stainless walls 388 + stainless doors 330 + fire rating ~350 + granite floor 38):

- Stepping *one* travel band adds ~1.3–2.1 t — roughly *1.5 to 2×* every finish option in the model combined.
- Spanning the *full* travel range, `low_0_15` to `tower_75_100`, adds ~7 t — roughly *6×* that same total.

Either way the direction is unambiguous, and it rests on the retrieved steel factor rather than on the assumed ones, so it survives the §1 uncertainties that §3 does not. If the prototype makes one honest didactic point about elevator footprint, this is the one: the building's geometry decides the embodied number, and the customer's taste barely moves it. It also supports 008's decision to make footprint a whole-configuration readout rather than a per-option badge.

## 6. Drive, counterweight and platform

Thinnest evidence in these notes; treat all of it as *assumed* ([gaps.md](../gaps.md#l5)).

A 630 kg traction lift's counterweight is roughly car mass + 50% of rated load ≈ 1,200 kg. Filled with concrete in a steel frame that is ~460 kg CO₂e; as cast iron it is ~2,300 kg. That is a factor of five on a single component nobody ever sees, and it is invisible in every EPD I retrieved.

A hydraulic platform trades the counterweight for a ram, cylinder, power unit and 150–250 litres of mineral oil, and pays for it in the use phase through k_L > 1 ([use-phase-energy.md](use-phase-energy.md) §3) and no regeneration. A gearless PM machine for this duty is perhaps 150–250 kg including a few kilograms of NdFeB magnet; at the wide factors above the magnets contribute on the order of 100–400 kg CO₂e — material, but not decisive, and the uncertainty band is wider than the quantity.

For `platform` (S300 / M500 / M700 / H900) I found no basis at all for differentiating embodied carbon beyond what load, travel and drive type already imply. Recommendation: derive platform footprint from those, rather than inventing a platform-level scalar that pretends to knowledge nobody has.

## Related

- [lifecycle.md](lifecycle.md) — the EPD anchor these derivations calibrate against
- [elevator-domain.md](../elevator-domain.md) — the variables the deltas are attached to
- [sustainability-prior-art.md](sustainability-prior-art.md) — why per-option numbers should not be badges
