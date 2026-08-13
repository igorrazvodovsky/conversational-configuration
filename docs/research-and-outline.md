# Chat-based configuration of complex industrial products — research grounding and first steps

Working question: can a chat interface support configuration of a complex industrial product (an elevator) with thousands of parts, variants, and context-specific requirements — i.e. a complex, *nonlinear* workflow embedded in chat?

## 1. Is this covered by HCI / interaction design research?

Verdict: *partially covered — five mature ingredient literatures, with a genuine gap at their intersection.* No published system combines a realistic constraint-based product model, an LLM chat front-end, a synchronized structured canvas, and explicit support for nonlinear revision. That intersection is a defensible novelty claim for this prototype.

### Thread A — Mixed-initiative interaction

- Horvitz, *Principles of Mixed-Initiative User Interfaces*, CHI 1999 — https://dl.acm.org/doi/10.1145/302979.303030
- Wu, Terry, Cai, *AI Chains*, CHI 2022 — https://dl.acm.org/doi/10.1145/3491102.3517582
- Zamfirescu-Pereira et al., *Why Johnny Can't Prompt*, CHI 2023 — https://dl.acm.org/doi/10.1145/3544548.3581388

Configuration is a textbook mixed-initiative setting: the agent takes initiative when propagation makes a choice forced or invalid, yields it when the user explores. Horvitz's principles translate directly: visible partial-configuration state, undoable agent actions, confidence-conditional questions instead of a fixed interrogation script.

### Thread B — Conversational recommenders and critiquing

- Jannach et al., *A Survey on Conversational Recommender Systems*, ACM CSUR 2021 — https://dl.acm.org/doi/10.1145/3453154
- Chen & Pu, *Critiquing-based recommenders: survey and emerging trends*, UMUAI 2012 — https://link.springer.com/article/10.1007/s11257-011-9108-6
- Gao et al., *Advances and Challenges in Conversational Recommender Systems*, AI Open 2021 — https://www.sciencedirect.com/science/article/pii/S2666651021000164

Critiquing is arguably the right conversational primitive for configuration: show a *valid* candidate and let the user react ("like this, but cheaper / glass doors"), with the constraint engine keeping every shown candidate feasible. Pure attribute-question sequences fatigue users; mixing recommendation with elicitation outperforms interrogation. Key mismatch to design for: recommenders assume independent catalog items; configuration has hard constraints *between* choices, so critiques ripple — and the ripple must be explained.

### Thread C — Dialogue-based product configuration specifically

- Niederer, Schloss, Christensen, *Designing Context-Aware Chatbots for Product Configuration*, CONVERSATIONS 2022 — https://link.springer.com/chapter/10.1007/978-3-031-25581-6_12
- Felfernig, Hotz, Bagley, Tiihonen (eds.), *Knowledge-Based Configuration: From Research to Business Cases*, Morgan Kaufmann 2014 — https://dl.acm.org/doi/book/10.5555/2669162
- ConfWS 2024/2025 proceedings (several LLM+configuration papers) — https://ceur-ws.org/Vol-3812/ and https://ceur-ws.org/Vol-4149/

Thin but active. The consensus architecture is already settled in this literature: *the LLM must not be the source of truth about validity* — a symbolic constraint engine validates; the LLM elicits, translates needs into assignments, and explains. What the literature does not provide is the frontend interaction design (papers describe pipelines and pure-chat prototypes, not hybrid chat+structured UI).

### Thread D — Chat critiques and generative/hybrid UI

- Wattenberger, *Why Chatbots Are Not the Future of Interfaces*, 2023 — https://wattenberger.com/thoughts/boo-chatbots/
- NN/g, *Overcoming the Articulation Barrier in Generative AI Using Hybrid Interfaces* — https://www.nngroup.com/articles/ai-articulation-barrier/
- *Generative and Malleable User Interfaces* ("Jelly"), CHI 2025 — https://dl.acm.org/doi/10.1145/3706598.3713285
- Chen et al., *Generative Interfaces for Language Models*, arXiv:2508.19227 — https://arxiv.org/abs/2508.19227

