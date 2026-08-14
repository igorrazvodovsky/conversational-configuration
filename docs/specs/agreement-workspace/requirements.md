# Agreement workspace

Status: requirements approved 2026-08-13; implemented 2026-08-13. The last acceptance criterion (placement of the two surfaces) was added afterwards, on the user's direct instruction, and implemented the same day.

The built system keys the configuration to the conversation: `AgentState.configuration` lives in the thread's LangGraph checkpoint, so starting a new conversation silently starts a new agreement, and the threads drawer stands in for choosing an agreement. This spec decouples them. A *workspace* is the durable home of one installation's service agreement — configuration, candidate, and frames; conversations are ephemeral views onto it, many per workspace. The journey starts at the workspace list, not at an empty chat.

Serves discovery principles [the canvas remembers; the chat explains](../../discovery/principles/canvas-remembers-chat-explains.md) and [changing your mind is a normal move, not a restart](../../discovery/principles/revision-is-not-a-restart.md), and makes the implementation honest to the assertion [the canvas, not the transcript, is the durable locus of state](../../discovery/assertions/canvas-is-the-durable-state.md) — today the transcript's thread literally is the durable locus. It also delivers the kept half of the rejected *spreadsheet that talks* concept ([direction](../../discovery/direction.md) §1): the returning operator can open the agreement and read or edit it with chat idle.

Scope decisions:

- *Identity and naming.* A workspace corresponds to one installation and is presented to the user as an *elevator* — the concrete thing an operator points at — while code, store, and routes keep the neutral term *workspace*. It is created unnamed: the list shows a placeholder, and the agent names it from the conversation the way chat apps title conversations — with the installation's identity when one emerges ("Riverside Tower — north lift"), descriptively otherwise — and renames when better identity appears. The customer is never asked to invent a name. The agreement is the workspace's content, not its identity. One agreement per workspace, evolving forever — successive agreements about the same elevator (renewal as a new document, change of counterparty) are out of scope, mirroring the [service-agreement](../service-agreement/requirements.md) position that renewal is resumption plus revision. Keying by installation keeps agreements-as-versions an additive change later.
- *Concurrency.* One conversation writes at a time; last write wins. Simultaneous conversations on one workspace are not defended against (constitution #10).

## Stories

- As a building operator, I open the tool and see my installations with their agreements; I open one and the agreement sheet is there as I left it — no conversation needed to look at it.
- As an operator, I start a new conversation about an existing agreement; the agent already knows its current state and never re-asks what is settled, and every change made in this conversation lands on the same agreement.
- As an operator, I reopen an earlier conversation to reread the negotiation; its cards cannot act on an agreement state that has since moved on.
- As a new customer, I start a new elevator with one click and just begin talking; the entry names itself as the conversation reveals which installation it is.

## Acceptance criteria

- GIVEN the app root, WHEN it loads, THEN it shows the elevator list — name (or placeholder), monthly price when a candidate exists, last activity — with a one-click create action that asks for nothing, and no chat surface before a workspace is opened.
- GIVEN a conversation that reveals the installation's identity, WHEN the agent records it, THEN the workspace gets its name without the customer being asked to name anything, and the name updates live in the open workspace and on the list.
- GIVEN a workspace with recorded state, WHEN it is opened, THEN the canvas renders the current agreement from the workspace's stored state before and without any conversation being active.
- GIVEN an open workspace with no active conversation, WHEN the user edits the canvas, THEN a new conversation starts and carries that edit as its first structured message through the normal validated path.
- GIVEN an existing workspace, WHEN a new conversation starts, THEN the agent's state begins from the workspace's current configuration (choices with provenance, candidate, frames), and choices recorded in the conversation are persisted to the workspace.
- GIVEN two conversations of one workspace, WHEN a change is applied in one and the other is reopened, THEN the canvas shows the workspace's current state — not the reopened thread's checkpoint — and all cards in the reopened transcript are inert whenever its checkpoint no longer matches the workspace state.
- GIVEN a frame saved in one conversation, WHEN any other conversation of the same workspace runs, THEN the frame is available to compare and adopt — frames are workspace-level.
- GIVEN a dev-server restart, WHEN the app reloads, THEN workspaces, their agreements, and their conversation lists survive.
- GIVEN an open workspace on a desktop viewport, WHEN it renders, THEN the agreement canvas holds the primary area with the chat beside it, the operator can drag the boundary between them, and neither can be dragged below the width at which it stops working. This is the default and the state every load returns to; the operator can move the chat off it — float it, give it the screen, put it away — under the [chat-surface spec](../chat-surface/requirements.md), which owns those modes and leaves this one as it is.

## Relationship to other specs

- [nonlinear-interaction](../nonlinear-interaction/requirements.md): thread resumption evolves — messages still hydrate from the thread, configuration now hydrates from the workspace; reconcile that spec's design when this lands. Frames move from thread-scoped to workspace-scoped by riding in the workspace's configuration.
- [service-agreement](../service-agreement/requirements.md): the agreement this spec makes durable; no change to its terms or pricing.
- [configuration-canvas](../configuration-canvas/requirements.md): the canvas itself is unchanged; it gains the no-conversation display state and the edit-starts-a-conversation behavior.

## Out of scope

Successive agreements per installation (see scope decision); concurrent-conversation conflict handling; multi-user access and auth; deleting or archiving workspaces and conversations; migrating threads created before this feature (they simply do not appear in any workspace); fleet views across installations.
