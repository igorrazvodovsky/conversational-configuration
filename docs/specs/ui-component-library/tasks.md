# UI component library — tasks

## Setup

- [x] Hand-write `components.json` — no `shadcn init`, which would author `globals.css` wholesale and lose the CopilotKit font override, the showcase rules, the inspector positioning and the broadened `dark` variant
- [x] `"style": "radix-lyra"`, `baseColor: "zinc"`
- [x] Replace the palette with `@shadcn/theme-zinc` oklch values, light and dark; keep only the two `--cpk-*` accents the showcase rules still reference
- [x] `--radius: 0` and every step of the ramp at `0rem`, so a stray `rounded-md` cannot reintroduce a corner
- [x] `@theme inline` bridge, including `--chart-1..5`, `--font-sans`/`--font-mono`
- [x] `@import "tw-animate-css"` (overlay keyframes) and `@import "shadcn/tailwind.css"` (the custom variants and utilities Lyra components are written against) + the `shadcn` devDependency
- [x] Keep `@custom-variant dark (&:where(.dark, .dark *))`, defined after the imports so it wins — shadcn's default `&:is(.dark *)` misses the `<html>` element `ThemeProvider` stamps
- [x] Verify the bridge compiles before refactoring anything
- [x] `shadcn add` all 19 components under the Lyra style (`resizable` was added later, with the workspace placement change)
- [x] Drop `@radix-ui/react-{checkbox,label,separator}`, superseded by the unified `radix-ui` package

## Call sites

- [x] `app/page.tsx` — elevator list: `Item` rows via `asChild` + `Link`, `Button` for create, `Empty` for the empty list
- [x] `app/workspaces/[id]/page.tsx` — not-found state as `Empty`
- [x] `app/layout.tsx` — `TooltipProvider`
- [x] `components/workspace/conversation-sidebar.tsx` — `Button` rows (`secondary` = active, `ghost` = not), `ScrollArea`
- [x] `components/config-canvas/index.tsx` — `ScrollArea`, `Card`/`CardContent` groups, `Collapsible` rows, `Badge` provenance, `Button` options and frame chips, `Popover` footprint, `Tooltip` on frame chips, `Empty`
- [x] `components/generative-ui/ask-choices.tsx` — `Card`, `Button` chips, `ToggleGroup spacing={0}` scale, `Item` option list
- [x] `components/generative-ui/repair-options.tsx` — `Card`, shared `RepairButton` over `Button`
- [x] `components/generative-ui/frame-comparison.tsx` — `Card`, `Button` adopt actions
- [x] `components/example-layout/mode-toggle.tsx` — `Tabs` *(the file is gone: the Chat/App toggle went with the placement change in the [agreement-workspace spec](../agreement-workspace/design.md), which replaced this layout with `workspace-split.tsx` on `Resizable`)*
- [x] `components/example-layout/index.tsx` — token classes *(same; superseded)*
- [x] `components/tool-rendering.tsx` — `Collapsible` in place of `<details>`, `font-mono` in place of the inline font style
- [x] `components/headless-chat.tsx` — `Input` + `Button`
- [x] Strip every literal radius class in scope (`rounded-full`, `rounded-lg`, `rounded-md`, `rounded-[4px]`, `rounded-[2px]`, `rounded-none`) — the zero ramp does not reach them
- [x] `components/generative-ui/meeting-time-picker.tsx` — mechanical only: `Spinner size="lg"` → `className="size-8"`, since the prop is gone. Starter code, otherwise untouched

## Chat pane (decision 7)

- [ ] `shadcn add message-scroller message bubble input-group attachment` — radix-lyra variants; adds the `@shadcn/react` runtime dependency
- [ ] Strip the literal `rounded-*` classes the four arrive with
- [ ] `components/chat/` — a `ConfiguratorChat` wrapper holding the slot components, so `workspaces/[id]/page.tsx` keeps rendering one element
- [ ] `scrollView` → provider/scroller/viewport around the given children, unwrapped, plus the scroll-to-end button; `autoScroll={false}` on the chat
- [ ] `messageView` `children` → `MessageScrollerContent`, one `MessageScrollerItem` per element keyed off the element key, `scrollAnchor` on user turns
- [ ] `assistantMessage` `children` → `Message`/`MessageContent`/`MessageFooter` around CopilotKit's markdown and tool-calls elements
- [ ] `userMessage` `children` → `Bubble`/`BubbleContent`
- [ ] `reasoningMessage` → `Collapsible`, matching `tool-rendering.tsx`
- [ ] `input` `children` → `InputGroup` + `InputGroupTextarea` + `InputGroupAddon`; pass the placeholder explicitly, since it comes from CopilotKit's labels
- [ ] `sendButton` / `addMenuButton` / transcribe buttons → `Button`
- [ ] `suggestionView`'s `suggestion` → `Button variant="outline" size="xs"`; `welcomeScreen` → `Empty`; `cursor` → `Spinner`
- [ ] Read the [agreement-workspace design](../agreement-workspace/design.md) before the scroll view goes in — hydration, not styling, is where this breaks
- [x] Decide the attachment queue: kept — attachments feed the agent ([chat-attachments](../chat-attachments/requirements.md)), so the affordance is real
- [ ] Composer queue → `AttachmentGroup`, via a `chatView` wrapper that takes `attachments`/`onRemoveAttachment` and hands `CopilotChatView` an empty `attachments` array so it draws no queue of its own
- [ ] Files in a sent message → `Attachment` rows in the user-message slot. Keep the MIME/filename parse in `describeAttachments` — it is the only place the name is recovered — and replace the chip it feeds; give the nameless case an `AttachmentDescription` rather than a title that is really a MIME type
- [ ] Reconcile [chat-attachments](../chat-attachments/) — its design and tasks record the chip and the un-restyled queue as the settled state
- [ ] Update the *UI components* paragraph in `CLAUDE.md` — the chat pane no longer stays rounded

