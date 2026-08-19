# The CopilotKit surface, and which of it this tier can reach

*Evidence: solid.* Every claim below was read out of the installed packages — `@copilotkit/react-core` and `@copilotkit/runtime` at 1.65.0, `copilotkit` (Python) 0.1.94 — rather than from the documentation. That distinction did work: several docs pages describe a v1 API or an Enterprise-only path, and one of them contradicts what this repo demonstrably does. Where a claim rests on reading rather than on running, it says so.

Read 2026-08-14, and §4 added 2026-08-16 against the same package versions. It grounds the [shared attention](../specs/shared-attention/requirements.md) and [suggested moves](../specs/suggested-moves/requirements.md) specs, the removal of the starter's MCP configuration from the runtime route, and the state-transport reasoning in [parallel drafts](../specs/parallel-drafts/design.md).

## 1. The tier

This decides which of the platform is reachable at all, and most of the rest follows from it.

The runtime runs OSS with `InMemoryAgentRunner`. `COPILOTKIT_LICENSE_TOKEN` is unset, so the `CopilotKitIntelligence` branch in the runtime route is inert. Durability is not CopilotKit's: LangGraph's checkpointer holds thread state and `workspace_store.py` holds the agreement.

The runtime nevertheless serves `GET /threads`, `/threads/:id/messages`, `/threads/:id/events` and `/threads/:id/state` without a licence. `resolveThreadEndpointInfo` in `handlers/get-runtime-info.mjs` returns `list: true, inspect: true` for any runner declaring `ɵsupportsLocalThreadEndpoints`, which `InMemoryAgentRunner` does; `mutations` and `realtimeMetadata` stay `false`. The documentation's claim that the OSS runtime "keeps nothing server-side" describes the Intelligence store and not this fallback, which is why it appears to contradict `use-workspace-attachment.ts` fetching those endpoints successfully.

What those endpoints read is a `Map` in the Next.js process (`GLOBAL_STORE` in `runtime/runner/in-memory.mjs`). It is per-process and it empties on restart. Three consequences the repo has to live with:

- `listThreads()` returns every thread the process has run, with no workspace scoping and no persistence.
- `connect()` replays the thread's compacted historic event stream — messages and the trailing `STATE_SNAPSHOT` — which is the behaviour `use-workspace-attachment.ts` describes as the connect wiping hydrated messages. Whether that replay is complete enough to retire the hook's manual fetch and sleep loops is *not established here*; it needs a run against the app.
- `handleGetThreadState` answers `Response.json({ state })` and never a 404, so a thread the store has lost returns 200 carrying `null`. An absent checkpoint is therefore indistinguishable from an unchanged one at the call site, which is why the hook now treats it as unverifiable rather than as fresh.

## 2. What the project uses

The v2 entrypoint exports 25 hooks. The configurator imports five: `useAgent`, `useCopilotChatConfiguration`, `useRenderTool`, `useDefaultRenderTool`, `useConfigureSuggestions`. Alongside them it uses the `CopilotKit` provider, `CopilotChat` and its slot components, one uncontrolled `CopilotChatConfigurationProvider`, the agent-level imperative API, the thread REST endpoints, `LangGraphAgent`, and `CopilotKitMiddleware` on the Python side.

Three further hooks — `useFrontendTool`, `useHumanInTheLoop`, `useComponent` — appear only in `use-generative-ui-examples.tsx`, which is dead starter code.

It uses them along two paths that are not equivalent, and the difference is invisible at the call site. `RunHandler.runAgent` in `@copilotkit/core` is what assembles a run's `tools`, `context` and `forwardedProps` before delegating to `agent.runAgent(...)`; `AbstractAgent.prepareRunAgentInput` defaults all three to empty when called bare. The composer goes through the core (`copilotkit.runAgent({ agent })`); the two in-app dispatch sites — `card-dispatch.ts` for the in-chat cards and `config-canvas/index.tsx` for canvas edits — called `agent.runAgent()` directly, so those turns carried no frontend tools and no app context, and skipped the tool-execution loop, the suggestion engine's reload, and the run-failed error path. `copilotkit.stopAgent` stopped such a run correctly either way, because it calls `agent.abortRun()` itself. Nothing depended on the gap — neither tools nor context are registered — which is why it went unnoticed. Both were closed on the day this note was written, ahead of the [shared attention spec](../specs/shared-attention/design.md) they are a precondition for, and verified against the running app.

## 3. Reachable and unused

