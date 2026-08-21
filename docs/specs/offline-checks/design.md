# Offline checks — design

Rules the tier that needs no provider key: two runners for two languages, what is checked and what deliberately is not, the message grammar compared by building it on both sides, and what CI runs. Read it before adding an offline check or changing anything that crosses the language boundary.

## 1. Two runners, because there are two languages

`uv run pytest` in `agent/` and `vitest` at the root. Each owns its own language, and neither is driven from the other, with one deliberate exception: the coupling checks run the agent's half as a subprocess and compare what it builds, because a contract spanning the boundary can't be checked from one side (decisions 3 and 4). That exception is confined to `tests/couplings.test.ts`, so the rest of the frontend checks stay a Node-only, sub-second run.

Vitest rather than Jest, because the repo is already a Vite-adjacent Next.js project and vitest resolves the TypeScript, the `@/` alias and the imported `elevator.json` with no transform configuration. `vitest.config.mts` carries the alias and pins `environment: "node"` for this tier: the absence of a DOM is the point, not a default to be overridden later. When the [interface checks](../interface-checks/design.md) later needed a DOM, they got their own vitest project rather than an override here, so this tier still can't acquire one by accident.

## 2. What is checked, and what is deliberately not

Checked: `src/lib/configurator.ts`, `src/lib/suggested-moves.ts`, `src/lib/workspaces.ts`, the pure readers of `src/lib/attachments.ts`, and `src/components/config-canvas/render/geometry.ts`. All of it is logic that computes what a surface shows or what a click sends, and none of it renders.

Not checked here: every component and every hook. `useWorkspaceAttachment` is checked by the [interface checks](../interface-checks/design.md), which render it against a mocked stream. `card-dispatch.ts` is checked by neither, because its interesting behavior — a card going inert, a dispatch racing a run — is behavior of the CopilotKit core it calls. The hydration rules in `docs/specs/chat-surface/design.md` are the kind of thing only a browser shows, and constitution #9 keeps them on the running app.

The failure mode the geometry checks exist for is specific: the scene is computed from millimetre codes, and a renamed code makes `carGeometry` return `null` rather than throw. The render then shows its empty state and reports nothing. So the check isn't "these codes parse" but "every code the model currently has still parses", iterated over the live model — 540 combinations, and cheap.

## 3. The message grammar is compared by building it on both sides

The grammar exists three times. `src/lib/configurator.ts` mints it, `agent/tests/scenario_grammar.py` mints it again for the conversation checks, and `agent/main.py` teaches the agent to recognise it. Two of the three are code, and are compared as code.

`agent/tests/grammar_dump.py` builds every sentence from the agent's own helpers, for a set of inputs it names itself, and prints the lot as JSON. `tests/couplings.test.ts` runs it through the shared loader in `tests/agent-dump.ts` — shared with the [interface checks](../interface-checks/design.md), which take their agreement payloads from the same dump — builds the same sentences from the same inputs, read out of the dump so the two provably compared the same thing, and asserts the two objects equal. Comparing the two sources as text, which is what this check did first, passes on two files that hold the same words and build different sentences. This doesn't.

The inputs include a draft name with quotes inside it, because the draft moves quote the name and escaping is where the two sides would diverge first.

The prompt is the third copy and is prose, so it can only be read as text. `PROMPT_FRAGMENTS` holds the part of each sentence that doesn't vary, asserted both against the prompt and against the sentence the frontend actually builds, so rewording a builder fails there too and the table can't go quietly stale. A separate assertion requires the table to name every element, so no element can be exempted from having a prompt rule.

## 4. The rest of the boundary is compared the same way

The same dump carries what the agent declares a configuration to be, its provenance sources, its reconciliation marks, and what `_format_co2` prints for ten inputs. Each is compared against the frontend's own answer rather than against a copy of the agent's.

The TypeScript interface is erased at runtime, so three witness objects stand in for it: `{choices: true, statuses: true, …} satisfies Record<keyof Required<Configuration>, true>`, and two like it. The `satisfies` makes the typecheck reject a witness missing a member or carrying one the type doesn't have, so `Object.keys` over it is a list of the type's own members rather than a fourth hand-maintained copy. The dump gives both the keys the agent *declares* and the keys an agreement it actually built carries. The second is a subset, because two fields are optional, and the frontend has to read both.