## Verification (constitution #9 — running app)

- [x] Elevator list, light and dark
- [x] Workspace split view with a populated canvas, light and dark
- [x] Canvas row expands; unavailable options render struck-through and disabled
- [x] Footprint popover opens, and closes on Escape — the behaviour the hand-rolled panel lacked
- [x] `ask_choices` card: scale segments joined and wrapping, greyed segments read as out-of-range, multi-select enables "Apply n choices"
- [x] Frames strip: chip renders, its tooltip fires (enabled trigger), and clicking it dispatches `Compare frame "Baseline" with the current configuration` verbatim
- [x] `compare_frames` card: table plus "Adopt Baseline" action
- [x] `revise_choices` repair card: multi-line repair rows wrap, ripple and rule lines present, dashed abandon row
- [x] Dispatch is intact end to end — clicking through produced `Set Travel height to 15–30 m (travel=mid_15_30)` and the canvas took the value with a `you` badge
- [x] A used card goes inert (faded, controls dead) exactly as before
- [x] Every disabled control whose `title` carries a reason computes `pointer-events: auto` — re-checked after the Lyra switch on both the `Button` path (canvas options, sidebar "New conversation") and the `ToggleGroupItem` path (scale segments). Lyra keeps `disabled:pointer-events-none`, so the workaround is still load-bearing
- [x] The canvas `ScrollArea` genuinely scrolls (viewport 693px over 1745px of content) rather than clipping
- [x] `Empty` in place: workspace-not-found, and a fresh elevator's bare canvas. The empty *elevator list* was not reached — it needs a store with no workspaces
- [x] Computed `border-radius: 0px` on canvas rows, chips and cards

Chat pane:

- [ ] Split view in both themes: nothing across the divider reads as a different product, and computed `border-radius: 0px` holds on message rows, composer and pills
- [ ] A reply longer than the viewport: the sent turn anchors near the top with the previous turn peeking, the last line clears the composer, and scrolling back is not stolen by incoming tokens
- [ ] The scroll-to-end control returns to the live end
- [ ] All three cards render inside assistant messages and dispatch verbatim — `Set …`, `Apply repair: …`, `Adopt frame "…"`, `Compare frame "…" with the current configuration`
- [ ] Markdown, streaming, the stop button, suggestions, the welcome screen on a fresh conversation
- [ ] Attach a document by picker, by drag and by paste: it appears in the composer strip once — not also in CopilotKit's own queue — and once in the sent message, removable before sending, named — and a conversation reopened from the store shows the same row without a filename to show, labelled honestly
- [ ] A rejected file still raises its `Alert` and starts no run ([chat-attachments](../chat-attachments/requirements.md))
- [ ] Thread switch while scrolled back: the new transcript hydrates and the scroller resets to its end
- [ ] Attach to a workspace with existing history — a full transcript arriving after mount, not a fresh conversation — and the scroller lands at the end rather than the top

## Not done

- The dead starter surfaces (`example-canvas/`, `charts/`, `meeting-time-picker`, `declarative-generative-ui/`) still use the primitives but were not refactored — see `CLAUDE.md`. They inherit the zinc palette, but a sweep of the tree shows they keep literal `rounded-*` classes and so keep their corners; their layout was not reviewed. `src/lib/a2ui-theme.css` is imported by nothing and was left alone.
- The `[data-copilotkit] button[data-slot="suggestion-pill"]` highlight rules in `globals.css` serve `use-example-suggestions.tsx` alone. Restyling the suggestion pill may leave them inert; removing them is a separate mechanical change to dead starter styling, not part of this spec.
- `skeleton`, `alert`, `label`, `checkbox`, `input` and `separator` are installed but unused by the configurator; they are the vocabulary for the next surface, not dead weight to remove.
- The chat pane is still CopilotKit's own styling; the section above is the work that changes that, and is not started.
