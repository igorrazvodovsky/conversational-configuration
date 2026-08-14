# Trade-offs are shown as a pair, not collapsed into a score

Cost and footprint are held side by side, with the differing variables named. There is no weighted composite and no single "best".

*Grounded in* the two-objective context (the [footprint spec](../../specs/environmental-footprint/requirements.md)) and the carbon-presentation evidence: combining indicators into one display degrades evaluation ([../../research/footprint/sustainability-prior-art.md](../../research/footprint/sustainability-prior-art.md)). That evidence is all food and menu labelling, so the transfer to a capital good is itself an assumption, [registered as an open gap](../../research/gaps.md#l4).

*Rules out* a sustainability score. It is also why per-option carbon badges were rejected in favour of a cumulative total plus paired comparison ([footprint spec](../../specs/environmental-footprint/requirements.md), decision 3).

*Test.* After seeing the comparison, can the user say *which options* differ and what each costs?

*The line the agent may not cross.* Resolving the cost/footprint weighting on the user's behalf is the irreducible user decision ([../models/Conversation moves.md](../models/Conversation%20moves.md) §3). The current implementation completes on cheapest price but solves the other objective in the same call and discloses both deltas whenever the two disagree, which makes the default disclosed rather than silent ([footprint spec](../../specs/environmental-footprint/design.md)). Whether disclosure suffices, or the first proposal must arrive as a pair, remains open in [../models/Conversation moves.md](../models/Conversation%20moves.md) §6.

## Related

- [../direction.md](../direction.md) §2 — the principle index
- [two objectives held as a pair make the trade-off legible](../assertions/two-objectives-as-a-pair.md) — the assertion this principle acts on
