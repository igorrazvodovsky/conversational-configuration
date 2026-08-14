# Agreement document canvas — design

Draft, written alongside the requirements; to be reconciled after implementation.

## Projection, not store

The document is rendered from `agent.state.configuration` plus the model display JSON already imported by `src/lib/configurator.ts` — the same two sources the sheet reads. No new frontend state (constitution #3); the optimistic `pending` overlay carries over unchanged. Recitals prose comes from deterministic template functions over state and model data, colocated with the canvas components. The alternative — agent-composed recitals cached in state — was rejected: it puts model prose into the record, which drifts from state between compositions and breaks the grounding discipline (constitution #6); the agent's free narration already has a surface, the chat.

## No editor framework in this spec

The layers are React components; editable islands reuse the existing row-editor popover and `canvasEditMessage()` dispatch. An inline value in recitals prose is a span that opens the same popover — no rich-text machinery is needed to render read-only prose with interactive tokens (constitution #10). ProseMirror/Tiptap is deferred to the typed-edits follow-on, where its inspectable edit transactions are the actual requirement; its collaboration and persistence features (Y.js, Hocuspocus) are a duplicate store and stay unused even then (constitution #3).

## Layer mapping is a presentation heuristic

`context` → recitals, `agreement` plus headline outcomes → operative terms, remaining groups → schedules. The mapping lives in the frontend beside the control-selection heuristic, not in the product model — same rule as the [canvas design](../configuration-canvas/design.md): UI concerns stay out of product data (constitution #2). Adding a variable to a group needs no layout decision.

## Glosses

Situational glosses are display data (per-option annotation in the display JSON or a frontend lookup), never model-composed at render time — the same grounding rule as recitals. Which variables carry one is a short frontend list, expected to overlap the consequence-heavy set already forced to the `list` control.

## What carries over untouched

The canvas-edit round trip, the hidden-message filters, the optimistic overlay, status/provenance semantics, and the in-chat `ask_choices` controls are all unchanged — this spec changes how state is *rendered*, not how it moves. The [configuration-canvas spec](../configuration-canvas/requirements.md) remains the authority on the edit protocol; after implementation its layout-specific criteria should be reconciled to point here.
