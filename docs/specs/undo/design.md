# Undo — design

Rules one-move reversal: history as a stack pair beside the configuration it belongs to, what a snapshot holds and what it must never hold, restore as a validated transition, the two tools and their two sentences, and the depth mirror the canvas controls render from. Read it before changing what writes history or what a reversal restores.

Status: implemented and verified by running the app. One known gap is recorded in *Verification*: a click in the first seconds of a freshly switched conversation can be swallowed by the attachment hook.

## Decision 1: history is a stack pair beside the configuration it belongs to, written at the store's single write point

The store gains one field beside `configuration` — on the record when this shipped, and on each draft since [parallel drafts](../parallel-drafts/design.md):

```json
"history": { "past": [snapshot, …], "future": [snapshot, …] }
```

`past` holds the state *before* each applied batch, newest last. `future` holds the states undo has walked away from. `save_configuration` pushes the previous configuration onto `past` and empties `future`. It is the one function every mutating tool reaches through `_commit`, and the reason the [requirements](requirements.md) chose snapshots over a log of inverse operations. No tool can forget to record history, and no tool has to know it exists.

Plain `==` guards the push on the configuration actually differing. Python dict equality is key-order independent, so the store needs no equivalent of the frontend hook's `stableStringify`. Without the guard, a no-op `set_choices` — the agent re-recording a value already recorded — would burn a history slot, and the customer's undo would visibly do nothing.

Depth is ten batches, dropped oldest first, and `save_configuration` is the only function that applies the bound. A restore moves an entry from one stack to the other and so can't grow the pair; `future` needs no bound of its own, because it can't receive more than `past` gave it. Ten covers the storyboard's revision runs with room to spare and keeps the record readable by hand. Anything a customer wants to hold past that is what a second draft is for ([parallel drafts](../parallel-drafts/design.md), which also made the bound per draft).

Records written before this spec carry no `history` key. Every read path defaults it, the way the codebase already defaults `footprint`.

## Decision 2: a snapshot is what cannot be recomputed — never `statuses`

A snapshot is `choices`, `candidate` and `rfq`: a `Configuration` minus its `statuses`. It has its own `Snapshot` TypedDict rather than reusing `Configuration`, since it deliberately lacks a required key. The filter itself lives in the store, which is what writes the snapshots, and `configuration.snapshot` delegates to it. A change to the shape therefore can't pass the tests while the store writes something else.

`statuses` is the only purely derived field, and by far the bulkiest — one entry per value of every variable, rewritten on every tool call into a JSON file people read by hand. Leaving it out turns the requirement that a restore re-derives statuses rather than copying them blind into a structural property instead of a discipline: there is nothing to copy.

Everything else is kept because it can't be rebuilt faithfully. `candidate` is the clearest case, and carries the same argument `ingest` already makes: cost-free variables leave several equally cheap completions, and `complete()` picks among them arbitrarily, so a recomputed candidate could offer a value the batch never named. `rfq` rides along because reconciliation marks move with a batch — `reconcile_requirement` with `move="open"` changes nothing else — so restoring the marks is most of what undoing a reconciliation means.

## Decision 3: restore is a validated transition, not an assignment

`restore(snapshot) -> Configuration` sits beside `apply_choices` and `revise` as a pure, unit-tested transition. It re-validates the snapshot's choices against the product model, re-derives statuses from the solver, keeps the candidate only if it still extends those choices, and carries the RFQ block from the snapshot. The tool commits nothing until it returns, so a refused restore leaves the agreement exactly as it was.

Two failure modes exist, and they aren't equally likely. A snapshot that was feasible stays feasible while `elevator.json` is unchanged, so the `ConflictError` branch the requirements call for is unreachable in a static model. It exists for the case constitution #2 makes ordinary: an edited product model. The reachable failure under a model edit is the plainer one, a snapshot naming a value the model no longer has, which raises `ValueError` out of `_validate_known`. Both are caught, and only the second is exercised by a test.

## Decision 4: two tools, two sentences, one grammar

