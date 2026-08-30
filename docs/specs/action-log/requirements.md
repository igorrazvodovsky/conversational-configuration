# Action log: the record holds moves, not only states

Status: approved 2026-08-21 and implemented ([design](design.md)). Sequenced after [one-gesture-one-action](../one-gesture-one-action/requirements.md), which settles which tool a dispatched sentence reaches before the log starts recording tool names.

The durable record is state plus an undo history of whole states. A draft holds its configuration and, beside it, ten snapshots of what the configuration was before each applied batch. Nothing anywhere records what happened. `undo_change` describes what it reversed by diffing the state it left against the state it restored, so the record can say a value moved and cannot say which action moved it, who made it, or which rule forced the part nobody chose ([ontology finding 3](../ontology-of-phenomena/ontology.md)). `attributed` survives only for a value that is still current. A declined change leaves nothing at all, because `keep_as_is` writes nothing (finding 4).

This feature replaces the snapshot history with the record Meng et al. call a governed trace: a per-draft, append-only log of typed actions over named facts, each entry carrying the action, its participants, the facts it asserted and the facts it retracted. Undo and redo walk that log instead of a stack of states. The vocabulary the entries are written in is the one the [ontology](../ontology-of-phenomena/ontology.md) already enumerates, which is what makes this the next adoption step rather than a new structure to name.

*The objection this answers.* The [undo requirements](../undo/requirements.md) considered and rejected a move log: "a log of inverse operations would need an inverse per tool, where a snapshot needs one hook at the store's single write-through point". That argument holds against inverse operations and not against a fact delta. Inversion is generic — swap `asserted` and `retracted` — so no tool needs an inverse, and the delta is computed by diffing the incoming configuration against the stored one at the same single write point that takes today's snapshot. What each tool has to add is its own name.

*What it costs to keep.* Measured over the twenty-eight workspaces in a local store: on the longest history, seven entries of fact deltas against six snapshots is 3.8 KB against 30 KB, because a delta grows with what changed and a snapshot grows with the size of the agreement. On short histories a delta log is slightly larger, since a fact triple is more verbose than a key. Retention past ten entries is therefore affordable, and reversibility and retention become two numbers instead of one.

Serves discovery principle [the agent proposes and the user decides](../../discovery/principles/agent-proposes-user-decides.md), whose words are that *every action it takes is visible on the canvas and can be undone* — today the canvas shows the state each action left, and the action itself is nowhere. Tests the assertion [the canvas is the durable locus of state](../../discovery/assertions/canvas-is-the-durable-state.md) where it is weakest: that assertion fails when users scroll the transcript to check what was decided, and the transcript is the only place a decision's history exists.

## Scope decisions

- *The trace replaces the snapshot history rather than joining it.* Two histories on one draft is the shape the ontology exists to catch, and finding 3's prize only lands if the log is what undo walks.
- *Append-only, with a cursor.* Undo moves a per-draft cursor back and redo moves it forward; a new content action moves the cursor to the head and leaves what it passed marked reversed rather than truncating it. Today's `future` stack destroys that record. The undo requirements' bound survives as a limit on how far the cursor may walk, and retention becomes its own number.
- *Content actions only.* The trace is per draft, and fork, switch and discard rearrange drafts rather than change one — the position the ontology already takes. A workspace-level trace is a known gap, not a second record on a draft.
- *An action that asserts nothing still lands.* `keep_as_is` is an occurrence whose whole content is that it occurred, which the paper admits and this record cannot hold. It gains a trace entry and no facts, which needs a write path that appends without touching the configuration — today it deliberately routes through `_reply` for exactly that reason.
- *Queries stay out.* `ask_choices` changes no state and writes nothing, and giving a query a write path would collapse the distinction the ontology settled. Finding 5 — a question put and unanswered is not a fact — becomes reachable and stays open.

## Stories

