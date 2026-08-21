# Chat surface — design

Rules the chat's geometry and the workspace page's tree: one mount and four geometries switched by class, the mode control, the conversation switcher, and the standing rule that nothing minting a React id may join the hydrated tree. Read it before adding any component to the workspace page.

## Decision 1: the mode is React view state, and nothing else

`ChatSurfaceMode = "sidebar" | "floating" | "fullscreen" | "hidden"` lives in `useState` on the workspace page and is passed down. It isn't agent state: constitution #3 puts *shared configuration* in the agent, and how wide a pane is drawn isn't configuration. The agent must not be able to read it, and nothing the agent returns may change it, which the requirements forbid outright. It isn't URL state either, because a link to a workspace names the agreement, not a layout.

It also isn't persisted, per the acceptance criterion. `localStorage` is invisible to the server, so restoring on mount is the same hydration mismatch `workspace-split.tsx` already refuses for the panel split. The mode resets to sidebar on reload, which is also the safest default for the one guard the discovery amendment rests on: the app never opens anyone in a transcript.

## Decision 2: one chat mount, four geometries, switched by class

The chat is mounted exactly once, in one place in the React tree, in every mode. Modes change `className` on its container and nothing else, so the tree's shape is identical in all four.

The reason isn't tidiness. Three behaviours in the pane are mount-scoped, and all of them break if the chat is re-parented:

- `SettleAtEnd` in `chat/scroll-view.tsx` lands the transcript at its end once per conversation, 250 ms after the hydration batches stop. A remount resets its `settled` ref, so every mode switch would re-fire it and drag the transcript to the bottom.
- `MessageScrollerProvider` is keyed by thread and starts at `defaultScrollPosition="end"`. A fresh provider is a fresh scroll position.
- The scroll offset itself is a property of a DOM node. Re-parenting a node — which is what a React portal does when its target changes, and what conditional rendering per mode does outright — destroys and rebuilds its layout box, and scrollTop goes to zero with it.

