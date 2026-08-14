# Agreement document canvas — design

## Projection, not store

The document is rendered from `agent.state.configuration` plus the model display JSON already imported by `src/lib/configurator.ts` — the same two sources the sheet read. No new frontend state (constitution #3); the optimistic `pending` overlay carries over unchanged, threaded from the shell into every layer so a click on a token inside a sentence shows immediately, exactly as a click on a row does. Recitals prose comes from deterministic template functions over state and model data, colocated with the canvas components. The alternative — agent-composed recitals cached in state — was rejected: it puts model prose into the record, which drifts from state between compositions and breaks the grounding discipline (constitution #6); the agent's free narration already has a surface, the chat.

## One resolver, one dispatch

`resolveValue()` in `src/lib/configurator.ts` is the single answer to "what does the agreement say for this variable, and on whose authority" — choice, else forced, else the candidate's. The register compares against it and all three layers render from it, so what the document shows and what the register measures cannot disagree. `liveValue()` is the same function with the provenance dropped.

Dispatch is routed once, in the shell: a variable the customer's document speaks to sends the visible `Reconcile deviation:` message, every other variable the hidden `Canvas edit:`. Layers receive that routed handler and never build a message themselves. This is the fault the split into layers invites — an inline token in prose calling `canvasEditMessage()` directly would silently turn an answer to the customer's own requirement into bookkeeping, and nothing would error.

## No editor framework in this spec

The layers are React components; editable islands reuse one `OptionEditor` and the shell's dispatch. An inline value in recitals prose is a button that opens that editor in a popover — no rich-text machinery is needed to render read-only prose with interactive tokens (constitution #10). ProseMirror/Tiptap is deferred to the typed-edits follow-on, where its inspectable edit transactions are the actual requirement; its collaboration and persistence features (Y.js, Hocuspocus) are a duplicate store and stay unused even then (constitution #3).

## Layer mapping is a presentation heuristic

`context` → recitals, `agreement` and `performance` → terms, remaining groups → schedules. The whole `performance` group is a term, not a subset: the [rfq-reconciliation spec](../rfq-reconciliation/requirements.md)'s stage-1 vocabulary is `agreement`, `context`, `performance`, drawn independently, and it is exactly these two layers. The mapping lives in the frontend beside the control-selection heuristic, not in the product model — same rule as the [canvas design](../configuration-canvas/design.md): UI concerns stay out of product data (constitution #2). Adding a variable to a group needs no layout decision.

## Prose is phrased, not labelled

The model's labels are column headings: "Office", "Modernization (existing shaft)". Dropping them into a sentence re-imposes catalogue terms at the primary surface, which is the failure this layer exists to undo. So each recitals token takes a `phrasing` map from value to how it reads in that sentence — "an office building", "into the building's existing shaft, replacing the equipment there" — written beside the sentence it serves and total over the model's values, with the label as fallback so a new option degrades rather than breaks. Placeholders are phrased the same way: an undecided value reads "an accessibility package not yet decided", not "—".

Both phrasings and glosses are deterministic data, but they live in different places for a reason. A gloss ("a stretcher fits") is product knowledge and belongs in `elevator.json` as an option's `note` (constitution #2); the solver's loader takes named keys and ignores it. Phrasing is grammar — it exists only because of the sentence around it — and belongs with that sentence. Where the model carries a `note`, the value is glossed wherever it renders; presence of the field is the list, so there is no second frontend list to keep in step.

## Marks in the margin, once per variable

Recitals and terms are a two-column grid: the clause, and a margin holding its provenance badge and any deviation mark. That is where the genre puts attribution and tracked changes, and it keeps marks out of the reading line. The column appears via a container query (`@2xl`), not a viewport one — the canvas is a resizable panel whose width has nothing to do with the window's; below that width the marks flow under the clause they mark.

A variable is marked in exactly one layer, the one its group maps to. Recitals restate three agreement-group values — term, service level, usage profile — because a recital only reads as the change in the world if it says how long and on what service; both instances are editable and edit the same state, but the marks for those three appear only in the terms. Without that rule the same badge and the same deviation mark would render twice on one page.

The register's own moves are unchanged: accept the offered value, leave open, reopen, each dispatching the same message it did on the sheet.

## What carries over untouched

The canvas-edit round trip, the hidden-message filters, the optimistic overlay, status/provenance semantics, and the in-chat `ask_choices` controls are all unchanged — this spec changes how state is *rendered*, not how it moves. Nothing agent-side changed: no tool, no system prompt, and the only file touched under `agent/` is model data the solver ignores. The [configuration-canvas spec](../configuration-canvas/requirements.md) remains the authority on the edit protocol; its layout criteria now point here.

## Notes from implementation

- Frontend files: `src/components/config-canvas/` — `index.tsx` (shell: header, register summary, frames strip, routed dispatch, overlay), `document-parts.tsx` (the shared `DocumentView`, `OptionEditor`, `ValueToken`, `Gloss`, `ProvenanceBadge`, `DeviationMark`, `Clause`), `recitals.tsx`, `terms.tsx`, `schedules.tsx`. `src/lib/configurator.ts` gained `resolveValue`, the layer mapping, and `optionNote`.
- The monthly figure is stated as a term, in the consideration clause closing the operative terms, and repeated compactly in the header. Stating it only in the clause put the most-consulted number in the app below the recitals — which would both cost the operator the glance the [configuration-canvas spec](../configuration-canvas/requirements.md) asks for and manufacture the scroll-past behaviour that is [canvas anatomy](../../discovery/models/Canvas%20anatomy.md) §5's first failure signal, contaminating the assertion this surface exists to test.
- Schedules are collapsed by default, and a schedule holding an unanswered requirement of the customer's document opens itself — an annex is the one place the document could hide a deviation. Collapse state is `boolean | undefined`, undefined meaning "untouched, follow the register": a computed initial value would not re-run when the register arrives, and a default read from anything the server cannot see is the hydration mismatch `workspace-split.tsx` records.
- Glosses annotate `rated_load`, `rated_speed`, `car_size`, `door_width`, `wall_finish` and `floor` — the consequence-heavy set, which straddles both the terms and the schedules. They are additive to the label, never a restatement of it: `1000 kg / 13 persons` glosses as "a stretcher fits", not as "thirteen persons".

## Verification

Model validator passes with the notes added (`uv run python src/product_model/validate.py`), and the production build compiles. Walked through in the browser on a copy of an RFQ-seeded workspace (Kranhaus Nord, 11 requirements, one waived):

- All three layers render from one state: recitals prose in building language, eight numbered terms with margin badges, the consideration at €1,951/mo with the footprint disclosure, four collapsed schedules.
- The waived `rated_speed` deviation renders as a margin mark on its term — "Clause 3.1 asked 3.0 m/s · offered 2.5 m/s · waived, still listed" — with Reopen intact. On a second fixture carrying two added requirements, the same mark renders in the recitals margin ("Clause 2.1b asked Hotel · offered Office") and as a row strip in the schedules, and the cabin schedule opened itself with "your document speaks to this" while the other three stayed collapsed.
- An editable island in prose (`usage_profile`, inside a recital sentence) opens the same editor as a row, with solver-invalid options struck through and monthly deltas shown.
- A schedule edit (car floor → granite composite) showed optimistically with the "you" badge and its gloss, round-tripped through `set_choices`, and left no echo in the chat; the agent spoke only to say the prior quote was cleared.
- At a narrow canvas width the margin column folds under its clause and the document stays readable.

Not verified: the move mix the genre change is supposed to produce. [The representation of the agreement selects the user's moves](../../discovery/assertions/representation-selects-moves.md) is an assertion under test with named failure signals in [canvas anatomy](../../discovery/models/Canvas%20anatomy.md) §5 — recitals scrolled past every session, revision going straight to the schedules, changes still arriving through chat. One walkthrough cannot produce that evidence; it needs sessions with someone who is not the author.

## Known gaps

- The `ask_choices` in-chat cards still carry option controls the document now hosts better. Relocating repair sets and pending revisions onto the terms layer is the [surface architecture model](../../discovery/models/Surface%20architecture.md) §2 amendment, whose target surface this spec builds; it remains unwritten spec work.
- Typed free-text editing of the document — the follow-on named in [canvas anatomy](../../discovery/models/Canvas%20anatomy.md) §4 — is untouched, as are export, comparison-view placement, and mobile layout.
- The `unmapped` clauses of an ingested RFQ (budget caps, access windows, service credits) have no home in the document; they remain visible only through the agent.
