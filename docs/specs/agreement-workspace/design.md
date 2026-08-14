# Agreement workspace — design

## Store (agent side)

`agent/src/workspace_store.py`: one JSON file per workspace under `agent/data/workspaces/` (gitignored), `{id, name, configuration, threads: [{id, createdAt}], updatedAt}`. `name` is `null` until the agent names the workspace (`rename_workspace(id, name)`); creation takes no name. The store lives on the Python side because tools are the single validated mutation path (constitution #1, #3) and must write through to it; a frontend store would duplicate state (constitution #3). File-per-workspace JSON is the smallest mechanism that survives restarts (constitution #10) — no database.

Creating a workspace seeds `empty_configuration()` (solver-derived statuses), so the canvas of a fresh workspace is complete before any conversation.

## Terminology and naming

The user-facing term for a workspace is *elevator* (list heading, back link, empty states); code, store, and routes keep *workspace*. Naming works like conversation auto-titles: the workspace starts unnamed (frontend shows the placeholder "New elevator", styled as such), and the system prompt tells the agent to call the `name_workspace` tool once the conversation identifies the installation — or with a short descriptive name when enough context exists without an explicit identity — and to rename when better identity emerges, never asking the customer for a name. The tool persists via `rename_workspace` and returns a `Command` updating the new `AgentState.workspace_name` field, so the open workspace's sidebar re-renders with the name immediately; the list page reads it from the store on next load. Display precedence in the sidebar: `agent.state.workspace_name` ?? fetched `record.name` ?? placeholder. `get_configuration` reports the current name (from the store) so the agent knows whether the workspace is already suitably named.

## Agent state and write-through

- `AgentState` gains `workspace_id: str` (absent on legacy threads — read with `.get`). The frontend seeds it into agent state when attaching a conversation; it persists in the thread checkpoint thereafter.
- Every mutating tool (`set_choices`, `revise_choices`, `clear_choices`, `propose_completion`, `save_frame`, `adopt_frame`) calls one helper after computing the new configuration: persist to the store when `workspace_id` is present, then return the usual `Command`. Read-only tools are untouched. Last write wins; no locking.
- The thread checkpoint still carries `configuration` — as the historical record of what that conversation saw, which is exactly what cross-conversation staleness detection compares against (below).

## HTTP surface

Custom routes mounted into the LangGraph dev server via `langgraph.json`'s `http.app` (a small FastAPI app in `agent/src/http_app.py`): `GET /workspaces`, `POST /workspaces` (no body needed — workspaces are created unnamed), `GET /workspaces/{id}` (record incl. configuration), `POST /workspaces/{id}/threads` (register a conversation). The frontend reaches them through a Next.js rewrite `/api/workspaces/*` → `localhost:8123/workspaces/*` — same-origin, no CORS. The mounting works under `langgraph dev` (langgraph-api 0.7.x logs "Loaded custom app"); the fallback (separate process) was not needed.

## Frontend

- `/` — elevator list page (name or placeholder, price of current candidate if any, conversation count, last activity; one-click "New elevator" create that navigates straight in). No chat mounts here.
- `/workspaces/[id]` — a three-column surface scoped to one workspace: conversation sidebar, agreement canvas, chat (see *The split*). `CopilotThreadsDrawer` is replaced by `src/components/workspace/conversation-sidebar.tsx`, a conversation list built from the workspace record (rows labelled by date) — the drawer lists all threads globally, which is the wrong entity. The provider stays *uncontrolled* (its original rationale holds): the sidebar drives threads imperatively via the configuration's `setActiveThreadId` / `startNewThread`, which the uncontrolled provider permits.
- Opening a workspace mounts a fresh, unregistered conversation (the provider's minted thread) beside the canvas; the canvas renders from the seeded workspace state whether or not anyone chats. A conversation — typed, suggestion-clicked, or started by a canvas edit's structured message — joins the workspace's list on its *first message* (registration is message-triggered, not button-triggered), so "a canvas edit starts a conversation" needs no special path.

## The split

`src/components/workspace/workspace-split.tsx` — the agreement canvas holds the primary area and the chat sits to its right in a panel the operator drags to size. Position carries precedence: the centre column is what the user is working on, and the assertion [the canvas, not the transcript, is the durable locus of state](../../discovery/assertions/canvas-is-the-durable-state.md) is not credible while the chat holds the left half and the agreement is the thing pushed aside. The sidebar stays outside the panel group — it is fixed-width navigation, not one of the two working surfaces.

Built on shadcn `resizable` (`react-resizable-panels`), added to the [component library](../ui-component-library/design.md). Canvas 62% / chat 38% by default, with pixel floors of 360px each rather than percentage ones: what makes a pane unusable is its width, and a percentage floor that reads fine at 1600px is cramped at 1100px. The chat floor is measured — at 320px the frame-comparison table overflows its card and CopilotKit's composer breaks onto a second row. Together the floors are 720px, under the group's width at `lg`, the narrowest viewport that still shows the panes side by side.

Two things this replaced or gave up:

- *The Chat/App mode toggle is gone*, and with it `src/components/example-layout/` and its `enableAppMode` / `enableChatMode` frontend tools (starter code from the todo demo; nothing in the system prompt referenced them). Its app mode collapsed the canvas to zero width, which contradicts the placement decision, and the drag handle does the rest of its job. Below `lg` the panes stack vertically instead of hiding the chat, so both surfaces stay reachable without a toggle.
- *The split is not persisted.* `useDefaultLayout` restores the last drag from localStorage, which the server cannot see, so the SSR pass renders default sizes and hydration renders stored ones — a hydration error on every load. A remembered width is not worth a permanent error in the only surface this prototype is verified in (constitution #9, #10). The panel group and handle carry explicit `id`s for the same reason: without them `useId` supplied the ids and diverged the same way.

## Hydration and precedence

`use-thread-resumption` became `use-workspace-attachment` (`src/hooks/`). On opening a workspace or switching conversations: fetch the workspace record; messages hydrate from the thread endpoints as before; `configuration` seeds from the *workspace*, never the thread checkpoint. The draft assumed run-initial-state semantics would be enough; verification proved two more mechanisms necessary:

- *The connect overwrites the seed.* The connect fired by a page load or thread switch delivers the thread checkpoint's state (or nothing, for a fresh thread) *after* the seed. Precedence is therefore enforced event-driven: an agent subscriber (`agent.subscribe({onStateChanged})`) re-asserts the workspace configuration whenever agent state stops matching it, and disarms the moment a user message exists that was not hydrated from the server — from then on state belongs to the live run.
- *The agent instance swaps identity.* `useAgent`'s agent is replaced when the initial connect lands; a seed or subscriber applied to the stale instance is invisible to the UI. The attach effect re-runs on agent-instance change (it must not be guarded to run once per thread) and re-attaches idempotently.
- *The active thread survives navigation between workspaces.* The active thread and the agent's messages are global to the CopilotKit core, not scoped to the provider, so client-side navigation from one workspace to another carried the previous workspace's conversation along — its transcript rendered in the new workspace and its lingering message count registered a ghost conversation there. The hook therefore forces a fresh conversation on workspace entry (`startNewThread()` once per workspaceId — which the "opening a workspace mounts a fresh, unregistered conversation" behavior promised anyway) and clears messages synchronously alongside the state clear on every thread change (no connect wipes them in the navigation case).

The thread history endpoints return 500 (not 404) for a thread the server has never seen; any non-OK response is treated as "brand-new thread, nothing to restore". Runs then write through to the store (agent side), so the checkpoint is demoted to a historical record with no LangGraph-side change.

## Staleness across conversations

The attachment hook compares the reopened thread's checkpoint `configuration` with the workspace's current one (key-order-independent stringify — the two take different serialization paths); on mismatch it flags the thread stale via `StaleThreadContext` (exported from `card-dispatch.ts`, default `false` so cards outside a workspace are unaffected), and `useCardDispatch` treats the flag like its existing inert conditions. Within-thread staleness behavior is unchanged.

## System prompt

Two additions: the agreement may have been changed in other conversations; trust the current state (`get_configuration`) over the transcript when they disagree. And the naming instruction (see *Terminology and naming*): name the elevator via `name_workspace` as identity emerges, never ask the customer for a name.

## Testing

Store: unit tests in `agent/tests/test_workspace_store.py` (create/read/save round-trip, thread registration idempotence, recency ordering, unknown-id and path-escape rejection). Agent: existing pure-function tests unaffected (77 pass). Frontend and journey: browser pass per constitution #9 — see the notes in [tasks.md](tasks.md).
