# Configuration as a field — vocabulary, the elevator benchmark, industry CPQ

Status: literature and practice review, unchanged since 2026-08. Split from the former `docs/research-and-outline.md` §2 (first three subsections). Grounds the propose-check-repair framing in [../discovery/problem-framing.md](../discovery/problem-framing.md) §3 and the model scale in spec [001](../specs/product-model/design.md).

## The research field

Standard vocabulary (Mittal & Frayman IJCAI-89 — https://www.ijcai.org/Proceedings/89-2/Papers/087.pdf; Sabin & Weigel survey 1998; Felfernig et al. 2014): *component types* with attributes, *ports* (connection points), *resources* (produced/consumed quantities — traction capability vs. load, shaft space, heat), and constraint types: compatibility tables, requires, excludes, numeric formulas, resource balances. Configuration is formalized as a CSP; the field moved from rules (R1/XCON) to declarative constraint models because rule bases became unmaintainable.

## Elevators are the founding benchmark of this field

The VT system (Marcus & McDermott, AI Magazine 1988 — https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/664) designed real elevator systems at Westinghouse via *propose-and-revise*: forward-chain parameter assignments, detect constraint violations, apply domain-specific fixes, re-propagate. The Sisyphus-VT benchmark (Schreiber & Terpstra 1996 — https://www.cs.vu.nl/~guus/papers/Schreiber96a.pdf) gives concrete scale numbers: ~280 parameters, 529 calculations, 88 constraints, component models like `platform-2B` / `safety-B4`. Real elevator design is not a linear wizard — it is propose → check → repair, which maps directly onto a conversational loop.

## Industry CPQ practice

- Tacton (constraint-based): *needs-based configuration* — users answer questions about their situation (building, traffic, budget), not technical parameters; the solver derives the spec, tolerates incomplete input, always keeps the configuration valid, lets users start from any angle. https://www.tacton.com/cpq-blog/constraint-based-vs-rules-based-configuration-the-advantage-for-complex-manufacturing/
- Configit Virtual Tabulation: compiles the entire solution space into a BDD ahead of time; every choice instantly filters the remaining valid space, invalid combinations can never be selected, no backtracking. The "how this scales" story. https://configit.com/virtual-tabulation/ (patent US7584079B2)
- SAP LO-VC/AVC: characteristics + object dependencies (preconditions, selection conditions, procedures, constraints) + super BOM filtered down to the variant.
- Typical flow: guided-selling needs questions → engine proposes a valid configuration → user tweaks with continuous validation and repair suggestions → price/BOM/quote. Sales works needs-based, engineering works parameter-based, on the same model — a split a chat interface could unify.

## Related

- [elevator-domain.md](elevator-domain.md) — what the [product model](../specs/product-model/requirements.md) actually has to represent
- [interaction-literature.md](interaction-literature.md) — thread C, the dialogue half of the same problem
- [solver-choice.md](solver-choice.md) — which engine gives the interaction what it needs
