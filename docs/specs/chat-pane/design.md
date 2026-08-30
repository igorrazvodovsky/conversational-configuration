# Chat pane — design

Rules what the chat is made of: composition from `CopilotChat`'s slots, the replaced scroll view and the composer clearance it owns, the landing position after hydration, row grouping by element key, and what a row is allowed to take vertically and how close it may stand to the row above. Read it before changing the transcript scroller, a message row, the composer or the attachment strip. The pane's *geometry* is the [chat-surface design](../chat-surface/design.md), and which messages it hides the [agreement-document design](../agreement-document/design.md).

The pane lives in `src/components/chat/`. It is built from the primitives of the [component library](../ui-component-library/design.md) and inherits its identity and its rules: zinc, the Lyra style, and zero radius by token *and* by stripping literal `rounded-*` at the call sites.

## Decision 1: the pane is composed from slots, not overridden

`CopilotChat` is not a black box. Every level of it takes slots, typed as `SlotValue<C> = C | string | Partial<ComponentProps<C>>` — a replacement component, a className to merge, or a partial props object — and every level also takes a `children` render-prop that hands back the rendered slot elements to arrange freely. The pane is therefore dressed by passing project components in, never by patching the package or writing descendant selectors against its markup. That keeps constitution #10 satisfied: the mechanism is the props the library already documents.

Object slot values are spread over the component's own props, `{...props, ...slot}`, so `messageView={{ children: fn }}` reaches `CopilotChatMessageView` as a render-prop and wins over the default body, with no wrapper component needed to get at the elements. This is the least obvious mechanic here, and the one the rest of the composition rests on.

The pane keeps CopilotKit's own layout — a scroll area with the composer absolutely positioned over its foot — and swaps the contents of each slot:

| Slot | Replacement | Note |
|---|---|---|
| `scrollView` | `MessageScrollerProvider` → `MessageScroller` → `MessageScrollerViewport` around the given children, plus `MessageScrollerButton` | takes scrolling over from CopilotKit's `use-stick-to-bottom`; see decision 2 |
| `messageView`'s `children` | `MessageScrollerContent` with one `MessageScrollerItem` per row | `scrollAnchor` on user turns is what anchors a turn instead of pinning the bottom |
| `assistantMessage`'s `children` | `Message` / `MessageContent` / `MessageFooter` | CopilotKit's `markdownRenderer` (Streamdown) and `toolCallsView` elements are placed inside, unreplaced — `toolCallsView` is what renders the three configurator cards |
| `userMessage`'s `children` | `Bubble` / `BubbleContent` | its toolbar and branch-navigation elements are placed, not rebuilt |
| `reasoningMessage`'s `header` / `contentView` / `toggle` | dressed to match the `Collapsible` disclosure in `tool-rendering.tsx` | a three-part disclosure, filled slot by slot rather than replaced wholesale |
| `input`'s `children` | `InputGroup` + `InputGroupTextarea` + `InputGroupAddon` | the composer becomes the same field vocabulary as the rest of the app |
| `sendButton`, `addMenuButton`, the transcribe buttons | `Button` | each of these slots is typed `ButtonHTMLAttributes`, so a shadcn `Button` receives its handlers and disabled state unchanged |
| `suggestionView`'s `suggestion` | `Button variant="outline" size="xs" className="pointer-events-auto"` | the chip vocabulary the canvas uses; the class is not decoration, as the note after this table explains |
| `welcomeScreen` | `Empty`, and the `suggestionView` prop passed through | already installed, already the empty state everywhere else; the strip is the whole point of an empty workspace ([suggested moves](../suggested-moves/design.md)) |
| `cursor` | `Spinner` | |
| the composer's queue and a file in a sent message | `Attachment` family — `AttachmentGroup` / `AttachmentMedia` / `AttachmentTitle` / `AttachmentDescription` / `AttachmentAction` | the queue has no slot; see decision 6 |

*Two of those slots fail silently rather than visibly, both around suggestions, and both were found only when the strip's contents became worth clicking.* The suggestion container is `pointer-events-none`, and CopilotKit's own pill re-enables them on itself. A replacement pill that doesn't carry `pointer-events-auto` renders perfectly and never fires, which left every suggestion in the app inert. And the welcome screen is handed the bound suggestion view as a prop, so a replacement that takes only `input` drops the strip from the one state where an empty workspace has nothing else to say. The general shape: a slot replacement inherits the library's layout assumptions about its own element, and drops whatever it doesn't name.

