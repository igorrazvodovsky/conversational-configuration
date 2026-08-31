# UI component library — design

Rules the component vocabulary: shadcn installed rather than hand-written, the palette in oklch, the Lyra style, the primitive mapping, and how a state is expressed once a primitive is in hand — sizes, the focus indicator, unavailability, inertness, and what a control does instead of refusing a click. Read it before editing `src/app/globals.css`, relaxing an upstream default at a call site, expressing a state as a fade, putting an explanation on a `title`, or disabling anything; all of those have reasons recorded here.

Constitutions #16 and #17 are the rules the last five decisions apply. Both bind at every call site and no spec owns either, so what is here is this vocabulary's share of them and not their home.

## Decision 1: shadcn is the component vocabulary, installed rather than copied

Components come from `npx shadcn@latest add`, never hand-written. That is what makes `src/components/ui/` current upstream source rather than a set of approximations that drift, and it is why adding a surface should start by reaching for a primitive.

`shadcn init` is still not used, because it wants to author `globals.css` wholesale, and this stylesheet carries things the CLI knows nothing about: the CopilotKit font override, the showcase pill rules, the inspector positioning, and a `dark` variant that has to be broader than shadcn's default. That variant is `@custom-variant dark (&:where(.dark, .dark *))`, declared after the stylesheet imports so it wins, because the default `&:is(.dark *)` misses the `<html>` element `ThemeProvider` stamps. `components.json` is written by hand instead, and `add` needs nothing else.

## Decision 2: shadcn's own palette, in oklch

The prototype ran on the CopilotKit starter's brand hexes. They were placeholder branding, so they are gone, replaced by shadcn's zinc scale in oklch, taken verbatim from `@shadcn/theme-zinc`. Zinc is a neutral grey with no hue commitment, which suits a tool whose colour should carry meaning — chosen, proposed, unavailable — rather than identity.

Two brand values survive because something still references them: `--cpk-lilac-400` and `--cpk-mint-400`, used by the showcase pill rules, which are reached only from `use-example-suggestions.tsx`, starter code no surface mounts. Both the rules and the two hexes go whenever that file does. The rest of the `--cpk-*` accents and the ambient gradient were unreferenced, and were deleted rather than translated.

Tailwind v4 still needs the `@theme inline` bridge: `bg-background`, `text-muted-foreground` and `border-input` are utilities only if `--color-*` is declared there. This is the one edit that can fail silently, because an unmapped token isn't an error, only an unstyled element, so it is verified against the compiled stylesheet before any call site is touched.

One token is not the value `@shadcn/theme-zinc` ships. `--ring` is a zinc step darker in both themes — zinc-500 in light, zinc-400 in dark — because stock zinc's ring is 2.63:1 against white and a focus indicator needs 3:1, so the light theme had no conforming one anywhere. It is still a step of the same ramp rather than a colour from outside it. Decision 8 covers the app-level `:focus-visible` outline that goes with it, which the token alone does not replace.

## Decision 3: the Lyra style

`components.json` sets `"style": "radix-lyra"`, so `add` fetches components in shadcn's Lyra flavour: square, dense, sharp. Concretely it changes more than corners. The default button is `h-8` and `text-xs` rather than `h-9` and `text-sm`, `destructive` is a tint rather than a fill, controls take a one-pixel press-down on `:active`, and `ToggleGroup` gains a default gap between segments.

Lyra pairs conventionally with a monospace face, and the body stays Plus Jakarta Sans anyway. The canvas is a dense mix of prose labels and numbers, and long agent prose in the chat reads badly in mono. Spline Sans Mono keeps its existing job on tool rows and code.

*Radius is zero twice over.* Every step of the ramp, `--radius-sm` through `--radius-xl`, is `0rem`, so a stray `rounded-md` can't reintroduce a corner. That doesn't cover literal classes, which aren't token-derived: `rounded-full` on the option chips, `rounded-[4px]` and `rounded-[2px]` in the since-deleted mode toggle, `rounded-lg` on the cards. Those were removed at the call sites, and the zero ramp is the backstop.

