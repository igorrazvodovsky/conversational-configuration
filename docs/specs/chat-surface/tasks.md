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
- [x] All four modes render as specified: sidebar unchanged, floating 400px bottom-right over a full-width canvas, fullscreen over the whole area, hidden leaving only the restore button
- [x] No hydration mismatch on load — bisected against a clean HEAD worktree, then fixed by mounting the menu after hydration
- [ ] All twelve mode transitions with a scrolled transcript: position survives, nothing re-lands at the end
- [ ] A reply switched mid-stream keeps streaming
- [ ] Floating: canvas scrolls, a row expands and a value edits underneath the panel; no focus trap, no dismiss on outside click
- [ ] Hidden: an agent reply marks the restore button; the pane does not open itself; restoring returns to the previous mode and clears the mark
- [ ] Tab from the canvas with the chat hidden never reaches the composer (`inert` is on the DOM node; the tab order itself is unverified)
- [ ] A card clicked in floating and fullscreen dispatches the same string as in sidebar
- [ ] Both themes; reload returns to sidebar

The unchecked items all need a transcript with several turns, and the browser automation went unresponsive before one could be driven. Nothing in them is known to be broken; none of them has been seen working either.

## The conversation list moves into the pane (decisions 7 and 8)

- [x] `src/components/workspace/conversation-menu.tsx` — the list as a dropdown in the chat's header, grouped Today / Yesterday / date, plus the new-conversation button; `conversation-sidebar.tsx` deleted
- [x] `chat-surface.tsx` — `ChatSurfaceHeader` split into a hookless container, `ConversationMenu` and `ChatModeControls`, so a streaming reply re-renders only the mode controls
- [x] `config-canvas/index.tsx` — the back link and the workspace name as a breadcrumb above the title, name resolved on the page and passed in
- [x] `workspaces/[id]/page.tsx` — the aside and its wrapper row gone; thread callbacks handed to the header

### Verify

- [x] Console clean on load, both menus present — the hydration hazard of decision 4 does not return with the second menu
- [x] Grouping and order on a workspace with nine conversations across two days; picking one from yesterday swapped the transcript and left the canvas on workspace state, with that transcript's frame card inert
- [x] New conversation from the header: the trigger reads "New conversation" and the start button is disabled carrying its reason (`title="you're in a new conversation now"`)
- [x] Sidebar, floating and hidden: the header's four controls fit at 400px with the longest label, and hidden leaves the canvas at full width with the breadcrumb intact
- [ ] Dark theme
- [ ] Below `lg`, where the panes stack: the chat's header sits at the top of the lower half and the switcher is reachable. Not run — the browser's window would not resize in this environment (`resize_window` reported success, `window.innerWidth` never moved), and neither page zoom nor a root `zoom` shifted the media query. Structurally it follows — the header is the chat panel's first child in every orientation — but it has not been seen

## Reconcile

- [x] [agreement-workspace](../agreement-workspace/requirements.md) — its last acceptance criterion now reads as sidebar mode, the default and where a reload lands
- [x] [agreement-workspace](../agreement-workspace/design.md) *The split* — sidebar is one mode of four; the split itself is unchanged
- [x] [ui-component-library](../ui-component-library/design.md) — `dropdown-menu` added to the installed set, with the hydration rule it brought
- [x] `docs/specs/README.md` status; `CLAUDE.md` *What's live* and the workspace page's two rules
- [x] [agreement-workspace](../agreement-workspace/design.md) *Frontend* and *The split* — two surfaces, not three columns; the name renders in the canvas header
- [x] [agreement-document](../agreement-document/design.md) — the agreement header now opens with the workspace breadcrumb
