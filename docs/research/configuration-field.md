# Configuration as a field — vocabulary, the elevator benchmark, industry CPQ

Status: literature and practice review, unchanged since 2026-08. Grounds the propose-check-repair framing in [problem framing](../discovery/problem-framing.md), *Contextual statements*, and the model scale in the [product-model spec](../specs/product-model/design.md).

## The research field

The standard vocabulary comes from [Mittal and Frayman, IJCAI-89](https://www.ijcai.org/Proceedings/89-2/Papers/087.pdf), the Sabin and Weigel survey of 1998, and Felfernig et al. 2014. It gives *component types* with attributes, *ports* as connection points, and *resources* as produced or consumed quantities — traction capability against load, shaft space, heat. The constraint types are compatibility tables, requires, excludes, numeric formulas and resource balances. Configuration is formalized as a CSP, and the field moved from rules, as in R1 and XCON, to declarative constraint models, because rule bases became unmaintainable.

## Elevators are the founding benchmark of this field

The VT system ([Marcus and McDermott, AI Magazine 1988](https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/664)) designed real elevator systems at Westinghouse through *propose-and-revise*: forward-chain parameter assignments, detect constraint violations, apply domain-specific fixes, re-propagate. The [Sisyphus-VT benchmark](https://www.cs.vu.nl/~guus/papers/Schreiber96a.pdf) (Schreiber and Terpstra, 1996) gives concrete scale numbers: about 280 parameters, 529 calculations, 88 constraints, and component models such as `platform-2B` and `safety-B4`. Real elevator design isn't a linear wizard. It is propose, check, repair, which maps directly onto a conversational loop.

## Industry CPQ practice

- [Tacton](https://www.tacton.com/cpq-blog/constraint-based-vs-rules-based-configuration-the-advantage-for-complex-manufacturing/), which is constraint-based, sells *needs-based configuration*: users answer questions about their situation — building, traffic, budget — rather than about technical parameters. The solver derives the spec, tolerates incomplete input, always keeps the configuration valid, and lets users start from any angle.
- [Configit Virtual Tabulation](https://configit.com/virtual-tabulation/), patent US7584079B2, compiles the entire solution space into a BDD ahead of time. Every choice instantly filters the remaining valid space, invalid combinations can never be selected, and there is no backtracking. It is the "how this scales" story.
- SAP LO-VC and AVC use characteristics plus object dependencies — preconditions, selection conditions, procedures, constraints — plus a super BOM filtered down to the variant.
- The typical flow runs guided-selling needs questions, then an engine proposal of a valid configuration, then user tweaks with continuous validation and repair suggestions, then price, BOM and quote. Sales works needs-based and engineering works parameter-based, on the same model, and that is a split a chat interface could unify.

## Related

- [What the product model actually has to represent](elevator-domain.md), for the [product-model spec](../specs/product-model/requirements.md)
- [The dialogue half of the same problem](interaction-literature.md) — thread C
- [Which engine gives the interaction what it needs](solver-choice.md)
