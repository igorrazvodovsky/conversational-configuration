# UI component library — design

## Decision 1: shadcn is the component vocabulary, installed not copied

Components come from `npx shadcn@latest add`, never hand-written. That is what makes `src/components/ui/` current upstream source rather than a set of approximations that drift, and it is why adding a surface should start by reaching for a primitive.

`shadcn init` is still not used: it wants to author `globals.css` wholesale, and this stylesheet carries things the CLI knows nothing about — the CopilotKit font override, the showcase pill rules, the inspector positioning, and a `dark` variant that has to be broader than shadcn's default: `@custom-variant dark (&:where(.dark, .dark *))`, declared after the stylesheet imports so it wins — the default `&:is(.dark *)` misses the `<html>` element `ThemeProvider` stamps. `components.json` is written by hand instead; `add` needs nothing else.

## Decision 2: shadcn's own palette, in oklch

The prototype ran on the CopilotKit starter's brand hexes. They were placeholder branding, so they are gone, replaced by shadcn's zinc scale in oklch, taken verbatim from `@shadcn/theme-zinc`. Zinc is a neutral grey with no hue commitment, which suits a tool whose colour should carry meaning — chosen / proposed / unavailable — rather than identity.

Two brand values survive because something still references them: `--cpk-lilac-400` and `--cpk-mint-400`, used by the showcase pill rules. The rest of the `--cpk-*` accents and the ambient gradient were unreferenced and were deleted rather than translated.

Tailwind v4 still needs the `@theme inline` bridge: `bg-background`, `text-muted-foreground` and `border-input` are utilities only if `--color-*` is declared there. This is the one edit that can fail silently — an unmapped token is not an error, just an unstyled element — so it is verified against the compiled stylesheet before any call site is touched.

## Decision 3: the Lyra style

`components.json` sets `"style": "radix-lyra"`, so `add` fetches components in shadcn's Lyra flavour: square, dense, sharp. Concretely it changes more than corners — the default button is `h-8`/`text-xs` rather than `h-9`/`text-sm`, `destructive` is a tint rather than a fill, controls take a one-pixel press-down on `:active`, and `ToggleGroup` gains a default gap between segments.

Lyra pairs conventionally with a monospace face; the body stays Plus Jakarta Sans anyway. The canvas is a dense mix of prose labels and numbers, and long agent prose in the chat reads badly in mono. Spline Sans Mono keeps its existing job on tool rows and code.

*Radius is zero twice over.* Every step of the ramp — `--radius-sm` through `--radius-xl` — is `0rem`, so a stray `rounded-md` cannot reintroduce a corner. That does not cover literal classes, which are not token derived: `rounded-full` on the option chips, `rounded-[4px]`/`rounded-[2px]` in the since-deleted mode toggle, `rounded-lg` on the cards. Those were removed at the call sites, and the zero ramp is the backstop.

Lyra components are written against custom variants (`data-open`, `data-checked`, `data-vertical`) and utilities (`scroll-fade`, `shimmer`) that live in `shadcn/tailwind.css`. That import, and the `shadcn` devDependency behind it, are required — without them those class names silently do nothing.

The style reaches the chat pane too, through composition rather than override — decision 7.

## Decision 4: primitives, mapped

| Hand-rolled | Replacement | Note |
|---|---|---|
| `<button className="rounded-md border …">` | `Button` (`outline`/`ghost`/`link`/`default`) | |
| elevator-list and option-list rows | `Item` + `ItemContent`/`ItemTitle`/`ItemDescription`/`ItemActions` | `asChild` carries the `Link` (list) or `<button>` (option list) |
| chip / pill option rows | `Button size="xs"`/`"sm"` | active = `default`, unavailable = `disabled` + `line-through` |
| provenance tag span | `Badge variant="secondary"` | one component for `you` / `agent` / `auto` / `proposed` |
| `FootprintSummary`'s absolutely-positioned div | `Popover` | gains outside-click and Escape, which the hand-rolled version lacked |
| `VariableRow`'s and `ToolReasoning`'s `open` state | `Collapsible` | replaces a `<details>` element and a `useState` toggle; focus management and `aria-expanded` come free |
| `ScaleControl`'s segmented row | `ToggleGroup type="single" spacing={0}` | keeps per-segment `disabled` and `title` |
| bordered list wrappers | `Card` / `CardContent` | canvas groups, in-chat cards |
| dashed-border empty states | `Empty` | elevator list, canvas, workspace-not-found |
| chat/app switch | `Tabs` | |
| scrolling panes | `ScrollArea` | canvas, sidebar |
| the workspace's two-pane split | `Resizable` | added later, with the placement change in the [agreement-workspace design](../agreement-workspace/design.md); replaces the fixed `w-1/2` halves and the Chat/App toggle that hid one of them |

