# Remembered split — design

Rules where the division between canvas and chat is kept, why the route grew a server half to read it, and what may write it. Read it before changing how the workspace page renders, before adding anything else the server has to know, and before making any other view state durable.

Status: implemented 2026-08-31 and verified against a production build; the verification record and one known gap are at the end. It reverses a decision the [agreement workspace](../agreement-workspace/design.md) and the [chat surface](../chat-surface/design.md) both recorded, and both were reconciled with it.

## Decision 1: a cookie, because the server renders this split too

The panels are sized by props, and props are rendered twice: once by the server and once by the browser hydrating what the server sent. Anything the browser can see and the server cannot therefore cannot size them. That is the whole of why `useDefaultLayout` was refused — it restores the last drag from `localStorage`, so the SSR pass renders 62/38 and hydration renders the stored split, and React reports a mismatch on every load.

A cookie travels with the request. `src/lib/split-layout.ts` names it `workspace-split` and holds the value's meaning: `canvasPercentFrom` turns the raw string into the canvas's share, and `splitCookie` turns a drag back into the string. The server parses with the first, the browser writes through the second, and neither has an opinion of its own about what a stored value means. A year of `max-age`, because a way of working outlasts a session, and `SameSite=Lax`, because no cross-site request has any business carrying it.

What is stored is one number: the canvas's percentage, whole. The chat takes the rest. Storing a proportion rather than two pixel widths is what lets the division survive a different window, and rounding it keeps the value stable across the arithmetic of a drag.

The alternatives, both rejected. *A blocking script in `<head>`*, which is how the theme beats its own flash: it would have to rewrite inline styles React is about to hydrate, and `defaultSize` takes a length, not a variable, so there is nothing for the script to set. *Applying the split after hydration*, through the group's imperative API: no mismatch, but a visible resize on every load, in an app that already added a script to avoid a flash of the wrong theme.

## Decision 2: the route grows a server half, and nothing else moves

`src/app/workspaces/[id]/page.tsx` is a server component. It awaits `params`, reads the cookie, and renders `WorkspaceRoot`. Everything else — the provider, the view, the surfaces — moved verbatim to `workspace-view.tsx` behind `"use client"`.

`WorkspaceRoot` stands exactly where the page component stood. That is deliberate and it is the whole risk of this change: [chat surface](../chat-surface/design.md) decision 4 records that anything inserted above id-minting descendants moves the tree path their `useId` values derive from, and breaks hydration page-wide. A server component contributes no fiber, so the client tree needed a component to stand in the page's place rather than one more wrapper around it. This was verified rather than reasoned about; see *Verification*.

Reading a cookie opts the route out of static prerendering — it renders on demand, which `next build` reports. Nothing here was prerenderable anyway: the page mounts an agent connection on load.

The root layout stays a client component, and a server component page renders beneath it. That combination was probed before any of this was designed, because the whole approach rests on it.

## Decision 3: only a drag of this handle, in this geometry, writes

`onLayoutChanged` fires for far more than a drag. The group reports the mount, a constraint recompute and every imperative call through the same callback, with `isUserInteraction: false`. A load that wrote would replace the operator's division with whatever the group computed for the current window, silently, every time.

`recordsTheSplit` in `split-layout.ts` is that gate, and it is three conditions rather than one:

- `isUserInteraction`, so nothing but a pointer drag or a resize key writes.
- `sideBySide`, because stacked below `lg` the handle divides height. A division that reads well in a narrow column is not an opinion about a two-column desktop, and one number cannot hold both.
- `docked`, because the other three chat geometries do not change the group's layout at all — they take the panel's contents out of the flow and empty its box with a flex override ([chat surface](../chat-surface/design.md) decision 2). A dragged split survives a trip through them, as it always has.

It is a named function rather than three inline `&&`s so that the truth table is checkable without a browser: `tests/split-layout.test.ts` covers it, and covers the parser's agreement with the writer, which is the other thing a wrong answer turns into a hydration error rather than a wrong width.

## Decision 4: the pixel floors stay the group's business

`canvasPercentFrom` bounds a stored value to 15–85%, which is not a constraint on drags but a guard against a damaged cookie asking for a division no drag could produce. The floors that matter are the panels' 360px, and they depend on the window, which the server does not know. So a stored 75% at a 1295px window renders 75/25 from the server and settles at 935/360 once the group measures — the floors win, exactly as they do for a live drag.

That settling is a resize after hydration, at windows narrow enough to breach a floor. It is not a mismatch, it is not new, and the [requirements](requirements.md) scope the flash-free criterion around it: today's 62/38 default behaves the same way at the same widths. The clamp does not write, because it is not a user interaction, so the operator's stored division survives being displayed clamped.

## What is not remembered

The chat's *mode*. [Chat surface](../chat-surface/design.md) decision 1 keeps it in React state and resets it to sidebar on load, and the reason that survives this change is not the hydration one: sidebar on load is the guard the discovery amendment rests on, so the app never opens anyone in a transcript. This spec touches sidebar's width and nothing else about what a load lands in.

Nothing about the split reaches the workspace store. It is a property of the operator's screen rather than of the agreement, so it does not belong beside the drafts in `agent/data/workspaces/`, it is not shared between browsers, and it does not appear in the ontology's facts.

## Verification

Run against a production build of the change in a scratch worktree, since `next dev` reports a hydration mismatch on the first load after any edit and there were edits landing throughout (the report seen at that moment named Radix collapsible ids in the schedules, and the next loads of the same code were clean — the documented false positive, and the reason this was rebuilt rather than believed).

- The server renders the stored division: with `workspace-split=75`, the HTML arrives as `flex-basis:75%` and `flex-basis:25%`, in both the dev server and the production build.
- No hydration mismatch and no console error at all, on repeated loads of the production build with a stored split. This is the criterion the earlier refusal was protecting.
- A drag persists: dragging 62 → 75 and reloading returns 75, and the division survives a full navigation.
- The floors win without overwriting: at a 1295px window a stored 75% renders as 935/360, and the cookie still reads 75 afterwards.
- `npm test` (341) and `npm run typecheck` pass, including the new offline checks over the parser and the write gate.

*Known gaps, all three below `lg` or in an undocked mode, and none of them seen either working or broken.* The two negative cases of decision 3 — that switching to a chat geometry which undocks the panel writes nothing, and that a drag while stacked leaves the desktop split alone — were checked by their truth table in `tests/split-layout.test.ts` and by reading the call site rather than by driving the browser. So was the stacked render: the server cannot know the viewport, so it renders the group horizontal at the stored division and `useSplitOrientation` flips it to vertical in an effect, which is the pre-existing behaviour of the 62/38 default and not something this change introduces. What it does change is the number the stacked panes open at — a remembered proportion rather than 62/38 — since one stored proportion serves both axes. The browser's renderer went unresponsive partway through the session and these were not worth a fourth attempt.
