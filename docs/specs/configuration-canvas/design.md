# Configuration canvas — design

## Canvas

New `src/components/config-canvas/` (the todo `example-canvas/` stays untouched as reference): a spec-sheet layout mapping `agent.state.configuration` — groups from the product model in model order, one row per variable with value, status badge, and provenance. Per the [service-agreement spec](../service-agreement/design.md) the leading `agreement` group puts outcome terms above the derived hardware spec (data order does the grouping — no layout logic), and the header is the agreement header: title "Service agreement", the candidate's monthly figure with its objective named ("cheapest completion"). Under it, per the [environmental-footprint spec](../environmental-footprint/design.md), the candidate's modelled lifetime footprint with an assumptions disclosure (embodied/use-phase split, service life, usage profile in effect, grid factor with the decarbonising bookend, module scope) — cumulative total only, no per-option carbon badges anywhere, all values read from agent state and the model JSON. A static JSON copy of the model's display data (variables, groups, labels, prices, the `pricing` block) is exposed to the frontend so the canvas can render labels without a backend call; the solver statuses in state remain the only source of validity.

Row editor: popover listing options; `statuses[var][value] === "invalid"` renders disabled with a tooltip ("ruled out by your other choices — ask me why in chat"); price deltas shown as EUR/month at the term in effect, via `monthlyDelta()` in `src/lib/configurator.ts` — the single place the frontend re-derives money, from the same imported JSON the agent reads. Candidate values fill open rows in a muted "proposed" style.

## Canvas-edit round trip (decision point)

A canvas edit must go through solver validation and refresh statuses, so it round-trips through the agent. Chosen mechanism: the canvas dispatches a *visible structured user message* into the chat (e.g. "Set Door finish → Framed glass"), which the agent handles with `set_choices` like any other commitment. Rationale: one validation path, the transcript stays a faithful history of both parties' actions (mixed-initiative visibility, Horvitz), and the agent naturally reacts to the edit — announcing cascades or pushing back. Alternative rejected for now: a silent programmatic run (faster, but hides user actions from the dialogue history and creates a second interaction grammar).

## In-chat option controls

New fixed-schema tool `ask_choices(variables: list[str], prompt?)` in the agent (the `search_flights` pattern, not free-form A2UI): the tool reads current state and returns a typed payload — per variable: valid options with labels and monthly deltas at the term in effect (chosen, else the candidate's, else the default term — [service-agreement](../service-agreement/design.md)), invalid values flagged (rendered greyed in place), the cheapest-monthly-completion value marked, and a `control` field selected server-side.

Control selection is a heuristic in the payload builder, not stored in the product model (UI concerns stay out of product data): variables in the `performance` and `dimensions` groups are ordered domains → `scale` (the option order in the model JSON is the scale order); otherwise ≤6 options → `chips`; otherwise → `list`. `car_size`, `wall_finish`, `floor` are forced to `list` regardless (consequence-heavy, need descriptions). The agent may pass several variables; the frontend composes them into one form card with a single submit.

Frontend: one `AskChoices` renderer registered in the tool-rendering path (`src/components/tool-rendering.tsx`) with sub-components `ChipRow`, `ScaleControl`, `OptionList`, composed by `FormCard` when multiple variables arrive. Activating a control (or submitting the form) dispatches the same structured user message as a canvas edit — one batch, one `set_choices`. Controls disable once any later user message exists — valid-by-construction at render time, inert afterwards.

`generate_a2ui`, `search_flights`, `query_data` stay unregistered (see the [agent-tools design](../agent-tools/design.md)).

## State streaming

Revisits the [agent-tools decision](../agent-tools/design.md): still no streaming of configuration tool args; the canvas updates from validated Command state only. If the post-run refresh feels laggy in practice, note it and revisit in 005.

## Notes from implementation

- Frontend files: `src/lib/configurator.ts` (types + model display data, imported directly from `agent/src/product_model/elevator.json` so there is one source of truth), `src/components/config-canvas/`, `src/components/generative-ui/ask-choices.tsx`, `src/hooks/use-configurator-ui.tsx` (also replaces the example suggestions). `page.tsx` swaps in the config canvas. (The example layout it originally rendered into, and that layout's Chat/App mode toggle, were later replaced by `workspace-split.tsx` — see the [agreement-workspace design](../agreement-workspace/design.md).)
- Tool-card reactivity gotcha: the `ask_choices` card does not re-render when `agent.isRunning` flips, so isRunning must not be baked into the rendered disabled state (it left the card permanently locked). Inertness = submitted ∨ stale (user message after the call); isRunning is read fresh at click time instead.
- Verified end-to-end in the browser (hotel scenario): needs elicitation → forced EN 81-70/MRL cascade → €61,700 candidate on the canvas; canvas edit to glass doors dispatched the visible structured message and *forced fire rating to "not rated"* (R23) with the agent narrating the ripple; `ask_choices` rendered scale (2500 kg greyed as out-of-range) + detail list (1800×2700 unavailable) with cheapest markers, and "Apply 2 choices" recorded one batch; the used card went inert.

## Testing

Component-level rendering is verified by running the app (constitution #9). The `ask_choices` payload builder is a pure function in `agent/src/configuration.py` with unit tests (valid/invalid flagging, price deltas, cheapest marker, control-selection heuristic, multi-variable payloads). Manual end-to-end pass: hotel scenario via chips + a canvas edit that triggers a forced cascade.