Three upstream defaults are relaxed at call sites, each to preserve behaviour rather than appearance:

- `ToggleGroupItem` is `whitespace-nowrap` and fixed-height, which made long scale labels ("630 kg / 8 persons") overlap their neighbours instead of wrapping. Relaxed with `h-auto whitespace-normal`.
- `ToggleGroup` defaults to `spacing={2}`. A scale is a range, and gapped cells read as independent options, so the scale control asks for `spacing={0}`.
- see decision 5 for `disabled:pointer-events-none`.

Installing also swapped the three individual `@radix-ui/react-*` dependencies for the unified `radix-ui` package the current components import from.

## Decision 5: keep native `title` for unavailability

Radix `Tooltip` does not fire on a disabled trigger, and every "ruled out by your other choices" / "outside the valid range" explanation in this app sits on a disabled control. Wrapping each in an enabled span to satisfy the tooltip would change focus order and hit targets for no gain, so those explanations stay on the native `title` attribute. `Tooltip` is installed and used only where the trigger is enabled — the frames strip, whose chips carry "click to compare with the current configuration" — which is what `TooltipProvider` in `layout.tsx` is for.

There is a trap in keeping `title`: shadcn's `Button` and `Toggle` set `disabled:pointer-events-none`, and a control with no pointer events never gets the hover the browser needs to raise its native tooltip. So every disabled control that carries a reason also carries `disabled:pointer-events-auto`. It cannot be clicked either way; it can still be hovered. Verified in the running app on both merge paths — every disabled control whose `title` is a reason computes `pointer-events: auto`. Lyra did not change this default, so the workaround survives the style switch.

The one place pointer events stay off is a control disabled only because its card has gone inert. Those carry a price hint, not a reason, and a spent card has nothing left to explain.

This is the concession [every "no" carries its reason](../../discovery/principles/every-no-carries-its-reason.md) demands: a nicer tooltip — or a tidier disabled state — that silently stops the explanation from appearing would drop the reason from the interface.

## Decision 6: dispatch copy is frozen

Cards are messages, not callbacks — the agent's prompt maps the exact strings the UI sends. The restyle touches presentation only; `choiceMessage(...)`, `Apply repair: …`, `Adopt frame "…"` and `Compare frame "…" with the current configuration` are moved verbatim. No type checker catches a change here, so the strings are diffed explicitly.

## Decision 7: the chat pane is composed, not overridden

`CopilotChat` is not a black box. Every level of it takes slots, typed as `SlotValue<C> = C | string | Partial<ComponentProps<C>>` — a replacement component, a className to merge, or a partial props object — and every level also takes a `children` render-prop that hands back the rendered slot elements to arrange freely. So the pane is dressed by passing project components in, never by patching the package or writing descendant selectors against its markup. That keeps constitution #10 satisfied: the mechanism is the props the library already documents.

The pane keeps CopilotKit's own layout — scroll area with the composer absolutely positioned over its foot — and swaps the contents of each slot:

| Slot | Replacement | Note |
|---|---|---|
| `scrollView` | `MessageScrollerProvider` → `MessageScroller` → `MessageScrollerViewport` around the given children, plus `MessageScrollerButton` | takes scrolling over from CopilotKit's `use-stick-to-bottom`; see below |
| `messageView`'s `children` | `MessageScrollerContent` with one `MessageScrollerItem` per row | `scrollAnchor` on user turns is what anchors a turn instead of pinning the bottom |
| `assistantMessage`'s `children` | `Message` / `MessageContent` / `MessageFooter` | CopilotKit's `markdownRenderer` (Streamdown) and `toolCallsView` elements are placed inside, unreplaced — `toolCallsView` is what renders the three configurator cards |
| `userMessage`'s `children` | `Bubble` / `BubbleContent` | its toolbar and branch-navigation elements are placed, not rebuilt |
| `reasoningMessage`'s `header` / `contentView` / `toggle` | dressed to match the `Collapsible` disclosure in `tool-rendering.tsx` | a three-part disclosure, filled slot by slot rather than replaced wholesale |
| `input`'s `children` | `InputGroup` + `InputGroupTextarea` + `InputGroupAddon` | the composer becomes the same field vocabulary as the rest of the app |
| `sendButton`, `addMenuButton`, the transcribe buttons | `Button` | each of these slots is typed `ButtonHTMLAttributes`, so a shadcn `Button` receives its handlers and disabled state unchanged |
| `suggestionView`'s `suggestion` | `Button variant="outline" size="xs"` | the chip vocabulary the canvas uses |
| `welcomeScreen` | `Empty` | already installed, already the empty state everywhere else |
| `cursor` | `Spinner` | |
| the composer's queue and a file in a sent message | `Attachment` family — `AttachmentGroup` / `AttachmentMedia` / `AttachmentTitle` / `AttachmentDescription` / `AttachmentAction` | the queue has no slot; see below |

