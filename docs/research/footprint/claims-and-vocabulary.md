# Claims and vocabulary — what we may honestly say about our numbers

Status: constraint memo, 2026-08. Split from the former `docs/environmental-footprint-research.md` §4. Binds the [environmental-footprint spec](../../specs/environmental-footprint/requirements.md) and any UI copy that shows a footprint figure.

Verdict: *we can call our numbers an estimate, a model, or an illustration. We cannot call them an EPD, a declaration, a class, or a verified figure, and we cannot invite cross-manufacturer comparison. As of 27 September 2026 some of the tempting phrasings are not merely sloppy but unlawful in the EU.*

## 1. The vocabulary, briefly

*ISO 14025* defines Type III environmental declarations: quantified life-cycle data, developed under a *Product Category Rule* (PCR), verified by an independent third party, and published by a *programme operator* (EPD International/Environdec, IBU, the Finnish RTS — all three appear in the EPDs in [lifecycle.md](lifecycle.md)). The verification and the PCR are what make it a declaration rather than a claim.

*EN 15804* fixes the module structure that gives EPDs their comparability within a category:

| Stage | Modules |
|---|---|
| Product | A1 raw material supply, A2 transport, A3 manufacturing |
| Construction | A4 transport to site, A5 installation |
| Use | B1 use, B2 maintenance, B3 repair, B4 replacement, B5 refurbishment, *B6 operational energy*, B7 operational water |
| End of life | C1 deconstruction, C2 transport, C3 waste processing, C4 disposal |
| Beyond boundary | D reuse/recovery/recycling potential |

EN 15804+A2 (2019) made cradle-to-grave including module C mandatory and switched to EF characterisation factors — which is why the two KONE EPDs are not directly comparable. Note the disclaimer printed in the 700 DX EPD itself (*retrieved*): "considering that Module C is included in this EPD, it is discouraged to use the results of modules A1-A3 without considering the results of module C."

The [footprint spec](../../specs/environmental-footprint/requirements.md) deliberately collapses all of this to *embodied* + *use-phase*. That is the right call for an interaction-research prototype and it is out of scope to change. But the collapsed model should be *named* against this structure in the UI — "embodied ≈ A1–A3, use-phase ≈ B6, everything else excluded" — because that one line converts a vague number into an honest, checkable simplification. What the prototype omits is not trivial: maintenance (B2) was 10.5% of the 700 DX total, and A4/A5 another 8.7%.

## 2. What would be greenwashing

The EU has made this concrete. [Directive (EU) 2024/825](https://enterprise.gov.ie/en/what-we-do/the-business-environment/empowering-consumers-for-the-green-transition/) (Empowering Consumers for the Green Transition) applies from *27 September 2026* — weeks from now — and bans generic environmental claims, bans "carbon neutral" claims founded on offsetting, and prohibits sustainability labels not based on a certification scheme or public authorisation (*retrieved*). A configurator UI that displays a self-styled A–G badge is squarely in the territory this directive addresses, even for a prototype.

Concretely, from illustrative data we must not imply:

1. *That a number is verified.* No "EPD", "declared", "certified", "verified" — those words have owners.
2. *An energy class as a rating.* Our `energy_class` is a modelling enum. Show it as "modelled, ISO 25745-flavoured", never as an achieved class, and never on a label that mimics the EU energy-label chevrons.
3. *Cross-manufacturer or cross-product comparison.* [lifecycle.md](lifecycle.md) §2 shows the headline totals of two EPDs from the *same manufacturer* are not comparable. Ours are comparable only against each other, within one model, under one set of assumptions.
4. *Precision we do not have.* [use-phase-energy.md](use-phase-energy.md) §5 puts the best available prediction methods at roughly ±30% against measurement for use-phase alone. Displaying "12,431 kg CO₂e" implies five significant figures of knowledge; round hard, and prefer deltas to absolutes.
5. *That a lower-carbon configuration is "green", "eco-friendly", or "sustainable".* Generic claims, now explicitly banned. "Lower modelled footprint than the alternative" is both accurate and legal.
6. *That savings are absolute.* Every use-phase figure is conditional on a usage profile and a grid factor; a configuration is not lower-carbon in itself, only lower-carbon under stated assumptions.

The design consequence: the assumptions panel the spec already requires is not a nicety, it is the thing that makes the feature honest. It should name service life, usage profile, grid factor, module scope, and the phrase "illustrative model, not a verified assessment" — and the agent should be able to surface it on request in chat, since chat is where an unhedged sentence is most likely to escape.

## Related

- [assumptions.md](assumptions.md) — the contents of that assumptions panel
- [sustainability-prior-art.md](sustainability-prior-art.md) — the presentation evidence, which points the same way for different reasons
- [../../specs/constitution.md](../../specs/constitution.md) — the solver-grounding invariant this extends to carbon numbers
