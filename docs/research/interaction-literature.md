# Interaction literature — five threads and the gap at their intersection

Status: literature review, unchanged since it was written in 2026-08. Grounds the prototype's novelty claim and most of the [assertions](../discovery/assertions/). The exceptions are [outcome-level elicitation works](../discovery/assertions/outcome-level-elicitation.md) and [two objectives held as a pair make the trade-off legible](../discovery/assertions/two-objectives-as-a-pair.md).

Working question: can a chat interface support configuration of a complex industrial product, an elevator, with thousands of parts, variants and context-specific requirements — that is, a complex, *nonlinear* workflow embedded in chat?

Verdict: *partially covered.* Five mature ingredient literatures exist, with a genuine gap at their intersection. No published system combines a realistic constraint-based product model, an LLM chat front-end, a synchronized structured canvas, and explicit support for nonlinear revision. That intersection is a defensible novelty claim for this prototype ([the unshipped intersection](gaps.md#unshipped-intersection)).

## Thread A — Mixed-initiative interaction

- Horvitz, [*Principles of Mixed-Initiative User Interfaces*](https://dl.acm.org/doi/10.1145/302979.303030), CHI 1999
- Wu, Terry and Cai, [*AI Chains*](https://dl.acm.org/doi/10.1145/3491102.3517582), CHI 2022
- Zamfirescu-Pereira et al., [*Why Johnny Can't Prompt*](https://dl.acm.org/doi/10.1145/3544548.3581388), CHI 2023

Configuration is a textbook mixed-initiative setting. The agent takes initiative when propagation makes a choice forced or invalid, and yields it when the user explores. Horvitz's principles translate directly: visible partial-configuration state, undoable agent actions, and confidence-conditional questions instead of a fixed interrogation script.

## Thread B — Conversational recommenders and critiquing

- Jannach et al., [*A Survey on Conversational Recommender Systems*](https://dl.acm.org/doi/10.1145/3453154), ACM CSUR 2021
- Chen and Pu, [*Critiquing-based recommenders: survey and emerging trends*](https://link.springer.com/article/10.1007/s11257-011-9108-6), UMUAI 2012
- Gao et al., [*Advances and Challenges in Conversational Recommender Systems*](https://www.sciencedirect.com/science/article/pii/S2666651021000164), AI Open 2021

Critiquing is arguably the right conversational primitive for configuration: show a *valid* candidate and let the user react — "like this, but cheaper", "glass doors" — with the constraint engine keeping every shown candidate feasible. Pure attribute-question sequences fatigue users, and mixing recommendation with elicitation outperforms interrogation. There is one mismatch to design for: recommenders assume independent catalog items, while configuration has hard constraints *between* choices, so critiques ripple, and the ripple has to be explained.

## Thread C — Dialogue-based product configuration specifically

- Niederer, Schloss and Christensen, [*Designing Context-Aware Chatbots for Product Configuration*](https://link.springer.com/chapter/10.1007/978-3-031-25581-6_12), CONVERSATIONS 2022
- Felfernig, Hotz, Bagley and Tiihonen, eds., [*Knowledge-Based Configuration: From Research to Business Cases*](https://dl.acm.org/doi/book/10.5555/2669162), Morgan Kaufmann 2014
- ConfWS proceedings, with several LLM-and-configuration papers: [2024](https://ceur-ws.org/Vol-3812/) and [2025](https://ceur-ws.org/Vol-4149/)

Thin but active. The consensus architecture is already settled in this literature: *the LLM must not be the source of truth about validity*. A symbolic constraint engine validates, and the LLM elicits, translates needs into assignments, and explains. What the literature doesn't provide is the frontend interaction design, because papers describe pipelines and pure-chat prototypes rather than a hybrid of chat and structured UI ([no published frontend](gaps.md#no-published-frontend)).

## Thread D — Chat critiques and generative or hybrid UI

- Wattenberger, [*Why Chatbots Are Not the Future of Interfaces*](https://wattenberger.com/thoughts/boo-chatbots/), 2023
- NN/g, [*Overcoming the Articulation Barrier in Generative AI Using Hybrid Interfaces*](https://www.nngroup.com/articles/ai-articulation-barrier/)
- [*Generative and Malleable User Interfaces*](https://dl.acm.org/doi/10.1145/3706598.3713285) ("Jelly"), CHI 2025
- Chen et al., [*Generative Interfaces for Language Models*](https://arxiv.org/abs/2508.19227), arXiv:2508.19227

Pure chat has two named failures: unclear affordances, and the *articulation barrier*, where users lack the vocabulary. The second is acute for industrial products, where customers don't know part nomenclature. Chen et al. show LLM-generated task-specific UIs beating plain chat by large margins on information-dense, multi-turn, comparison-heavy tasks, which is what configuration is. That is strong evidence for chat plus canvas rather than chat alone: persistent configuration state as a manipulable surface, chat as the negotiation and explanation channel, and bidirectional sync between them. It is the CopilotKit shared-agent-state pattern this repo already implements.

## Thread E — Nonlinearity: revision, branching, repair

- Suh et al., [*Sensecape*](https://arxiv.org/abs/2305.11483), UIST 2023; Jiang et al., *Graphologue*, UIST 2023
- Amin et al., *Conversations in Space* (CanvasConvo), arXiv:2605.15848
- El Asri et al., [*Frames* dataset and frame tracking](https://arxiv.org/pdf/1706.01690), 2017
- [*Understanding is a Two-Way Street*](https://dl.acm.org/doi/10.1145/3641026), on user-initiated repair, CSCW 2024

Nonlinearity in configuration means three things: revising an early choice such as rated load that invalidates twenty later ones, keeping two candidate configurations alive for comparison, and resuming after interruption. The dialogue-systems community identified the revision problem a decade ago — slot-filling overwrites state, while frame tracking keeps parallel hypothetical states alive — and never got an LLM-era UI ([frame tracking without a UI](gaps.md#frame-tracking-without-a-ui)). The design implications are to model the configuration as versioned frames rather than a flat slot set, to surface ripple effects as explanations at revision time, and to make the canvas, rather than the transcript, the locus of resumption.

## Related

- [Thread E's branching half carried forward: what the AI-era pattern forks, and the pre-LLM work it restates](branching-in-ai-uis.md)
- [The symbolic half of thread C, and industry practice](configuration-field.md)
- [The same intersection question for the footprint dimension](footprint/sustainability-prior-art.md)
- [The principles this thread set produced](../discovery/direction.md)
- Cited by the [agreement document](../specs/agreement-document/requirements.md) for thread D, and by [nonlinear interaction](../specs/nonlinear-interaction/requirements.md) for thread E
