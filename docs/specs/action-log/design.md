# Action log — design

Rules the trace: the shape of a log entry and where it is written, the fact vocabulary a delta is expressed in, what makes an entry reversible, how the cursor is held and bounded, the name each tool commits under, and the counts the canvas renders. Read it before changing what a mutating tool writes, what a reversal restores, or how far either walks.

Status: implemented. The [requirements](requirements.md) were approved 2026-08-21.

## Decision 1: the log is one field on a draft, written through three doors

The stack pair goes; each draft carries a log instead.

```json
"log": [
  {
    "id": "0f3c…",
    "action": "revise_choices",
    "source": "user",
    "conversation": "thread-1",
    "at": "2026-08-21T09:12:44+00:00",
    "standing": "applied",
    "asserted":  [["chose", "rated_speed", "mps1_6"],
                  ["attributed", "rated_speed", "user"]],
    "retracted": [["chose", "rated_speed", "mps3_0"],
                  ["attributed", "rated_speed", "document"]]
  }
]
```

An entry's address is the log it sits in, so no fact repeats the draft. `conversation` is the thread that caused the action, null outside a run. `standing` is decision 4.

Three store functions write it, and the separation is structural rather than a flag:

- `save_configuration(workspace_id, configuration, action, source, thread_id)` computes the delta against the current draft's stored configuration, appends the entry, and writes the configuration. Every mutating tool reaches the store through it, which is the property the [undo design](../undo/design.md) chose snapshots for and which the delta inherits unchanged.
- `append_action(workspace_id, action, source, thread_id)` appends an entry with no facts and touches no configuration. `keep_as_is` needs it: the tool routes through `_reply` rather than `_committed` precisely so that declining a change cannot move the agreement, and a flag on `save_configuration` would hand it a write path it must not have.
- `append_action` records the conversation on the entry and deliberately does not stamp it on the workspace. A workspace opens on the conversation that last *changed the agreement* ([agreement-workspace](../agreement-workspace/requirements.md)), and a decline is the one action that changes nothing, so stamping would let it decide where the operator lands.
- `commit_reversal(workspace_id, direction, configuration, thread_id)` moves the cursor and writes the restored configuration. Like `commit_restore` before it, it deliberately isn't `save_configuration`: a reversal appends nothing, so undoing and redoing the same batch ten times leaves ten cursor moves and one entry.

The structural moves reach none of the three. Forking, switching and discarding rearrange drafts rather than change one, so they write no entry, exactly as they wrote no snapshot.

## Decision 2: a delta is a multiset of facts, and the configuration is the same facts rebuilt

`agent/src/trace.py` holds the vocabulary and four pure functions over it: `facts(snapshot)`, `rebuild(facts)`, `delta(before, after)` and `apply(snapshot, delta)`. It imports neither the solver nor the product model, so the store can call it without growing a model of the product, and `configuration.py` can call it without a cycle.

Making `facts` and `rebuild` mutual inverses is what makes reversal exact rather than careful:

```
delta(before, after) = {retracted: facts(before) − facts(after),
                        asserted:  facts(after) − facts(before)}
apply(x, d)          = rebuild(facts(x) − d.retracted + d.asserted)
invert(d)            = {retracted: d.asserted, asserted: d.retracted}
```

so `apply(before, d) == after` and `apply(after, invert(d)) == before` hold by construction, and the property test that says so replaces the round-trip coverage `snapshot`/`restore` carried.

The differences are multiset differences, not set differences: one occurrence removed per fact. It mattered more before clauses had identity, when two clauses of a document could reduce to the same triple — a blank clause number, a blank quote and the same note — and set semantics would lose one of them on a reversal ([document-clauses](../document-clauses/design.md)). A delta is a list of facts either way, and set semantics would be a claim about the vocabulary rather than about one document.

A Clause is an individual with a uuid ([document-clauses](../document-clauses/design.md)), so every fact of one is addressed by its identity, exactly as facts of a Variable are addressed by its name. It was not so when this vocabulary was written: a Requirement had no identity (finding 6), so the clause number and the quote rode *inside* `requires` rather than being facts of their own, and a mark was addressed by the variable. Identity removed both compromises.

