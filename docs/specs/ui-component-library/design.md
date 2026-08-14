# UI component library — design

## Decision 1: shadcn is the component vocabulary, installed not copied

Components come from `npx shadcn@latest add`, never hand-written. That is what makes `src/components/ui/` current upstream source rather than a set of approximations that drift, and it is why adding a surface should start by reaching for a primitive.

`shadcn init` is still not used: it wants to author `globals.css` wholesale, and this stylesheet carries things the CLI knows nothing about — the CopilotKit font override, the showcase pill rules, the inspector positioning, and a `dark` variant that has to be broader than shadcn's default. `components.json` is written by hand instead; `add` needs nothing else.

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

*What replacing the scroll view takes on.* Three things, each of which fails quietly:

- Two scroll controllers would fight, so `autoScroll={false}` on the chat. CopilotKit's default view pins to the bottom on every token; the scroller's anchoring is the behaviour the requirements ask for and only one of them can win.
- The children CopilotKit hands the slot already carry the bottom padding that clears the absolutely-positioned composer, computed from a measured `inputContainerHeight`. Render them inside the viewport, unwrapped, and the clearance comes free; re-wrap or replace them and the last line hides behind the composer.
- The default view supplies the scroll element that drives CopilotKit's virtualization above 100-odd messages. A replacement does not, and the `children` render-prop on the message view disables virtualization anyway. Acceptable for a prototype whose conversations are tens of turns, not thousands.

*Hydration is the risk, not styling.* A transcript does not arrive with the mount — `use-workspace-attachment.ts` hydrates it from the workspace and CopilotKit suppresses its welcome screen with `isConnecting` while `/connect` is in flight. The scroller's initial position resolves against whatever rows exist when it first runs, so attaching to a workspace with history is a distinct case from switching threads mid-session, and both are distinct from a fresh conversation. Read the [agreement-workspace design](../agreement-workspace/design.md) before touching the scroll view.

*Rows are grouped by element key, never by index.* `messageElements` is a `flatMap` — a single message can yield a custom-before row, the message itself, a custom-after row and an intelligence indicator — so it is not positionally aligned with `messages`. Each element carries a key derived from its message id, and that key is what identifies the `MessageScrollerItem`: one item per direct child, as the component requires, with `scrollAnchor` set when the key resolves to a user message.

*Attachments stay, and they get the shadcn vocabulary too.* The [chat-attachments spec](../chat-attachments/requirements.md) makes the agent read a file, so the paperclip leads somewhere and the queue earns its place. A file then shows up twice, and both places become the `Attachment` family:

- *In the composer, before sending.* `CopilotChatAttachmentQueue` is rendered by the view directly and is the one piece of chat chrome with no slot of its own. It is still reachable without owning the layout: the `chatView` slot receives `attachments`, `onRemoveAttachment` and the drop-zone props, so a thin wrapper renders an `AttachmentGroup` from that data and hands `CopilotChatView` an empty `attachments` array. Those two are the view's only readers of `attachments` — the queue above the composer and the queue on the welcome screen, guarded identically — while `dragOver`, `onDragOver`, `onDrop` and the composer's `onAddFile` are separate props that pass through untouched, so suppressing the queue costs neither drag-and-drop nor paste. Handing the same data to the `input` slot puts the strip inside the `InputGroup`, where the composer's own border can hold it.
- *In a sent message.* An attachment returns from the agent as an `image` part whatever it was, so `describeAttachments` in `src/lib/attachments.ts` re-types it and recovers the filename from the `;name=` parameter on the MIME type. That parse stays — it is the only place the name is recovered at all. What it feeds changes: instead of re-typing a part so CopilotKit's own chip will draw it, the user-message slot draws `Attachment` rows from the parsed type and name directly. It also gives the case where the name did not survive the thread round trip somewhere honest to put the MIME type — an `AttachmentDescription` under a generic title, rather than a chip labelled `text/markdown` as if that were the file's name.

Everything else `chat-attachments` added to this surface already follows the vocabulary: the rejection message is an `Alert` below the composer.

`useAttachments` is not the way in. It holds the queue in local `useState`, so calling it again from a component of ours would create a second, disconnected queue rather than read the live one — the reason the `chatView` wrapper, which is handed the state, is the route.

*How the slots are passed.* Object slot values are spread over the component's own props (`{...props, ...slot}`), so `messageView={{ children: fn }}` reaches `CopilotChatMessageView` as a render-prop and wins over the default body — no wrapper component needed to get at the elements. This is the least obvious mechanic here and the one the rest of the composition rests on.

## Verification

Constitution #9: UI is verified by running the app. `npm run build` cannot see a missing utility class, a changed padding, or a corner that stayed round, so the check is the running app in both themes across the elevator list, the workspace split view with a populated canvas, an expanded canvas row, the footprint popover, and all three in-chat cards.

The chat pane adds a behavioural half to that check, because the slots carry behaviour and not only appearance: a reply long enough to scroll, read while it streams; a card clicked and its dispatched string confirmed verbatim; a thread switched while the pane is scrolled back.