The five components this needed — `message-scroller`, `message`, `bubble`, `input-group`, `attachment` — were installed under the rules of the [component library](../ui-component-library/design.md), which is also where the runtime dependency they pull in is recorded. As everywhere else, the literal `rounded-*` classes they arrive with are stripped here at the call sites: the zero radius ramp is a backstop for token-derived corners only, and a bubble is exactly the kind of thing that ships with a literal one.

## Decision 2: replacing the scroll view, and what that takes on

Three things, each of which fails quietly:

- Two scroll controllers would fight, so the chat sets `autoScroll={false}`. CopilotKit's default view pins to the bottom on every token, the scroller's anchoring is the behaviour the requirements ask for, and only one of them can win.
- The children CopilotKit hands the slot already carry the bottom padding that clears the absolutely-positioned composer, computed from a measured `inputContainerHeight`. Render them inside the viewport, unwrapped, and the clearance comes free. Re-wrap or replace them and the last line hides behind the composer.
- The default view supplies the scroll element that drives CopilotKit's virtualization past a hundred-odd messages. A replacement doesn't, and the `children` render-prop on the message view disables virtualization anyway. That is acceptable for a prototype whose conversations are tens of turns rather than thousands.

## Decision 3: landing at the end of a transcript that arrives in batches

The risk here is hydration rather than styling. A transcript doesn't arrive with the mount: `use-workspace-attachment.ts` hydrates it from the workspace, in more than one batch. Anchoring makes that visible, because every user turn that lands grabs the scroll, so an attaching conversation comes to rest at whichever turn arrived last, part-way up its own history.

Two things settle it. The provider is keyed by thread, so each conversation starts from an empty scroller rather than inheriting the last one's position. And a small component inside the provider, `SettleAtEnd`, lands once at the end when the message count has been still for 250 ms. The interval is the assumption: a batch arriving after a longer pause lands wherever anchoring puts it, because the settle has already fired and doesn't fire again for that conversation. Read the [agreement-workspace design](../agreement-workspace/design.md) before touching this.

## Decision 4: rows are grouped by element key, never by index

`messageElements` is a `flatMap` — a single message can yield a custom-before row, the message itself, a custom-after row and an intelligence indicator — so it isn't positionally aligned with `messages`. Each element carries a key derived from its message id, and grouping by that key gives one item per *message*. The wrappers render nothing unless a custom renderer is registered, and a tool result has no row at all, so an item per element fills the transcript with empty rows and a `gap-6` around each. A group with no row of its own is dropped for the same reason, and so is an assistant turn that ended with neither words nor tool calls, whose element exists and renders nothing. `scrollAnchor` goes on the user turns.

## Decision 5: the composer restores two things the layout it replaces provided

It floats over the transcript, so mid-scroll the rows pass behind it. CopilotKit softens that with a feather gradient rendered inside the scroll view, which is no longer theirs here, and an opaque background does the same job with one less thing to keep in sync. And clicking the chrome around the field focuses the field: CopilotKit does that in its own layout, and `InputGroupAddon` has the same idea but reaches for an `input`, which this composer doesn't have.

The markdown keeps CopilotKit's prose, at this app's size. Their renderer sets 16px, which next to the agreement reads as a different product. Prose sizes everything else in em, so overriding the root is enough — with `!`, because both are utilities and stylesheet order would otherwise decide.

The size is 14px. It was 12px, on the reasoning that the canvas is 12px, and the canvas's *reading matter* — its clauses, recitals and schedule rows — is and always was `text-sm`; 12px is this app's size for chrome. The [accessible surface](../accessible-surface/design.md) states that split and puts a floor under it.

## Decision 6: attachments get the shadcn vocabulary in both places

The [chat-attachments spec](../chat-attachments/requirements.md) makes the agent read a file, so the paperclip leads somewhere and the queue has a purpose. A file then shows up twice, and both places become the `Attachment` family.

