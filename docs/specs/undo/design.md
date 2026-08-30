# Undo — design

Rules one-move reversal: restore as a validated transition, the two tools and their two sentences, and the counts mirror the canvas controls render from. What the record holds and how far a reversal walks it moved to [action-log](../action-log/design.md); read that one before changing what a reversal restores, and this one before changing the tools or the control.

Status: implemented and verified by running the app. What the durable record holds moved to [action-log](../action-log/design.md), and decisions 1, 2 and 4 keep only the parts of it that survived. One known gap is recorded in *Verification*: a click in the first seconds of a freshly switched conversation can be swallowed by the attachment hook.

## Decision 1: the record lives beside the configuration it belongs to, written at the store's single write point

The store holds one field beside each draft's `configuration` — on the record when this shipped, and on the draft since [parallel drafts](../parallel-drafts/design.md). What that field holds is ruled by [action-log](../action-log/design.md): it was a pair of snapshot stacks and is a log of typed actions. Three things about it were decided here and survive that replacement.

*One door.* `save_configuration` is the one function every mutating tool reaches through `_commit`, and it is where the record is written. No tool can forget to record what it did, and no tool has to know the record exists. This is the property the [requirements](requirements.md) chose snapshots for, and the delta inherits it unchanged.

*Bounded depth.* Ten batches, which covers the storyboard's revision runs with room to spare and keeps the record readable by hand. Anything a customer wants to hold past that is what a second draft is for ([parallel drafts](../parallel-drafts/design.md), which made the bound per draft). Under the log the ten became a bound on how far the cursor may walk, with retention its own number.

*Records written before the feature carry nothing.* Every read path defaults the field, the way the codebase already defaults `footprint`.

## Decision 2: a reversal restores what cannot be recomputed, and never `statuses`

What the record keeps of a configuration is `choices`, `candidate` and `rfq`, and the shape a reversal reconstructs is a `Configuration` minus its `statuses` — its own `Snapshot` TypedDict rather than a reuse of `Configuration`, because it deliberately lacks a required key. Under [action-log](../action-log/design.md) those fields are held as facts and the reconstruction comes from a delta, and the line this decision draws is the same one.

`statuses` is the only purely derived field, and by far the bulkiest — one entry per value of every variable, rewritten on every tool call into a JSON file people read by hand. Leaving it out turns the requirement that a restore re-derives statuses rather than copying them blind into a structural property instead of a discipline: there is nothing to copy.

Everything else is kept because it can't be rebuilt faithfully. `candidate` is the clearest case, and carries the same argument `ingest` already makes: cost-free variables leave several equally cheap completions, and `complete()` picks among them arbitrarily, so a recomputed candidate could offer a value the batch never named. `rfq` rides along because reconciliation marks move with a batch — `reconcile_requirement` with `move="open"` changes nothing else — so restoring the marks is most of what undoing a reconciliation means.

## Decision 3: restore is a validated transition, not an assignment

`restore(state) -> Configuration` sits beside `apply_choices` and `revise` as a pure, unit-tested transition. It re-validates the reconstructed choices against the product model, re-derives statuses from the solver, keeps the candidate only if it still extends those choices, and carries the RFQ block from the reconstruction. The tool commits nothing until it returns, so a refused restore leaves the agreement exactly as it was. [action-log](../action-log/design.md) changed where the state comes from and not what happens to it, so this decision and the test that exercises it are untouched.

Two failure modes exist, and they aren't equally likely. A state that was feasible stays feasible while `elevator.json` is unchanged, so the `ConflictError` branch the requirements call for is unreachable in a static model. It exists for the case constitution #2 makes ordinary: an edited product model. The reachable failure under a model edit is the plainer one, a restored state naming a value the model no longer has, which raises `ValueError` out of `_validate_known`. Both are caught, and only the second is exercised by a test.

## Decision 4: two tools, two sentences, one grammar

`undo_change` and `redo_change` each take no arguments. A single tool with a direction parameter would give the model something to get wrong for no gain, and the two dispatched messages are distinct sentences anyway: *Undo the last change* and *Redo the undone change*. Both are added to the message grammar in `src/lib/configurator.ts` and mirrored in `tests/scenario_grammar.py`.