| Surface | Reachable here | Verdict |
|---|---|---|
| `useAgentContext` | Yes, end to end | Adopted by [shared attention](../specs/shared-attention/requirements.md). The frontend hook publishes into the runtime's context list and the installed Python `CopilotKitMiddleware.before_agent` reads `state["copilotkit"]["context"]` and injects it as an `App Context:` block. No agent-side work needed |
| `useFrontendTool` | Yes | Considered and rejected for revealing changes; the reason is in the [shared attention design](../specs/shared-attention/design.md) decision 3. A reveal that depends on the model remembering to call a tool is one that sometimes silently does not happen |
| `useConfigureSuggestions`, dynamic form | Yes | Considered and rejected for [suggested moves](../specs/suggested-moves/design.md); generated pills are prose, and constitution #9 keeps the conversation harness off prose, so a dynamic strip could not be checked at all |
| `useHumanInTheLoop`, `useInterrupt` | Yes | Rejected for `ask_choices`. Cards-are-messages exists so every move is a replayable user message mapping to one atomic tool call, which is what the conversation checks read and what [undo](../specs/undo/requirements.md) will reverse. A promise-resolving pause resolves inside a run and mints no message |
| `useThreads`, `CopilotThreadsDrawer` | List only | Rejected, as `conversation-menu.tsx` already records. `mutations: false` on this tier, and the list is the flat process-local one from §1 — the wrong entity and the wrong lifetime beside the workspace store's own list |
| `useMemories`, `useLearnFromUserAction`, `useLearningContainers` | No — Enterprise | Also unwanted: a value chosen from a learned preference has provenance nobody can read back, against [choice provenance](../specs/choice-provenance/requirements.md) |
| Channels | No — Enterprise | `channel-host.mts`, `channels.mts` and seven `@copilotkit/channels-*` packages are inherited starter code |
| `useSandboxFunctions`, `openGenerativeUI` | Yes | Model-authored UI, against [always show a valid whole](../discovery/principles/always-show-a-valid-whole.md) — a candidate the model draws is not one the solver validated — and against the shadcn-only component vocabulary |
| A2UI | Partly | Dead as configured: the provider registers a catalog while the runtime sets `injectA2UITool: false`, so the agent can never call it |
| `useAttachments` | Yes | Not needed; the composer's queue already arrives through `CopilotChatView`'s props |
| `useRenderCustomMessages`, `useRenderActivityMessage` | Yes | The supported seam if hidden `Canvas edit:` messages should ever leave a mark in the transcript instead of being filtered out. The current design hides them deliberately |
| `AGUISendStateSnapshot`, `AGUISendStateDelta` | No — `BuiltInAgent` only | Model-authored state writes, and not on this repo's path at all (§4) |

## 4. State reaches the canvas as snapshots, never as deltas

The protocol defines both. `STATE_SNAPSHOT` carries a whole state object; `STATE_DELTA` carries an RFC 6902 JSON Patch array, and `@ag-ui/client` applies it with `fast-json-patch`. Nothing on this repo's path emits the second one.

`@ag-ui/langgraph`'s adapter dispatches `STATE_SNAPSHOT` in three situations and `STATE_DELTA` in none: when the accumulated graph values differ from the last dispatched ones at a node boundary, on subgraph change and at run end (`getStateAndMessagesSnapshots`, which re-reads the thread state), and when a `ManuallyEmitState` custom event arrives. That last one is what the Python `copilotkit_emit_state` produces, so state streaming — were it ever wanted (§6) — would also arrive as a whole snapshot. What it offers is a choice of how often, not of how much.

The delta path is reachable only through `BuiltInAgent` in Simple Mode, which auto-injects two tools, `AGUISendStateSnapshot` and `AGUISendStateDelta`, for the model to call. This repo runs `LangGraphAgent`, so neither tool exists here; and a model emitting JSON Patch operations against the agreement is the provenance defect [choice provenance](../specs/choice-provenance/requirements.md) exists to prevent. The failure mode argues the same way: `defaultApplyEvents` applies a delta inside a `try`/`catch` whose `catch` is a `console.warn`, so a patch that does not apply leaves the canvas rendering the previous state with nothing to say it is stale.

What a snapshot carries is filtered, and this is the part that can bite silently. `getStateSnapshot` narrows the graph values to the keys of the assistant's `output_schema` plus a few constants, falling back to the constants alone if the schema request fails. `agent/main.py` passes a single `state_schema=AgentState`, so the output schema is `AgentState` and every key declared on that TypedDict arrives — `workspace_name` and the undo depth mirror are the live proof. A key a tool writes through `Command(update=…)` but the TypedDict does not declare is dropped on the way to the browser, with no error on either side. Anything added to state has to be declared, not merely written.

Compaction works on the same terms and bears on hydration. `compactEvents` folds every state event of a run into one trailing `STATE_SNAPSHOT`, starting from an empty object and applying snapshots as replacements and deltas as patches. That is the snapshot §1 describes `connect()` replaying, and what it carries is whatever the last run of that thread put in `AgentState`. So a field newly added to state is missing from every snapshot replayed for a thread that last ran before the field existed, and a thread that has never run replays no snapshot at all. The frontend's own seed — `use-workspace-attachment.ts` writing the workspace record into state on attach — is the only path for such a field on either kind of thread, which is why the hook's seed list has to grow whenever `AgentState` does.

## 5. MCP apps were not inert

The starter's `mcpApps` block named `https://mcp.excalidraw.com` in the runtime route. A non-empty server list is not passive configuration: `configureAgentForRequest` attaches `MCPAppsMiddleware` to the per-request agent clone, and the middleware's `run()` calls `fetchUITools()` — `client.connect(transport)` then `listTools()` against every listed server — on every agent run, with no cache, appending whatever UI-capable tools come back to the tool list for that run. Failures are swallowed into a `console.error`.

So every message sent in the prototype opened an outbound connection to a third-party host and offered the elevator agent that host's tools. The block was removed on the day this note was written.

## 6. What this note does not establish

- Whether `connect()`'s replay makes the manual hydration in `use-workspace-attachment.ts` partly redundant. Read from source, not run.
- Whether any solver round trip is slow enough to want `copilotkit_emit_state` state streaming. Unmeasured, and constitution #10 argues against adding the mechanism to find out. What such streaming would look like is settled by §4 — more frequent whole snapshots — so only the question of worth is open.
- Whether a thread can hold messages while holding no state snapshot, which is the case where §1's third consequence has teeth. The defensive treatment in the hook does not depend on the answer.

## Related

- [architecture-consensus.md](architecture-consensus.md) — the layer diagram this sits inside
- [gaps.md](gaps.md) — the register; nothing here is a literature gap, but §5 is the same kind of register entry