The CO₂ rows are compared against what the agent printed, not against a table copied from it. `agent/tests/test_tools.py` keeps a table of its own, which is the Python side's regression when Node isn't around. That the two languages still agree is this check's job.

## 5. The fixtures are held against agreements the agent actually built

The frontend checks assemble their own `Configuration` values, and a hand-assembled one can be valid in shape and impossible in fact. `forcing()` was exactly that: it marked a value forced and left its siblings open, which is a state the solver never produces, because when a value is forced every sibling is invalid — being the only one left is what forced means.

So the dump carries four real agreements: empty, one with a choice applied, one priced, and one seeded from the office-tower RFQ. `couplings.test.ts` reads four invariants off them — at most one decided value per variable, every sibling of a decided value invalid, a variable with nothing decided has something open, and a recorded choice reads as chosen — asserts they hold of all four, and only then requires them of the fixtures. Asserting the invariants of the real agreements first is what keeps them from being invented: a rule the agent's own output breaks is a wrong rule, and it says so.

`agreement()` derives statuses from the choices handed to it, applying them over any statuses given explicitly, so the two can't be passed in disagreeing. Verified by restoring the old `forcing()` and watching two checks fail.

What this still doesn't catch is a semantic divergence behind identical output: a prompt rewritten to keep every fragment while changing what the agent does with it, or a builder that agrees on these inputs and disagrees on others. The conversation checks are the only thing that sees the first.

## 6. The typecheck had nothing running it

`next.config.ts` sets `typescript.ignoreBuildErrors: true` for the Docker route override, so `next build` type-checks nothing. `npm run typecheck` is the only thing that does, over the plain `tsconfig.json`, which also covers the checks under `tests/`.

Making it pass needed three type errors fixed, all in the dead starter code the repo still carries, listed in CLAUDE.md: the A2UI `Title` renderer and the example bar chart, both React 19 migration leftovers. An excluding tsconfig was tried first and doesn't work, because an excluded file is still compiled when an included one imports it, and `layout.tsx` imports the A2UI catalog. The fixes are type-level only and change no behavior, and the standing instruction not to *extend* the starter files is untouched.

## 7. CI runs both, and not the paid checks

`.github/workflows/checks.yml` holds two jobs. The agent job runs the model validator and `uv run pytest`, and the frontend job runs `npm run typecheck` and `npm test`. The conversation checks are absent by design: `pytest -m scenario` is opted into by a developer who means to spend the money, and their own spec puts CI wiring for them out of scope.

The frontend job installs both toolchains, because the coupling checks run the agent's half of the shared contracts. It installs them in two explicit steps rather than through the repo's `postinstall`, so a failure names which half broke.

## Verification

- `uv run pytest` in `agent/`: 249 passed, 5 deselected, about 34s, against 158 before this work.
- `npm test`, this tier, with `--project offline`: 187 passed across 6 files in about 2s, where there was no runner before. This record said 185 until 2026-08-20, because the two invariant checks added when the fixtures were held against the agent's own agreements were never counted here.
- `npm run typecheck`: clean.
- `uv run python src/product_model/validate.py`: passes, and also runs inside the suite.
- Coverage of the agent package, measured with `uv run --with pytest-cov pytest --cov=src`, moved from 69% to 90% overall, `src/configuration.py` from 58% to 96%, and `src/http_app.py` from 0% to complete. What remains uncovered is the dead starter modules, which the suite correctly ignores.

## Known gaps

- The couplings are compared on the inputs the dump names, not exhaustively, and the prompt, being prose, is still only read as text (decision 4). A prompt rewritten to keep every fragment while changing what the agent does with it passes here, and only the conversation checks see it.
- The prompt rule added for a control activation (decision 3) hasn't been run against the live agent, because that needs the conversation checks, which need a provider key and cost money per run. It is a rule for a sentence the agent already handled, so the risk of the edit is that it is redundant rather than that it is wrong.
- `npm test` needs the agent environment, because the coupling checks run the agent's half. A frontend-only checkout fails those four checks with a message naming the command to fix it, rather than skipping them.
- No check reaches a React component, a hook, or the hydration rules. That is by design, and it means the traps in `docs/specs/chat-surface/design.md` and `docs/specs/agreement-document/design.md` are still found only by running the app.