The relations are the ontology's own, so an entry read alone says what happened:

| Fact | Where it comes from |
|---|---|
| `chose(Variable, Option)`, `attributed(Variable, Source)` | one pair per recorded choice |
| `cites(Clause, Citation)`, `quote(Clause, Quote)` | one pair per clause of the document, whatever else it carries — two facts, because the identity is what they are both said about |
| `carries(Clause, Variable)` | the variable a clause bears on, where one does |
| `requires(Clause, Variable, Option)` | the value a clause asks for, where it asks for one |
| `note(Clause, Note)` | why nothing carries this clause, or what the model could not carry |
| `reconciled(Clause, Mark)` | the mark of a clause a reconciliation answered |
| `budget_cap(EUR)` | the cap the document states |
| `candidate_value(Variable, Option)`, `candidate_price(EUR)`, `candidate_footprint(kg, kg, kg)`, `candidate_objective(Objective)` | the standing completion |

`statuses` and `unavailable` are in no delta, by the argument that kept them out of a snapshot: the solver re-derives them, so there is nothing to copy blind. The candidate is in full, by the argument that kept it in one: `complete()` picks arbitrarily among equally cheap completions, so a recomputed candidate can offer a value the batch never named. `budget_cap` rides along because `ingest_rfq` asserts it and nothing else ever does.

One property of the product makes the encoding safe, and it is checked rather than assumed: a register always holds at least one clause, because `ingest` refuses a document that maps to nothing — so the block's presence needs no fact of its own, and a rebuild that finds no clause facts is right to leave `rfq` off. A fact of a clause nothing cites raises rather than minting one, which is the same rule `chose` without `attributed` already follows.

The register is also the only ordered structure in a configuration, and it only ever arrives or leaves whole. `apply` appends re-asserted facts in recorded order, so undoing an ingestion and redoing it returns the clauses in the order the document was read in. Choices and the candidate assignment are dicts, where order is not part of the value.

## Decision 3: an entry with no facts is not reversible, and the cursor walks past it

A `keep_as_is` entry asserts nothing. So does an entry for a batch that changed nothing — the agent re-recording a value the agreement already holds. Both are occurrences worth recording and neither is a step back to anywhere, so:

*Reversibility is a property of the delta.* An entry is reversible when it asserted or retracted at least one fact. Undo walks back to the nearest reversible entry, marking the fact-less entries it passes, and refuses when it finds none within reach. Redo walks forward the same way. The counts the canvas renders count reversible entries only, so the control is never offered for a reversal that would visibly do nothing.

*And an entry with no facts strands nothing.* Only a reversible entry marks the reversed ones `abandoned`. An action that moved nothing leaves the agreement in the state those entries were replayable from, so a decline — or the agent re-recording a value the agreement already holds — must not cost the customer their redo.

Both halves replace the `configuration != draft["configuration"]` guard, and both are needed, because that one comparison did two things: it kept a no-op batch off the undo stack, and it left the redo tail alone. Under the log the no-op batch is recorded, which is the honest record the [requirements](requirements.md) ask for; it is unreversible, which is the first half; and it strands nothing, which is the second. One rule now covers the declined change and the no-op batch, where the old shape needed a guard for one and had nothing for the other.

## Decision 4: the cursor is a standing on each entry, never an index

Every entry carries `standing`, one of three values:

- `applied` — in force.
- `reversed` — the cursor has walked back past it, and redo can walk forward again.
- `abandoned` — reversed, and then passed by a new action. Still in the log, no longer reachable.

The cursor is the boundary the standings imply, and holding it that way rather than as a position settles two things at once. Retention trims the oldest entries, so an index would shift under a trim and an id would need resolving on every read; and the [requirements](requirements.md) ask that a new action after an undo leave what it passed *marked reversed* rather than truncated, which is a per-entry fact whatever the cursor is.

The three transitions read the log by order rather than by an invariant over standings, because a fact-less entry landing after an undo sits `applied` behind a `reversed` one and nothing may break when it does:

