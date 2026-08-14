# Chat surface — tasks

## Discovery

- [x] Amend [Surface architecture](../../discovery/models/Surface%20architecture.md) §2: the document holds the centre *by default*; the user may give chat the whole surface or put it away, the app never does

## Frontend

- [x] `npx shadcn@latest add dropdown-menu`
- [x] `src/components/workspace/chat-surface.tsx` — the `ChatSurfaceMode` type, the header with the mode switcher and the hide button, the restore button, `useUnseenReplies`, `useHydrated`
- [x] `workspace-split.tsx` — take a `mode` prop; per-mode classes on the chat panel and the handle, the `[&>#chat]:!flex-none` override that gives up the column, tree shape unchanged
- [x] `workspaces/[id]/page.tsx` — hold the mode and the previous-mode ref, wrap the chat in its chrome, render the restore button when hidden
- [x] Hidden mode: `inert` + `opacity-0` + `pointer-events-none`, never `display:none`

## Verify (constitution #9, running the app)

- [x] Sidebar → fullscreen → sidebar with the split dragged off its default — the split returns where it was (46/54 both sides) and the panel group warns about nothing
- [x] All four modes render as specified: sidebar unchanged, floating 400px bottom-right over a full-width canvas, fullscreen over the whole area with the nav sidebar kept, hidden leaving only the restore button
- [x] No hydration mismatch on load — bisected against a clean HEAD worktree, then fixed by mounting the menu after hydration
- [ ] All twelve mode transitions with a scrolled transcript: position survives, nothing re-lands at the end
- [ ] A reply switched mid-stream keeps streaming
- [ ] Floating: canvas scrolls, a row expands and a value edits underneath the panel; no focus trap, no dismiss on outside click
- [ ] Hidden: an agent reply marks the restore button; the pane does not open itself; restoring returns to the previous mode and clears the mark
- [ ] Tab from the canvas with the chat hidden never reaches the composer (`inert` is on the DOM node; the tab order itself is unverified)
- [ ] A card clicked in floating and fullscreen dispatches the same string as in sidebar
- [ ] Both themes; reload returns to sidebar

The unchecked items all need a transcript with several turns, and the browser automation went unresponsive before one could be driven. Nothing in them is known to be broken; none of them has been seen working either.

## Reconcile

- [x] [agreement-workspace](../agreement-workspace/requirements.md) — its last acceptance criterion now reads as sidebar mode, the default and where a reload lands
- [x] [agreement-workspace](../agreement-workspace/design.md) *The split* — sidebar is one mode of four; the split itself is unchanged
- [x] [ui-component-library](../ui-component-library/design.md) — `dropdown-menu` added to the installed set, with the hydration rule it brought
- [x] `docs/specs/README.md` status; `CLAUDE.md` *What's live*
