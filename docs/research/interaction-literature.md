# Interaction literature — five threads and the gap at their intersection

Status: literature review, unchanged since it was written (2026-08). Split from the former `docs/research-and-outline.md` §1. Grounds the prototype's novelty claim and five of the seven [assertions](../discovery/assertions/) — all but [outcome-level elicitation](../discovery/assertions/outcome-level-elicitation.md) and [two objectives held as a pair](../discovery/assertions/two-objectives-as-a-pair.md).

Working question: can a chat interface support configuration of a complex industrial product (an elevator) with thousands of parts, variants, and context-specific requirements — i.e. a complex, *nonlinear* workflow embedded in chat?

Verdict: *partially covered — five mature ingredient literatures, with a genuine gap at their intersection.* No published system combines a realistic constraint-based product model, an LLM chat front-end, a synchronized structured canvas, and explicit support for nonlinear revision. That intersection is a defensible novelty claim for this prototype ([gaps.md](gaps.md#l1)).

## Thread A — Mixed-initiative interaction

- Horvitz, *Principles of Mixed-Initiative User Interfaces*, CHI 1999 — https://dl.acm.org/doi/10.1145/302979.303030
- Wu, Terry, Cai, *AI Chains*, CHI 2022 — https://dl.acm.org/doi/10.1145/3491102.3517582
- Zamfirescu-Pereira et al., *Why Johnny Can't Prompt*, CHI 2023 — https://dl.acm.org/doi/10.1145/3544548.3581388

Configuration is a textbook mixed-initiative setting: the agent takes initiative when propagation makes a choice forced or invalid, yields it when the user explores. Horvitz's principles translate directly: visible partial-configuration state, undoable agent actions, confidence-conditional questions instead of a fixed interrogation script.

## Thread B — Conversational recommenders and critiquing

- Jannach et al., *A Survey on Conversational Recommender Systems*, ACM CSUR 2021 — https://dl.acm.org/doi/10.1145/3453154
- Chen & Pu, *Critiquing-based recommenders: survey and emerging trends*, UMUAI 2012 — https://link.springer.com/article/10.1007/s11257-011-9108-6
- Gao et al., *Advances and Challenges in Conversational Recommender Systems*, AI Open 2021 — https://www.sciencedirect.com/science/article/pii/S2666651021000164

Critiquing is arguably the right conversational primitive for configuration: show a *valid* candidate and let the user react ("like this, but cheaper / glass doors"), with the constraint engine keeping every shown candidate feasible. Pure attribute-question sequences fatigue users; mixing recommendation with elicitation outperforms interrogation. Key mismatch to design for: recommenders assume independent catalog items; configuration has hard constraints *between* choices, so critiques ripple — and the ripple must be explained.

## Thread C — Dialogue-based product configuration specifically

- Niederer, Schloss, Christensen, *Designing Context-Aware Chatbots for Product Configuration*, CONVERSATIONS 2022 — https://link.springer.com/chapter/10.1007/978-3-031-25581-6_12
- Felfernig, Hotz, Bagley, Tiihonen (eds.), *Knowledge-Based Configuration: From Research to Business Cases*, Morgan Kaufmann 2014 — https://dl.acm.org/doi/book/10.5555/2669162
- ConfWS 2024/2025 proceedings (several LLM+configuration papers) — https://ceur-ws.org/Vol-3812/ and https://ceur-ws.org/Vol-4149/

Thin but active. The consensus architecture is already settled in this literature: *the LLM must not be the source of truth about validity* — a symbolic constraint engine validates; the LLM elicits, translates needs into assignments, and explains. What the literature does not provide is the frontend interaction design (papers describe pipelines and pure-chat prototypes, not hybrid chat+structured UI) — [gaps.md](gaps.md#l2).

## Thread D — Chat critiques and generative/hybrid UI

- Wattenberger, *Why Chatbots Are Not the Future of Interfaces*, 2023 — https://wattenberger.com/thoughts/boo-chatbots/
- NN/g, *Overcoming the Articulation Barrier in Generative AI Using Hybrid Interfaces* — https://www.nngroup.com/articles/ai-articulation-barrier/
- *Generative and Malleable User Interfaces* ("Jelly"), CHI 2025 — https://dl.acm.org/doi/10.1145/3706598.3713285
- Chen et al., *Generative Interfaces for Language Models*, arXiv:2508.19227 — https://arxiv.org/abs/2508.19227

Two named failures of pure chat: unclear affordances and the *articulation barrier* (users lack the vocabulary — acute for industrial products, where customers don't know part nomenclature). Chen et al. show LLM-generated task-specific UIs beat plain chat by large margins precisely on information-dense, multi-turn, comparison-heavy tasks — exactly configuration. Strong evidence for chat+canvas, not chat-only: persistent configuration state as a manipulable surface, chat as the negotiation/explanation channel, bidirectional sync between them. This is the CopilotKit shared-agent-state pattern this repo already implements.

## Thread E — Nonlinearity: revision, branching, repair

- Suh et al., *Sensecape*, UIST 2023 — https://arxiv.org/abs/2305.11483; Jiang et al., *Graphologue*, UIST 2023
- Amin et al., *Conversations in Space* (CanvasConvo), arXiv:2605.15848
- El Asri et al., *Frames* dataset / frame tracking, 2017 — https://arxiv.org/pdf/1706.01690
- *Understanding is a Two-Way Street* (user-initiated repair), CSCW 2024 — https://dl.acm.org/doi/10.1145/3641026

Nonlinearity in configuration means: revising an early choice (rated load) that invalidates twenty later ones; keeping two candidate configurations alive for comparison; resuming after interruption. The dialogue-systems community identified the revision problem a decade ago (slot-filling overwrites state; frame tracking keeps parallel hypothetical states alive) but never got an LLM-era UI ([gaps.md](gaps.md#l3)). Design implications: model the configuration as versioned frames, not a flat slot set; surface ripple effects as explanations at revision time; make the canvas, not the transcript, the locus of resumption.

## Related

- [configuration-field.md](configuration-field.md) — the symbolic half of thread C, and industry practice
- [sustainability-prior-art.md](footprint/sustainability-prior-art.md) — the same intersection question for the footprint dimension
- [../discovery/direction.md](../discovery/direction.md) §2 — the principles this thread set produced
- Cited by the [configuration canvas](../specs/configuration-canvas/requirements.md) (thread D) and [nonlinear interaction](../specs/nonlinear-interaction/requirements.md) (thread E)
