# Chat surface

Status: draft — awaiting approval (2026-08-14).

The chat has one shape: a resizable column to the right of the canvas, the same width whether the agreement is empty or settled. That shape was chosen for one kind of work — negotiating over a document that exists — and the tool now imposes it on all the rest. Opening a brand-new elevator, the canvas holds nothing to read and the column crowds the only surface doing anything. Reading a settled agreement, the operator has one question to ask and no reason to surrender a third of the screen to a transcript. Those are examples, not a taxonomy: the problem is that the split is fixed at all.

This spec makes the chat's surface a mode the user picks — *sidebar* (the column as it is today), *floating* (a small panel over a full-width canvas), *full screen*, and *hidden* — switched from one control, the way Notion switches its assistant.

Serves discovery principle [the canvas remembers; the chat explains](../../discovery/principles/canvas-remembers-chat-explains.md). The principle divides labour between the two surfaces but says nothing about their relative weight at a given moment, and a fixed split asserts that the weight never changes. It does: at the opening there is nothing yet to remember, and for the returning operator there is little left to explain. The modes let the user put the weight where the work is, without the tool deciding for them which moment they are in.

Hidden is the limit of that, and it is already in the framing: [Surface architecture](../../discovery/models/Surface%20architecture.md) §1 sets the document-first geometry aside as the primary shape but keeps its binding half — *the canvas must work with chat idle, for the returning operator* — and the [brief](../../discovery/brief.md) §3 says the same of the rejected spreadsheet-that-talks, that chat should be optional. The canvas already renders from workspace state with no conversation attached; nothing but the layout has been asserting that the chat must be on screen.

Constrained by [any door is an entrance](../../discovery/principles/any-door-is-an-entrance.md): a mode is a view, never a stage. No mode may be a step in a sequence, none may lock a move that another mode allows, and the app may not move the user between them.

## Discovery amendment this requires

[Surface architecture](../../discovery/models/Surface%20architecture.md) §2 currently reads *"The agreement takes the primary area and the chat sits beside it in a pane the user sizes — a chat pane that can be pushed to the margin, and never a document that can be hidden."* Full screen hides the document, so the model has to change or this spec cannot be written.

The proposed amendment holds the claim and narrows its subject to default weight:

> *The document holds the centre.* The geometry names two surfaces but not their weight. By default the agreement takes the primary area and the chat sits beside it in a pane the user sizes. The user may temporarily give the chat the whole surface, or put it away entirely — the app never does either, and never on the user's behalf. Placement is the cheapest evidence for [the canvas is the durable state](../assertions/canvas-is-the-durable-state.md): a surface the layout treats as secondary by default will not be read as the record, whatever the state actually lives in. What a user chooses to look at for a minute is not what the layout treats as secondary; an app that opened them in a transcript would be.

The guard in that paragraph — user-invoked, one click back, never the app's choice — is what keeps the principle intact, and it is an acceptance criterion below.

## What each mode gives up

The modes are described by what they trade, not by the moment they belong to. Which mode suits which moment is the user's judgement and the boundaries are fuzzy — the point of the feature is the flexibility, so nothing here presumes a mapping, and no mode is recommended, defaulted into or nudged toward by the tool. The sketches below are illustration, not scope.

| Mode | The trade | Where it plausibly helps |
|---|---|---|
| Sidebar (default) | Both surfaces at once, neither at full width | Negotiating over a document you are reading at the same time |
| Floating | Canvas at full width; the chat is small and sits over it | Working in the document with something to ask |
| Full screen | The whole surface to the conversation; the canvas is out of view | An empty agreement, or a long passage — a comparison, a ripple explained |
| Hidden | No chat at all; only a control to bring it back | Reading, checking or editing the agreement with nothing to say |

## Stories