Portals were rejected for the same reason as per-mode rendering: both move the node. Class swapping is the only mechanism that leaves it where it is, and it is the smallest one (constitution #10).

Concretely, `workspace-split.tsx` always renders `[canvas panel][handle][chat panel]` and dresses the last two per mode:

| Mode | Chat panel | Handle | Canvas |
|---|---|---|---|
| sidebar | in flow, sized by the panel group as before | visible | 62% default, drag to resize |
| floating | `absolute` bottom-right, 400px, bordered, elevated, over the canvas | `hidden` | fills the group |
| fullscreen | `absolute inset-0`, elevated above the canvas, transcript capped at `max-w-3xl` | `hidden` | fills the group, out of view |
| hidden | `absolute inset-0`, transparent, `inert`, click-through | `hidden` | fills the group |

The panel keeps its `react-resizable-panels` identity throughout, and the handle is hidden rather than unmounted so the group's children never change shape.

*Taking the panel out of the flow needs two things, not one*, and this is the part that was wrong on the first attempt. `ResizablePanel` renders *two* elements: an outer box the group sizes with an inline `flex`, and an inner one that receives the `className` and `style` passed to it. So the mode classes position the panel's *contents*, anchored to the group, which is why the group is `relative` — but the outer box keeps its column, and the canvas never widens. The box is emptied separately, by overriding its inline flex from the group: `[&>#chat]:!flex-none`.

That selector is coupled to the panel's `id="chat"`, so renaming the id leaves the undocked modes with a dead column and no error anywhere. The group's imperative `setLayout({canvas: 100, chat: 0})` was the first thing tried and doesn't work: the layout is validated against `minSize`, so the panel comes back at 360px. Overriding the flex leaves the group's layout state untouched, which turns out to be the better outcome, because a split the user dragged is where they left it when the chat returns, with no layout to save and restore. Verified: dragged to 46/54, out to fullscreen, back, still 46/54.

*Hidden is `inert`, not `display:none`.* A node with no layout box has no scroll offset to keep, so `display:none` would cost the thing decision 2 exists to protect. Hidden mode instead leaves the pane laid out at full size and hides it with `opacity-0`, plus `inert` and `pointer-events-none` so it takes no focus, no pointer and no place in the accessibility tree. Stacking order does no work here and isn't relied on: neither panel paints its own background, since `bg-background` is on the page wrapper behind both, so a hidden pane put *behind* the canvas would show through it. `opacity-0` is what hides it. React 19 forwards `inert` as a real boolean attribute, confirmed in the DOM. The cost is that a hidden chat still renders, which is acceptable for a prototype's tens of turns and the same trade `content-visibility` on the scroller items already makes.

## Decision 3: floating is a panel, not a dialog

Floating is a plain positioned `div`. `Dialog` and `Sheet` were both rejected, because they trap focus and mark the rest of the page inert, which would make the canvas unreachable underneath the floating chat. That is the exact opposite of the mode's purpose, and a violation of [configuration can start from any variable, in any order](../../discovery/principles/start-from-any-variable.md), which the requirements carry as a constraint. Nothing dims, nothing closes on outside click, and Escape doesn't dismiss it.

Its width is 400px, above the 360px floor the sidebar measured — under which the comparison card overflows and the composer wraps — with room to spare. Its height is `min(70vh, …)`, capped so it never touches the top of the canvas.

## Decision 4: the mode control is chrome around the chat, not inside it

The switcher lives in a small header bar in the chat container, rendered by `chat-surface.tsx` *around* `ConfiguratorChat` rather than inside it. `ConfiguratorChat` is a slot composition against `CopilotChat` (the [chat pane design](../chat-pane/design.md)), and adding a layout control into that composition would mean either a fifth thing fighting for the pane's flex layout or a slot used for something that isn't chat. Keeping it outside also keeps the chat identical in all four modes, which is what the requirements ask for.

The control is a `DropdownMenu` of radio items, the same shape as the Notion reference and the only shadcn primitive that gives a current-value checkmark in a menu. It is installed with `npx shadcn@latest add dropdown-menu`, per the component library's rule. Beside it sits a hide button. Both are `Button variant="ghost" size="icon-xs"`, the vocabulary the rest of the chrome uses.

*The menus have to mount after hydration.* A Radix menu present during the hydration pass shifts React's `useId` values across the *whole page*: every canvas disclosure hydrates with an id the server never sent, and React reports a mismatch on every load. This is the hazard `workspace-split.tsx` already documents for the panel group, and it was verified here by bisection — a clean HEAD worktree served beside the change showed no mismatch, removing the menu removed it, and giving Radix explicit `id`s didn't. So the server and the first client render agree on a plain button, and a mounted flag swaps the menu in a tick later.

The rule this leaves behind is that *nothing that mints an id may be added to this page's hydrated tree*. It governs both menus in this header, and the conversation switcher of decision 7 is gated on the same `useHydrated` flag for the same reason. A later refactor found the rule is wider than "mints an id": a plain component inserted *above* id-minting descendants moves the tree path their ids derive from and breaks hydration the same way, which is why the canvas's layer headings are shared as a class string rather than as a component ([agreement document](../agreement-document/design.md)). Bisecting against a HEAD worktree on a cold build is the check that settles either case.

When hidden, the only affordance is a single `Button` fixed to the bottom right of the workspace area. It restores *the mode the user last had*, held in a ref beside the mode state, because hiding from full screen and restoring into sidebar would be the app choosing a geometry.

## Decision 5: the unread mark is counted, never acted on

While hidden, the agent can still speak: a repair proposal, a rejected `Canvas edit:` and its reason. The requirements forbid reopening the pane by itself, which would be the app choosing the mode, and forbid losing the reason, so what is left is a mark.

`useUnseenReplies` records the assistant-message count at the moment of hiding and compares it with the live count from `useAgent()`. Any increase raises a flag the restore button draws as a dot, and leaving hidden — by restoring *or* by picking a mode from the menu — clears it. It counts messages rather than reading them: no parsing, no notion of importance, no message-type special cases. The dot means only that something was said.

*Where the counting lives is a deliberate choice.* `useAgent` re-renders its caller on every agent event, which during a streaming reply is every token. Called from `useChatSurface`, where it started, that caller is the whole workspace page, `useWorkspaceAttachment` and canvas included. It sits in the header instead, a leaf of two buttons, and reports upward through a `useCallback`-stable setter that only flips a boolean.

## Decision 6: what stays untouched

Sidebar mode is byte for byte the split the [agreement workspace](../agreement-workspace/design.md) specifies: same 62/38 default, same 360px pixel floors, same vertical stack under `lg`, still unpersisted. What left the page is the fixed navigation column beside that split, in decisions 7 and 8, rather than anything the panel group does. The other three modes bypass the group's sizing entirely, so its floors and its stacking behaviour don't apply to them. Under `lg`, floating and fullscreen render as they do at desktop width, and floating's fixed 400px is narrower than the viewport at every width the app is verified in.

The dispatch grammar is untouched. Cards, canvas edits and the `Canvas edit:` filter behave identically in all four modes, because none of them re-render the chat's contents.

## Decision 7: the conversation switcher is a sibling of the mode control, not a parent

The switcher sits at the left of the same header bar, opposite the mode and hide buttons: a `DropdownMenu` whose trigger is the active conversation's label with a chevron, and beside it an icon button that starts a new one. Both are the header's vocabulary already — `Button variant="ghost"`, and `DropdownMenuRadioGroup` for the current-value checkmark — so no new primitive is installed. Rows are grouped under `DropdownMenuLabel` headings by day (Today, Yesterday, then the date), which is the visible shape of the Notion reference and the only thing a date-labelled list needs to become readable at a dozen entries.

*The header is three components, and the split is about render scope.* `useUnseenReplies` calls `useAgent()`, which re-renders its caller on every streamed token — decision 5 pushed the watcher down into the header for exactly that reason, when the header was two buttons. Hanging the conversation list off the same component would pull the whole list back into per-token rendering. So `ChatSurfaceHeader` is a bare flex container that calls no hook, with two leaves beside each other: `ConversationMenu`, which takes props only — the workspace record, the active thread, two callbacks — and `ChatModeControls`, which holds the watcher, the mode menu and the hide button. A streaming reply re-renders the second and never the first, which holds only while the container stays hookless. That is the invariant: *nothing in `ChatSurfaceHeader` itself may subscribe to agent state.* One hook there re-renders both leaves and the split achieves nothing.

The page keeps ownership of the data. It already holds `workspace` from `useWorkspaceAttachment` and drives threads through the `setActiveThreadId` and `startNewThread` of `useCopilotChatConfiguration()`, and those call sites don't move. Nothing about registration, hydration or staleness changes: this is the same imperative pair the [agreement workspace](../agreement-workspace/design.md) specifies, called from a different button.

Four things are carried over from the column it replaces, because each is a decision rather than a detail. Newest first. The current conversation checked. "New conversation" disabled while the active thread is unregistered, with the reason in a native `title` and `disabled:pointer-events-auto` so the title survives ([component library](../ui-component-library/design.md) decision 4). And a line telling the user an unregistered conversation joins the list on its first message. The empty state is reworded, because the list is no longer *beside* the sheet: it now says the conversation under it starts one.

*Two consequences, both accepted.* Hidden mode has no switcher: the pane is `inert` and `opacity-0`, so a conversation change means restoring the chat first. That follows from the requirements rather than fighting them — hiding the chat is saying you are done with conversations, and the restore control is one click. And under `lg` the list gains a home it never had, because the old column was `max-lg:hidden`, so a narrow viewport listed no conversations at all.

## Decision 8: the workspace's identity moves to the head of the canvas

With the list gone, the navigation column held two lines of text, so it goes too. Its contents move into the canvas header, above the "Service agreement" title: the back link to the elevator list, then the workspace's name, as one breadcrumb line. The canvas is the right host, because it is the surface present in every mode, hidden included, which is the same argument decision 7 makes in reverse for the conversation list.

`ConfigCanvas` takes the resolved name as a prop rather than reading it. The precedence the [agreement workspace](../agreement-workspace/design.md) fixes — `agent.state.workspace_name` ?? the fetched record's name ?? the placeholder — is resolved in `useWorkspaceAttachment` and stays there. The canvas renders what it is handed, including the italic placeholder, and the name still changes the moment `name_workspace` returns.

A `Link` and a `span` mint no ids, so this breadcrumb is safe in the hydrated tree, unlike everything decision 4 covers. The page wrapper loses its flex row and the `h-dvh` aside with it, and the split fills the viewport on its own.

## Verification

Constitution #9, by running the app, in both themes:

- Sidebar → fullscreen → sidebar with the split dragged away from its default: the split comes back where it was dragged, and the panel group logs no warning. This is the check that decides whether decision 2's mechanism holds at all, because a panel going out of flow is what the group is least likely to tolerate. If it doesn't hold, the fallback that keeps the decision intact is to leave the panel in flow and move the positioning to the wrapper `div` inside it, which is already there.
- Each of the four modes entered from each of the others, with a transcript long enough to scroll: the position survives every switch, and no switch re-lands at the end.
- Tab from the canvas with the chat hidden: focus never reaches the composer.
- A reply switched mid-stream: it keeps streaming, and the tokens land in the new geometry.
- Floating over a populated canvas: expand a row, edit a value, scroll the canvas, all without the panel closing or stealing focus.
- Hidden with a canvas edit that draws a reply: the dot appears, the pane doesn't open itself, and restoring returns to the previous mode and clears the dot.
- An in-chat card clicked in floating and in fullscreen: the dispatched string is the one sidebar mode sends.
- A reload in each mode: the workspace comes back in sidebar.
- The console on load, with both menus in the header: no hydration mismatch, in any mode. This fails as a report rather than as a break, so it is only ever caught by looking.
- A workspace with conversations from more than one day: the menu groups them Today, Yesterday, then date, newest first, with the current one checked. Picking an older one swaps the transcript and leaves the canvas on workspace state, with that transcript's cards inert.
- New conversation from the header, then the header again: the trigger says it is a new conversation, and the start control is unavailable with its reason on hover.
- The menu opened and closed with the transcript scrolled up: the position doesn't move.
