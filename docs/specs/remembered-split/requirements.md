# Remembered split: the pane weight an operator sets survives the reload

Status: implemented and verified 2026-08-31. The [design](design.md) records the mechanism, the tree-shape hazard it had to clear, and one gap in the verification.

Sidebar mode gives the canvas 62% of the width and the chat 38%, and the operator can drag the handle to any other division. That drag lasts until the page reloads. Every return to a workspace — a refresh, a follow of a link, tomorrow morning — puts the split back at 62/38, and an operator who works at 75/25 re-drags the handle on every load. The tool re-asserts a weight the operator has already rejected, once per visit.

Serves discovery principle [the canvas holds the state and the chat explains it](../../discovery/principles/canvas-holds-state-chat-explains.md). The principle divides the labour between the two surfaces but says nothing about their relative weight, which is the reasoning the [chat surface](../chat-surface/requirements.md) already draws on to make that weight the user's choice. A weight the user picks and the tool forgets is only half of that choice: the modes let the operator say where the work is, and this spec lets them say it once.

## The recorded refusal, and what changes

Three places currently state that the split is not persisted — [agreement workspace](../agreement-workspace/design.md), and the [chat surface](../chat-surface/design.md) twice. The reason given in all three is one mechanism rather than a product judgement: `useDefaultLayout` restores the last drag from `localStorage`, the server cannot read `localStorage`, so the server renders 62/38 and hydration renders the stored split — a hydration error on every load, in the only surface this prototype is verified in.

That reasoning stands and this spec does not overturn it. What it overturns is the conclusion that no mechanism can do the job. A cookie is visible to the server, so the server render and the first client render can be given the same number and agree. The probe that settles the one uncertainty in that claim — whether a server component can read `cookies()` beneath this app's client root layout — was run before writing this: it can.

## What is remembered, and what is not

One split, for every workspace and every session. An operator has a way of working, not a way of working per elevator, and the request is for the size to travel. There is no per-workspace division to keep and nothing about it to reconcile against the workspace store: this is a property of the operator's screen, not of the agreement, so it does not belong in `agent/data/workspaces/` and it is not shared between browsers.

The chat's *mode* stays unpersisted, for the reason the [chat surface](../chat-surface/design.md) gives, which is not the hydration one: sidebar on load is the guard behind the discovery amendment, so the app never opens anyone in a transcript. Only the sidebar split is remembered, so only sidebar mode changes.

Floating, full screen and hidden bypass the group's sizing entirely and cannot change the remembered split. Neither can the stacked layout below `lg`, where the handle divides height rather than width: a division that reads well in a narrow column is not the operator's opinion about a two-column desktop, and the two cannot share one number.

## Stories

- As an operator who works with the document wide and the chat narrow, I drag the handle once and find that division on every workspace I open, today and next week.
- As an operator who reloads mid-negotiation, I get the page back exactly as I left it, with no flash of the default split on the way.
- As an operator on a narrow screen, I size the stacked panes for the screen I am on without changing the split I use at my desk.
- As an operator who hides the chat and brings it back, I find the split I dragged, as I do today.
- As a developer, I read the split from the request and pass it down as a default size, so the server's HTML and the first client render are the same and hydration stays clean.

## Acceptance criteria

- GIVEN I have dragged the split, WHEN I reload the workspace, open another workspace, or return in a later session, THEN the panes render at the division I dragged, and the handle sits where I left it.
- GIVEN a stored split that both panes' 360px floors can hold at the current window width, WHEN the page loads, THEN the split is right from the first paint: no default division is painted first and no pane resizes after hydration. The narrow case is the criterion below, where the floors win as they already do for today's 62/38.
- GIVEN a stored split, WHEN the page loads, THEN the console reports no hydration mismatch, in any chat mode. This is the criterion the earlier refusal was protecting and it is not traded away.
- GIVEN I have never dragged the split, or the stored value is missing or unreadable, WHEN the page loads, THEN the panes render at 62/38, as they do today.
- GIVEN a stored split, WHEN the window is narrow enough that either pane would fall below its 360px floor, THEN the floors win, exactly as they do for a live drag, and the stored value is not overwritten by that clamping.
- GIVEN the chat is floating, full screen or hidden, WHEN I load or leave the workspace, THEN the remembered split is unchanged, and returning to sidebar shows the division I last dragged there.
- GIVEN the panes are stacked below `lg`, WHEN I drag the handle, THEN the desktop split is unchanged.
- GIVEN I am reading a workspace, WHEN nothing is dragged, THEN nothing is written: only my own drag of the handle records a split.
