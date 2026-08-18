# Chat surface

Status: implemented 2026-08-14; the transcript-behaviour half of the verification is outstanding (see [tasks.md](tasks.md)).

The chat has one shape: a resizable column to the right of the canvas, the same width whether the agreement is empty or settled. That shape was chosen for one kind of work — negotiating over a document that exists — and the tool now imposes it on all the rest. Opening a brand-new elevator, the canvas holds nothing to read and the column crowds the only surface doing anything. Reading a settled agreement, the operator has one question to ask and no reason to surrender a third of the screen to a transcript. These are examples rather than a taxonomy; the problem is that the split is fixed at all.

This spec makes the chat's surface a mode the user picks — *sidebar* (the column as it is today), *floating* (a small panel over a full-width canvas), *full screen*, and *hidden* — switched from one control, the way Notion switches its assistant.

Serves discovery principle [the canvas holds the state and the chat explains it](../../discovery/principles/canvas-holds-state-chat-explains.md). The principle divides labour between the two surfaces but says nothing about their relative weight at a given moment, and a fixed split asserts that the weight never changes. It does: at the opening there is nothing yet to remember, and for the returning operator there is little left to explain. The modes let the user put the weight where the work is, without the tool deciding for them which moment they are in.

Hidden is the limit of that, and it is already in the framing: [Surface architecture](../../discovery/models/Surface%20architecture.md) §1 sets the document-first geometry aside as the primary shape but keeps its binding half — *the canvas must work with chat idle, for the returning operator* — and the [brief](../../discovery/brief.md) §3 says the same of the rejected spreadsheet-that-talks, that chat should be optional. The canvas already renders from workspace state with no conversation attached; nothing but the layout has been asserting that the chat must be on screen.

Constrained by [configuration can start from any variable, in any order](../../discovery/principles/start-from-any-variable.md): a mode is a view, never a stage. No mode may be a step in a sequence, none may lock a move that another mode allows, and the app may not move the user between them.

## Discovery amendment

[Surface architecture](../../discovery/models/Surface%20architecture.md) §2 previously ruled out a document that can be hidden, which full screen does; the model was amended with this spec. It now names the two surfaces but not their weight: the document holds the centre *by default*, and the user may temporarily give the chat the whole surface or put it away entirely — the app never does either, and never on the user's behalf. That guard — user-invoked, one click back, never the app's choice — is what keeps the principle intact, and it is an acceptance criterion below.

## The conversation list travels with the pane

The list of a workspace's conversations is chat chrome, not workspace furniture: it belongs in the pane whose contents it changes, and it is present only when that pane is. So it lives in the chat's header — the conversation's name, opening onto the others — the way Notion carries its assistant's history, and no column outside the pane lists conversations.

This serves the assertion [the canvas, rather than the transcript, is the durable locus of state](../../discovery/assertions/canvas-is-the-durable-state.md). A permanently visible register of transcripts contradicts it twice over: it gives the ephemeral thing the fixed furniture, and it spends a column of the screen on navigation between views of an agreement that is itself only ever shown in one place. Picking a past conversation is a rare move; reading the sheet is the constant one.

With the column gone, the workspace's identity — its name and the way back to the elevator list — moves to the head of the canvas, which is the surface that survives every mode.

## What each mode gives up

The modes are described by what they trade, not by the moment they belong to. Which mode suits which moment is the user's judgement — nothing here presumes a mapping, and no mode is recommended, defaulted into or nudged toward by the tool.

| Mode | The trade |
|---|---|
| Sidebar (default) | Both surfaces at once, neither at full width |
| Floating | Canvas at full width; the chat is small and sits over it |
| Full screen | The whole surface to the conversation; the canvas is out of view |
| Hidden | No chat at all; only a control to bring it back |

## Stories

- As an operator opening a brand-new elevator, I give the conversation the whole screen, because there is nothing on the canvas yet to keep in view.
- As an operator revising a settled agreement, I keep the document at full width and ask my question from a small panel over it, without losing my place in either surface.
- As an operator with nothing to say, I put the chat away entirely and read, check and edit the agreement on a screen that holds only the agreement — and bring it back from one control when I do have something to say.
- As a user in any mode, I can see which mode I am in and get to any other in one click — including back out of full screen and back from hidden.
- As an operator rereading an earlier negotiation, I find the workspace's conversations where the conversation is: at the top of the chat, one click from the one I am in.
- As an operator with nothing to say, I get a screen with no register of transcripts on it at all — the conversations leave with the chat.
- As a user who switches mode mid-conversation, I find the same conversation where I left it.
- As a developer, I add a mode by placing one chat component, not by maintaining a second chat.

## Acceptance criteria