`undo_change` and `redo_change` each take no arguments. A single tool with a direction parameter would give the model something to get wrong for no gain, and the two dispatched messages are distinct sentences anyway: *Undo the last change* and *Redo the undone change*. Both are added to the message grammar in `src/lib/configurator.ts` and mirrored in `tests/scenario_grammar.py`.

Both messages are visible in the chat, unlike a `Canvas edit: `. After a restore the document shows only the restored state, so if the chat didn't carry what was reversed, nothing would. The tool result names the reversal by diffing the two configurations — every variable whose live value moved, the monthly figure, and reconciliation marks that changed — and the prompt asks the agent to say that back in one sentence and stop. Diffing rather than labelling each batch at its call site keeps the description truthful by construction and touches no existing tool. The price is that the sentence describes the *effect* ("rated speed back to 1.6 m/s") rather than the move that caused it.

Typed prose lands on the same tools, which is the point of the requirement that the control and the sentence are one move. The prompt's existing instruction never to restore older values from the transcript gains its counterpart here: there is a sanctioned way to put a value back, and it is this tool rather than a fresh `set_choices` reconstructed from what the transcript remembers.

## Decision 5: the control reads a counts mirror in agent state

The canvas needs to know whether history is non-empty, because the requirement is that with empty history the control is absent rather than disabled. The store holds the history, and `AgentState` carries a two-integer mirror — `history: {undo, redo}` — written by `_commit` on every batch and seeded from the workspace record on attach, exactly as `workspace_name` is display plumbing beside the store's durable copy. The canvas renders the pair of buttons in the document header from that mirror, dispatching through the same `dispatch` every other canvas control uses. They mint no React ids and render only once state has arrived, so they stay out of the hydrated tree; a `title` attribute rather than a tooltip keeps it that way.

One known gap follows from the store's last-write-wins stance. The mirror refreshes on attach and on this conversation's own commits, so a batch applied in another conversation can leave an open conversation's buttons in the wrong presence state until it is reopened. The reversal itself is never stale — both tools read the store fresh and reverse the last applied batch whoever applied it — so the failure is a missing or an inert-looking control, never a wrong restore.

The suggestion strip stays out of this. Pills are sentences a customer could have typed and deliberately carry no structured grammar ([suggested moves](../suggested-moves/design.md), decision 4). Undo is chrome on the record, and putting it in both places would offer the same move twice with two different meanings.

## Decision 6: undoing past an ingestion

`ingest_rfq` is a batch like any other, so undoing it removes the `rfq` block from the configuration. The requirements deliberately leave the document *text* out of scope, and it stays on the workspace record as reference material. The consequence is worth recording rather than leaving to be discovered: `ingest` guards on `config.get("rfq")`, so after such an undo a re-ingestion succeeds and `attach_rfq` overwrites the stored text. That is the coherent outcome, since the agreement and the frozen reference move together, but it means an undo can put an RFQ-seeded workspace back into a state where the document is on the record and no longer answered by the register.

## Verification

- `uv run pytest`, 140 passing. The transitions are covered in `test_configuration.py`: round trip with sources and candidate, statuses re-derived rather than kept, RFQ marks restored, a candidate that no longer extends its choices dropped, and a value the model no longer has refused. The stack arithmetic is covered in `test_workspace_store.py`: push, both directions, redo tail discarded by a new batch, depth bound, a no-op batch pushing nothing, history crossing conversations and surviving a store round trip, and a record written before this feature.
- The conversation checks extend the mid-contract revision scenario rather than adding one. That scenario is already the storyboard's F7 case, and a run costs money. Two turns after the repair is applied, `undo_change` returns the choices to the pre-repair set and `redo_change` brings the repaired set back. The turns weren't run at implementation time, because they bill a provider key; the assertions are tool-call- and state-level, so they read like the rest of that scenario.
- Run in the app against a live agent (constitution #9), all confirmed. The Undo control is absent on an untouched agreement and appears as soon as the first batch commits. Undo returns the sheet to its prior state and swaps the control for Redo, and redo brings it back with provenance intact. At the earliest state only Redo is offered, so each control is absent rather than disabled at its end of the history. Typed prose — "actually undo that, put it back" — lands on `undo_change` and reverses the same batch. History survives a page reload, and a conversation started afterwards offers the control and restores a batch the *other* conversation applied.