- Append marks each `reversed` entry `abandoned` when the entry it is landing is reversible, then appends the new entry as `applied`. That is the redo tail discarded, with the record kept.
- Undo marks entries `reversed` from the newest `applied` one backwards, stopping at the first reversible entry, which is the one it inverts.
- Redo marks entries `applied` from the oldest `reversed` one forwards, on the same rule.

Reading forward for the oldest `reversed` entry is what makes redo right whatever has landed behind the cursor: the entries the cursor walked past stay in log order, so replaying them forward replays them in the order they were applied.

Both refuse without marking anything when the walk finds no reversible entry, so a log of nothing but declined changes offers neither control. Undo has a second refusal that redo does not — the cursor has walked its whole reach while reversible entries remain — and the two are answered with different sentences, because only one of them means the agreement is at its earliest recorded state.

## Decision 5: two bounds, because reversibility and retention are two questions

`HISTORY_DEPTH` stays 10 and keeps its meaning: how far the cursor may walk back from the head, counted in reversible entries. `LOG_RETENTION` is 50 and is new: how many entries a draft keeps, oldest dropped first.

The [requirements](requirements.md) measured the room this buys — on the longest local history, seven deltas against six snapshots is 3.8 KB against 30 KB, because a delta grows with what changed and a snapshot grows with the size of the agreement. Fifty entries is a record of the negotiation that stays readable by hand, and ten remains what a customer can walk back, which is the number the undo requirements chose and the browser pass confirmed. Anything a customer wants to hold past ten is still what a second draft is for.

The reach is a bound on the walk, not on the log: `undo` is offered while fewer than ten reversible entries stand `reversed`. So walking ten back and one forward leaves one more step available, and the pair of counts always sums to at most ten.

## Decision 6: every tool commits under its own name, and the names are enumerable offline

`ToolRuntime` carries the state, the config and the tool-call id, and no tool name — nothing in the run says which tool is executing. So the name is an argument: `_committed(runtime, config, lines, action=…, source=…)`, both keyword-only and neither defaulted. A new call site that omits them raises `TypeError` at its first call rather than logging anonymously, which is the mechanism the [one-gesture-one-action design](../one-gesture-one-action/design.md) argues for where a prompt paragraph would be a request.

`CONTENT_ACTIONS` is a module-level frozen set of the seven names that may appear in an entry, and `_committed` and `keep_as_is`'s append both refuse a name outside it. The set is what makes the acceptance criterion checkable offline: `grammar_dump.py` prints it, and `tests/couplings.test.ts` asserts every member is a tool the agent builds and a name the ontology enumerates. Deriving the name from the runtime, had the runtime carried one, would have left the check with nothing to read but a second description of the rule.

The name being *right* is a separate claim from the name being *nameable*, and it is checked in `test_tools.py`: each content tool is called and the entry it wrote is asserted to carry its own name.

The entry's `source` is who the move belongs to, and it is not always who the facts are attributed to. `set_choices` and `revise_choices` pass their own `source` argument, so the agent recording what the customer just said writes a user move. The rest are fixed by what the action is: `clear_choices` and `reconcile_requirement` are the customer's, `propose_completion` is the agent's, `ingest_rfq` is the document's, and `keep_as_is` is the customer's.

## Decision 7: a reversal reuses the validation path, and the reply names the move

`_restore_step` keeps its shape and changes what it walks. It reads the store fresh, takes the reversal target, rebuilds the state on the other side of that entry with `trace.apply(configuration, cursor_move(entry, direction))` — the entry run backwards for an undo and forwards for a redo, which is the whole of what a direction means here — and hands the result to `restore()` unchanged — which re-validates the choices against the product model, re-derives statuses from the solver, drops a candidate that no longer extends them, and raises on a value the model no longer has. Nothing is written until it returns, so a refused reversal leaves the agreement exactly as it was. The criterion about a restored fact set the model no longer admits therefore holds by the same code and the same test as before.

