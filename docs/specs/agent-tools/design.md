# Agent tools — design

## Shape

`agent/src/configuration.py`:

- Module-level `MODEL = load_model(...)` and `SOLVER = ConfigSolver(MODEL)` — one solver session for the process lifetime, matching the [solver service](../solver-service/design.md)'s persistent-session design.
- `AgentState` gains a `configuration` key (schema per requirements). The todo state and tools are unregistered from `main.py`; the example files stay in the repo untouched as CopilotKit reference material.
- Pure functions `apply_choices(config, choices, source)`, `withdraw_choices(config, vars)`, `make_candidate(config)` that take/return plain state dicts — the `@tool` wrappers around them stay thin (mirroring `manage_todos`' Command-update pattern). Unit tests target the pure functions; no ToolRuntime mocking.

## Tools

- `set_choices(choices: dict[str, str], source: "user" | "agent")` → on success, `Command(update={"configuration": ...})` with a ToolMessage listing newly forced values; on conflict, no state update, ToolMessage carries `Conflict.describe()` plus the structured ids so the LLM can negotiate.
- `clear_choices(variables: list[str])`
- `propose_completion()` → stores `{assignment, price}` as candidate, returns it. Per the [service-agreement spec](../service-agreement/design.md), `price` means EUR/month (key name kept for thread-resumption compatibility) and the message presents a service agreement over its term.
- `get_configuration()` → read-only echo of state for the LLM (statuses summarized: only non-open facts, to keep tokens down).
- `describe_product()` → variables, groups, option labels and prices from the model, so the LLM never invents the catalog. All prices it prints are EUR/month — agreement fees directly, hardware as amortized deltas at the default term — so the LLM never sees a capex figure it could leak.

## System prompt

Rewritten around the elicitation strategy: needs-first questions, record commitments via `set_choices`, announce forced values, surface conflicts with the rule labels verbatim, offer a priced candidate early and refine by critique. Explicit prohibition: never claim feasibility/infeasibility without a tool result. Per the [service-agreement spec](../service-agreement/design.md) the frame is a service agreement: elicitation targets the building and its outcomes (traffic, budget per month, uptime, commitment length), candidates are presented as "€X/month over the N-year term", and a second prohibition applies — never quote a one-off capex figure.

## State streaming

Register `StateItem(state_key="configuration", tool="set_choices", tool_argument=...)`? — `StateStreamingMiddleware` streams tool args as they generate; for configuration the authoritative state comes from the solver-validated Command update, so streaming raw args would flash unvalidated values. Decision: no streaming middleware for configuration in 003; revisit in 004 if canvas latency warrants it.

## Notes from implementation

- Deviation from the draft: *all* example tools (todos, a2ui, flight search, query_data) were unregistered from `main.py`, not just todos — the elevator-focused system prompt would have contradicted their guidance. The example files remain in the repo; 004 will reintroduce a generative-UI path deliberately.
- Smoke-tested against gpt-5.4-mini: "6-storey hotel in Munich, 20 m travel" → agent recorded hotel/europe/new_build/mid-travel choices, the rules forced EN 81-70 accessibility and gearless MRL drive, and it proposed a €61,700 candidate into shared state. "Modernization + 3.0 m/s" → atomic REJECTED with R04+R28, agent verbalized the headroom explanation and offered ways forward.
- Rejection is batch-atomic: if one choice in a `set_choices` call conflicts, the whole batch is rejected; the LLM can re-record the innocent subset on the next call.

## Testing

`agent/tests/test_configuration.py` on the pure functions: apply/conflict-rejection/forced-reporting, withdraw + candidate invalidation, candidate correctness (extends choices, solver-valid, price matches). Chat-level behavior is exercised manually via `npm run dev` until 006 scripts exist.