- *In the composer, before sending.* `CopilotChatAttachmentQueue` is rendered by the view directly and is the one piece of chat chrome with no slot of its own. It is still reachable without owning the layout: the `chatView` slot receives `attachments`, `onRemoveAttachment` and the drop-zone props, so a thin wrapper renders an `AttachmentGroup` from that data and hands `CopilotChatView` an empty `attachments` array. Those two are the view's only readers of `attachments` — the queue above the composer and the queue on the welcome screen, guarded identically — while `dragOver`, `onDragOver`, `onDrop` and the composer's `onAddFile` are separate props that pass through untouched, so suppressing the queue costs neither drag-and-drop nor paste. Handing the same data to the `input` slot puts the strip inside the `InputGroup`, where the composer's own border can hold it.
- *In a sent message.* An attachment returns from the agent as an `image` part whatever it was, so the parse in `src/lib/attachments.ts` reads the real type off the MIME string and recovers the filename from its `;name=` parameter. That parse stays, because it is the only place the name is recovered at all, but it feeds `Attachment` rows in the user-message slot rather than re-typing a part for CopilotKit's chip. The slot's `children` renders the media itself, which the default row does and the render-prop doesn't hand back, so this isn't optional once the row is composed. The nameless case gets a sensible place for the MIME type: an `AttachmentDescription` under a generic title, rather than a chip labelled `text/markdown` as if that were the file's name. That case is the common one, because the round trip through AG-UI drops both the metadata and the parameter within the same session, so a row shows the file's kind from the moment the reply starts.

`useAttachments` is not the way in. It holds the queue in local `useState`, so calling it again from a project component would create a second, disconnected queue rather than read the live one. That is why the `chatView` wrapper, which is handed the state, is the route.

Everything else `chat-attachments` added to this surface already follows the vocabulary: the rejection message is an `Alert` under the composer.

## Decision 7: nothing invisible may take vertical space

`gap-6` between rows is the transcript's rhythm — decision 8 is its one deliberate exception — and two invisible things were adding to it.

*The hover toolbar.* Every row carries a toolbar — copy, and the user's edit and branch navigation where they are bound — which is hidden until the row is hovered. In flow it took its height anyway: 36px, plus `MessageContent`'s `gap-2`, under every message, with nothing on screen to account for it. Measured on the mid-contract revision transcript, a user turn and the repair card answering it stood 72px apart where the design says 24. `MessageFooter` is therefore positioned out of flow, at `top-full` on the row's own `relative` box, and appears over the gap on hover with its pointer events restored at the same moment.

The reveal has two triggers, not one. The copy button stays in the tab order while the toolbar is hidden, so with hover alone a keyboard user tabbed onto an invisible control; `focus-within` sits beside `group-hover/message` and lifts the same opacity and pointer events ([accessible surface](../accessible-surface/design.md), decision 7). Nothing about the out-of-flow position changes, and the toolbar still takes no vertical space.

That fixes the size of its buttons. The row below starts at the top of its own bubble or card, so a toolbar taller than the 24px gap would cover it; `copyButton` takes a class through the slot it has and comes down to 24px, which is what the gap holds. The class carries `!` for the reason decision 5 gives about the prose size — the library's own `cpk:h-8` is a utility of equal weight, and stylesheet order would otherwise decide.

*Hanging below the row means the row may not clip.* `MessageScrollerItem` arrives with `content-visibility: auto`, which applies paint containment at all times and not only while the row is skipped, so anything drawn outside the item's box is never painted. The first toolbar built this way rendered, revealed on hover with its opacity and pointer events correct, and stayed invisible; computed style cannot tell that state from a working one, and only a screenshot with the reveal forced showed it. The transcript therefore sets `[content-visibility:visible]!` at the call site in `message-view.tsx`, the way a literal `rounded-*` is stripped at one. It goes on every item, the interrupt's included, so that what a row draws is clipped or not for reasons of its own rather than by which kind of row it landed in. `contain-intrinsic-size` goes inert with it, which decision 2 already argues this transcript can afford: virtualization is off, and conversations here are tens of turns.

The containment was taking something visible with it as well. A card's edge is the component library's `ring-1`, which is a shadow drawn outside the box, and a card is exactly as wide as the row it sits in, so the left and right of the ring fell outside the clip while the top and bottom stayed within the card's `my-2`. Every card in the transcript was reading as a pair of rules rather than as a box. Restoring `auto` on one row brings the pair of rules back, which is how this was told apart from the change that landed beside it.

*The empty markdown wrapper.* An assistant turn that only calls a tool has no prose, and the wrapper rendered regardless at zero height — invisible, and still taking a `gap-2` above the card. It is rendered only when the message has text. `content` is `string | undefined` on an AG-UI assistant message, so the same test `hiddenMessageIds` makes serves here.

Between them these accounted for every gap in the transcript wider than `gap-6`.

## Decision 8: a run of tool rows sits at its own margin, not the transcript's

