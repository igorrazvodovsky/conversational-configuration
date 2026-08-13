# Sustainability in configuration — prior art, presentation evidence, and what backfires

Status: literature review, 2026-08. Split from the former `docs/environmental-footprint-research.md` §6. Cited as "§6" by [two objectives held as a pair](../../discovery/assertions/two-objectives-as-a-pair.md), and grounds [trade-offs shown as a pair](../../discovery/principles/trade-offs-shown-as-a-pair.md).

Verdict: *the configuration community has arrived at this problem very recently and has published the architecture, the metrics and even an LLM-explanation prototype — but not the interaction design, and not with a constraint solver keeping candidates valid. The gap this prototype occupies is real and narrower than it was; the HCI literature on carbon presentation is mature, mixed, and has specific findings about what backfires.*

## 1. Configuration-side prior art

Wiezorek & Christensen, [*Integrating Sustainability Information in Configurators*](https://ceur-ws.org/Vol-2945/52-RW-ConfWS21_paper_16.pdf), ConfWS 2021, pp. 65–72 — the closest architectural precedent. They extend the classical configurator architecture in three places (data integration, processing, user interface) so the LCA runs *inside* the configurator, recalculating as the user configures, using the Ecological Scarcity Method over ecoinvent generic data. Their stated open problems are exactly ours: allocating sustainability values to components in a large variant space, and making an aggregated single score comprehensible without either oversimplifying or drowning the user in indicators. They note the tension explicitly — a single total value is readable but lossy; multiple indicators "add significant complexity to the information displayed". (*retrieved*)

Lubos, Felfernig, Hotz, Tran, Polat-Erdeniz, Le, Garber & El-Mansi, [*Responsible Configuration Using LLM-based Sustainability-Aware Explanations*](https://ceur-ws.org/Vol-3812/paper10.pdf), ConfWS 2024, pp. 68–73 — the nearest thing to this prototype in the literature. LLM-generated "sustainability-aware explanations" in a configurator, organised around Cialdini's persuasion principles, under a stated "less-is-more" principle; evaluated by LLM self-evaluation plus a *within-research-group study of N=10* who ranked explanations by perceived persuasive impact. Their own framing is nudging and persuasion, and their keywords include "Green Configuration", "Responsible Configuration", "Nudging", "Persuasion". (*retrieved*)

Two things follow. First, the LLM-plus-configuration-plus-sustainability combination is no longer novel in itself — cite this paper, don't claim its ground. Second, its evaluation is very thin (N=10, internal, ranking perceived persuasiveness rather than measuring choices), and its stance is explicitly *persuasive*. This prototype's constitution points the other way: solver-grounded numbers, explained not advocated. That contrast — *decision support versus persuasion* — is a sharper positioning claim than novelty would have been, and it is defensible precisely because the persuasion framing runs into §3's backfire findings.

Felfernig, Garber, Lubos & Tran, [*Sustainability Evaluation Metrics for Configuration Systems*](https://ceur-ws.org/Vol-4149/paper16.pdf), ConfWS 2025, pp. 192–198 — proposes evaluation metrics mapped to the UN SDGs, including *AvgCarFConf*, the average carbon footprint of configurations a system proposes over a period, as a measure of whether a configurator *tends* to steer users toward lower-carbon outcomes. Their open research issues name two of ours directly: multi-objective optimisation over accuracy and sustainability yielding Pareto-efficient solutions, and *CLabelCov* — the share of catalogue components with known sustainability data — as the practical limiter. They also propose "green component variable value ordering", favouring environmentally-friendly components in the solver's search order. (*retrieved*)

That last idea is worth stealing outright: it is a solver-level green default, it composes with Z3's existing machinery, and it is a more interesting mechanism than a separate "greenest" button because it shapes what the user sees first rather than what they can ask for. *AvgCarFConf* is also directly usable as a prototype evaluation metric — it measures the system, not the user, and needs no participants.

Also in ConfWS 2025 (*retrieved* titles, not read): Schenner, Havur, Rogenhofer, Wallner, Filtz & Pellegrini, [*A Lifecycle- and Sustainability-Aware Product Configuration Model for Modular Industrial Systems*](https://ceur-ws.org/Vol-4149/paper15.pdf), pp. 175–191; and Grosso, Scatto & Venturini, [*Designing for Circularity: Exploring Configurator-Based Decision Support for Eco-Design in Food Packaging*](https://ceur-ws.org/Vol-4149/paper14.pdf), pp. 159–174.

Industry CPQ vendors (Tacton, camos, KBMax) market sustainability messaging, but what they describe is material-efficiency and waste reduction as a by-product of accurate configuration, not carbon as an optimisation objective. No vendor evidence of carbon-as-objective was retrieved. Treat the industrial state of the art as "sustainability as marketing adjacency", which makes the solver-backed version a genuine differentiator rather than a catch-up.

## 2. What presentation formats influence decisions

The empirical literature is almost entirely food and menu labelling — different domain, different stakes, single-shot choices rather than a multi-hour configuration — so transfer is suggestive, not evidential. Applying it to a €60,000 industrial capital good is an assumption this prototype would be making, and worth stating as one ([gaps.md](../gaps.md#l4)).

What holds up (*retrieved*):

- *Colour-coding beats raw numbers.* In menu-label field experiments, colour-coded labels reduced the likelihood of choosing high-carbon dishes by ~2.7 percentage points and cut per-choice CO₂e by ~2.0%, where numeric-only labels moved less. Traffic-light encoding gives an unanchored number a scale.
- *Label everything, not just the winners.* Effectiveness increased as the proportion of labelled options rose from labelling only the lowest-emission items to labelling all items. Partial labelling reads as endorsement rather than information.
- *Effects are real but small, and sometimes zero.* A large UK workplace-canteen study of 111,837 meal choices found *no* improvement in sustainability of purchases, with label salience implicated. See [Beyer et al., *How Does Carbon Footprint Information Affect Consumer Choice? A Field Experiment*, Journal of Accounting Research 2024](https://onlinelibrary.wiley.com/doi/10.1111/1475-679X.12505), and the [worksite cafeteria trial in *Behavioural Public Policy*](https://www.cambridge.org/core/journals/behavioural-public-policy/article/do-carbon-labels-encourage-sustainable-food-choices-evidence-from-a-field-experiment-in-callcentre-worksite-cafeterias/049853A9BAC10AF4A6C1A73A651CCD4F).

## 3. What backfires

This is the part that should change design decisions, and it is the part a persuasion-framed system is most exposed to.

*Moral licensing / rebound.* A documented negative spillover: consumers treat an earlier environmentally-responsible choice as licence for a less responsible subsequent one ([eco-labels, conspicuous conservation and moral licensing](https://www.sciencedirect.com/science/article/abs/pii/S092180092200310X); [rebound effects in carbon-labelled dining](https://journals.sagepub.com/doi/10.1177/21582440251359051)). In a configuration flow — a *sequence* of choices where an early green pick is followed by twenty more — this is the single most relevant finding in the whole literature and the one most likely to bite. Design consequence: show *cumulative* configuration footprint continuously rather than celebrating individual green picks. A running total gives licensing nothing to feed on; a per-choice green badge feeds it directly. This argues against per-option carbon badges independently of the argument in [embodied-carbon.md](embodied-carbon.md) §3 that the per-option numbers are mostly noise.

*Label crowding degrades evaluation.* Nutrition and low-carbon labels shown together made products evaluated *worse* than either alone ([Less Is Better](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8066962/)). More indicators is not more information — the same conclusion Wiezorek & Christensen reached from the configurator side.

*Repetition breeds variety-seeking.* Repeated exposure to the same labelled choice drives users toward unlabelled alternatives out of boredom. A configurator that badges every option every turn is running this experiment on its users.

*Unanchored absolutes are inert.* Nobody knows whether 12 tonnes of CO₂e is a lot for an elevator. Anchor against something in the same decision — the alternative configuration, the cheapest completion, the greenest completion — which is precisely the cheapest-vs-greenest comparison 008 already specifies. That comparison is well supported by this literature; the per-option badge is not.

## 4. Design implications, collected

1. *Cumulative, not per-choice.* Continuous whole-configuration total; no per-option green badges. Supported independently by the licensing evidence (§3) and by the fact that most option-level deltas are noise ([embodied-carbon.md](embodied-carbon.md) §3).
2. *Anchor by comparison.* Cheapest vs. greenest side by side, with only the differing variables shown, is the format the evidence supports and the format 008 already requires.
3. *Split the number the way the physics splits.* Embodied and use-phase behave differently, respond to different choices, and carry different uncertainty. One merged total hides the mechanism the prototype exists to make discussable.
4. *Green defaults at the solver, not the label.* Green value-ordering (Felfernig et al. 2025) shapes what appears first; it is cheap in Z3 and better-evidenced than badge-based persuasion.
5. *Surface price-carbon decorrelation deliberately.* [embodied-carbon.md](embodied-carbon.md) §3 and §5 mean this model contains real instances of "costs more, emits less" and "free, emits far more". Those are the cases where a trade-off display earns its keep; a configurator where price and carbon moved together would not need one.
6. *Explain, don't persuade.* The nearest prior art (Lubos et al. 2024) is explicitly persuasive; the backfire literature is largely a catalogue of what persuasion does at scale. Grounding every number in the solver and declining to advocate is both the constitutionally-required position here and the better-evidenced one.

## Related

- [interaction-literature.md](../interaction-literature.md) — the same "no frontend" verdict, for configuration generally
- [claims-and-vocabulary.md](claims-and-vocabulary.md) — the legal floor under these presentation choices
- [trade-offs shown as a pair](../../discovery/principles/trade-offs-shown-as-a-pair.md) — this note's main consumer, with [two objectives held as a pair](../../discovery/assertions/two-objectives-as-a-pair.md) the assertion it tests
