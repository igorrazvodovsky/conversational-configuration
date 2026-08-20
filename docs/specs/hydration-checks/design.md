# Hydration checks — design

## 1. The decision: hydration is automated, components and hooks are not

Three things had no automated check, and they are not one thing.

*Components.* No render harness, decided rather than deferred. The failures these specs actually record are not component-logic failures: a menu that shifts the page's ids, a heading factored into a component that moves the tree beneath it, a chat pane whose DOM node is re-parented, a panel that loses its column. Every one is a property of the whole page or of a node's identity within it, and none of them is visible to a component rendered on its own. What a harness would reach instead is the code that decides what a surface shows and what a click sends — and that already has checks, because it lives in `src/lib/` and is covered by the [offline checks](../offline-checks/design.md). The residue is markup, and a check that renders markup and asserts the markup is a change detector.

There is also a fidelity argument, and it is the stronger one. The components worth checking subscribe to agent state, and agent state comes from CopilotKit's `useAgent`. Rendering them means mocking that, so the assertions would be made against a mock of the thing under test — constitution #3 puts the state in the agent precisely so there is one copy of it, and a mock is a second.

*Hooks.* Same answer, with a standing instruction attached: logic worth checking leaves the hook. `src/lib/attachments.ts` and `src/lib/suggested-moves.ts` are already that pattern — pure readers extracted from the surfaces that use them, checked in the node suite. The named candidates for the same treatment are the tool-call shape conversion inside `use-workspace-attachment.ts` and the staleness predicate in `card-dispatch.ts`. Neither is done here: this spec decides the method, and extracting them is a refactor with its own risk in a file the [agreement workspace](../agreement-workspace/design.md) design calls trap-dense.

*Hydration.* Automated, and it is the one thing on this list that fails on every load without anyone noticing. The mechanism is the rest of this note.

## 2. The check runs against the dev server, because production reports less

Measured on this app, with a deliberate server/client divergence injected in the canvas header:

| Injected divergence | `next dev` | `next build` + `next start` |
|---|---|---|
| Text (`Service agreement` + S or C) | reported in full | `Minified React error #418` |
| Attribute (`id="ssr-x"` vs `"csr-x"`) | reported in full — *"A tree hydrated but some attributes of the server rendered HTML didn't match the client properties"* | nothing at all |

An id divergence is an attribute divergence: `useId` values reach the DOM as `id` on a Radix collapsible's content and as `aria-controls` on its trigger. So a check run against a production build would be blind to exactly the class of defect these rules exist for, and the check runs `next dev --turbopack` — the same command `npm run dev:ui` runs.

That brings the dev server's own inconsistency with it, the one CLAUDE.md records: the first load after an edit can report a mismatch that the next load with the same code does not. The answer is to spend a load on it. Each route is loaded twice in fresh browser contexts and only the second is believed; the first also pays for the route's compile, which is where the dev server is least settled. The cost is that a mismatch that appears only on a cold first load would be missed, which is the trade the dev-server inconsistency forces either way.

## 3. No agent, no store, and that costs nothing

Hydration compares the server's HTML with the *first* client render. Both are drawn before any fetch resolves, so the tree under test is drawn from an empty configuration whether or not a workspace exists — and everything the workspace seed later fills in arrives after hydration, client-only by construction, unable to mismatch anything.

This is not an assumption. The data-less workspace page's server HTML already contains the five schedule collapsibles with their `useId`-derived Radix ids, both header menus in their pre-hydration form, and the panel group with its explicit ids — which is the whole surface the rules govern. So the route is requested with an id no workspace has (`/workspaces/hydration-check`): the fetch that discovers this resolves after hydration, and the page's collapse into its not-found state is downstream of the only thing being measured.

The consequence is that the check needs a Node toolchain and a browser, and nothing else: no provider key, no `uv`, no LangGraph server, no workspace store. It is the only check in the repo that renders this app's components, and it is still cheaper to run than the ones that do not.

