# UI component library — design

## Decision 1: shadcn is the component vocabulary, installed not copied

Components come from `npx shadcn@latest add`, never hand-written. That is what makes `src/components/ui/` current upstream source rather than a set of approximations that drift, and it is why adding a surface should start by reaching for a primitive.

`shadcn init` is still not used: it wants to author `globals.css` wholesale, and this stylesheet carries things the CLI knows nothing about — the CopilotKit font override, the showcase pill rules, the inspector positioning, and a `dark` variant that has to be broader than shadcn's default: `@custom-variant dark (&:where(.dark, .dark *))`, declared after the stylesheet imports so it wins — the default `&:is(.dark *)` misses the `<html>` element `ThemeProvider` stamps. `components.json` is written by hand instead; `add` needs nothing else.

## Decision 2: shadcn's own palette, in oklch

The prototype ran on the CopilotKit starter's brand hexes. They were placeholder branding, so they are gone, replaced by shadcn's zinc scale in oklch, taken verbatim from `@shadcn/theme-zinc`. Zinc is a neutral grey with no hue commitment, which suits a tool whose colour should carry meaning — chosen / proposed / unavailable — rather than identity.

Two brand values survive because something still references them: `--cpk-lilac-400` and `--cpk-mint-400`, used by the showcase pill rules — which are reached only from `use-example-suggestions.tsx`, starter code no surface mounts, so both the rules and the two hexes go whenever that file does. The rest of the `--cpk-*` accents and the ambient gradient were unreferenced and were deleted rather than translated.

Tailwind v4 still needs the `@theme inline` bridge: `bg-background`, `text-muted-foreground` and `border-input` are utilities only if `--color-*` is declared there. This is the one edit that can fail silently — an unmapped token is not an error, just an unstyled element — so it is verified against the compiled stylesheet before any call site is touched.

## Decision 3: the Lyra style

`components.json` sets `"style": "radix-lyra"`, so `add` fetches components in shadcn's Lyra flavour: square, dense, sharp. Concretely it changes more than corners — the default button is `h-8`/`text-xs` rather than `h-9`/`text-sm`, `destructive` is a tint rather than a fill, controls take a one-pixel press-down on `:active`, and `ToggleGroup` gains a default gap between segments.

Lyra pairs conventionally with a monospace face; the body stays Plus Jakarta Sans anyway. The canvas is a dense mix of prose labels and numbers, and long agent prose in the chat reads badly in mono. Spline Sans Mono keeps its existing job on tool rows and code.

*Radius is zero twice over.* Every step of the ramp — `--radius-sm` through `--radius-xl` — is `0rem`, so a stray `rounded-md` cannot reintroduce a corner. That does not cover literal classes, which are not token derived: `rounded-full` on the option chips, `rounded-[4px]`/`rounded-[2px]` in the since-deleted mode toggle, `rounded-lg` on the cards. Those were removed at the call sites, and the zero ramp is the backstop.

Lyra components are written against custom variants (`data-open`, `data-checked`, `data-vertical`) and utilities (`scroll-fade`, `shimmer`) that live in `shadcn/tailwind.css`. That import, and the `shadcn` devDependency behind it, are required — without them those class names silently do nothing.

The style reaches the chat pane too, through composition rather than override — see the [chat pane design](../chat-pane/design.md).

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
| chat/app switch | `Tabs` | both are gone: the switch left with the split ([agreement-workspace](../agreement-workspace/design.md)), and `tabs.tsx` stays installed but unused |
| scrolling panes | `ScrollArea` | canvas, sidebar |
| the workspace's two-pane split | `Resizable` | added later, with the placement change in the [agreement-workspace design](../agreement-workspace/design.md); replaces the fixed `w-1/2` halves and the Chat/App toggle that hid one of them |

Three upstream defaults are relaxed at call sites, each to preserve behaviour rather than appearance:

- `ToggleGroupItem` is `whitespace-nowrap` and fixed-height, which made long scale labels ("630 kg / 8 persons") overlap their neighbours instead of wrapping. Relaxed with `h-auto whitespace-normal`.
- `ToggleGroup` defaults to `spacing={2}`. A scale is a range, and gapped cells read as independent options, so the scale control asks for `spacing={0}`.
- see decision 5 for `disabled:pointer-events-none`.