- As a customer undoing, I am told what move is being reversed and who made it — "your revision of the rated speed", "the values the agent filled after it" — rather than a description of the difference it made.
- As a returning operator, I can ask what happened to this agreement and get the moves in order, from the record rather than by scrolling a transcript that may have been deleted.
- As the person comparing two checkouts of this repo, a run is a sequence of named actions, so two arms diverge at an action or they do not, instead of being compared assertion by assertion.
- As the person adding a tool, the name it commits under is the ontology's name for it, and a check says so.

## Acceptance criteria

The entry:

- GIVEN any committed mutating tool call, WHEN it commits, THEN one entry is appended to the current draft's log, carrying the action's name, its participants, the facts asserted, the facts retracted, the conversation that caused it and a timestamp. One tool call is one entry, per the ontology's settlement that a batch is one action.
- GIVEN an entry, THEN its facts are named by the ontology's relations — `chose`, `attributed`, `reconciled`, the candidate facts — never by the store's key shapes, so that an entry read alone says what happened.
- GIVEN the set of action names any entry can carry, THEN every one is a name the ontology enumerates, asserted by an offline check. A tool added without being named there fails a run.
- GIVEN `keep_as_is`, WHEN it is called, THEN it appends an entry asserting and retracting nothing, and the configuration is untouched.

Reversal:

- GIVEN an applied batch, WHEN the customer undoes, THEN the entry's asserted facts are retracted and its retracted facts re-asserted, statuses re-derived by the solver, and the agreement returns to its exact pre-batch state — every criterion of the [undo requirements](../undo/requirements.md) holds unchanged, including provenance, the candidate and reconciliation marks.
- GIVEN a reversal, THEN the agent's reply names the action reversed and its source, where today it names the effect. This is what finding 3 asks for and the only customer-visible change in this feature.
- GIVEN repeated undo and redo, THEN the cursor walks and the entries it passes stay in the log. GIVEN a new content action after an undo, THEN the passed entries are no longer reachable by redo and are still readable in the log.
- GIVEN a restored fact set the current product model no longer admits, THEN the reversal is refused and the agreement stays as it was, exactly as a snapshot restore is refused today.

The record:

- GIVEN a draft, THEN its log is readable by hand in the workspace JSON, and retention is a bound of its own, separate from how far undo may walk.
- GIVEN a workspace written before this feature, WHEN it is read, THEN it opens with an empty log and its snapshots lapse. Converting them would mean naming the action behind a state, which is provenance the record does not have — the argument `_adapt` already makes for dropped frames.
- GIVEN the counts the canvas renders its undo and redo controls from, THEN they are computed from the cursor and the affordance is unchanged.

## Relationship to other specs

- [undo](../undo/requirements.md): its scope decision that history is per-batch snapshots rather than a move log is superseded, and reconciled in the same change. Every other criterion of that spec survives, and its known gap about a stale counts mirror is untouched.
- [ontology-of-phenomena](../ontology-of-phenomena/requirements.md): findings 3 and 4 are retired. Finding 5 is restated as reachable and still open. The out-of-scope entry naming an action log is discharged.
- [conversation-checks](../conversation-checks/requirements.md): `compare_refs.py` gains a structural comparison, and only forward — both arms need the trace, so a ref predating this change yields nothing new.
- [open-points](../open-points/requirements.md), a draft spec: it derives open points from the workspace record and inherits finding 5's limit. The trace does not lift it.
- [choice-provenance](../choice-provenance/requirements.md), a draft spec: quotes are facts on `(Draft, Variable)` and ride the deltas like any other.

## Out of scope

- *Reactions.* Stating constitution #1, #5 and #6 as rules over the trace is the step after this one and needs the trace first. It is now specified, as the [code of conduct](../code-of-conduct/requirements.md).
- *Concepts.* Partitioning the actions is deferred, and this feature adds no reason to revisit that.
- *A workspace-level trace* covering fork, switch, discard and naming.
- *Selective undo*, branching history and a visible timeline, all still out under the undo spec.
- *Logging queries*, and with them a fact for a question already put.
