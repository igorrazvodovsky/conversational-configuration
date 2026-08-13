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

*Radius is zero twice over.* Every step of the ramp — `--radius-sm` through `--radius-xl` — is `0rem`, so a stray `rounded-md` cannot reintroduce a corner. That does not cover literal classes, which are not token derived: `rounded-full` on the option chips, `rounded-[4px]`/`rounded-[2px]` in the mode toggle, `rounded-lg` on the cards. Those were removed at the call sites, and the zero ramp is the backstop.

Lyra components are written against custom variants (`data-open`, `data-checked`, `data-vertical`) and utilities (`scroll-fade`, `shimmer`) that live in `shadcn/tailwind.css`. That import, and the `shadcn` devDependency behind it, are required — without them those class names silently do nothing.

*What Lyra does not reach.* CopilotKit renders its own chat surface and does not follow either the palette or the style, so the chat half of the split view keeps its rounded input and pills against a square, zinc canvas. Patching CopilotKit's internals to match is out of scope and would violate constitution #10.

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

## Verification

Constitution #9: UI is verified by running the app. `npm run build` cannot see a missing utility class, a changed padding, or a corner that stayed round, so the check is the running app in both themes across the elevator list, the workspace split view with a populated canvas, an expanded canvas row, the footprint popover, and all three in-chat cards.
