# Agreement document canvas — design

## Projection, not store

The document is rendered from `agent.state.configuration` plus the model display JSON — a static copy of the model's variables, groups, labels, prices and `pricing` block, imported into `src/lib/configurator.ts` straight from `agent/src/product_model/elevator.json` so there is one source of truth and the canvas needs no backend call to render a label. The solver statuses in state remain the only source of validity. No new frontend state (constitution #3); the optimistic `pending` overlay is threaded from the shell into every layer so a click on a token inside a sentence shows immediately, exactly as a click on a row does. Recitals prose comes from deterministic template functions over state and model data, colocated with the canvas components. The alternative — agent-composed recitals cached in state — was rejected: it puts model prose into the record, which drifts from state between compositions and breaks the grounding discipline (constitution #6); the agent's free narration already has a surface, the chat.

## One resolver, one dispatch

`resolveValue()` in `src/lib/configurator.ts` is the single answer to "what does the agreement say for this variable, and on whose authority" — choice, else forced, else the candidate's. The register compares against it and all three layers render from it, so what the document shows and what the register measures cannot disagree. `liveValue()` is the same function with the provenance dropped.

Dispatch is routed once, in the shell: a variable the customer's document speaks to sends the visible `Reconcile deviation:` message, every other variable the hidden `Canvas edit:` one. Layers receive that routed handler and never build a message themselves. This is the fault the split into layers invites — an inline token in prose calling `canvasEditMessage()` directly would silently turn an answer to the customer's own requirement into bookkeeping, and nothing would error.

## The canvas-edit round trip

An edit must go through solver validation and refresh statuses, so it round-trips through the agent. The mechanism is a *hidden structured user message* (`Canvas edit: Set Door finish to Framed glass (door_finish=glass)`), which the agent handles with `set_choices` like any other commitment — one validation path, one interaction grammar. The message is real in the transcript (the agent stays aware turn by turn, and reopened conversations replay correctly), but the chat renders nothing for it: the user already made the choice on the document, and echoing it in conversation duplicates the document's job. Serves discovery principle [the canvas holds the state and the chat explains it](../../discovery/principles/canvas-holds-state-chat-explains.md). The agent is likewise instructed to reply with an empty message when the edit applies cleanly, and to speak only when it has something the document cannot show — a newly forced cascade, a conflict, repair options (the chat skips rendering empty assistant messages, so a quiet turn leaves no trace).

Mechanics: `canvasEditMessage()` in `src/lib/configurator.ts` prefixes the shared structured grammar with `Canvas edit: `; the chat's message view (`src/components/chat/message-view.tsx`, the [chat-pane design](../chat-pane/design.md)'s composition) computes a set of hidden message ids and drops those rows — a user message carrying the prefix, and a *text-less* assistant message whose nearest preceding user message is one of them, which hides the tool-call chips of a quiet turn while letting a ripple explanation (which has text) through. Both tests are content-based, so reopened conversations hide the same messages without needing metadata to survive the checkpoint round trip. `choiceMessage()` — the same grammar without the prefix — remains the visible echo for the in-chat `ask_choices` cards: a card's picked values live in component state that does not persist, so there the echo is what the transcript remembers. The agent-side silence is a hard rule in the system prompt (a softly-worded version still produced "Got it — I've recorded…" confirmations); prompt wording and this filter are coupled — change them together.

Alternatives rejected: a *visible* echo (the original mechanism — transcript as faithful mixed-initiative history, after Horvitz — but it restates what the document already shows, which [the canvas holds the state and the chat explains it](../../discovery/principles/canvas-holds-state-chat-explains.md) rules out); a silent programmatic run outside the agent (faster, but a second interaction grammar and a second entry point into validation).

## The editor and the optimistic overlay

One `OptionEditor` serves every layer, opened in a popover: options with `statuses[var][value] === "invalid"` render disabled and struck through, with the reason on hover ("ruled out by your other choices — ask why in chat"); price deltas are shown as EUR/month at the term in effect, via `monthlyDelta()` in `src/lib/configurator.ts` — the single place the frontend re-derives money, from the same imported JSON the agent reads. Candidate values fill open rows in a muted "proposed" style.

