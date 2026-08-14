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

- [x] `shadcn add message-scroller message bubble input-group attachment` — radix-lyra variants; adds the `@shadcn/react` runtime dependency, and pulls in `textarea` as a registry dependency
- [x] Strip the literal `rounded-*` classes — nothing to strip: the Lyra variants of these five arrive `rounded-none` already
- [x] `components/chat/` — `ConfiguratorChat` holds the slots and the rejection `Alert`, so `workspaces/[id]/page.tsx` renders one element again
- [x] `scrollView` → provider/scroller/viewport around the given children, unwrapped, plus the scroll-to-end button; `autoScroll={false}` on the chat, and the provider keyed by thread
- [x] `messageView` `children` → `MessageScrollerContent`, one `MessageScrollerItem` per *message* (see design 7 — per element leaves empty rows), `scrollAnchor` on user turns
- [x] `SettleAtEnd` inside the provider — hydration arrives in batches, so the transcript lands at its end once the batches stop
- [x] `assistantMessage` `children` → `Message`/`MessageContent`/`MessageFooter` around CopilotKit's markdown and tool-calls elements, at this app's text size
- [x] `userMessage` `children` → `Bubble`/`BubbleContent`, with the message's own text renderer replaced so the bubble holds plain text
- [x] `reasoningMessage` `children` → header and toggle inside a `Message`
- [x] `input` `children` → `InputGroup` + `InputGroupTextarea` + `InputGroupAddon`; placeholder passed explicitly, opaque background, `pointer-events-auto`
- [x] `sendButton` / `addMenuButton` / transcribe buttons → `Button`
- [x] `suggestionView`'s `suggestion` → `Button variant="outline" size="xs"`; `welcomeScreen` → `Empty`; `cursor` → `Spinner`
- [x] Read the [agreement-workspace design](../agreement-workspace/design.md) before the scroll view goes in — hydration, not styling, is where this breaks
- [x] Decide the attachment queue: kept — attachments feed the agent ([chat-attachments](../chat-attachments/requirements.md)), so the affordance is real
- [x] Composer queue → `AttachmentGroup`, via a `chatView` wrapper that takes `attachments`/`onRemoveAttachment` and hands `CopilotChatView` an empty `attachments` array so it draws no queue of its own
- [x] Files in a sent message → `Attachment` rows in the user-message slot. `describeAttachments` became `messageAttachments`: the same MIME/filename parse, feeding our rows instead of CopilotKit's chip, with `AttachmentDescription` for the nameless case
- [x] Reconcile [chat-attachments](../chat-attachments/) — its design and tasks recorded the chip and the un-restyled queue as settled
- [x] Update the *UI components* paragraph in `CLAUDE.md` — the chat pane no longer stays rounded

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

- [x] Split view in both themes: nothing across the divider reads as a different product; the markdown body needed one override to stop reading at 16px against a 12px canvas
- [x] A reply longer than the viewport: the sent turn anchors near the top and the reply streams below it; the last row cleared the composer (bottom 485px against a composer top of 597px)
- [x] The scroll-to-end control appears when scrolled back and returns to the live end
- [x] Cards render inside the transcript — `ask_choices` chips, scale and "Apply choices"; `compare_frames` table with "Adopt Baseline"; the `revise_choices` repair rows — and dispatch is verbatim: clicking a term produced `Set Contract term to 10 years (contract_term=y10)` and the agent answered with one `set_choices`
- [x] Markdown, streaming, the stop button, suggestions, the welcome screen on a fresh conversation
- [x] Attach a document: it appears in the composer strip once — CopilotKit's own queue is gone, confirmed absent from the DOM — removable, named, and once in the sent message. A rejected `spec.pdf` raised the `Alert` and queued nothing
- [x] Thread switch while scrolled back: the new transcript hydrates and the scroller lands at its end
- [x] Attach to a workspace with existing history: 12 rows, none of them empty, resting exactly at the end. The first pass had three empty rows — assistant turns that ended with neither words nor tool calls — now dropped alongside the canvas-edit bookkeeping
- [x] Clicking the chrome around the field focuses it, as it did in CopilotKit's own composer layout
- [x] `npm run build` — a production build compiles the five new client modules
- [ ] Drag-and-drop and paste were not exercised — the file input was driven directly. The drop-zone props pass through untouched, so this is unverified rather than changed

## Not done

- The dead starter surfaces (`example-canvas/`, `charts/`, `meeting-time-picker`, `declarative-generative-ui/`) still use the primitives but were not refactored — see `CLAUDE.md`. They inherit the zinc palette, but a sweep of the tree shows they keep literal `rounded-*` classes and so keep their corners; their layout was not reviewed. `src/lib/a2ui-theme.css` is imported by nothing and was left alone.
- The `[data-copilotkit] button[data-slot="suggestion-pill"]` highlight rules in `globals.css` serve `use-example-suggestions.tsx` alone. Restyling the suggestion pill may leave them inert; removing them is a separate mechanical change to dead starter styling, not part of this spec.
- `skeleton`, `alert`, `label`, `checkbox`, `input` and `separator` are installed but unused by the configurator; they are the vocabulary for the next surface, not dead weight to remove.
- A file's name survives only while the message is local: the AG-UI round trip drops the part's metadata and the `;name=` parameter within the same session, so in practice a row shows the file's kind rather than its name. The transport to the agent is unaffected ([chat-attachments](../chat-attachments/design.md) decision 5).
- CopilotKit's slash-command menu and its feather gradient are not reachable from the slots this composition uses. Neither is configured here; the composer's opaque background does the feather's job.
- Virtualization is off, as decision 7 anticipated.