## 4. What is not asserted

The second rule of the workspace page is that the chat is mounted exactly once ([chat-surface](../chat-surface/design.md) decision 2), and this check says nothing about it. Two reasons, in order of weight. What breaks when the rule breaks is a scroll offset, and an offset needs a transcript long enough to scroll, which needs a conversation — the conversation checks' cost tier, not this one's. And the weaker half that *could* be asserted here — that the pane's DOM node survives a mode switch — needs the page not to collapse into its not-found state, which means a running workspace store, which means the Python toolchain in a check that currently needs no Python. Marking a node and switching modes is perhaps twenty lines; it is the workspace store behind it that was not worth it. The rule stays where constitution #9 leaves it.

Nothing here asserts appearance, layout, or what any control does. A check that loads two pages and reads one class of console line is the smallest mechanism that closes the gap (constitution #10), and it is deliberately not the seed of a browser test suite.

## 5. A separate runner and a separate CI job

`node tests/hydration.mjs`, via `npm run test:hydration`, not vitest. The [offline checks](../offline-checks/design.md) pin `environment: "node"` and treat the absence of a DOM as the point; a check that spawns a dev server and drives a browser for tens of seconds does not belong in a suite that finishes in under two. Playwright is the dependency, and the browser is not vendored: `npx playwright install chromium` once, locally and in CI.

CI gets a third job beside `agent` and `frontend`, on the same argument the frontend job splits its two installs — a failure should name which thing broke. The job installs the frontend without its `postinstall` (the agent is not needed) and one browser.

## Verification

- `npm run test:hydration` on a clean tree at HEAD: both routes clean, 1m14s, dominated by the workspace route's cold dev compile.
- The same, with a text divergence injected in the canvas header: fails, quoting React.
- The same, with an attribute divergence injected: fails on the dev server (and, as the table in §2 records, would not have on a production build).
- The dev server is spawned into its own process group and killed as one. `npx` is a wrapper around a shell around the server, so killing the child left the server holding both the port and this process's stdout — which made the first version of the check appear to take ten minutes when it took just over one.
- The console lines the missing agent produces — `ERR_CONNECTION_RESET` and a 500 from the workspace store proxy — are present on every run and are ignored, as intended.

## Known gaps

- *The failure the chat-surface rule was written for did not reproduce.* With `useHydrated` forced to return true, so that both chat-header menus render in the hydrated tree exactly as the [chat-surface](../chat-surface/design.md) design says they must not, neither a production build nor the dev server reported any mismatch at HEAD, and the canvas collapsibles' ids were unchanged. React and Radix have both moved several versions since that decision was taken, and the bisection behind it was run against dev servers, where the first-load inconsistency lives. This does not license removing the gates — it says the rule is currently unfalsifiable by hand, which is the argument for the check rather than against it, and that a deliberate re-test of the gates is now cheap and worth doing on its own.
- *An attempt to shift ids without changing the DOM was inconclusive.* A zero-DOM component wrapper inserted above the schedules on the client only drew no report, but React derives `useId` from a tree context that a fragment component does not move, so the injection probably shifted nothing. What is established is the class, not that particular vector: React reports a mismatched attribute, and an id reaches the DOM as one. The [agreement document](../agreement-document/design.md) records the vector that is known to move them — a real component fiber inserted above the collapsibles, measured on a cold build — and that is the injection to use if anyone wants to watch this check catch an id divergence specifically.
- *Two routes, one viewport, one theme.* The check loads `/` and a workspace at Playwright's default viewport. The stacked layout below `lg` and the second canvas mode are not visited; the render mode is behind `next/dynamic` and mounts on demand, so nothing draws it here.
- *It is slow relative to what it asserts* — the workspace route's cold dev compile dominates, and the route is compiled once and loaded twice. Fast enough for CI and for a developer about to open a pull request; not fast enough to sit inside `npm test`, which is why it does not.