Optimistic display: a click shows the chosen value immediately, from a local `pending` overlay in the canvas shell, while the round trip runs; when the run finishes the overlay is discarded wholesale and the document renders from validated agent state again. This is ephemeral display state, not a store (constitution #3 intact) — the solver stays the only source of validity, and the overlay can only ever hold options that were valid at click time because invalid ones are unclickable. If the agent nevertheless rejects or revises the edit, the discard-at-run-end reconciliation makes the value snap to the truth and the chat carries the explanation.

## No editor framework

The layers are React components; editable islands reuse that one editor and the shell's dispatch. An inline value in recitals prose is a button that opens the editor in a popover — no rich-text machinery is needed to render read-only prose with interactive tokens (constitution #10). ProseMirror/Tiptap is deferred to the typed-edits follow-on, where its inspectable edit transactions are the actual requirement; its collaboration and persistence features (Y.js, Hocuspocus) are a duplicate store and stay unused even then (constitution #3).

## Layer mapping is a presentation heuristic

`context` → recitals, `agreement` and `performance` → terms, remaining groups → schedules. The whole `performance` group is a term, not a subset: the [rfq-reconciliation spec](../rfq-reconciliation/requirements.md)'s stage-1 vocabulary is `agreement`, `context`, `performance`, drawn independently, and it is exactly these two layers. The mapping lives in the frontend beside the control-selection heuristic, under the same rule that keeps that heuristic out of the product model: UI concerns stay out of product data (constitution #2). Adding a variable to a group needs no layout decision.

## Prose is phrased, not labelled

The model's labels are column headings: "Office", "Modernization (existing shaft)". Dropping them into a sentence re-imposes catalogue terms at the primary surface, which is the failure this layer exists to undo. So each recitals token takes a `phrasing` map from value to how it reads in that sentence — "an office building", "into the building's existing shaft, replacing the equipment there" — written beside the sentence it serves and total over the model's values, with the label as fallback so a new option degrades rather than breaks. Placeholders are phrased the same way: an undecided value reads "an accessibility package not yet decided", not "—".

Both phrasings and glosses are deterministic data, but they live in different places for a reason. A gloss ("a stretcher fits") is product knowledge and belongs in `elevator.json` as an option's `note` (constitution #2); the solver's loader takes named keys and ignores it. Phrasing is grammar — it exists only because of the sentence around it — and belongs with that sentence. Where the model carries a `note`, the value is glossed wherever it renders; presence of the field is the list, so there is no second frontend list to keep in step.

## Marks in the margin, once per variable

Recitals and terms are a two-column grid: the clause, and a margin holding its provenance badge and any deviation mark. That is where the genre puts attribution and tracked changes, and it keeps marks out of the reading line. The column appears via a container query (`@2xl`), not a viewport one — the canvas is a resizable panel whose width has nothing to do with the window's; below that width the marks flow under the clause they mark.

A variable is marked in exactly one layer, the one its group maps to. Recitals restate three agreement-group values — term, service level, usage profile — because a recital only reads as the change in the world if it says how long and on what service; both instances are editable and edit the same state, but the marks for those three appear only in the terms. Without that rule the same badge and the same deviation mark would render twice on one page.

The register's own moves are unchanged: accept the offered value, leave open, reopen, each dispatching the same message it did on the sheet.

## The header carries what precedes the document

Above the recitals: a breadcrumb of the back link and the workspace's name — the canvas is the surface present in every chat mode, so it carries the workspace's identity ([chat-surface](../chat-surface/design.md) decision 8) — then the title "Service agreement", then the monthly figure with its objective named ("cheapest completion", or "lowest-footprint completion" when the candidate carries that objective, per the [footprint spec](../environmental-footprint/design.md)), and the register summary line when the workspace was seeded from a document.

The monthly figure is stated as a term, in the consideration clause closing the operative terms, and *repeated* here compactly. Stating it only in the clause put the most-consulted number in the app below the recitals — which would both cost the operator the glance and manufacture the scroll-past behaviour that is [canvas anatomy](../../discovery/models/Canvas%20anatomy.md) §5's first failure signal, contaminating the assertion this surface exists to test. `ConfigCanvas` takes the resolved workspace name as a prop rather than reading it; the precedence the [agreement-workspace design](../agreement-workspace/design.md) fixes is resolved in `useWorkspaceAttachment` and stays there.

## In-chat option controls

Fixed-schema tool `ask_choices(variables: list[str], prompt?)` in the agent (the `search_flights` pattern, not free-form A2UI): the tool reads current state and returns a typed payload — per variable, the valid options with labels and monthly deltas at the term in effect (chosen, else the candidate's, else the default term — [service-agreement](../service-agreement/design.md)), invalid values flagged (rendered greyed in place), the cheapest-monthly-completion value marked, and a `control` field selected server-side.

Control selection is a heuristic in the payload builder, not stored in the product model: variables in the `performance` and `dimensions` groups are ordered domains → `scale` (the option order in the model JSON is the scale order); otherwise ≤6 options → `chips`; otherwise → `list`. `car_size`, `wall_finish`, `floor` are forced to `list` regardless (consequence-heavy, need descriptions). The agent may pass several variables; the frontend composes them into one form card with a single submit.

Frontend: one `AskChoices` renderer registered against the tool name in `src/hooks/use-configurator-ui.tsx`, with sub-components `ChipRow`, `ScaleControl`, `OptionList` picked per variable by `Control`. A single variable dispatches on the pick; several stack their controls in one card and hold the picks in local state behind one Apply button, which sends them as a batch. Activating a control (or submitting the form) dispatches the same structured user message as a document edit — one batch, one `set_choices`. Controls disable once any later user message exists — valid-by-construction at render time, inert afterwards.

`generate_a2ui`, `search_flights`, `query_data` stay unregistered (see the [agent-tools design](../agent-tools/design.md)).

## State streaming

Revisits the [agent-tools decision](../agent-tools/design.md): still no streaming of configuration tool args; the canvas updates from validated Command state only. If the post-run refresh feels laggy in practice, note it and revisit (the [nonlinear-interaction](../nonlinear-interaction/design.md) pass did not need to).

## Notes from implementation

- Frontend files: `src/lib/configurator.ts` (types, model display data, `resolveValue`, the layer mapping, `optionNote`, `monthlyDelta`, the message builders), `src/components/config-canvas/` — `index.tsx` (shell: header, register summary, frames strip, routed dispatch, overlay), `document-parts.tsx` (the shared `DocumentView`, `OptionEditor`, `ValueToken`, `Gloss`, `ProvenanceBadge`, `DeviationMark`, `Clause`), `recitals.tsx`, `terms.tsx`, `schedules.tsx`; `src/components/generative-ui/ask-choices.tsx`; `src/hooks/use-configurator-ui.tsx`.
- The genre recast changed nothing agent-side: no tool, no system prompt, and the only file touched under `agent/` was model data the solver ignores.
- Tool-card reactivity gotcha: the `ask_choices` card does not re-render when `agent.isRunning` flips, so isRunning must not be baked into the rendered disabled state (it left the card permanently locked). Inertness = submitted ∨ stale (user message after the call); isRunning is read fresh at click time instead.
- Schedules are collapsed by default, and a schedule holding an unanswered requirement of the customer's document opens itself — an annex is the one place the document could hide a deviation. Collapse state is `boolean | undefined`, undefined meaning "untouched, follow the register": a computed initial value would not re-run when the register arrives, and a default read from anything the server cannot see is the hydration mismatch `workspace-split.tsx` records.
- Glosses annotate `rated_load`, `rated_speed`, `car_size`, `door_width`, `wall_finish` and `floor` — the consequence-heavy set, which straddles both the terms and the schedules. They are additive to the label, never a restatement of it: `1000 kg / 13 persons` glosses as "a stretcher fits", not as "thirteen persons".

## Verification

Component-level rendering is verified by running the app (constitution #9). The `ask_choices` payload builder is a pure function in `agent/src/configuration.py` with unit tests (valid/invalid flagging, price deltas, cheapest marker, control-selection heuristic, multi-variable payloads). The model validator passes with the glosses added (`uv run python src/product_model/validate.py`), and the production build compiles.

The edit protocol was verified in the browser before the genre recast and again after it. On the sheet: a hotel scenario from needs elicitation through a forced EN 81-70/MRL cascade to a candidate on the canvas, with `ask_choices` rendering a scale (2500 kg greyed as out-of-range) and a detail list (1800×2700 unavailable) with cheapest markers, "Apply 2 choices" recorded as one batch, and the used card going inert; and a clean hidden edit (mirror → half-height) that left the conversation completely untouched while rippling edits produced only the consequence, with the hidden messages still hidden after a thread switch and back.

On the document, walked through on a copy of an RFQ-seeded workspace (Kranhaus Nord, 11 requirements, one waived):

- All three layers render from one state: recitals prose in building language, eight numbered terms with margin badges, the consideration at €1,951/mo with the footprint disclosure, four collapsed schedules.
- The waived `rated_speed` deviation renders as a margin mark on its term — "Clause 3.1 asked 3.0 m/s · offered 2.5 m/s · waived, still listed" — with Reopen intact. On a second fixture carrying two added requirements, the same mark renders in the recitals margin ("Clause 2.1b asked Hotel · offered Office") and as a row strip in the schedules, and the cabin schedule opened itself with "your document speaks to this" while the other three stayed collapsed.
- An editable island in prose (`usage_profile`, inside a recital sentence) opens the same editor as a row, with solver-invalid options struck through and monthly deltas shown.
- A schedule edit (car floor → granite composite) showed optimistically with the "you" badge and its gloss, round-tripped through `set_choices`, and left no echo in the chat; the agent spoke only to say the prior quote was cleared.
- At a narrow canvas width the margin column folds under its clause and the document stays readable.

Not verified: the move mix the genre change is supposed to produce. [The representation of the agreement selects the user's moves](../../discovery/assertions/representation-selects-moves.md) is an assertion under test with named failure signals in [canvas anatomy](../../discovery/models/Canvas%20anatomy.md) §5 — recitals scrolled past every session, revision going straight to the schedules, changes still arriving through chat. One walkthrough cannot produce that evidence; it needs sessions with someone who is not the author.

## Pending amendment, from discovery

The [surface architecture model](../../discovery/models/Surface%20architecture.md) §2 rules that pending revisions, repair sets and comparisons are document-side artifacts — this canvas will host them, with chat carrying only their narration. The fuller statement of what changes, and why the built chat-card placement is faulted, is in the [nonlinear-interaction design](../nonlinear-interaction/design.md) (*Pending amendment*). The target surface now exists — the operative-terms layer — so the amendment is unblocked spec work rather than a dependency, and the `ask_choices` cards described above still carry option controls the document would host better.

## Known gaps

- Typed free-text editing of the document — the follow-on named in [canvas anatomy](../../discovery/models/Canvas%20anatomy.md) §4 — is untouched, as are export, comparison-view placement, and mobile layout.
- The `unmapped` clauses of an ingested RFQ (budget caps, access windows, service credits) have no home in the document; they remain visible only through the agent.