Lyra components are written against custom variants — `data-open`, `data-checked`, `data-vertical` — and utilities such as `scroll-fade` and `shimmer`, which live in `shadcn/tailwind.css`. That import, and the `shadcn` devDependency behind it, are required: without them those class names silently do nothing.

*Two sizes, and a floor.* Lyra's density made `text-xs` the default on every control, and the canvas's *reading matter* — its clauses, recitals and schedule rows — was `text-sm` from the start without anyone writing down that it was a different thing. It is: reading matter is 14px, chrome is 12px, and nothing is smaller (constitution #16). Four call sites had gone below — a completion label, the provenance badge, the scale legend, and the rule labels behind a repair, which are what constitution #6 exists to surface, set at 10px in a muted grey. The chat's prose override is on the reading side of that line and had landed on the chrome size, aiming to match "a 12px canvas"; the [chat pane design](../chat-pane/design.md) records the correction. `tests/legibility.test.ts` holds the floor, because it is the half of #16 a check can see.

The style reaches the chat pane too, through composition rather than override, as the [chat pane design](../chat-pane/design.md) describes.

## Decision 4: primitives, mapped

| Hand-rolled | Replacement | Note |
|---|---|---|
| `<button className="rounded-md border …">` | `Button` (`outline`/`ghost`/`link`/`default`) | |
| elevator-list and option-list rows | `Item` + `ItemContent`/`ItemTitle`/`ItemDescription`/`ItemActions` | `asChild` carries the `Link` (list) or `<button>` (option list) |
| chip / pill option rows | `Button size="xs"`/`"sm"` | active is `default`, unavailable is `disabled` plus `line-through` |
| provenance tag span | `Badge variant="secondary"` | one component for `you` / `agent` / `auto` / `proposed` |
| `FootprintSummary`'s absolutely-positioned div | `Popover` | gains outside-click and Escape, which the hand-rolled version lacked |
| `VariableRow`'s and `ToolReasoning`'s `open` state | `Collapsible` | replaces a `<details>` element and a `useState` toggle; focus management and `aria-expanded` come free |
| `ScaleControl`'s segmented row | `ToggleGroup type="single" spacing={0}` | keeps per-segment `disabled`, `title` and `aria-describedby` |
| bordered list wrappers | `Card` / `CardContent` | canvas groups, in-chat cards |
| dashed-border empty states | `Empty` | elevator list, canvas, workspace-not-found |
| chat/app switch | `Tabs` | both are gone: the switch left with the split ([agreement-workspace](../agreement-workspace/design.md)), and `tabs.tsx` stays installed but unused |
| scrolling panes | `ScrollArea` | canvas, sidebar |
| the workspace's two-pane split | `Resizable` | added later, with the placement change in the [agreement-workspace design](../agreement-workspace/design.md); replaces the fixed `w-1/2` halves and the Chat/App toggle that hid one of them |

Three upstream defaults are relaxed at call sites, each to preserve behaviour rather than appearance.

- `ToggleGroupItem` is `whitespace-nowrap` and fixed-height, which made long scale labels such as "630 kg / 8 persons" overlap their neighbours instead of wrapping. It is relaxed with `h-auto whitespace-normal`.
- `ToggleGroup` defaults to `spacing={2}`. A scale is a range, and gapped cells read as independent options, so the scale control asks for `spacing={0}`.
- `disabled:pointer-events-none` is relaxed for the reason decision 5 gives.

Installing also swapped the three individual `@radix-ui/react-*` dependencies for the unified `radix-ui` package the current components import from.

## Decision 5: native `title` for unavailability, as the second channel rather than the only one

Radix `Tooltip` doesn't fire on a disabled trigger, and every "ruled out by your other choices" and "outside the valid range" explanation in this app sits on a disabled control. Wrapping each in an enabled span to satisfy the tooltip would change focus order and hit targets for no gain, so those explanations stay on the native `title` attribute. `Tooltip` is installed and used only where the trigger is enabled — the frames strip, whose chips carry "click to compare with the current configuration" — which is what `TooltipProvider` in `layout.tsx` is for.

*What this decision got wrong, and what it now means.* The premise holds and the conclusion drawn from it was too narrow: the alternative to a tooltip that will not fire is not a different tooltip, it is not being a tooltip. A disabled control is outside the tab order, so a `title` on one reaches a mouse and nothing else — no keyboard, no touch screen — and for a while every named rule the solver produced arrived that way and stopped there. The rules now render as visible text under the control that refuses, with `aria-describedby` from the control to that line; `RefusalList` in `src/components/refusals.tsx` is the one place it is written, and `tests/interface/refusals.test.tsx` asserts it for all four controls that draw a refusal. `title` is kept on top of it, because a tooltip is a real convenience for a mouse and costs nothing once it is not the only channel. This is constitution #16 applied to the one thing constitution #6 makes the interface owe.

*And the premise is now gone with it.* Under constitution #17 a ruled-out option is not disabled at all — the click reaches `revise_choices` and comes back with repair paths — so Radix `Tooltip` would fire on it, `title` raises on hover *and* on focus, and `aria-describedby` is announced when a keyboard user tabs onto the control rather than only in a screen reader's browse mode. The decision above is kept as written because its reasoning is what produced the repair, and because the three-line workaround it justified is the thing this change retires. `KEEP_TITLE` is deleted from `src/lib/utils.ts`: it existed to restore pointer events to a disabled control so its `title` could be hovered, and no control that carries a reason is disabled any more. `cursor-not-allowed` goes from the same call sites, where it had become a false statement about what a click does.

*Ids without `useId`.* The control and its sentence are joined by `aria-describedby`, and [chat-surface](../chat-surface/design.md) forbids minting a React id in the hydrated tree. Every id here is derived from data already in hand — a tool call id in the chat, a variable and its layer on the sheet — so it is stable across server and client by construction. The layer is part of it because a variable can have two editors on one page: three agreement-group values are restated in the recitals as well as stated in the terms, and `onEditorOpen` reports what is open without enforcing that only one is.

*The catch that made `KEEP_TITLE` necessary, and why it is gone.* shadcn's `Button` and `Toggle` set `disabled:pointer-events-none`, and a control with no pointer events never gets the hover the browser needs to raise its native tooltip, so every disabled control carrying a reason also carried `disabled:pointer-events-auto` — exported as `KEEP_TITLE` so the concession and its reason were written once. It was verified in the running app on both merge paths and survived the Lyra switch. It has no call sites now, because no control that carries a reason is disabled, and the export is deleted rather than left as vocabulary for a state this codebase no longer has. Restoring pointer events to a disabled control is the shape of the problem decision 9 removes, so leaving the helper in reach would be leaving the workaround in reach.

The one place pointer events stay off is a control disabled only because its card has gone inert. Those carry a price hint rather than a reason, and a spent card has nothing left to explain.

This is the concession [every refusal names the rules that caused it](../../discovery/principles/refusals-name-their-rules.md) demands: a nicer tooltip, or a tidier disabled state, that silently stops the explanation from appearing would drop the reason from the interface.

## Decision 6: dispatch copy is frozen

Cards are messages rather than callbacks, and the agent's prompt maps the exact strings the UI sends. The restyle touches presentation only, so `choiceMessage(...)`, `Apply repair: …`, `Adopt frame "…"` and `Compare frame "…" with the current configuration` are moved verbatim. No type checker catches a change here, so the strings are diffed explicitly.

## Decision 7: the rest of the installed set

The chat pane took five more components off the registry — `message-scroller`, `message`, `bubble`, `input-group`, `attachment` — and with them `@shadcn/react`, a new runtime dependency holding the headless primitives behind the styled scroller. Which slot uses which belongs to the [chat pane design](../chat-pane/design.md). What belongs here is that they came in the same way as everything else, in the `radix-lyra` variant `components.json` asks for, with their literal `rounded-*` classes stripped at the call sites.

`dropdown-menu` was added later, for the chat's mode switcher ([chat-surface](../chat-surface/design.md)), and arrives already square. It carries a constraint the others don't: a Radix menu inside the workspace page's *hydrated* tree shifts React's `useId` values across the whole page and breaks hydration on every load, so it is mounted a tick after hydration. Anything else that mints an id belongs behind the same guard.

`sonner` came last, for decision 9's answer to a blocked click, and it is the one component whose registry file was edited rather than taken as installed. The file reads the theme from `next-themes`, which nothing here mounts; it reads it from `@/hooks/use-theme` instead, which has the same shape and the same three values. Left alone, a toast would sit on the system theme while the rest of the page followed an explicit choice. It clears the hydrated-tree rule without a guard — `useId` appears nowhere in its bundle, checked in the installed package rather than assumed — so it is mounted plainly in `layout.tsx`, and its own list is `aria-live="polite"`, which is what makes a transient sentence reach a screen reader at all.

## Decision 8: unavailability and inertness are token changes, and the focus outline is one unlayered rule

Three states in this vocabulary were expressed as fades, and constitution #16 exists because they compounded: a spent card at `opacity-60`, an option ruled out inside it at `opacity-40`, its price at `opacity-70` — each a defensible local choice, multiplying to 0.17.

*The fade cannot be tuned, only removed.* The first attempt kept it and looked for an alpha that passed. Sweeping the card's opacity with every child fade removed, measured against `--muted-foreground`, which is what the staleness sentence and every secondary note use:

| card `opacity` | dark | light |
|---|---|---|
| 0.60 (as built) | 3.13 | 2.32 |
| 0.75 | 4.27 | 2.99 |
| 0.85 | 5.18 | 3.60 |
| 0.90 | 5.67 | 3.96 |
| none | 6.74 | 4.83 |

Small text needs 4.5, and light theme reaches it at no opacity below 1 — `--muted-foreground` on white starts at 4.83 and has no headroom to spend. That is the general argument, not a fact about one card.

So *unavailable* is `text-muted-foreground` with the strike kept, and *inert* is stated rather than faded: the controls inside are genuinely `disabled`, which the browser exposes without being asked, and the card's edge goes dashed. The edge is `border-muted-foreground` unqualified, because for two of the three inert conditions it is the only indicator — a card just clicked and a card a later message overtook explain themselves from the transcript and carry no sentence — and a state indicator is held to 3:1. At `/50` it was 2.65 and 1.98. `ScaleControl`'s unavailable segments take the same vocabulary rather than a background tint, since no tint reaches 3:1 against the card.

Two call sites keep `disabled:opacity-100`, in `repair-options.tsx` and `draft-comparison.tsx`. That override was written against the compounding, which is gone; it is kept for the other half of its own argument, that a spent card is still the record of what was offered. It is also the only place `disabled` still styles anything here: decision 9 takes the attribute off every control that was using it to mean *no*, and leaves it exactly where a spent card's controls are, which is what these two call sites are for.

## Decision 9: nothing is disabled to mean no, and the answer is a sentence

Constitution #17 is the rule; this is what it costs and what it looks like in this vocabulary.

*The mechanism is one module.* `src/lib/say-why.ts` holds `sayWhy(id, sentence)` over `sonner`, plus the two sentences more than one control says — a run in flight, and a draft with no priced candidate. The `id` is what keeps an impatient second click from stacking a second copy of one sentence. The sentences are shared rather than written per call site because three separate controls on the canvas are unusable for the one reason that a run is in flight, and a reason said three ways reads as three conditions.

*A toast does not violate constitution #16, and the line is worth stating.* That rule governs how a *state* is carried, and its objection to a transient channel is that a state outlives the moment. A toast here carries no state: it answers a gesture at the moment it is made, and every condition it speaks about is also readable somewhere that stays — the run has the chat's own indicator, a draft with no price says so in the menu beside its name, and a ruled-out option carries its rules in `RefusalList` whether or not anybody clicks it. A refusal is never put in a toast alone.

*The most-seen one belongs to CopilotKit.* The chat composer's send button greys itself on an empty field, and its `disabled` is computed inside `CopilotChatInput` rather than passed by this app. It is the one place the rule reaches into a library prop, and it is ruled by [chat-pane](../chat-pane/design.md) decision 10 rather than here, because what makes it delicate is the coupling to an internal and not the vocabulary.

*Where the guard went instead.* Six controls on the sheet were disabled on `isRunning`, each expressing one condition. `DocumentView.disabled` is deleted and the condition is answered once, in the canvas shell's own `dispatch`, which every editable island, both history controls and all four draft moves already route through. `card-dispatch.ts` had the same condition and answered it by returning silently — a click that did nothing and said nothing — and now says it. Two non-idempotent actions, creating an elevator and deleting one, already returned early on a second call, so the attribute was never their guard; they keep the early return, drop the attribute, and say they are working with a spinner and a changed word.

*What a ruled-out option looks like now.* Muted, struck, and clickable, with its rules underneath and one line saying what asking for it anyway does. `REFUSAL_AFFORDANCE` in `src/components/refusals.tsx` is that line, kept out of `refusalText` on purpose: `refusalText` is the *reason*, it is what `aria-describedby` resolves to, and the agent quotes the same rules in prose where there is no control to click.

*The focus outline is app-level and deliberately unlayered.* Decision 2's darker `--ring` fixes `focus-visible:border-ring` on anything with a card behind it, and not on a filled control: on a selected chip the ring against the primary fill is 2.07:1 in dark, because a border is drawn on the button and measured against the button. An outline is drawn outside it. `globals.css` therefore carries one `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px }`, placed *outside* `@layer base` — unlayered rules beat layered ones, and the primitives set `outline-none` on themselves from Tailwind's utilities layer, so a base-layer rule would lose to every one of them and fail silently. One rule beats editing twelve installed components, which decision 1 would take back on the next `add`.

*Being unwinnable, that rule arrived on top of the marks already there rather than in place of them.* The browser pass found four shapes of it, each one state said two or three ways at once, and three further rules in the same unlayered block answer them.

| what focus drew | why | what says it now |
|---|---|---|
| Any button, link or chip: a recoloured border, a 1px ring and the outline | `focus-visible:ring-1` is a primitive default and the rule above cannot displace it | the outline alone; the ring is removed |
| The composer's field: a ring round `InputGroup` and an outline round the textarea inside it | `InputGroupTextarea` sets `focus-visible:ring-0` to keep exactly this from happening, and lost | one outline round the `InputGroup` |
| An elevator row: the row's border in `--primary`, an outline round the title's text | the title link is a zero-area anchor whose hit area is an `after:inset-0` overlay | one outline round the row |
| A menu item: the accent fill and an outline clipped by the menu's own edges | menu content is `overflow-hidden`, a scrolling group inside it `overflow: hidden auto` | the outline, drawn inside the border box |

*The ring is removed rather than each component edited.* Tailwind draws it through `--tw-ring-shadow`, and a custom property declared unlayered beats the utilities-layer declaration of the same name while `box-shadow` still resolves through the variable — so `shadow-md` on a popover survives untouched, and decision 1 keeps its hands off `src/components/ui/`. The rule is held off `[aria-invalid="true"]`, which is Tailwind's own selector for that variant: there the ring is the *other* state, and the two are meant to be legible together. No call site passes `aria-invalid` today — the seven primitives that style it all do so through the variant and none of this app's code sets the attribute — so the carve-out is there for the first thing that does, which would otherwise be stripped of its invalid ring at the moment the reader is in the field fixing it.

*`focus-visible:border-ring` stays on a control and is held off a field.* The unfocused border colour cannot be recovered generically from an unlayered rule, and on a button or a chip a recoloured edge is a colour change on a border already occupying space — on a filled chip it is also the fallback wherever an outline is clipped. A field is the exception, and it is the one thing here that computed style found but could not weigh: the composer's border read back as `--ring` like any other focused control, and only the screenshot showed that on a box that size two lines of the same weight 2px apart are two rectangles rather than one mark. Which is the argument for keeping a browser pass in a spec that computes contrast rather than sampling it — the numbers say what is drawn, looking says what it reads as. `InputGroup`, `Input` and `Textarea` therefore hold their border at `--input` while focused, which is recoverable because a field's resting border is one known token.

`has-[a:focus-visible]:border-primary` on the elevator row is deleted, because it was hand-written, it said focus in a second colour, and the outline it now draws round the whole row is the row-shaped mark it was reaching for.

*Two composites are named in `globals.css` rather than at their call sites, and each rule carries an assumption about its call site.* The menu rule names the three item roles rather than descending from `[role="menu"]`, so a focusable that is not an item — a submenu trigger, a control in a label — keeps the ordinary outline; neither menu has one today. The row rule fires for any link in any `Item`'s content, and what makes an outline on the row right rather than wrong is that this link is a row-covering `after:inset-0` overlay. The other `Item` call site, in `ask-choices.tsx`, is `asChild` on a button and holds no link at all. A second row-shaped `Item` whose link is an ordinary inline one would be marked in the wrong place, and nothing would say so.

*Where they are named.* The `InputGroup` and the elevator row each read as one control and are several elements, so the composite takes the outline and the descendant holding focus gives its own up. The suppression has to be unlayered for the same reason the outline does — it is reaching a control that already sets `outline-none` from the utilities layer — and a rule cannot be half unlayered, so both halves live in the stylesheet. `:has(:focus-visible)` and not `:focus-within`: the latter fires on a mouse click, which is the thing `:focus-visible` exists to avoid.

## Verification

*Contrast is computed, not sampled.* Every ratio in this document comes from converting the oklch tokens in `globals.css` to sRGB and compositing nested `opacity` the way a browser does. Sampling could not reach the states that matter anyway: a card goes inert only when the agreement moves past the conversation that drew it, which no crawler and no check reaches.

Two checks hold the mechanical halves of constitutions #16 and #17. `tests/legibility.test.ts` (offline) asserts that no live source sets a text size below 12px and that no hand-written element carries an unconditional `opacity-*` beside a text token; it was verified negatively before being trusted, by reintroducing both defects and confirming it names the call sites. `tests/interface/refusals.test.tsx` now covers all four controls that draw a refusal — the card's three, and `OptionEditor` on the sheet, which computes its refusals from the agreement through `rulesAgainst` rather than reading them off a payload and so could drift from the other three unnoticed. Each is asserted to put the rule in the document, to resolve `aria-describedby` to the element carrying it, to say what asking anyway does, and to leave the control operable: neither `disabled` nor `aria-disabled`, since a control that acts is not disabled in either sense. Restoring `disabled={refused || inert}` to one control fails it by name. The rest — colour, focus, layout — is the running app.

Constitution #9: UI is verified by running the app. `npm run build` can't see a missing utility class, a changed padding, or a corner that stayed round, so the check is the running app in both themes, across the elevator list, the workspace split view with a populated canvas, an expanded canvas row, the footprint popover, and all three in-chat cards.

The chat pane carries behaviour as well as appearance, and so has a check of its own, in the [chat pane design](../chat-pane/design.md).

## Notes from implementation

- The browser pass ran in both themes across every in-scope surface. Dispatch was confirmed verbatim on all three cards and a canvas edit, a used card goes inert exactly as before, and every disabled control whose `title` carries a reason computes `pointer-events: auto`. That last was re-checked after the Lyra switch on both the `Button` and `ToggleGroupItem` paths, since Lyra keeps `disabled:pointer-events-none` and the workaround is still required.
- *Two defects the change introduced, both found by reading rather than by any tier.* Making a control live moves work that the `disabled` attribute was silently doing, and in two places something else was relying on it. The canvas's `dispatchChoice` set its optimistic `pending` overlay *before* calling `dispatch`; with the busy guard now inside `dispatch`, a click during a run raised the toast, sent nothing, and marked the clause as though it had landed — held on screen until the run ended, which is worse than the grey control it replaced. `dispatch` now reports whether it ran and the overlay is set from that. And the render's shaft viewpoint kept Radix's `onValueChange`, so the toast fired *and* the view switched to an empty one; the guard moved into `onValueChange`, where the answer is the sentence instead of the sentence plus a broken picture. Both were reachable only because the controls had stopped refusing, and neither is visible to a type-checker or to any check in either tier.
- *The two non-idempotent actions gained a ref.* `create` and `remove` guarded on their `creating`/`deleting` state, which is read from a render's closure and only holds once React has re-rendered between two clicks. That was double protection while the attribute was there and is the whole guard now, so each sets a `useRef` flag synchronously in the handler. The attribute stays off; what replaces it is a spinner and a changed word.
- *Decision 9 has not had its browser pass either, and it is now two changes deep.* All three check tiers are green and the operable assertion was mutation-tested. What to look at, beyond decision 8's list: a toast, in both themes and at the bottom right, where the chat's own composer sits; a ruled-out chip clicked in anger, which should produce a repair card and not a silent turn; the send button pressed on an empty field, which should say so and must not submit an empty message; the sheet during a run, which no longer greys and no longer collapses its schedule rows, so several controls now look live that were not before; and a second click on *New elevator*, which should show a spinner rather than a dead button. Whether the toast is *noticed* at the bottom right while the reader is looking at the canvas is the open question, and it is a browser question.
- *Decision 8's focus half has had its browser pass; the rest of it has not.* Focus was driven with real `Tab` events under CDP and read back as computed style, because a screenshot cannot separate a 1px ring from a 2px outline at 2px offset. Two forms of it: a sweep of the whole tab order on the elevator list and the workspace page, which is what found the elevator row nobody would have thought to name, and a targeted pass over a plain button, a filled chip, the composer's field, the resizable handle and a menu item, which reaches what the tab order does not. After the change every stop in both sweeps carries exactly one focus mark. Read style settled, not mid-transition: the primitives animate `transition-all`, so a reading taken 90 ms after the key event catches an outline offset partway to 2px and a ring partway to nothing, and reports both. The other false positive to expect is the schedule cards' resting `shadow`, which an ancestor sweep reports and which is there with nothing focused at all. Focus on a filled control, which the outline exists for, works. Clipping turned out to be real but local: it is menus, not `Card`, whose padding leaves the outline room. The `aria-invalid` carve-out was checked positively and negatively on an injected control. Still to look at, none of it about focus: a `ScaleControl` whose scale has several segments out of range, since the refusal list grows a line per refusal under a compact control; and an inert card in both themes, which may now read as *emphasized*, its dashed edge being 6.74:1 in dark where a live card's ring is 1.33:1.
- *No check sees any of this, and none can be written cheaply.* "Two focus marks on one element" is a question about resolved style in a browser, which neither vitest project reaches; `npm test` and `npm run typecheck` were green before the change and after it. The verification is the driven-focus pass, and it is what to repeat after touching the focus block or installing a primitive that brings its own ring.
- One thing the pass didn't reach: the empty *elevator list* state, which needs a store with no workspaces.
- The dead starter surfaces — `example-canvas/`, `charts/`, `meeting-time-picker`, `declarative-generative-ui/` — use the primitives but weren't refactored, as `CLAUDE.md` records. They inherit the zinc palette, keep their literal `rounded-*` classes and so their corners, and their layout wasn't reviewed. `src/lib/a2ui-theme.css` is imported by nothing and was left alone.
- `skeleton`, `label`, `checkbox`, `input` and `separator` are installed but unused by the configurator: vocabulary for the next surface rather than dead weight to remove. `alert` has since been taken up by the [chat-attachments](../chat-attachments/design.md) rejection message.