`gap-6` is the distance between *turns*, and an assistant turn that only calls a tool is not one — it has no words, and a run of them is one stretch of the agent working that the transcript was breaking into separate paragraphs. Two tool rows stood 36px apart: the gap plus each row's own `my-1.5`. Inside such a run the gap is taken back out, with `-mt-6` on the second row and every row after it, leaving the rows separated by their own margins alone: 12px, half the transcript's rhythm.

The test is the one `hiddenMessageIds` already makes — no text, at least one tool call — and it is applied to the emitted list rather than to `messages`, because a hidden canvas edit between two such rows leaves them adjacent on screen. Only a run of them tightens: a user turn or an assistant turn with prose on either side keeps `gap-6`, and no anchored row is ever pulled up, since only user turns anchor.

Removing the gap is safe against decision 7's toolbar because these rows have none. CopilotKit computes `toolbarVisible && hasContent`, and `hasContent` is the message's own text being non-empty, so the rows whose gap this closes are exactly the rows with nothing hanging into it.

*A card is left out, and that costs a coupling.* A card is a rendering of a tool call with no prose beside it, so from the message view it looks exactly like a tool row — `RepairOptions` even renders as one when its outcome is prose. The name of the tool is the only thing that tells them apart, so `CARD_TOOLS` in `card-shell.tsx` lists the four the chat registers a card renderer for, and `message-view.tsx` reads it. The coupling earns its keep by what grouping a card looked like: pulled up under a status line, a box with an edge of its own reads as a collision rather than as a group, which the gap it lost was doing the work of preventing. `tests/couplings.test.ts` holds the list against the registrations in `use-configurator-ui.tsx`, so a fifth card cannot arrive without it.

## Verification

Constitution #9: UI is verified by running the app. The slots carry behaviour and not only appearance, so the check is behavioural as well as visual: a reply long enough to scroll, read while it streams; a card clicked and its dispatched string confirmed verbatim; a thread switched while the pane is scrolled back; both themes.

## Notes from implementation

- A card's dispatched sentence is displayed without its option codes. Every card grammar spells them, because the agent maps the sentence onto one atomic tool call and a label is not a key, but the sentence is rendered in the customer's own bubble, so the transcript was quoting them saying `contract_term=y10`. `spokenText` in `src/lib/configurator.ts` strips the parenthetical codes, and for the repair's bare `var=value` it drops in the words the card used — for display only, so what reaches the agent is untouched. It is gated on the card prefixes, so a customer who types a code sees what they typed. Found by the task 6 walkthrough of 2026-08-20, against [elicitation uses the building's vocabulary, not the catalogue's](../../discovery/principles/elicit-in-the-buildings-vocabulary.md).
- The browser pass ran in both themes. Dispatch was confirmed verbatim on all three cards, a used card goes inert exactly as before, and the reply anchor and the composer clearance were measured rather than eyeballed.
- Two things the pass didn't reach: drag-and-drop and paste into the composer. The file input was driven directly, and the drop-zone props pass through untouched, so this is unverified rather than changed.
- Decision 7 was found from a screenshot and settled by measurement, on 2026-08-30, against stored conversations reopened cold — the checkpoints under `agent/.langgraph_api/` hydrate a transcript with its cards without spending anything on the model, which is the cheap fixture for any layout question about the pane. Every gap in a seven-row transcript is now 24px in both themes, the hover toolbar paints into the gap without reaching the row below, its 24px button still copies, and the transcript still lands with its last turn in view.
- Decision 8 came from the same screenshot habit, on 2026-08-30: two consecutive tool rows read as two turns. Measured on the same reopened conversation — a user turn to the first tool row 24px, tool row to tool row 0 plus their 12px of margin, and the `ask_choices` card that closes the run back at 24px. The card was grouped in the first cut of this, which is how the exclusion above was decided: 8px between a status line and a card's edge is what settled it.
- CopilotKit's slash-command menu and its feather gradient aren't reachable from the slots this composition uses. Neither is configured, and the composer's opaque background does the feather's job. Virtualization is off, as decision 2 anticipated.

## Known defect

The composer throws a React "Maximum update depth exceeded" runtime error, raised in `src/components/ui/textarea.tsx` through `InputGroupTextarea` and `ComposerTextArea`. Observed in the browser on 2026-08-21 while verifying [one gesture, one action](../one-gesture-one-action/design.md), which touches no React and did not cause it. No check sees it: the interface checks render the transcript against a mocked stream and the composer is not among what they mount.