- As an operator opening a brand-new elevator, I give the conversation the whole screen, because there is nothing on the canvas yet to keep in view.
- As an operator revising a settled agreement, I keep the document at full width and ask my question from a small panel over it, without losing my place in either surface.
- As an operator with nothing to say, I put the chat away entirely and read, check and edit the agreement on a screen that holds only the agreement — and bring it back from one control when I do have something to say.
- As a user in any mode, I can see which mode I am in and get to any other in one click — including back out of full screen and back from hidden.
- As a user who switches mode mid-conversation, I find the same conversation where I left it.
- As a developer, I add a mode by placing one chat component, not by maintaining a second chat.

## Acceptance criteria

- GIVEN a workspace I open, WHEN it first renders, THEN the chat is in sidebar mode beside the canvas, whatever the state of the agreement — the app picks no other mode on my behalf, and no agent turn, tool call or card click ever changes the mode.
- GIVEN any mode where the chat is on screen, WHEN I look at it, THEN one control offers every mode with the current one marked, and that control is reachable in each of them, full screen included.
- GIVEN the chat is hidden, WHEN I look at the workspace, THEN the canvas has the whole area and a single control — always visible, never covering canvas content I need — brings the chat back in the mode I had it in before I hid it.
- GIVEN the chat is hidden, WHEN the agent says something I have not seen — a repair proposal, a rejected edit and its reason, any reply to a `Canvas edit:` — THEN the restore control carries a mark that there is something to read, and the chat does not reopen itself. Hiding the explanation may not cost me the reason (discovery principle [every "no" carries its reason](../../discovery/principles/every-no-carries-its-reason.md)).
- GIVEN I am in full screen, floating or hidden, WHEN I return to sidebar, THEN the canvas is the agreement I left — same values, same rows expanded or collapsed.
- GIVEN floating mode, WHEN the panel is over the canvas, THEN the canvas underneath stays live: I can scroll it, expand a row and edit a value without dismissing or defocusing the chat. The panel is not modal, traps no focus and dims nothing.
- GIVEN floating mode at any window size, WHEN the panel renders, THEN it is at least as wide as the sidebar's measured floor (360px — below it the frame-comparison card overflows and the composer wraps onto a second row), and it does not cover the canvas edge-to-edge.
- GIVEN a conversation with a transcript, WHEN I switch mode — including hiding it and bringing it back — THEN it is the same conversation at the same scroll position: not reloaded, not re-landed at the end, and a reply that was streaming while it was away has streamed in, not restarted.
- GIVEN a card in the transcript — `ask_choices`, a repair set, a frame comparison — WHEN I click it in any mode, THEN it dispatches the same structured message it dispatches today. Modes change the geometry and nothing else about the interaction grammar.
- GIVEN any mode, WHEN I reload the page, THEN the workspace comes back in sidebar mode. The mode is session view state and is deliberately not remembered: restoring it from `localStorage` is invisible to the server and produces the hydration mismatch on every load that [`workspace-split.tsx`](../../../src/components/workspace/workspace-split.tsx) already refuses for the panel split (constitution #9, #10). If a remembered mode is wanted, it needs an answer to that first.
- GIVEN a viewport below `lg`, WHEN I am in sidebar mode, THEN the panes stack as they do today; the other modes behave as they do at desktop width.

## Relationship to other specs

- [Agreement workspace](../agreement-workspace/requirements.md): owns the split (`workspace-split.tsx`) that sidebar mode *is*. That spec is amended, not replaced — the mode is a layer above it, and sidebar mode must remain the split it describes, resizable floors and all.
- [UI component library](../ui-component-library/requirements.md): the mode control and the floating panel come from installed shadcn primitives, and the chat inside them is the same slot composition (design decision 7) in every mode — no second chat, no CSS reaching into CopilotKit's markup.
- [Configuration canvas](../configuration-canvas/requirements.md): unchanged, but floating mode is the first surface where a canvas edit happens with the chat overlapping it. The `Canvas edit:` dispatch and its hidden-message handling must behave identically.

## Out of scope

Remembering a mode across reloads or per workspace; a full-screen mode for the *canvas*; agent- or state-triggered mode changes; a small-screen layout redesign beyond not breaking what stacks today; more than one chat window at a time; anything about what the chat *says* in a given mode — the copy, suggestions and welcome screen are the same in every mode.
