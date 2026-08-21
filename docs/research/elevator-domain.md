# Elevator domain data — decisions, dimensions, coupled constraints

Status: domain reference, unchanged since 2026-08. Grounds the variable set and scale target of the [product-model spec](../specs/product-model/design.md).

Sources: the [KONE Elevator Planner](https://elevatorplanner.kone.com/), MonoSpace 500 DX planning data against EN 81-20, Schindler Plan, and the EN 81-20 dimension tables.

- Building and context: building type, new build against modernization, and region, which sets the code — EN 81-20/50 or ASME A17.1 — and the accessibility standard, EN 81-70 or ADA.
- Traffic and performance: rated load at 320, 450, 630, 800, 1000, 1250, 1600, 2000 or 2500 kg; rated speed from 0.63 to 3.0 m/s; travel height; number of stops; group size.
- Shaft and mechanical: shaft width by depth, pit depth, headroom, machine-room-less against machine room, drive type, through-type car.
- Doors: opening type, width from 700 to 1400 mm, material, fire rating.
- Car: dimensions, finishes, signalization, accessibility package.
- The coupled constraints are the heart of it. Load sets minimum car area. Car size plus door type sets minimum shaft size: 630 kg for 8 persons gives a car of 1100 × 1400, a shaft of about 1800 × 1700, a pit of 1200 and headroom of 3800. Speed sets pit and headroom. Travel height caps speed per platform. And hospital use forces a stretcher-depth car and wider doors.
- Scale target for a representative mock: roughly 15 to 25 user-facing decisions and 30 to 80 constraints, made of compatibility tables plus a few formulas. Real platform configurators expose 20 to 40 decisions over 250 or more underlying parameters.

The gap between that last pair of numbers is a stated fidelity limitation of the prototype rather than an oversight: the whole configuration has to fit on one canvas, and a real platform's would not ([problem framing](../discovery/problem-framing.md), *Contextual statements*, *Content*).

## Related

- [The modelling vocabulary these decisions are expressed in](configuration-field.md)
- [The same geometry, read as mass and carbon](footprint/embodied-carbon.md)
- [Load, speed, travel and drive as energy terms](footprint/use-phase-energy.md)
