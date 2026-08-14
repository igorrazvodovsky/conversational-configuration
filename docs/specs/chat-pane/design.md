# Chat pane — design

The pane lives in `src/components/chat/`. It is built from the [component library](../ui-component-library/design.md)'s primitives and inherits its identity and its rules — zinc, the Lyra style, zero radius by token *and* by stripping literal `rounded-*` at the call sites.

## Decision 1: the pane is composed from slots, not overridden

`CopilotChat` is not a black box. Every level of it takes slots, typed as `SlotValue<C> = C | string | Partial<ComponentProps<C>>` — a replacement component, a className to merge, or a partial props object — and every level also takes a `children` render-prop that hands back the rendered slot elements to arrange freely. So the pane is dressed by passing project components in, never by patching the package or writing descendant selectors against its markup. That keeps constitution #10 satisfied: the mechanism is the props the library already documents.

Object slot values are spread over the component's own props (`{...props, ...slot}`), so `messageView={{ children: fn }}` reaches `CopilotChatMessageView` as a render-prop and wins over the default body — no wrapper component needed to get at the elements. This is the least obvious mechanic here and the one the rest of the composition rests on.

The pane keeps CopilotKit's own layout — scroll area with the composer absolutely positioned over its foot — and swaps the contents of each slot:

| Slot | Replacement | Note |
|---|---|---|
| `scrollView` | `MessageScrollerProvider` → `MessageScroller` → `MessageScrollerViewport` around the given children, plus `MessageScrollerButton` | takes scrolling over from CopilotKit's `use-stick-to-bottom`; see decision 2 |
| `messageView`'s `children` | `MessageScrollerContent` with one `MessageScrollerItem` per row | `scrollAnchor` on user turns is what anchors a turn instead of pinning the bottom |
| `assistantMessage`'s `children` | `Message` / `MessageContent` / `MessageFooter` | CopilotKit's `markdownRenderer` (Streamdown) and `toolCallsView` elements are placed inside, unreplaced — `toolCallsView` is what renders the three configurator cards |
| `userMessage`'s `children` | `Bubble` / `BubbleContent` | its toolbar and branch-navigation elements are placed, not rebuilt |
| `reasoningMessage`'s `header` / `contentView` / `toggle` | dressed to match the `Collapsible` disclosure in `tool-rendering.tsx` | a three-part disclosure, filled slot by slot rather than replaced wholesale |
| `input`'s `children` | `InputGroup` + `InputGroupTextarea` + `InputGroupAddon` | the composer becomes the same field vocabulary as the rest of the app |
| `sendButton`, `addMenuButton`, the transcribe buttons | `Button` | each of these slots is typed `ButtonHTMLAttributes`, so a shadcn `Button` receives its handlers and disabled state unchanged |
| `suggestionView`'s `suggestion` | `Button variant="outline" size="xs"` | the chip vocabulary the canvas uses |
| `welcomeScreen` | `Empty` | already installed, already the empty state everywhere else |
| `cursor` | `Spinner` | |
| the composer's queue and a file in a sent message | `Attachment` family — `AttachmentGroup` / `AttachmentMedia` / `AttachmentTitle` / `AttachmentDescription` / `AttachmentAction` | the queue has no slot; see decision 6 |

The five components this needed — `message-scroller`, `message`, `bubble`, `input-group`, `attachment` — were installed under the [component library](../ui-component-library/design.md)'s rules, which is also where the runtime dependency they pull in is recorded. As everywhere else, the literal `rounded-*` classes they arrive with are stripped here at the call sites: the zero radius ramp is a backstop for token-derived corners only, and a bubble is exactly the kind of thing that ships with a literal one.

## Decision 2: replacing the scroll view, and what that takes on

Three things, each of which fails quietly:

- Two scroll controllers would fight, so `autoScroll={false}` on the chat. CopilotKit's default view pins to the bottom on every token; the scroller's anchoring is the behaviour the requirements ask for and only one of them can win.
- The children CopilotKit hands the slot already carry the bottom padding that clears the absolutely-positioned composer, computed from a measured `inputContainerHeight`. Render them inside the viewport, unwrapped, and the clearance comes free; re-wrap or replace them and the last line hides behind the composer.
- The default view supplies the scroll element that drives CopilotKit's virtualization above 100-odd messages. A replacement does not, and the `children` render-prop on the message view disables virtualization anyway. Acceptable for a prototype whose conversations are tens of turns, not thousands.

## Decision 3: landing at the end of a transcript that arrives in batches

The risk here is hydration rather than styling. A transcript does not arrive with the mount — `use-workspace-attachment.ts` hydrates it from the workspace, and in more than one batch. Anchoring makes that visible: every user turn that lands grabs the scroll, so an attaching conversation comes to rest at whichever turn arrived last, part-way up its own history.

