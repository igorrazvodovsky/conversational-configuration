# UI component library — design

Rules the component vocabulary: shadcn installed rather than hand-written, the palette in oklch, the Lyra style, and the primitive mapping. Read it before editing `src/app/globals.css` or relaxing an upstream default at a call site; both have reasons recorded here.

## Decision 1: shadcn is the component vocabulary, installed rather than copied

Components come from `npx shadcn@latest add`, never hand-written. That is what makes `src/components/ui/` current upstream source rather than a set of approximations that drift, and it is why adding a surface should start by reaching for a primitive.

`shadcn init` is still not used, because it wants to author `globals.css` wholesale, and this stylesheet carries things the CLI knows nothing about: the CopilotKit font override, the showcase pill rules, the inspector positioning, and a `dark` variant that has to be broader than shadcn's default. That variant is `@custom-variant dark (&:where(.dark, .dark *))`, declared after the stylesheet imports so it wins, because the default `&:is(.dark *)` misses the `<html>` element `ThemeProvider` stamps. `components.json` is written by hand instead, and `add` needs nothing else.

## Decision 2: shadcn's own palette, in oklch

The prototype ran on the CopilotKit starter's brand hexes. They were placeholder branding, so they are gone, replaced by shadcn's zinc scale in oklch, taken verbatim from `@shadcn/theme-zinc`. Zinc is a neutral grey with no hue commitment, which suits a tool whose colour should carry meaning — chosen, proposed, unavailable — rather than identity.

Two brand values survive because something still references them: `--cpk-lilac-400` and `--cpk-mint-400`, used by the showcase pill rules, which are reached only from `use-example-suggestions.tsx`, starter code no surface mounts. Both the rules and the two hexes go whenever that file does. The rest of the `--cpk-*` accents and the ambient gradient were unreferenced, and were deleted rather than translated.

Tailwind v4 still needs the `@theme inline` bridge: `bg-background`, `text-muted-foreground` and `border-input` are utilities only if `--color-*` is declared there. This is the one edit that can fail silently, because an unmapped token isn't an error, only an unstyled element, so it is verified against the compiled stylesheet before any call site is touched.

One token is not the value `@shadcn/theme-zinc` ships. `--ring` is a zinc step darker in both themes — zinc-500 in light, zinc-400 in dark — because stock zinc's ring is 2.63:1 against white and a focus indicator needs 3:1, so the light theme had no conforming one anywhere. It is still a step of the same ramp rather than a colour from outside it. The [accessible surface](../accessible-surface/design.md) rules that change and the app-level `:focus-visible` outline that goes with it.

## Decision 3: the Lyra style

`components.json` sets `"style": "radix-lyra"`, so `add` fetches components in shadcn's Lyra flavour: square, dense, sharp. Concretely it changes more than corners. The default button is `h-8` and `text-xs` rather than `h-9` and `text-sm`, `destructive` is a tint rather than a fill, controls take a one-pixel press-down on `:active`, and `ToggleGroup` gains a default gap between segments.

Lyra pairs conventionally with a monospace face, and the body stays Plus Jakarta Sans anyway. The canvas is a dense mix of prose labels and numbers, and long agent prose in the chat reads badly in mono. Spline Sans Mono keeps its existing job on tool rows and code.

*Radius is zero twice over.* Every step of the ramp, `--radius-sm` through `--radius-xl`, is `0rem`, so a stray `rounded-md` can't reintroduce a corner. That doesn't cover literal classes, which aren't token-derived: `rounded-full` on the option chips, `rounded-[4px]` and `rounded-[2px]` in the since-deleted mode toggle, `rounded-lg` on the cards. Those were removed at the call sites, and the zero ramp is the backstop.

Lyra components are written against custom variants — `data-open`, `data-checked`, `data-vertical` — and utilities such as `scroll-fade` and `shimmer`, which live in `shadcn/tailwind.css`. That import, and the `shadcn` devDependency behind it, are required: without them those class names silently do nothing.

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