Both messages are visible in the chat, unlike a `Canvas edit: `. After a restore the document shows only the restored state, so if the chat didn't carry what was reversed, nothing would.

What the tool result carries is ruled by [action-log](../action-log/design.md): the move reversed, named with its source, and what that does to the values, both read off the entry the cursor walked past. It once described the effect alone, by diffing the state left against the state restored, which was all a record of states could offer.

Typed prose lands on the same tools, which is the point of the requirement that the control and the sentence are one move. The prompt's existing instruction never to restore older values from the transcript gains its counterpart here: there is a sanctioned way to put a value back, and it is this tool rather than a fresh `set_choices` reconstructed from what the transcript remembers.

## Decision 5: the control reads a counts mirror in agent state

The canvas needs to know whether history is non-empty, because the requirement is that with empty history the control is absent rather than disabled. The store holds the history, and `AgentState` carries a two-integer mirror — `history: {undo, redo}` — written by `_commit` on every batch and seeded from the workspace record on attach, exactly as `workspace_name` is display plumbing beside the store's durable copy. The shape is unchanged under [action-log](../action-log/design.md); what the two integers count is reversible entries within the cursor's reach, computed the same way in both languages and held against each other by the couplings check. The canvas renders the pair of buttons in the document header from that mirror, dispatching through the same `dispatch` every other canvas control uses. They mint no React ids and render only once state has arrived, so they stay out of the hydrated tree; a `title` attribute rather than a tooltip keeps it that way.

One known gap follows from the store's last-write-wins stance. The mirror refreshes on attach and on this conversation's own commits, so a batch applied in another conversation can leave an open conversation's buttons in the wrong presence state until it is reopened. The reversal itself is never stale — both tools read the store fresh and reverse the last applied batch whoever applied it — so the failure is a missing or an inert-looking control, never a wrong restore.

The suggestion strip stays out of this. Pills are sentences a customer could have typed and deliberately carry no structured grammar ([suggested moves](../suggested-moves/design.md), decision 4). Undo is chrome on the record, and putting it in both places would offer the same move twice with two different meanings.

## Decision 6: undoing past an ingestion

`ingest_rfq` is a batch like any other, so undoing it removes the `rfq` block from the configuration. The requirements deliberately leave the document *text* out of scope, and it stays on the workspace record as reference material. The consequence is worth recording rather than leaving to be discovered: `ingest` guards on `config.get("rfq")`, so after such an undo a re-ingestion succeeds and `attach_rfq` overwrites the stored text. That is the coherent outcome, since the agreement and the frozen reference move together, but it means an undo can put an RFQ-seeded workspace back into a state where the document is on the record and no longer answered by the register.

## Verification

- `uv run pytest`, 140 passing at the time. The transitions are covered in `test_configuration.py`: round trip with sources and candidate, statuses re-derived rather than kept, RFQ marks restored, a candidate that no longer extends its choices dropped, and a value the model no longer has refused. Those five survive [action-log](../action-log/design.md) with the reconstruction coming from a delta instead of a snapshot. The stack arithmetic in `test_workspace_store.py` was replaced wholesale by the log's own, listed there.
- The conversation checks extend the mid-contract revision scenario rather than adding one. That scenario is already the storyboard's F7 case, and a run costs money. Two turns after the repair is applied, `undo_change` returns the choices to the pre-repair set and `redo_change` brings the repaired set back. The turns weren't run at implementation time, because they bill a provider key; the assertions are tool-call- and state-level, so they read like the rest of that scenario.
- Run in the app against a live agent (constitution #9), all confirmed. The Undo control is absent on an untouched agreement and appears as soon as the first batch commits. Undo returns the sheet to its prior state and swaps the control for Redo, and redo brings it back with provenance intact. At the earliest state only Redo is offered, so each control is absent rather than disabled at its end of the history. Typed prose — "actually undo that, put it back" — lands on `undo_change` and reverses the same batch. History survives a page reload, and a conversation started afterwards offers the control and restores a batch the *other* conversation applied.
