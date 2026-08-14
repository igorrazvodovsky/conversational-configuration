# Elevator domain data — decisions, dimensions, coupled constraints

Status: domain reference, unchanged since 2026-08. Split from the former `docs/research-and-outline.md` §2 ("What a real elevator configuration involves"). Grounds the variable set and scale target of the [product-model spec](../specs/product-model/design.md).

From KONE Elevator Planner (https://elevatorplanner.kone.com/), MonoSpace 500 DX planning data (EN 81-20), Schindler Plan, EN 81-20 dimension tables:

- Building/context: building type, new build vs. modernization, region → code (EN 81-20/50 vs. ASME A17.1) and accessibility standard (EN 81-70 / ADA).
- Traffic/performance: rated load (320/450/630/800/1000/1250/1600/2000/2500 kg), rated speed (0.63–3.0 m/s), travel height, number of stops, group size.
- Shaft/mechanical: shaft width × depth, pit depth, headroom, machine-room-less vs. machine room, drive type, through-type car.
- Doors: opening type, width (700–1400 mm), material, fire rating.
- Car: dimensions, finishes, signalization, accessibility package.
- The coupled constraints are the heart of it: load → min car area; car size + door type → min shaft size (e.g. 630 kg/8 persons → car 1100×1400 → shaft ~1800×1700, pit 1200, headroom 3800); speed → pit/headroom; travel height caps speed per platform; hospital use → stretcher-depth car and wider doors.
- Scale target for a representative mock: ~15–25 user-facing decisions, ~30–80 constraints (compatibility tables + a few formulas). Real platform configurators expose 20–40 decisions over ~250+ underlying parameters.

The gap between that last pair of numbers is a stated fidelity limitation of the prototype, not an oversight: the whole configuration has to fit on one canvas, and a real platform's would not ([../discovery/problem-framing.md](../discovery/problem-framing.md) §3, *Content*).

## Related

- [configuration-field.md](configuration-field.md) — the modelling vocabulary these decisions are expressed in
- [embodied-carbon.md](footprint/embodied-carbon.md) — the same geometry, read as mass and carbon
- [use-phase-energy.md](footprint/use-phase-energy.md) — load, speed, travel and drive as energy terms
