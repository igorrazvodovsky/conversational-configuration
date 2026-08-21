# Trade-offs are shown as a pair, not collapsed into a score

Cost and footprint are held side by side, with the differing variables named. There is no weighted composite and no single "best".

*Grounded in* the two-objective context (the [footprint spec](../../specs/environmental-footprint/requirements.md)) and the carbon-presentation evidence, where combining indicators into one display degrades evaluation ([sustainability prior art](../../research/footprint/sustainability-prior-art.md)). That evidence is all food and menu labelling, so the transfer to a capital good is itself an assumption, registered as [carbon labelling is all food](../../research/gaps.md#carbon-labelling-is-all-food).

*Rules out* a sustainability score. It is also why per-option carbon badges were rejected in favour of a cumulative total plus paired comparison ([footprint spec](../../specs/environmental-footprint/requirements.md), decision 3).

*Test.* After seeing the comparison, can the user say *which options* differ and what each costs?

*What the walkthrough of 2026-08-20 found.* Wherever the pair is drawn, it holds. The sheet states the monthly fee and the modelled lifetime footprint together, and the comparison card lists the differing variables with both totals, both footprints and a delta line reading "€528/mo more · 3.9 t CO₂e less", with the agent's sentence quoting the same two figures.

The test fails on the disclosure that isn't drawn. Beside a completion, the second objective arrives as prose — "the lower-footprint completion would cut modelled lifetime CO₂e by 31.3 t, but add €52/month and change 6 choices" — and the six choices are never named, so the reader can say what the alternative costs and not which options differ. Two different pairs are also spoken in the same voice: the one between two completions of the current draft, and the one between two drafts, with nothing marking which is which.

*The line the agent may not cross.* Resolving the cost and footprint weighting on the user's behalf is the irreducible user decision ([Conversation moves](../models/Conversation%20moves.md), *Agent moves*). The current implementation completes on cheapest price but solves the other objective in the same call, and discloses both deltas whenever the two disagree, which makes the default disclosed rather than silent ([footprint spec](../../specs/environmental-footprint/design.md)). Whether disclosure suffices, or the first proposal has to arrive as a pair, remains open in [Conversation moves](../models/Conversation%20moves.md), under *The initiative default*.

## Related

- [The principle index](../direction.md)
- [two objectives held as a pair make the trade-off legible](../assertions/two-objectives-as-a-pair.md) — the assertion this principle acts on