New components to install: `message-scroller`, `message`, `bubble`, `input-group`, `attachment`. They pull in `@shadcn/react`, a new runtime dependency — the headless primitives behind the styled scroller. The registry serves the `radix-lyra` variant of each, because `components.json` says so; the Base UI and React Aria variants of these same components are not what `add` writes here. As everywhere else, the literal `rounded-*` classes they arrive with are stripped at the call sites.

`dropdown-menu` was added later, for the chat's mode switcher ([chat-surface](../chat-surface/design.md)), and arrives already square. It carries a constraint the others do not: a Radix menu inside the workspace page's *hydrated* tree shifts React's `useId` values across the whole page and breaks hydration on every load, so it is mounted a tick after hydration. Anything else that mints an id belongs behind the same guard.

*What replacing the scroll view takes on.* Three things, each of which fails quietly:

- Two scroll controllers would fight, so `autoScroll={false}` on the chat. CopilotKit's default view pins to the bottom on every token; the scroller's anchoring is the behaviour the requirements ask for and only one of them can win.
- The children CopilotKit hands the slot already carry the bottom padding that clears the absolutely-positioned composer, computed from a measured `inputContainerHeight`. Render them inside the viewport, unwrapped, and the clearance comes free; re-wrap or replace them and the last line hides behind the composer.
- The default view supplies the scroll element that drives CopilotKit's virtualization above 100-odd messages. A replacement does not, and the `children` render-prop on the message view disables virtualization anyway. Acceptable for a prototype whose conversations are tens of turns, not thousands.

*Hydration is the risk, not styling.* A transcript does not arrive with the mount — `use-workspace-attachment.ts` hydrates it from the workspace, and in more than one batch. Anchoring makes that visible: every user turn that lands grabs the scroll, so an attaching conversation comes to rest at whichever turn arrived last, part-way up its own history. Two things settle it. The provider is keyed by thread, so each conversation starts from an empty scroller rather than inheriting the last one's position. And a small component inside the provider lands once, at the end, when the message count has been still for 250 ms — `SettleAtEnd`. The interval is the assumption: a batch arriving after a longer pause lands wherever anchoring puts it, because the settle has already fired and does not fire again for that conversation. Read the [agreement-workspace design](../agreement-workspace/design.md) before touching this.

*Rows are grouped by element key, never by index.* `messageElements` is a `flatMap` — a single message can yield a custom-before row, the message itself, a custom-after row and an intelligence indicator — so it is not positionally aligned with `messages`. Each element carries a key derived from its message id, and grouping by that key gives one item per *message*: the wrappers render nothing unless a custom renderer is registered, and a tool result has no row at all, so an item per element fills the transcript with empty rows and a `gap-6` around each. A group with no row of its own is dropped for the same reason, and so is an assistant turn that ended with neither words nor tool calls — its element exists and renders nothing. `scrollAnchor` goes on the user turns.

*The composer has to re-earn two things the layout it replaces gave it.* It floats over the transcript, so mid-scroll the rows pass behind it: CopilotKit softens that with a feather gradient rendered inside the scroll view, which is no longer theirs here, and an opaque background does the same job with one less thing to keep in sync. And clicking the chrome around the field focuses the field — CopilotKit does that in its own layout, and `InputGroupAddon` has the same idea but reaches for an `input`, which this composer does not have.

*The markdown keeps CopilotKit's prose, at this app's size.* Their renderer sets 16px, which next to a 12px canvas reads as a different product. Prose sizes everything else in em, so overriding the root is enough — with `!`, because both are utilities and stylesheet order would otherwise decide.

