# UI component library — requirements

The prototype's screens were hand-rolled markup: every button, chip, row and popover a `<button>` with a bespoke `className` string of arbitrary-value Tailwind (`bg-[var(--primary)]`, `border-[var(--border)]`). The seven files in `src/components/ui/` were shadcn-shaped by hand but never installed, so they drifted from upstream and almost nothing used them. The same idea — a selectable option, a status tag, an unavailable choice — was spelled differently on each surface.

This spec adopts [shadcn/ui](https://ui.shadcn.com) as the component vocabulary for the whole configurator UI: installed components, a real token mapping, and call sites refactored onto them. It also settles the prototype's visual identity, which until now was the CopilotKit starter's branding carried along by inertia: shadcn's zinc palette in oklch, and the [Lyra](https://www.shadcnblocks.com/blog/shadcn-component-styles-vega-nova-maia-lyra-mira) style — square, dense, sharp.

Serves discovery principle [the agent proposes and the user decides](../../discovery/principles/agent-proposes-user-decides.md) — its test is *can the user always tell who chose a value*, and provenance is carried by a status vocabulary (`you` / `agent` / `auto` / `proposed`) that must read the same everywhere it appears. It is also constrained by [every refusal names the rules that caused it](../../discovery/principles/refusals-name-their-rules.md): unavailable options explain themselves through a native `title` on a disabled control, and no restyling may cost the user that reason.

The vocabulary reaches the chat pane too. What the pane is composed *of* is its own spec — [chat pane](../chat-pane/requirements.md) — but it is built from these primitives and has to match this identity, or the divider between canvas and chat reads as a seam between two products.

## Scope

*In:* every surface the configurator renders — the elevator list, the workspace split view, the conversation sidebar, the configuration canvas, the three in-chat cards (`ask-choices`, `repair-options`, `frame-comparison`), the split layout, and tool rendering.

*Out:* the chat pane's own composition, which is the [chat pane spec](../chat-pane/requirements.md)'s — this spec supplies the primitives it uses and the identity it matches, nothing more. Out too: the dead starter code listed in `CLAUDE.md`, and with it the `[data-copilotkit]` suggestion-pill highlight rules in `globals.css`, which serve `use-example-suggestions.tsx` alone.

## User stories

*As the operator reading a spec sheet,* I want provenance tags, price deltas and unavailable options to look and behave the same on the canvas as in chat, so that I read one interface rather than three.

- GIVEN a variable the agent chose, WHEN I look at the canvas row, THEN a badge names the source (`agent`), and the same badge component renders the same way for `you`, `auto` and `proposed`.
- GIVEN an option ruled out by my other choices, WHEN I hover or focus it anywhere it appears (canvas row, chip row, scale, option list), THEN I still get the reason text.

*As the person revising an agreement,* I want the disclosure affordances to behave properly, so that an open panel closes when I click away and keyboard focus goes where I expect.

- GIVEN the footprint assumptions panel is open, WHEN I click outside it or press Escape, THEN it closes.
- GIVEN a canvas row's options are expanded, WHEN I collapse it, THEN focus stays on the row's trigger.

*As a developer,* I want to add a surface without inventing markup.

- GIVEN a new UI element, WHEN I need a button, badge, card, panel or disclosure, THEN it comes from `src/components/ui/` installed by the shadcn CLI, not from a new `className` string.
- GIVEN `npx shadcn@latest add <component>`, WHEN I run it in this repo, THEN it resolves aliases, style and stylesheet without further configuration, and what it writes is already in the project's style.

## Acceptance criteria

- GIVEN the app running, WHEN any in-scope surface is rendered in both light and dark mode, THEN it carries the same information at the same density as before, in zinc, with square corners throughout.
- GIVEN any in-scope surface, WHEN it is inspected, THEN no element has a rounded corner — including ones whose radius came from a literal class rather than the radius token. Only the dead starter files are exempt; they keep their literal `rounded-*` classes.
- GIVEN a card or canvas control is activated, WHEN the message is dispatched, THEN the dispatched string is byte-identical to before (`Apply repair: …`, `Adopt frame "…"`, `Compare frame "…" with the current configuration`, and `choiceMessage(...)`), because the agent prompt is coupled to that copy.
- GIVEN the agent is running or a card has gone stale, WHEN controls are shown, THEN they are disabled/inert exactly as before.
- GIVEN `src/components/ui/`, WHEN its files are inspected, THEN they are current upstream shadcn source in the Lyra style, not hand-written approximations.