Two things settle it. The provider is keyed by thread, so each conversation starts from an empty scroller rather than inheriting the last one's position. And a small component inside the provider lands once, at the end, when the message count has been still for 250 ms — `SettleAtEnd`. The interval is the assumption: a batch arriving after a longer pause lands wherever anchoring puts it, because the settle has already fired and does not fire again for that conversation. Read the [agreement-workspace design](../agreement-workspace/design.md) before touching this.

## Decision 4: rows are grouped by element key, never by index

`messageElements` is a `flatMap` — a single message can yield a custom-before row, the message itself, a custom-after row and an intelligence indicator — so it is not positionally aligned with `messages`. Each element carries a key derived from its message id, and grouping by that key gives one item per *message*: the wrappers render nothing unless a custom renderer is registered, and a tool result has no row at all, so an item per element fills the transcript with empty rows and a `gap-6` around each. A group with no row of its own is dropped for the same reason, and so is an assistant turn that ended with neither words nor tool calls — its element exists and renders nothing. `scrollAnchor` goes on the user turns.

## Decision 5: the composer restores two things the layout it replaces provided

It floats over the transcript, so mid-scroll the rows pass behind it: CopilotKit softens that with a feather gradient rendered inside the scroll view, which is no longer theirs here, and an opaque background does the same job with one less thing to keep in sync. And clicking the chrome around the field focuses the field — CopilotKit does that in its own layout, and `InputGroupAddon` has the same idea but reaches for an `input`, which this composer does not have.

The markdown keeps CopilotKit's prose, at this app's size. Their renderer sets 16px, which next to a 12px canvas reads as a different product. Prose sizes everything else in em, so overriding the root is enough — with `!`, because both are utilities and stylesheet order would otherwise decide.

## Decision 6: attachments get the shadcn vocabulary in both places

The [chat-attachments spec](../chat-attachments/requirements.md) makes the agent read a file, so the paperclip leads somewhere and the queue has a purpose. A file then shows up twice, and both places become the `Attachment` family:

- *In the composer, before sending.* `CopilotChatAttachmentQueue` is rendered by the view directly and is the one piece of chat chrome with no slot of its own. It is still reachable without owning the layout: the `chatView` slot receives `attachments`, `onRemoveAttachment` and the drop-zone props, so a thin wrapper renders an `AttachmentGroup` from that data and hands `CopilotChatView` an empty `attachments` array. Those two are the view's only readers of `attachments` — the queue above the composer and the queue on the welcome screen, guarded identically — while `dragOver`, `onDragOver`, `onDrop` and the composer's `onAddFile` are separate props that pass through untouched, so suppressing the queue costs neither drag-and-drop nor paste. Handing the same data to the `input` slot puts the strip inside the `InputGroup`, where the composer's own border can hold it.
- *In a sent message.* An attachment returns from the agent as an `image` part whatever it was, so the parse in `src/lib/attachments.ts` reads the real type off the MIME string and recovers the filename from its `;name=` parameter. That parse stays — it is the only place the name is recovered at all — but it now feeds `Attachment` rows in the user-message slot rather than re-typing a part for CopilotKit's chip. The slot's `children` renders the media itself, which the default row does but the render-prop does not hand back, so this is not optional once the row is composed. The nameless case gets a sensible place for the MIME type: an `AttachmentDescription` under a generic title, rather than a chip labelled `text/markdown` as if that were the file's name. That case is the common one — the round trip through AG-UI drops both the metadata and the parameter within the same session, so a row shows the file's kind from the moment the reply starts.

`useAttachments` is not the way in. It holds the queue in local `useState`, so calling it again from a component of ours would create a second, disconnected queue rather than read the live one — the reason the `chatView` wrapper, which is handed the state, is the route.

Everything else `chat-attachments` added to this surface already follows the vocabulary: the rejection message is an `Alert` below the composer.

## Verification

Constitution #9: UI is verified by running the app. The slots carry behaviour and not only appearance, so the check is behavioural as well as visual: a reply long enough to scroll, read while it streams; a card clicked and its dispatched string confirmed verbatim; a thread switched while the pane is scrolled back; both themes.

## Notes from implementation

- The browser pass ran in both themes. Dispatch was confirmed verbatim on all three cards; a used card goes inert exactly as before; the reply anchor and the composer clearance were measured, not eyeballed.
- Two things the pass did not reach: drag-and-drop and paste into the composer — the file input was driven directly, and the drop-zone props pass through untouched, so this is unverified rather than changed.
- CopilotKit's slash-command menu and its feather gradient are not reachable from the slots this composition uses; neither is configured, and the composer's opaque background does the feather's job. Virtualization is off, as decision 2 anticipated.