*Attachments stay, and they get the shadcn vocabulary too.* The [chat-attachments spec](../chat-attachments/requirements.md) makes the agent read a file, so the paperclip leads somewhere and the queue earns its place. A file then shows up twice, and both places become the `Attachment` family:

- *In the composer, before sending.* `CopilotChatAttachmentQueue` is rendered by the view directly and is the one piece of chat chrome with no slot of its own. It is still reachable without owning the layout: the `chatView` slot receives `attachments`, `onRemoveAttachment` and the drop-zone props, so a thin wrapper renders an `AttachmentGroup` from that data and hands `CopilotChatView` an empty `attachments` array. Those two are the view's only readers of `attachments` — the queue above the composer and the queue on the welcome screen, guarded identically — while `dragOver`, `onDragOver`, `onDrop` and the composer's `onAddFile` are separate props that pass through untouched, so suppressing the queue costs neither drag-and-drop nor paste. Handing the same data to the `input` slot puts the strip inside the `InputGroup`, where the composer's own border can hold it.
- *In a sent message.* An attachment returns from the agent as an `image` part whatever it was, so the parse in `src/lib/attachments.ts` reads the real type off the MIME string and recovers the filename from its `;name=` parameter. That parse stays — it is the only place the name is recovered at all — but it now feeds `Attachment` rows in the user-message slot rather than re-typing a part for CopilotKit's chip. The slot's `children` renders the media itself, which the default row does but the render-prop does not hand back, so this is not optional once the row is composed. The nameless case gets somewhere honest to put the MIME type: an `AttachmentDescription` under a generic title, rather than a chip labelled `text/markdown` as if that were the file's name. That case is the common one — the round trip through AG-UI drops both the metadata and the parameter within the same session, so a row shows the file's kind from the moment the reply starts.

Everything else `chat-attachments` added to this surface already follows the vocabulary: the rejection message is an `Alert` below the composer.

`useAttachments` is not the way in. It holds the queue in local `useState`, so calling it again from a component of ours would create a second, disconnected queue rather than read the live one — the reason the `chatView` wrapper, which is handed the state, is the route.

*How the slots are passed.* Object slot values are spread over the component's own props (`{...props, ...slot}`), so `messageView={{ children: fn }}` reaches `CopilotChatMessageView` as a render-prop and wins over the default body — no wrapper component needed to get at the elements. This is the least obvious mechanic here and the one the rest of the composition rests on.

## Verification

Constitution #9: UI is verified by running the app. `npm run build` cannot see a missing utility class, a changed padding, or a corner that stayed round, so the check is the running app in both themes across the elevator list, the workspace split view with a populated canvas, an expanded canvas row, the footprint popover, and all three in-chat cards.

The chat pane adds a behavioural half to that check, because the slots carry behaviour and not only appearance: a reply long enough to scroll, read while it streams; a card clicked and its dispatched string confirmed verbatim; a thread switched while the pane is scrolled back.

## Notes from implementation

- The browser pass ran in both themes across every in-scope surface. Dispatch was confirmed verbatim on all three cards and a canvas edit; a used card goes inert exactly as before; the reply anchor and the composer clearance were measured, not eyeballed; and every disabled control whose `title` carries a reason computes `pointer-events: auto` — re-checked after the Lyra switch on both the `Button` and `ToggleGroupItem` paths, since Lyra keeps `disabled:pointer-events-none` and the workaround is still load-bearing.
- Two things the pass did not reach: drag-and-drop and paste into the composer (the file input was driven directly; the drop-zone props pass through untouched, so this is unverified rather than changed), and the empty *elevator list* state, which needs a store with no workspaces.
- The dead starter surfaces (`example-canvas/`, `charts/`, `meeting-time-picker`, `declarative-generative-ui/`) use the primitives but were not refactored (see `CLAUDE.md`): they inherit the zinc palette, keep their literal `rounded-*` classes and so their corners, and their layout was not reviewed. `src/lib/a2ui-theme.css` is imported by nothing and was left alone.
- `skeleton`, `label`, `checkbox`, `input` and `separator` are installed but unused by the configurator — vocabulary for the next surface, not dead weight to remove. (`alert` has since been taken up by the [chat-attachments](../chat-attachments/design.md) rejection message.)
- CopilotKit's slash-command menu and its feather gradient are not reachable from the slots this composition uses; neither is configured, and the composer's opaque background does the feather's job. Virtualization is off, as decision 7 anticipated.