Two named failures of pure chat: unclear affordances and the *articulation barrier* (users lack the vocabulary — acute for industrial products, where customers don't know part nomenclature). Chen et al. show LLM-generated task-specific UIs beat plain chat by large margins precisely on information-dense, multi-turn, comparison-heavy tasks — exactly configuration. Strong evidence for chat+canvas, not chat-only: persistent configuration state as a manipulable surface, chat as the negotiation/explanation channel, bidirectional sync between them. This is the CopilotKit shared-agent-state pattern this repo already implements.

### Thread E — Nonlinearity: revision, branching, repair

- Suh et al., *Sensecape*, UIST 2023 — https://arxiv.org/abs/2305.11483; Jiang et al., *Graphologue*, UIST 2023
- Amin et al., *Conversations in Space* (CanvasConvo), arXiv:2605.15848
- El Asri et al., *Frames* dataset / frame tracking, 2017 — https://arxiv.org/pdf/1706.01690
- *Understanding is a Two-Way Street* (user-initiated repair), CSCW 2024 — https://dl.acm.org/doi/10.1145/3641026

Nonlinearity in configuration means: revising an early choice (rated load) that invalidates twenty later ones; keeping two candidate configurations alive for comparison; resuming after interruption. The dialogue-systems community identified the revision problem a decade ago (slot-filling overwrites state; frame tracking keeps parallel hypothetical states alive) but never got an LLM-era UI. Design implications: model the configuration as versioned frames, not a flat slot set; surface ripple effects as explanations at revision time; make the canvas, not the transcript, the locus of resumption.

## 2. Grounding in manufacturing configuration practice

### The research field

Standard vocabulary (Mittal & Frayman IJCAI-89 — https://www.ijcai.org/Proceedings/89-2/Papers/087.pdf; Sabin & Weigel survey 1998; Felfernig et al. 2014): *component types* with attributes, *ports* (connection points), *resources* (produced/consumed quantities — traction capability vs. load, shaft space, heat), and constraint types: compatibility tables, requires, excludes, numeric formulas, resource balances. Configuration is formalized as a CSP; the field moved from rules (R1/XCON) to declarative constraint models because rule bases became unmaintainable.

### Elevators are the founding benchmark of this field

The VT system (Marcus & McDermott, AI Magazine 1988 — https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/664) designed real elevator systems at Westinghouse via *propose-and-revise*: forward-chain parameter assignments, detect constraint violations, apply domain-specific fixes, re-propagate. The Sisyphus-VT benchmark (Schreiber & Terpstra 1996 — https://www.cs.vu.nl/~guus/papers/Schreiber96a.pdf) gives concrete scale numbers: ~280 parameters, 529 calculations, 88 constraints, component models like `platform-2B` / `safety-B4`. Real elevator design is not a linear wizard — it is propose → check → repair, which maps directly onto a conversational loop.

### Industry CPQ practice

- Tacton (constraint-based): *needs-based configuration* — users answer questions about their situation (building, traffic, budget), not technical parameters; the solver derives the spec, tolerates incomplete input, always keeps the configuration valid, lets users start from any angle. https://www.tacton.com/cpq-blog/constraint-based-vs-rules-based-configuration-the-advantage-for-complex-manufacturing/
- Configit Virtual Tabulation: compiles the entire solution space into a BDD ahead of time; every choice instantly filters the remaining valid space, invalid combinations can never be selected, no backtracking. The "how this scales" story. https://configit.com/virtual-tabulation/ (patent US7584079B2)
- SAP LO-VC/AVC: characteristics + object dependencies (preconditions, selection conditions, procedures, constraints) + super BOM filtered down to the variant.
- Typical flow: guided-selling needs questions → engine proposes a valid configuration → user tweaks with continuous validation and repair suggestions → price/BOM/quote. Sales works needs-based, engineering works parameter-based, on the same model — a split a chat interface could unify.

### What a real elevator configuration involves

From KONE Elevator Planner (https://elevatorplanner.kone.com/), MonoSpace 500 DX planning data (EN 81-20), Schindler Plan, EN 81-20 dimension tables:

- Building/context: building type, new build vs. modernization, region → code (EN 81-20/50 vs. ASME A17.1) and accessibility standard (EN 81-70 / ADA).
- Traffic/performance: rated load (320/450/630/800/1000/1250/1600/2000/2500 kg), rated speed (0.63–3.0 m/s), travel height, number of stops, group size.
- Shaft/mechanical: shaft width × depth, pit depth, headroom, machine-room-less vs. machine room, drive type, through-type car.
- Doors: opening type, width (700–1400 mm), material, fire rating.
- Car: dimensions, finishes, signalization, accessibility package.
- The coupled constraints are the heart of it: load → min car area; car size + door type → min shaft size (e.g. 630 kg/8 persons → car 1100×1400 → shaft ~1800×1700, pit 1200, headroom 3800); speed → pit/headroom; travel height caps speed per platform; hospital use → stretcher-depth car and wider doors.
- Scale target for a representative mock: ~15–25 user-facing decisions, ~30–80 constraints (compatibility tables + a few formulas). Real platform configurators expose 20–40 decisions over ~250+ underlying parameters.

## 3. Constraint solver choice

Requirements for interactive configuration (not one-shot solving): fast incremental re-solve after each choice; *consequence propagation* (which remaining values are still valid, to grey out options); *conflict explanation* (minimal unsat core → "X conflicts with Y because rule R"); optimization as a plus.

Recommendation: *Z3 (python bindings)* — the only candidate covering all three defining operations natively in one persistent solver session:

- Assumption-based `check()` — sub-millisecond incremental re-solves; nothing retracted, learned clauses kept.
- `Solver.consequences(assumptions, terms)` — one call returns every option value forced true/false under current choices. Exactly the "grey out invalid options" operation; no other solver has it as a built-in.
- `unsat_core()` over named assumptions (`assert_and_track`) — cores cite business-rule names the agent can verbalize; a simple deletion loop shrinks to a true MUS.
- `Optimize` for cheapest valid completion. MIT license, single pip wheel, and an officially maintained WASM/TypeScript twin (`z3-solver` on npm) if solving ever moves client-side.

Runners-up: OR-Tools CP-SAT (best optimizer, but stateless per solve — valid-domain computation needs N re-solves; cores not guaranteed minimal); clingo/ASP (elegant brave-consequences propagation, weak explanation story, ASP learning curve); CPMpy (Apache 2.0 modeling layer targeting both CP-SAT and Z3, ships MUS/QuickXplain tools — worth knowing if hand-rolling MUS ever feels tedious); flamapy/BDD (the Configit-style industrial pattern; overkill at prototype scale). MiniZinc and python-constraint fail the interactivity requirements.

Reference: Programming Z3 §4.6 (consequences, cores) — https://z3prover.github.io/papers/programmingz3.html

## 4. Target architecture

The consensus from both the research and the repo's existing pattern:

```
┌───────────────────────────── Next.js ─────────────────────────────┐
│  Chat (elicitation, explanation,        Canvas (configuration      │
│  generated in-chat controls via A2UI)   spec sheet, direct edit)   │
└──────────────────────┬────────────────────────┬───────────────────┘
                       │   shared agent state (CopilotKit v2)
┌──────────────────────┴────────────────────────┴───────────────────┐
│  LangGraph agent (LLM): elicits needs, translates to assignments, │
│  narrates ripple effects, proposes repairs — never decides validity│
│        │ tools: set_choices / valid_options / explain / complete   │
│  ┌─────┴──────────────────────────────────────────────────┐       │
│  │ Z3 solver service over a declarative product model      │       │
│  │ (single source of truth for validity)                   │       │
│  └────────────────────────────────────────────────────────┘       │
└───────────────────────────────────────────────────────────────────┘
```

Design principles carried over from the research:

1. Needs-based first, parameter-based on demand (Tacton; two audiences, one model).
2. Critiquing over interrogation: always show a valid candidate; the user reacts.
3. Mixed initiative: agent auto-fills forced values and flags dead ends; user can start from any angle and edit anything on the canvas.
4. Beat the articulation barrier with generated controls: the agent renders chips/selects/steppers in chat (the A2UI path already in this repo) instead of asking users to type part nomenclature.
5. Nonlinear revision as a first-class flow: changing an early choice triggers ripple explanation + repair proposals, not silent invalidation; keep parallel candidate configurations (frames) for comparison.
6. Every conflict message is grounded in a solver unsat core, verbalized by the LLM — never hallucinated.

## 5. First steps

Step 1 — Mock product model (pure data, no code dependencies).
A declarative JSON/YAML elevator model: ~20 decision variables with finite domains (building type, region/code, load, speed, travel, stops, drive, shaft dims, door type/width, car dims, finishes, accessibility package…), ~40–60 constraints as compatibility tables + requires/excludes + a few numeric couplings from the EN 81-20 tables (load→car area, car+door→shaft, speed→pit/headroom, travel→speed cap, hospital→stretcher car). Ground the numbers in the KONE MonoSpace planning PDF so demos feel real. Keep data separate from logic (the Tacton lesson).

Step 2 — Solver service (standalone, testable before any UI).
A small Python module wrapping Z3: load model → build one persistent `Solver`; operations `check(choices)`, `valid_options(choices)` (via `consequences`), `explain(choices)` (named assumptions → shrunk core → human-readable rule references), `complete(choices, objective)` (via `Optimize`). Unit-test with scenarios: a forced value, a greyed-out option, a conflict with a 2-rule explanation, a cheapest completion. This is ~100–200 lines and de-risks the whole project.

Step 3 — Agent state and tools (replace the todo pattern).
`ConfigurationState`: choices made (with provenance: user/agent/derived), per-variable valid values, forced values, active conflicts with explanations, and a list of named candidate frames. Tools: `set_choices`, `get_valid_options`, `explain_conflict`, `propose_completion`, `fork_candidate` / `compare_candidates`. System prompt encodes the elicitation strategy (needs questions first, critique loop, never assert validity yourself — always call the solver).

Step 4 — Canvas + in-chat controls.
Swap the todo canvas for a configuration spec sheet: grouped decisions, current value, status (chosen/derived/forced/conflicting), directly editable with invalid options greyed out from `valid_options`. Reuse the A2UI generative-UI path for in-chat question cards (option chips with only-valid choices, dimension steppers). Same shared-state sync as todos today.

Step 5 — The nonlinear showpieces (the actual research contribution).
(a) Revision with ripple: user changes rated load late; agent explains which downstream choices broke and proposes minimal repairs. (b) Parallel candidates: "keep this one, but show me a glass-door variant" → side-by-side frames with price/spec deltas. (c) Resumption: canvas as the durable locus, chat picks up mid-configuration.

Step 6 — Demo scripts / evaluation scenarios.
Three scripted walkthroughs matching the three showpieces, plus one "articulation barrier" scenario (user speaks in building terms, never part names). These double as the definition of done.

Steps 1–2 are independent of the frontend and can start immediately; step 3 slots into `agent/main.py` exactly where `todo_tools` sits today.
