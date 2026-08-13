# Agreement workspace — tasks

## Agent

- [x] `workspace_store.py`: file-per-workspace JSON store (create, get, list, save configuration, register thread) + unit tests
- [x] `AgentState.workspace_id`; write-through helper (`_commit`) called from the six mutating tools
- [x] `http_app.py` with the four workspace routes; mounted via `langgraph.json` `http.app` (verified under `langgraph dev` — no fallback needed)
- [x] System-prompt line: current state beats transcript when other conversations changed the agreement

## Frontend

- [x] Next.js rewrite `/api/workspaces/*` → agent (same `AGENT_URL` fallback chain as `src/agent.ts`)
- [x] `/` workspace list page (list, create, open)
- [x] `/workspaces/[id]` route hosting the split layout; `conversation-sidebar.tsx` replacing `CopilotThreadsDrawer`; uncontrolled provider driven via `setActiveThreadId`/`startNewThread`
- [x] `use-thread-resumption` → `use-workspace-attachment`: seed `{workspace_id, configuration}` from the workspace, messages from the thread; workspace configuration wins over checkpoint (subscriber-based — see design)
- [x] Canvas without active conversation renders from seeded state; a canvas edit dispatches into the fresh thread, which registers as a conversation on its first message
- [x] Cross-conversation staleness: `StaleThreadContext` from the attachment hook consumed by `useCardDispatch`

## Naming and terminology (revised 2026-08-13, after first implementation)

- [x] Store: `name` nullable, creation nameless, `rename_workspace`; tests updated
- [x] `name_workspace` tool + `AgentState.workspace_name`; `get_configuration` reports the name; system-prompt naming instruction
- [x] Frontend: user-facing term "elevator"; one-click create; placeholder display for unnamed workspaces; sidebar shows the live name from agent state
- [x] Browser pass: one-click create → placeholder in list and sidebar → first message identifying the installation triggers `name_workspace` (no announcement in the reply) → sidebar renames live → list shows the stored name

## Reconcile

- [x] Browser pass: create workspace → converse (choices + candidate persisted to store) → cold reload shows canvas with no conversation → canvas edit starts+registers a conversation and writes through → reopen first conversation (transcript hydrates, canvas keeps *current* state) → "where were we?" answered from current state, not the transcript
- [x] Update [nonlinear-interaction design](../nonlinear-interaction/design.md) (resumption section superseded)
- [x] Update `docs/specs/README.md` status and root `CLAUDE.md` pointers

## Notes from implementation

- Two traps beyond the drafted design (both now in design.md): the switch/load *connect* delivers the checkpoint state after the seed (fixed with an `onStateChanged` subscriber that re-asserts until the user acts), and the `agent` instance swaps identity when the initial connect lands (the attach effect re-runs per instance, not once per thread).
- Conversation registration is message-triggered, not button-triggered — a stale render right after `startNewThread()` still shows the previous thread's messages, so registration is additionally gated on the attach having completed for that thread (`attachedFor`).
- Card inertness in stale threads is wired and typechecked but was not exercised in the browser pass (the test transcripts contained no cards); exercise it when a card-bearing conversation gets superseded.
- Observed once in the pass: a reopened transcript showed one assistant message with its text duplicated. Likely a hydration/serialization quirk inherited from the resumption machinery — cosmetic, not chased.
- The naming pass exposed a third trap: the active thread survives client-side navigation between workspaces, leaking the previous workspace's transcript into the next and registering a ghost conversation there. Fixed in the attachment hook (fresh conversation on workspace entry + synchronous message clear); documented in design.md.
