# Two objectives held as a pair make the trade-off legible

Two objectives (cost, footprint) held as an explicit pair make the trade-off legible where a single score would hide it.

This claim is the least supported by anything but reasoning.

*Evidence today.* The carbon-presentation literature ([../../research/footprint/sustainability-prior-art.md](../../research/footprint/sustainability-prior-art.md)): unanchored absolute figures are inert, anchoring by comparison works, and combining indicators into one display degrades evaluation. All of it is food labelling, so transfer to a capital good is itself an assumption — [a gap that is open and staying open](../../research/gaps.md#l4).

*Status.* Under test since the [footprint spec](../../specs/environmental-footprint/requirements.md) was implemented (2026-08-13). The pair is held apart everywhere: two solver objectives with no combined score, every proposal disclosing the other objective's deltas, and the comparison card showing monthly and footprint deltas side by side. On the shipped model the objectives genuinely disagree (an office completion trades −10.9 t CO₂e for +€34/month), so the demonstration case exists.

*How we would know it is wrong.* Users want one number and treat the pair as unresolved work.

*Where it gets demonstrated.* The [comparing agreements](../scenarios/comparing-agreements.md) scenario, on a case where price and footprint disagree — travel band versus any finish ([footprint spec](../../specs/environmental-footprint/requirements.md), *relationship to other specs*).

## Related

- [../problem-framing.md](../problem-framing.md) §4 — the assertion index
- [trade-offs are shown as a pair, not collapsed into a score](../principles/trade-offs-shown-as-a-pair.md) — the principle it acts on
