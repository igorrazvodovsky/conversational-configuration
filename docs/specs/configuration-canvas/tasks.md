# Configuration canvas — tasks

- [x] Product-model display data exposed to the frontend (direct JSON import in `src/lib/configurator.ts`)
- [x] `config-canvas/`: spec-sheet layout, group sections, variable rows, status badges, price header
- [x] Row editor with greyed-out invalid options
- [x] Canvas-edit dispatch as structured chat message; running-state lockout
- [x] Canvas edits hidden from the conversation (`Canvas edit:` prefix + `messageView` slot filters; agent silent on clean applies, narrates only ripples/conflicts)
- [x] Optimistic row display: clicked value shows immediately from a local overlay, discarded when the run ends and validated state takes over
- [x] `ask_choices` tool + payload builder with control-selection heuristic (unit-tested; suite total 32)
- [x] `AskChoices` renderer: ChipRow, ScaleControl, OptionList, FormCard; stale-control inerting
- [x] Canvas wired into the page layout replacing the todo canvas; configurator suggestions
- [x] End-to-end pass in the browser: chips/scale/list flow, form-card batch apply, canvas edit with forced cascade
