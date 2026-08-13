# 006 — Design (draft)

## Two artifacts, one scenario source

- `docs/demo-scenarios.md` — the presenter document. Per scenario: research claim, setup (which suggestion chip or fresh thread), a numbered turn list (type this / click this), and the expected observable outcome per turn (canvas rows, cards, prices). Written against the running app.
- `agent/tests/test_scenarios.py` — the automated harness. Reuses the sequential-turn pattern proven in the 005 offline smoke: feed `graph.invoke` the accumulated state plus one user message per turn, then assert on `result["configuration"]` and tool-message payloads.

The two stay aligned by construction: the harness encodes the same turns the document prescribes, and both cite the scenario numbering from requirements. Divergence between them is a spec bug (constitution #12).

## Robustness against LLM nondeterminism

Two turn classes:

- *Steering turns* (free-form English): assert only state invariants afterwards — e.g. "some choices recorded, none invalid, no part codes were needed". The agent may ask a clarifying question or call ask_choices; the harness answers via the structured grammar rather than failing.
- *State-critical turns*: dispatched as structured messages (`choiceMessage` / `repairMessage` / `adoptMessage` grammar, mirrored in Python) so the expected tool call is near-deterministic. Postconditions assert exact choice sets, forced values, frame contents.

Assertions never match assistant prose. Where a scenario needs the *repairs payload* or *comparison payload*, the harness reads the ToolMessage JSON (kind: "repairs" / "frame_comparison") — solver-derived, stable.

## Keeping scripts honest against the model

Scenario expectations reference the product model through `load_model` (labels, prices, cheapest completions computed live), not literal copies. The one deliberate exception: scenario 2 pins the modernization/3.0 m/s rule chain (R03/R04/R27/R28) because that scenario *is about* those rules; if the model drops them, the scenario should fail loudly.

## Pytest wiring

`@pytest.mark.scenario` on the module; `pytest -m scenario` runs it, plain `uv run pytest` deselects it via `addopts = -m "not scenario"` in the pytest config. Module-level skip when OPENAI_API_KEY is missing (mirrors how the agent is invoked: `uv run --env-file ../.env pytest -m scenario`). Each scenario is one test function so failures name the broken demo.

## Resumption scenario mechanics

Scenario 4 cannot reload a browser; it simulates resumption the way the stack actually provides it: run scenario-3-like turns, capture the final `configuration`, then start a fresh invoke whose state carries only messages + that configuration (what LangGraph's checkpoint restores) and assert the what's-left answer used get_configuration and re-elicited nothing (no ask_choices for already-settled variables). The browser-side restore path stays covered by 005's verification and the presenter document.
