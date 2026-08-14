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

## Not done

- The dead starter surfaces (`example-canvas/`, `charts/`, `meeting-time-picker`, `declarative-generative-ui/`) still use the primitives but were not refactored — see `CLAUDE.md`. They inherit the zinc palette, but a sweep of the tree shows they keep literal `rounded-*` classes and so keep their corners; their layout was not reviewed. `src/lib/a2ui-theme.css` is imported by nothing and was left alone.
- `skeleton`, `alert`, `label`, `checkbox`, `input` and `separator` are installed but unused by the configurator; they are the vocabulary for the next surface, not dead weight to remove.
- The chat pane keeps CopilotKit's own rounded styling against the square canvas. Deliberate — see design decision 3.
