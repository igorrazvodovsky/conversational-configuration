# Offline checks — design

## 1. Two runners, because there are two languages

`uv run pytest` in `agent/` and `vitest` at the root. No attempt is made to drive one from the other: a single runner would mean either running Node from pytest or running Python from vitest, and every check below is expressible without it. The cost is that a coupling spanning the boundary is checked from one side only — see decision 4.

Vitest rather than Jest because the repo is already a Vite-adjacent Next.js project and vitest resolves the TypeScript, the `@/` alias and the imported `elevator.json` with no transform configuration. `vitest.config.mts` carries the alias and pins `environment: "node"` — the absence of a DOM is the point, not a default to be overridden later.

## 2. What is checked, and what is deliberately not

Checked: `src/lib/configurator.ts`, `src/lib/suggested-moves.ts`, `src/lib/workspaces.ts`, `src/lib/attachments.ts` (its pure readers) and `src/components/config-canvas/render/geometry.ts`. All of it is logic that computes what a surface shows or what a click sends, and none of it renders.

Not checked: every component, every hook, and `card-dispatch.ts` — which is a hook, and whose interesting behavior (a card going inert, a dispatch racing a run) is behavior of the CopilotKit core it calls. Constitution #9 keeps UI on the running app, and the hydration rules in `docs/specs/chat-surface/design.md` are the kind of thing only a browser shows.

The failure mode the geometry checks exist for is specific: the scene is computed from millimetre codes, and a renamed code makes `carGeometry` return `null` rather than throw. The render then shows its empty state and reports nothing. So the check is not "these codes parse" but "every code the model currently has still parses", iterated over the live model — 540 combinations, and cheap.

## 3. The message grammar is checked as fragments, not as sentences

The grammar exists three times: `src/lib/configurator.ts` mints it, `agent/main.py` teaches the agent to recognise it, and `agent/tests/scenario_grammar.py` mints it again for the conversation checks. Comparing whole sentences does not work, because two of the three sides interpolate a label into the same hole. So `tests/couplings.test.ts` holds a table of the literal fragments each sentence is built from, and asserts each fragment three times: against the sentence the real builder produces, against the prompt, and against the harness.

The first of those three is what keeps the table from going stale — reword a builder and the table fails before anything else can drift. A second guard covers the other direction: the table is asserted to name every export of `configurator.ts` ending in `Message` or `PREFIX`, so a new grammar element cannot be added without being placed in it.

The prompt is read whitespace-normalised, because it wraps sentences across lines mid-quote.

**One finding.** `choiceMessage` — a bare control activation, `Set Building type to Hospital (building_type=hospital)` — has no rule of its own in the system prompt. It is the only element of the grammar that does not, and the table records it as `inPrompt: false` rather than passing silently. The sentence is plain enough that the agent maps it onto `set_choices` anyway, and it is covered by the `Canvas edit: ` rule whenever it comes off the sheet, so this is recorded rather than fixed: a prompt edit is measurable only by the conversation checks, which cost money, and nothing observed suggests the gap is live.

## 4. Cross-language couplings are read as text

`tests/couplings.test.ts` reads `agent/main.py`, `agent/tests/scenario_grammar.py` and `agent/src/configuration.py` as strings. This is weaker than executing both sides, and it is what a check that must stay offline and single-language can do. It catches the failure that actually happens — a sentence reworded on one side of the boundary — and it does not catch a semantic divergence behind identical wording.

The `Configuration` shape is compared by parsing the field names out of the TypeScript interface and the Python `TypedDict`, along with the `Source` and `reconciliation` literal unions. Field *types* are not compared; the names are where drift shows.

The one piece of arithmetic both languages perform — the lifetime CO₂e total, which the customer reads on the sheet and hears in chat — is checked by a shared table of nine rows, asserted against `formatCO2` in `tests/couplings.test.ts` and against `_format_co2` in `agent/tests/test_tools.py`. Two tables rather than one shared fixture, because a fixture readable from both languages would be a third artifact to keep true; here each side's own check fails on its own drift, and the two tables are each other's specification.

## 5. The typecheck had nothing running it

`next.config.ts` sets `typescript.ignoreBuildErrors: true` for the Docker route override, so `next build` type-checks nothing. `npm run typecheck` is now the only thing that does, over the plain `tsconfig.json` — which also covers the new checks under `tests/`.

Making it pass needed three type errors fixed, all in the dead starter code the repo still carries (CLAUDE.md's list): the A2UI `Title` renderer and the example bar chart, both React 19 migration leftovers. An excluding tsconfig was tried first and does not work — an excluded file is still compiled when an included one imports it, and `layout.tsx` imports the A2UI catalog. The fixes are type-level only and change no behavior; the standing instruction not to *extend* the starter files is untouched.

## 6. CI runs both, and not the paid checks

`.github/workflows/checks.yml`, two jobs. The agent job runs the model validator and `uv run pytest`; the frontend job runs `npm run typecheck` and `npm test`. The conversation checks are absent by design — `pytest -m scenario` is opted into by a developer who means to spend the money, and their own spec puts CI wiring for them out of scope.

The frontend job installs with `--ignore-scripts`, because the repo's `postinstall` provisions the Python agent and that job does not need it.

## Verification

- `uv run pytest` in `agent/`: 248 passed, 5 deselected, ~34s (158 before this work).
- `npm test`: 163 passed across 6 files, ~0.7s (there was no runner before).
- `npm run typecheck`: clean.
- `uv run python src/product_model/validate.py`: passes, and now also runs inside the suite.
- Coverage of the agent package, measured with `uv run --with pytest-cov pytest --cov=src`, moved from 69% to 90% overall; `src/configuration.py` from 58% to 96% and `src/http_app.py` from 0% to complete. What remains uncovered is the dead starter modules, which the suite correctly ignores.

## Known gaps

- The couplings are checked as text, not as behavior (decision 4). A rewritten prompt that keeps every fragment while changing what the agent does with it passes here and is caught only by the conversation checks.
- `choiceMessage` has no prompt rule of its own (decision 3), recorded rather than fixed.
- No check reaches a React component, a hook, or the hydration rules — by design, and it means the traps in `docs/specs/chat-surface/design.md` and `docs/specs/agreement-document/design.md` are still found only by running the app.
- The frontend checks build their own `Configuration` fixtures. Their shape is asserted against the agent's declaration, but a fixture can still be valid in shape and impossible in fact — for instance statuses the solver would never produce together.
