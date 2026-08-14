# Agent tools — design

## Shape

`agent/src/configuration.py`:

- Module-level `MODEL = load_model(...)` and `SOLVER = ConfigSolver(MODEL)` — one solver session for the process lifetime, matching the [solver service](../solver-service/design.md)'s persistent-session design.
- `AgentState` gains a `configuration` key (schema per requirements). The todo state and tools are unregistered from `main.py`; the example files stay in the repo untouched as CopilotKit reference material.
- Pure functions `apply_choices(config, choices, source)`, `withdraw_choices(config, vars)`, `make_candidate(config)` that take/return plain state dicts — the `@tool` wrappers around them stay thin (mirroring `manage_todos`' Command-update pattern). Unit tests target the pure functions; no ToolRuntime mocking.

## Tools

- `set_choices(choices: dict[str, str], source: "user" | "agent")` → on success, `Command(update={"configuration": ...})` with a ToolMessage listing newly forced values; on conflict, no state update, ToolMessage carries `Conflict.describe()` plus the structured ids so the LLM can negotiate.
- `clear_choices(variables: list[str])`
- `propose_completion(objective="price" | "co2")` → stores `{assignment, price, footprint}` as candidate, returns it. Per the [service-agreement spec](../service-agreement/design.md), `price` means EUR/month (key name kept for thread-resumption compatibility) and the message presents a service agreement over its term. Per the [environmental-footprint spec](../environmental-footprint/design.md) the other objective is always solved too: when the two assignments differ, the message appends how many variables differ and both deltas, so the trade-off is disclosed at the moment of proposal.
- `get_configuration()` → read-only echo of state for the LLM (statuses summarized: only non-open facts, to keep tokens down).
- `describe_product()` → variables, groups, option labels and prices from the model, so the LLM never invents the catalog. All prices it prints are EUR/month — agreement fees directly, hardware as amortized deltas at the default term — so the LLM never sees a capex figure it could leak. Options also carry their embodied CO₂e delta (after the fabrication multiplier, so quoted figures reconcile with candidate totals), and the output ends with the assessment-assumptions section from the model's `footprint` block — the grounding for every footprint number the agent states in chat ([environmental-footprint](../environmental-footprint/design.md)).

## System prompt

Built around the elicitation strategy: needs-first questions, record commitments as they are made, announce forced values, surface conflicts with the rule labels verbatim, offer a priced candidate early and refine by critique. Explicit prohibition: never claim feasibility/infeasibility without a tool result. Per the [service-agreement spec](../service-agreement/design.md) the frame is a service agreement: elicitation targets the building and its outcomes (traffic, budget per month, uptime, commitment length), candidates are presented as "€X/month over the N-year term", and a second prohibition applies — never quote a one-off capex figure. The [environmental-footprint spec](../environmental-footprint/design.md) adds the claims discipline: footprint figures only from tool results, always "modelled, under these assumptions", the energy class never presented as certified, no "green"/"eco-friendly"/"sustainable" vocabulary, and the offer of the cheapest/greenest pair when the customer signals footprint interest — the four-step frames sequence itself lives in `propose_completion`'s docstring.

It is organized in five headed blocks — method, grounding, voice, messages that are not conversation, state — rather than one flat list, so that each instruction sits with the others that fire at the same moment.

## Where guidance lives: one home per instruction

Every tool description ships on every request alongside the system prompt, so an instruction stated in both is paid for twice and can drift out of sync. Each is therefore stated once, in the place chosen by *when it has to fire*.

The saving is larger than it looks on paper: the static context fell 14% (2,878 → 2,484 tokens), but measured prompt cost fell 24% (21.3k → 16.3k tokens per conversational turn), because a turn runs several model calls around the tool loop and every one of them resends the whole prompt.

- *Which tool, and with what arguments* — read at the moment of the call. The docstring is the home: `describe_product` before the first `set_choices`, the `source=` semantics, `ask_choices`' 1–4 related variables, `save_frame` before a big exploratory change, `adopt_frame` when the customer picks one, and `propose_completion`'s cheapest/greenest calling pattern.
- *What to write in the reply* — narrative discipline that must hold across the whole turn, including turns with no tool call at all. The system prompt is the home: never enumerate options the control already shows, never repeat a card's table or option list, repairs are choices and not verdicts, never announce a naming, footprint figures only from tool data, and the one-sentence trade-off line when the objectives disagree.

*One documented exception: revise over record.* "When the customer changes something already decided, revise it rather than recording it afresh" is stated in both `revise_choices`' docstring and the prompt's method block, because moving it to the docstring alone measurably broke the flow. In a scripted A/B against gpt-5.4-mini (three runs per arm, identical scenario: a recorded modernization, then "actually I need 3.0 m/s"), the baseline prompt chose `revise_choices` 3/3 and the customer got clickable repair paths; with the rule in the docstring only, the agent fell back to `set_choices` 2/3, which returns a flat `REJECTED` and no repair options — [revision is an ordinary move, not a restart](../../discovery/principles/revision-is-an-ordinary-move.md) failing at the moment it matters most. Restoring the four lines took it to 5/5 with cards. The general lesson holds but is narrower than it first looked: the docstring is enough for guidance the model reads while *choosing among tools it has already decided to use*, but not for guidance that must fire before it has framed the turn as a revision at all.

The rule is about *static* context only. Runtime tool results still carry their own emphasis — `set_choices` and `revise_choices` label newly forced values "(announce these to the customer)" in the message body, which is contextual and fires only when there is something to announce.

## State streaming

Register `StateItem(state_key="configuration", tool="set_choices", tool_argument=...)`? — `StateStreamingMiddleware` streams tool args as they generate; for configuration the authoritative state comes from the solver-validated Command update, so streaming raw args would flash unvalidated values. Decision: no streaming middleware for configuration; revisited and upheld in the [configuration-canvas design](../configuration-canvas/design.md).

## Notes from implementation

- Deviation from the draft: *all* example tools (todos, a2ui, flight search, query_data) were unregistered from `main.py`, not just todos — the elevator-focused system prompt would have contradicted their guidance. The example files remain in the repo; the [configuration-canvas spec](../configuration-canvas/design.md) reintroduced a generative-UI path deliberately (`ask_choices`).
- Smoke-tested against gpt-5.4-mini: "6-storey hotel in Munich, 20 m travel" → agent recorded hotel/europe/new_build/mid-travel choices, the rules forced EN 81-70 accessibility and gearless MRL drive, and it proposed a €61,700 candidate into shared state. "Modernization + 3.0 m/s" → atomic REJECTED with R04+R28, agent verbalized the headroom explanation and offered ways forward.
- Rejection is batch-atomic: if one choice in a `set_choices` call conflicts, the whole batch is rejected; the LLM can re-record the innocent subset on the next call.

## Verification of the de-duplication

Measured against the pre-de-duplication prompt with a scripted A/B — six scenarios, three runs per arm, eighteen completed conversations each side. Every scorable behavior came out identical: call order, `source="user"`, `revise_choices` on a revision, no options enumerated where a control was shown, empty text after a clean canvas edit, the workspace named without announcing it, no prohibited vocabulary, no untraceable footprint figure. The first pass found the one regression recorded above; a full re-run after the fix showed no remaining difference, and `tests/compare_refs.py HEAD` reproduces that result through the permanent harness ([demo-scenarios](../demo-scenarios/design.md)).

Known gap: this evidence is all about single moves. A manual pass over the demo scenarios — a whole conversation's arc, resumption, the RFQ entrance — has not been done, and nothing automated would catch an agent that merely grew vaguer over twenty turns.

## Testing

`agent/tests/test_configuration.py` on the pure functions: apply/conflict-rejection/forced-reporting, withdraw + candidate invalidation, candidate correctness (extends choices, solver-valid, price matches). Chat-level behavior is exercised manually via `npm run dev` and by the [demo-scenarios](../demo-scenarios/design.md) harness as its scenarios land.