- GIVEN a workspace I open, WHEN it first renders, THEN the chat is in sidebar mode beside the canvas, whatever the state of the agreement — the app picks no other mode on my behalf, and no agent turn, tool call or card click ever changes the mode.
- GIVEN any mode where the chat is on screen, WHEN I look at it, THEN one control offers every mode with the current one marked, and that control is reachable in each of them, full screen included.
- GIVEN the chat is hidden, WHEN I look at the workspace, THEN the canvas has the whole area and a single control — always visible, never covering canvas content I need — brings the chat back in the mode I had it in before I hid it.
- GIVEN the chat is hidden, WHEN the agent says something I have not seen — a repair proposal, a rejected edit and its reason, any reply to a `Canvas edit:` — THEN the restore control carries a mark that there is something to read, and the chat does not reopen itself. Hiding the explanation may not cost me the reason (discovery principle [every refusal names the rules that caused it](../../discovery/principles/refusals-name-their-rules.md)).
- GIVEN any mode where the chat is on screen, WHEN I look at its header, THEN it names the conversation I am in and opens the workspace's other conversations from that name — newest first, grouped by day — and picking one switches the transcript and the cards' staleness exactly as choosing it from a list always has. A control beside it starts a new conversation.
- GIVEN a conversation that has not yet sent its first message, WHEN I look at the header, THEN it tells me I am in a new conversation, and the start-a-conversation control is unavailable with that reason readable rather than silently inert.
- GIVEN the chat is hidden, WHEN I want a different conversation, THEN I bring the chat back first: nothing outside the pane lists conversations, and the workspace shows only the agreement.
- GIVEN a workspace at any width, WHEN it renders, THEN its name and the way back to the elevator list are at the head of the canvas, and no navigation column stands beside the two surfaces. The name still updates live when the agent names the workspace.
- GIVEN I am in full screen, floating or hidden, WHEN I return to sidebar, THEN the canvas is the agreement I left — same values, same rows expanded or collapsed.
- GIVEN floating mode, WHEN the panel is over the canvas, THEN the canvas underneath stays live: I can scroll it, expand a row and edit a value without dismissing or defocusing the chat. The panel is not modal, traps no focus and dims nothing.
- GIVEN floating mode at any window size, WHEN the panel renders, THEN it is at least as wide as the sidebar's measured floor (360px — below it the frame-comparison card overflows and the composer wraps onto a second row), and it does not cover the canvas edge-to-edge.
- GIVEN a conversation with a transcript, WHEN I switch mode — including hiding it and bringing it back — THEN it is the same conversation at the same scroll position: not reloaded, not re-landed at the end, and a reply that was streaming while it was away has streamed in, not restarted.
- GIVEN a card in the transcript — `ask_choices`, a repair set, a draft comparison — WHEN I click it in any mode, THEN it dispatches the same structured message it dispatches today. Modes change the geometry and nothing else about the interaction grammar.
- GIVEN any mode, WHEN I reload the page, THEN the workspace comes back in sidebar mode. The mode is session view state and is deliberately not remembered: restoring it from `localStorage` is invisible to the server and produces the hydration mismatch on every load that [`workspace-split.tsx`](../../../src/components/workspace/workspace-split.tsx) already refuses for the panel split (constitution #9, #10). If a remembered mode is wanted, it needs an answer to that first.
- GIVEN a viewport below `lg`, WHEN I am in sidebar mode, THEN the panes stack as they do today; the other modes behave as they do at desktop width.

## Relationship to other specs

- [Agreement workspace](../agreement-workspace/requirements.md): owns the split (`workspace-split.tsx`) that sidebar mode *is*, and the workspace/conversation relationship the switcher navigates. That spec is amended, not replaced — the mode is a layer above it, sidebar mode remains the split it describes, resizable floors and all, and every rule about how a conversation is registered, hydrated and made stale is untouched. What changes is where the list is drawn: the workspace is now two surfaces, not three columns.
- [UI component library](../ui-component-library/requirements.md): the mode control and the floating panel come from installed shadcn primitives.
- [Chat pane](../chat-pane/requirements.md): the chat inside every mode is that spec's slot composition, unchanged — no second chat, no CSS reaching into CopilotKit's markup.
- [Agreement document](../agreement-document/requirements.md): unchanged, but floating mode is the first surface where a canvas edit happens with the chat overlapping it. The `Canvas edit:` dispatch and its hidden-message handling must behave identically.

## Out of scope

Remembering a mode across reloads or per workspace; searching, renaming, deleting or archiving conversations, and any title for one beyond the date it started; a full-screen mode for the *canvas*; agent- or state-triggered mode changes; a small-screen layout redesign beyond not breaking what stacks today; more than one chat window at a time; anything about what the chat *says* in a given mode — the copy, suggestions and welcome screen are the same in every mode.