Installing also swapped the three individual `@radix-ui/react-*` dependencies for the unified `radix-ui` package the current components import from.

## Decision 5: keep native `title` for unavailability

Radix `Tooltip` does not fire on a disabled trigger, and every "ruled out by your other choices" / "outside the valid range" explanation in this app sits on a disabled control. Wrapping each in an enabled span to satisfy the tooltip would change focus order and hit targets for no gain, so those explanations stay on the native `title` attribute. `Tooltip` is installed and used only where the trigger is enabled — the frames strip, whose chips carry "click to compare with the current configuration" — which is what `TooltipProvider` in `layout.tsx` is for.

There is a catch in keeping `title`: shadcn's `Button` and `Toggle` set `disabled:pointer-events-none`, and a control with no pointer events never gets the hover the browser needs to raise its native tooltip. So every disabled control that carries a reason also carries `disabled:pointer-events-auto`, exported as `KEEP_TITLE` from `src/lib/utils.ts` so the concession and its reason are written once. It cannot be clicked either way; it can still be hovered. Verified in the running app on both merge paths — every disabled control whose `title` is a reason computes `pointer-events: auto`. Lyra did not change this default, so the workaround survives the style switch.

The one place pointer events stay off is a control disabled only because its card has gone inert. Those carry a price hint, not a reason, and a spent card has nothing left to explain.

This is the concession [every refusal names the rules that caused it](../../discovery/principles/refusals-name-their-rules.md) demands: a nicer tooltip — or a tidier disabled state — that silently stops the explanation from appearing would drop the reason from the interface.

## Decision 6: dispatch copy is frozen

Cards are messages, not callbacks — the agent's prompt maps the exact strings the UI sends. The restyle touches presentation only; `choiceMessage(...)`, `Apply repair: …`, `Adopt frame "…"` and `Compare frame "…" with the current configuration` are moved verbatim. No type checker catches a change here, so the strings are diffed explicitly.

## Decision 7: the rest of the installed set

The chat pane took five more components off the registry — `message-scroller`, `message`, `bubble`, `input-group`, `attachment` — and with them `@shadcn/react`, a new runtime dependency: the headless primitives behind the styled scroller. Which slot uses which is the [chat pane design](../chat-pane/design.md)'s; what belongs here is that they came in the same way as everything else, in the `radix-lyra` variant `components.json` asks for, with their literal `rounded-*` classes stripped at the call sites.

`dropdown-menu` was added later, for the chat's mode switcher ([chat-surface](../chat-surface/design.md)), and arrives already square. It carries a constraint the others do not: a Radix menu inside the workspace page's *hydrated* tree shifts React's `useId` values across the whole page and breaks hydration on every load, so it is mounted a tick after hydration. Anything else that mints an id belongs behind the same guard.

## Verification

Constitution #9: UI is verified by running the app. `npm run build` cannot see a missing utility class, a changed padding, or a corner that stayed round, so the check is the running app in both themes across the elevator list, the workspace split view with a populated canvas, an expanded canvas row, the footprint popover, and all three in-chat cards.

The chat pane carries behaviour as well as appearance and so has a check of its own — see the [chat pane design](../chat-pane/design.md).

## Notes from implementation

- The browser pass ran in both themes across every in-scope surface. Dispatch was confirmed verbatim on all three cards and a canvas edit; a used card goes inert exactly as before; and every disabled control whose `title` carries a reason computes `pointer-events: auto` — re-checked after the Lyra switch on both the `Button` and `ToggleGroupItem` paths, since Lyra keeps `disabled:pointer-events-none` and the workaround is still required.
- One thing the pass did not reach: the empty *elevator list* state, which needs a store with no workspaces.
- The dead starter surfaces (`example-canvas/`, `charts/`, `meeting-time-picker`, `declarative-generative-ui/`) use the primitives but were not refactored (see `CLAUDE.md`): they inherit the zinc palette, keep their literal `rounded-*` classes and so their corners, and their layout was not reviewed. `src/lib/a2ui-theme.css` is imported by nothing and was left alone.
- `skeleton`, `label`, `checkbox`, `input` and `separator` are installed but unused by the configurator — vocabulary for the next surface, not dead weight to remove. (`alert` has since been taken up by the [chat-attachments](../chat-attachments/design.md) rejection message.)