*What this decision got wrong, and what it now means.* The premise holds and the conclusion drawn from it was too narrow: the alternative to a tooltip that will not fire is not a different tooltip, it is not being a tooltip. A disabled control is outside the tab order, so a `title` on one reaches a mouse and nothing else — no keyboard, no touch screen — and for a while every named rule the solver produced arrived that way and stopped there. The rules now render as visible text under the control that refuses, with `aria-describedby` from the control to that line; `RefusalList` in `src/components/refusals.tsx` is the one place it is written. `title` is kept on top of it, because a tooltip is a real convenience for a mouse and costs nothing once it is not the only channel. The [accessible surface](../accessible-surface/design.md) rules this.

There is a catch in keeping `title`. shadcn's `Button` and `Toggle` set `disabled:pointer-events-none`, and a control with no pointer events never gets the hover the browser needs to raise its native tooltip. So every disabled control that carries a reason also carries `disabled:pointer-events-auto`, exported as `KEEP_TITLE` from `src/lib/utils.ts` so the concession and its reason are written once. It can't be clicked either way, and it can still be hovered. This was verified in the running app on both merge paths: every disabled control whose `title` is a reason computes `pointer-events: auto`. Lyra didn't change this default, so the workaround survives the style switch.

The one place pointer events stay off is a control disabled only because its card has gone inert. Those carry a price hint rather than a reason, and a spent card has nothing left to explain.

This is the concession [every refusal names the rules that caused it](../../discovery/principles/refusals-name-their-rules.md) demands: a nicer tooltip, or a tidier disabled state, that silently stops the explanation from appearing would drop the reason from the interface.

## Decision 6: dispatch copy is frozen

Cards are messages rather than callbacks, and the agent's prompt maps the exact strings the UI sends. The restyle touches presentation only, so `choiceMessage(...)`, `Apply repair: …`, `Adopt frame "…"` and `Compare frame "…" with the current configuration` are moved verbatim. No type checker catches a change here, so the strings are diffed explicitly.

## Decision 7: the rest of the installed set

The chat pane took five more components off the registry — `message-scroller`, `message`, `bubble`, `input-group`, `attachment` — and with them `@shadcn/react`, a new runtime dependency holding the headless primitives behind the styled scroller. Which slot uses which belongs to the [chat pane design](../chat-pane/design.md). What belongs here is that they came in the same way as everything else, in the `radix-lyra` variant `components.json` asks for, with their literal `rounded-*` classes stripped at the call sites.

`dropdown-menu` was added later, for the chat's mode switcher ([chat-surface](../chat-surface/design.md)), and arrives already square. It carries a constraint the others don't: a Radix menu inside the workspace page's *hydrated* tree shifts React's `useId` values across the whole page and breaks hydration on every load, so it is mounted a tick after hydration. Anything else that mints an id belongs behind the same guard.

## Verification

Constitution #9: UI is verified by running the app. `npm run build` can't see a missing utility class, a changed padding, or a corner that stayed round, so the check is the running app in both themes, across the elevator list, the workspace split view with a populated canvas, an expanded canvas row, the footprint popover, and all three in-chat cards.

The chat pane carries behaviour as well as appearance, and so has a check of its own, in the [chat pane design](../chat-pane/design.md).

## Notes from implementation

- The browser pass ran in both themes across every in-scope surface. Dispatch was confirmed verbatim on all three cards and a canvas edit, a used card goes inert exactly as before, and every disabled control whose `title` carries a reason computes `pointer-events: auto`. That last was re-checked after the Lyra switch on both the `Button` and `ToggleGroupItem` paths, since Lyra keeps `disabled:pointer-events-none` and the workaround is still required.
- One thing the pass didn't reach: the empty *elevator list* state, which needs a store with no workspaces.
- The dead starter surfaces — `example-canvas/`, `charts/`, `meeting-time-picker`, `declarative-generative-ui/` — use the primitives but weren't refactored, as `CLAUDE.md` records. They inherit the zinc palette, keep their literal `rounded-*` classes and so their corners, and their layout wasn't reviewed. `src/lib/a2ui-theme.css` is imported by nothing and was left alone.
- `skeleton`, `label`, `checkbox`, `input` and `separator` are installed but unused by the configurator: vocabulary for the next surface rather than dead weight to remove. `alert` has since been taken up by the [chat-attachments](../chat-attachments/design.md) rejection message.