`describe_restoration` goes. It diffed the state left against the state restored because that was the only description available, and finding 3 is the note that this can say a value moved and cannot say which action moved it. Two functions replace it, both reading the entry rather than a diff. `name_action(entry)` gives the move in the customer's terms, with the source as a possessive — *your revision of Rated speed*, *the assistant's completion of the agreement*, *the document's seeding of the agreement*. `describe_delta(change)` gives what the step does to the values, and takes the delta rather than the entry so a reversal describes what the customer is about to see rather than what the entry originally did.

Both take a second argument, and it is what lets a reconciliation name its term. A `chose` fact carries the variable, so most entries answer for themselves; `reconciled(Clause, Mark)` carries a clause and a mark, and the term the clause bears on is nowhere in the fact. `variables_by_clause` builds the map, reading the `carries` facts in the delta itself where there are any — an ingestion describes itself — and otherwise the configurations the step spans. Both spanned configurations are needed, because undoing an ingestion retracts every clause and redoing one asserts them, so each direction has one side where the clause is absent. Without the map the one move whose whole content is a mark — reopening a requirement already answered — names no term and reports nothing moved. The tool message leads with the move and asks the agent to say back which move it walked and whose it was.

Both run after `commit_reversal` has written, so neither may raise. `restore` re-validates choices against the product model and not the frozen register, so an edited model (constitution #2) can leave a requirement on a variable the model no longer declares; the register branch looks that variable up defensively where the choices loop is safe by iterating the model.

That sentence is the only customer-visible change in the feature, and it is prose, which the conversation checks deliberately never assert. What is assertable offline is the tool message the agent reads, and `test_tools.py` asserts it names the action and the source. The gap between the message and the sentence is recorded here rather than closed.

## Decision 8: the counts are computed twice, and a check says the two agree

The canvas renders its controls from `AgentState.history`, a two-integer mirror, unchanged in shape and in meaning. What changes is that computing it is no longer counting two lists. `history_depths` in the store applies decision 3's reversibility rule and decision 5's reach, and `historyDepths` in `src/lib/workspaces.ts` does the same thing in TypeScript, because the frontend seeds the mirror on attach while the agent refreshes it on every commit.

That is one predicate in two languages, which is what `tests/couplings.test.ts` exists for. `grammar_dump.py` prints a constructed log — a fact-less entry, an abandoned entry, a walk that has started, and more reversible entries than the reach allows — beside the depths the agent computes from it, and the frontend check asserts its own function returns the same pair for the same log. Without it the failure mode is a canvas that offers Undo only after a reload, which no other check in the repo sees.

`keep_as_is` grows a mirror it never had. It writes an entry, so it can change the counts — an entry landing while the cursor is behind the head abandons the redo tail — and returning `_reply` with no mirrors would leave the canvas offering a Redo that has been abandoned.

## Decision 9: records written before the log open with an empty one

`_adapt` drops `history` and defaults `log` on every draft it reads, extending what it already does for a record written before drafts. The snapshots lapse rather than converting: naming the action behind a stored state is provenance the record doesn't have, which is the argument `_adapt` already makes for the frames it drops. A workspace on disk therefore keeps its agreement and loses its undo history, once, and the store's own tests cover the read.

## Alternatives considered

- *Keep the snapshots and add the log beside them.* Two histories on one draft is the shape the [ontology](../ontology-of-phenomena/ontology.md) exists to catch, and finding 3's prize only lands if the log is what undo walks. It would also make every reversal a question about which record is authoritative.
- *An inverse operation per tool.* The [undo requirements](../undo/requirements.md) rejected a move log on exactly this, and were right about inverse operations. A fact delta needs no inverse per tool, because inversion is swapping two lists.
- *Compute the delta at each call site, where the tool knows what it did.* It would let an entry name intent as well as effect, and it would let a tool forget, which is the property the store's single door was built to remove.
- *Truncate the redo tail on a new action.* Cheaper, and it destroys the record of what was tried and abandoned — half of what a governed trace is for.
- *One store function with a flag for the fact-less append.* It hands `keep_as_is` a write path to the configuration, which is the thing the tool's routing through `_reply` exists to deny.

## What this supersedes

The [undo](../undo/requirements.md) scope decision that history is per-batch snapshots rather than a move log, and the design decisions that follow from it — the stack pair, what a snapshot holds, and the diffed description. Every other criterion of that spec survives unchanged, including the bounded depth, the per-draft history, the cross-conversation reversal, the validated restore, and the control's presence rule. Its known gap about a counts mirror going stale when another conversation moves the agreement is untouched, and so is the attachment-hook gap recorded in its verification.

In the ontology, findings 3 and 4 are retired in place and finding 5 is restated as reachable and still open. `undone` and `redoable` leave the asserted facts, the log's facts arrive, Entry joins the individuals, and Standing and Action join the values.

## Verification

*The vocabulary*, in `agent/tests/test_trace.py`: every agreement the agent builds — empty, chosen, priced, document-seeded — survives being read as facts and written back; every content transition applies forward to its after-state and backwards to its before-state exactly; what the solver derives is in no delta; a batch that changed nothing has an empty one; a reconciliation moves the mark of the clause it answers and no other; two clauses that say the same thing stay two clauses; the register comes back in the order the document was read in; and a fact nothing rebuilds raises rather than being dropped.

*The store*, in `agent/tests/test_workspace_store.py`: an entry per write, under its own name, with the conversation that caused it; a no-op batch recorded and not reversible; a fact-less entry landing without touching the configuration; the cursor walking past one, and refusing without marking anything when a log holds nothing else; a decline moving the record without deciding which conversation the workspace opens on, and stranding no redo tail; the reach refused as a different thing from the end of the log; the cursor moving both ways with the entries staying; a new action abandoning the redo tail and keeping the record; the reach refusing an eleventh step while the entries beyond it stay readable; retention trimming the log without moving the cursor; the log crossing conversations and surviving a round trip; and a record written before this feature opening with an empty log.

*The tools*, in `agent/tests/test_tools.py`: every content tool committing under its own name, including the two the document reaches; a name outside `CONTENT_ACTIONS` refused; the source recorded being whose move it was rather than who the facts are attributed to; a decline moving nothing and still landing; a decline mirroring the counts without changing them, with the redo still putting the change back; a walk that has used its whole reach refusing without claiming to be the start of the record; and undo naming the move it reversed and whose it was, then walking past a decline to the batch before it.

*The reconstruction*, in `agent/tests/test_configuration.py`: the five reversal cases the [undo design](../undo/design.md) records, now rebuilt from a delta rather than restored from a snapshot — the exact prior state with sources and candidate, statuses re-derived, reconciliation marks carried, a candidate that no longer extends its choices dropped, and a value the model no longer has refused.

*The boundary*, in `tests/couplings.test.ts`: every name an entry may carry is a tool the agent builds and a name the ontology enumerates; the two languages read one constructed log — a fact-less entry, abandoned entries, a walk in progress and more reversible entries than the reach allows — to the same pair of counts, and agree on the reach itself. `tests/workspaces.test.ts` covers the frontend predicate's own cases.

*Mutation-tested*, in both languages, in the form [one-gesture-one-action](../one-gesture-one-action/design.md) established. Each edit was applied to the source under test with the narrowest suite run against it, and every one was caught: a tool committing under another tool's name; the cursor spending a step on a fact-less entry; a new action truncating the tail instead of abandoning it; the reach not bounding the walk; retention not trimming; `attributed` dropped from the vocabulary; the candidate left out of a delta; the frontend counting entries that reverse nothing; the two languages disagreeing about the reach; a loggable name that is no action at all; a key added to an entry that nothing accounts for; a decline stamping the conversation it came from; a fact-less action stranding the redo tail; the reach answered as the start of the record; and a reversal raising while describing a requirement the model dropped.

`uv run pytest`, 283 passing. `npm test`, 292 across the two projects. `npm run typecheck` clean.

*The conversation checks*, `uv run --env-file ../.env pytest -m scenario`, all five. The first sweep failed two, and only one of them was this change: `comparing_agreements` asserted on `aside["history"]["past"]`, a harness read of the old shape that no offline check sees. It now reads the draft's log and names the actions in its failure detail. The other, `tender_as_entrance`, failed on the agent missing one clause of the document — `installation`, which is what the scenario's over-constrained assertion turns on — and passed on a re-run. It is the argument extraction of `ingest_rfq`, which this change does not touch; the only prompt edit was to the undo bullet. Recorded rather than dismissed: the tender scenario has now failed once on a clause-reading assertion, where the flake previously seen was in `needs-not-nomenclature`. `compare_refs.py` would not settle it either, because `agent/main.py` already carried uncommitted prompt work from earlier sessions, so neither arm would isolate this change's edit.

*Run in the app* against a live agent (constitution #9), 2026-08-21, which is the only way to see the canvas chrome. A fresh elevator with no control offered → a prose turn recording four choices and the agent filling four more, two entries in the log with the right sources, and Undo appearing → undo reversing the agent's batch alone, leaving the customer's four and turning the filled values into solver-forced ones, with the reply naming the move: *I've undone the assistant's last recording* → redo putting it back and the Redo control going → a decline typed in prose landing a fact-less entry and offering no reversal of itself → undo after it walking past the decline to the agent's batch, marking both entries reversed and reversing only the one with facts → a cold reload offering both controls, which is the frontend computing the counts from the record rather than from the mirror. The two exceptions the console reports are the composer defect recorded under *Known defect* in the [chat-pane design](../chat-pane/design.md), raised from `@copilotkit/react-core`; no hydration warning appeared. The pass predates the rule that a fact-less entry strands no redo tail, and did not reach it — there was no redo tail standing when the decline landed — so what it saw is what the code still does; that rule is covered offline in both the store and the tools.

## Known gaps

- *The sentence the agent writes is asserted by nothing.* The criterion that a reversal names the action and its source is met by the tool message, which `test_tools.py` asserts, and the agent's own sentence is prose — which the conversation checks deliberately never assert ([conversation-checks](../conversation-checks/requirements.md)). The prompt's State bullet asks for it and the tool message leads with it, which is the mechanism half; the prompt half is a request, as [one-gesture-one-action](../one-gesture-one-action/design.md) records.
- *A tool that commits without joining `CONTENT_ACTIONS` raises at its first call.* Loud rather than silent, and caught by `test_tools.py` only where the new tool joins the list that test drives. Nothing derives the set of committing tools structurally, because nothing in the runtime says which tool is executing.
- *The store is no longer indifferent to a configuration's shape.* It reads one as facts to compute the delta, so a caller passing something configuration-shaped but not a configuration now raises where it used to persist. Every caller is a tool, and the change surfaced only in a test that took the shortcut.
- *A delta computed at the door can absorb another conversation's change.* The store diffs the incoming configuration against what it holds, and a tool builds that configuration from agent state which may be a write behind ([agreement-workspace](../agreement-workspace/design.md), last write wins). The reversal stays exact — undo returns the store's own prior state — but the entry records the other conversation's change under this tool's name and source, so a later reading can name more terms than the customer touched. Narration, never a wrong restore, and the alternative is each tool computing its own delta, which decision 2 rejects for a stronger reason.
- *Retention counts entries, and the two kinds of entry do not cost the same.* `_append` trims to `LOG_RETENTION` whether an entry is reversible or not, while `HISTORY_DEPTH` counts only reversible ones. So an entry that reverses nothing consumes retention a reversible entry needs, and decision 5's reasoning — fifty entries is a record of the negotiation — assumes entries arrive roughly one per move of it. `keep_as_is` is the only fact-less action today and is rare enough that the gap is latent. It stops being latent as soon as a second one is common: the [code of conduct](../code-of-conduct/requirements.md) proposes recording each citation the agent gives, and `agent-tools` measures roughly seventy unavailable options on a filled agreement, which would evict every content entry undo walks. The fix is for retention to count the two kinds separately, or for fact-less entries to live outside this log; neither is in this change.
- *A workspace-level trace* is still absent: fork, switch, discard and naming rearrange drafts and are recorded nowhere. Out of scope in the [requirements](requirements.md), and unchanged by this.
