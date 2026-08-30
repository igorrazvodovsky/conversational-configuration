# The ontology

The enumeration itself: every individual, value, action and fact of the prototype as built. Read it before naming a happening in a spec, a prompt paragraph, a tool docstring, a card sentence or a check, and reconcile it here in the same session whenever the code gains or loses one (constitution #15).

*The paper* referred to throughout is Meng et al., [*Making Software Meaningful*](https://arxiv.org/abs/2606.11051); the local copy is in the source vault, at `Dropbox/PARA/3 Resources/Papers/pdfs/2606.11051v1.pdf`. Sections 4.1 to 4.3 are what this document implements, and 4.4 to 4.5 are what it defers.

Names are the ones the code already spends. Where a happening has a tool, the tool's name is its name — tool names ride in thread checkpoints and renaming them breaks resumption, and a vocabulary whose first act is a rename is a vocabulary nobody adopts. Where a happening has no tool, it is named here.

## Individuals

An individual carries identity and nothing else. It is matched, never interpreted, and holds no attributes: everything said about it is a fact relating it to a value or to another individual. The identity is *persistent*: it is minted once, when the individual comes into existence, and every later reading of the same individual returns the same one. An identity recomputed per read, or derived from the values the individual is related to, is neither — it would be comparable and decomposable, which the paper's §4.1 note 7 says an identity is not.

*Declared by the product model, and fixed.* `agent/src/product_model/elevator.json` is the population that pre-exists every run, which is what constitution #2 means by product knowledge as declarative data.

| Individual | Identity | Population |
|---|---|---|
| Variable | its name — `rated_load` | 35 variables in 8 groups |
| Option | its code within a variable — `kg2000` | one enumeration per variable |
| Rule | its id — `R17` | 54 rules, all `R`-prefixed |

*Created at runtime, and durable.* Held in `agent/data/workspaces/*.json` by `agent/src/workspace_store.py`.

| Individual | Identity | Comes into existence | Ceases |
|---|---|---|---|
| Workspace | `record.id`, a uuid | `create_workspace`, from the workspace list | `delete_workspace`, from the list or from the head of the agreement |
| Draft | `draft.id`, a uuid | with its workspace, or by `fork_draft` | `discard_draft` |
| Conversation | its LangGraph thread id | `register_thread`, on its first message | never — no path deletes a thread, and deleting its workspace does not either (finding 13) |
| Clause | `clause.id`, a uuid, minted once and persisted | `ingest_rfq` | undoing that ingestion; reconciling one never does, since a reconciled clause stays listed |
| Entry | `entry.id`, a uuid | any content action, in the draft's log | retention, oldest first |

Every ceasing named in that table is a ceasing *within* a workspace, and the workspace's own ends all of them at once: a Draft, an Entry and a Clause live inside the record, so `delete_workspace` destroys the population of all three without visiting any of them. A Conversation is the exception, and the one thing a workspace holds that is not inside it.

*Ephemeral.* A Card is identified by the tool-call id that produced it and lives in the thread checkpoint. It is what makes a tool result clickable, and it is the only individual whose whole lifecycle is a rendering concern.

Not individuals, though the code holds them as records: a *choice*, which is two facts on `(Draft, Variable)` — see settlement 1; and a *candidate*, which is a bundle of derived facts on a Draft — see settlement 2. An Entry is an individual, because a draft's record holds what was done to it rather than what it then was: two actions that leave the same agreement are two entries.

## Values

Interpreted by structure or by comparison, and never identified.

| Value | Where |
|---|---|
| EUR per month | option prices, candidate price, budget cap. The key is `price` and it means monthly; see *Names already spent* in the [requirements](requirements.md) |
| kg CO₂e | embodied, use-phase and lifetime totals |
| Label | the model's own wording for a variable, an option or a rule. Quoted, never paraphrased (constitution #6) |
| Name | a workspace's, a draft's. Workspaces are born without one |
| Citation, Quote, Note | the number the document gives a clause, its words, and why nothing carries it. The citation is carried by the record's `clause` key |
| Document text | the RFQ as pasted, held on the workspace |
| Timestamp | ISO 8601, on workspaces, drafts and conversations |
| Source | `user`, `agent`, `document` |
| Action | the name of an action an entry records — one of those enumerated under Actions, and no other |
| Standing | `applied`, `reversed`, `abandoned` — where the cursor stands relative to an entry |
| Objective | `price`, `co2` |
| Mark | `pending`, `waived`, `revised` |
| Status | `chosen`, `forced`, `invalid`, `open` — derived |
| Group | `agreement`, `context`, `performance`, `platform`, `dimensions`, `doors`, `safety`, `cabin` |
| Layer | `recitals`, `terms`, `schedules` — which layer of the document an editor is open on |

## Facts

A fact relates individuals to each other and to values. Three classes, and the distinction between the first two is the one constitution #1 rests on.

### Asserted facts

Added and retracted by actions, and nothing else may write them.

| Fact | Reading |
|---|---|
| `chose(Draft, Variable, Option)` | the agreement records this value on this term |
| `attributed(Draft, Variable, Source)` | who put it there |
| `draft_of(Draft, Workspace)`, `current(Workspace, Draft)`, `forked_from(Draft, Draft)` | the workspace's drafts and which one every action acts on |
| `named(Workspace, Name)`, `named(Draft, Name)` | |
| `belongs_to(Conversation, Workspace)`, `moved_at(Conversation, Timestamp)` | which conversation a workspace reopens on |
| `requires(Clause, Variable, Option)`, `carries(Clause, Variable)` | what the document asks. Which of the two a clause carries is what kind of clause it is: both is a requirement, `carries` alone is a clause left to us, neither is a clause no variable carries ([document-clauses](../document-clauses/design.md)) |
| `cites(Clause, Citation)`, `quote(Clause, Quote)`, `note(Clause, Note)` | immutable after ingestion |
| `reconciled(Clause, Mark)` | the only fact of a clause any action may move, and only a clause that requires something takes one |
| `budget_cap(Draft, EUR)` | reported against the candidate price as arithmetic, never as a constraint |
| `document_text(Workspace, Text)`, `ingested_at(Workspace, Timestamp)` | |
| `logged(Draft, Position, Entry)` | every action taken on this draft, oldest first |
| `acted(Entry, Action)`, `moved_by(Entry, Source)` | which action occurred, and whose move it was |
| `during(Entry, Conversation)`, `occurred_at(Entry, Timestamp)` | where it came from and when |
| `asserted(Entry, Fact)`, `retracted(Entry, Fact)` | the facts the action added and removed. Inverting the pair is what a reversal is |
| `standing(Entry, Standing)` | where the cursor stands relative to it |

### Derived facts

Computed by the solver from the asserted facts, and true whenever those are. No action asserts or retracts one, and any action that moves `chose` moves all of them. This class is an extension to the paper, which has actions assert every fact; naming it is what keeps constitution #1 sayable, because *the solver is the only thing that may write this class* is a sentence about a class of facts.

| Fact | Reading |
|---|---|
| `status(Draft, Variable, Option, Status)` | whether this option is chosen, forced, ruled out or open. Carried in state as `statuses` |
| `separates(Draft, Variable, Option, Rule)` | why an option cannot be taken *as the draft stands*. Computed with that variable's own choice lifted, so it answers the swap being weighed. Carried in state as `unavailable`, the variable → option → rules map ([agent-tools](../agent-tools/design.md)). It is not a fact about what may be asked for: every control that draws a separated option leaves it clickable, and asking for one is an ordinary `revises` that comes back with repairs (constitution #17) |
| `undecided(Draft, Variable)` | neither chosen nor forced |
| `candidate_value(Draft, Variable, Option)`, `candidate_price(Draft, EUR)`, `candidate_footprint(Draft, kg, kg, kg)`, `candidate_objective(Draft, Objective)` | the last completion proposed, and which objective it optimised |

The candidate is the class's exception and the reason it needs stating: `propose_completion` makes a derivation durable, and a later `chose` that diverges from it drops it. So a stored derived fact is discarded rather than recomputed, and the canvas shows a draft with no price until someone proposes again.

### Transient facts

Published per turn and held nowhere. The first two are what the agent reads beside the transcript, carried in the run's App Context block ([shared attention](../shared-attention/design.md)) and gone when the run ends. `inert` runs the other way: it is computed in the browser and shown to the customer, and no run ever sees it.

| Fact | Reading |
|---|---|
| `editing(Conversation, Variable, Layer)` | which value the operator has an editor open on. Attention, never an instruction |
| `stale(Conversation, Reason)` | the transcript predates the agreement, and why |
| `inert(Card, Reason)` | this card has been used, overtaken, or belongs to a superseded conversation |

## Actions

An action is an atomic occurrence with participants. *A batch is one action*: one tool call is one action is one entry in a draft's log, which is settlement 3.

### Agreement content

Each writes through to the current draft and lands one entry in its log, under its own name and with the facts it moved.

```
set_choices (choices: {(Variable, Option)}, source: Source) : (recorded, declined)
  requires  every Variable and Option declared by the model; and that no
            gesture opened the turn — a dispatched sentence is refused, and
            asserts nothing
  asserts   chose(current, v, o), attributed(current, v, source) — for the pairs
            that can hold with the rest; the remainder come back declined,
            each with the Rules that separate it
  retracts  the prior chose/attributed on those variables; the candidate, if a
            recorded pair diverges from it
```
*Partial.* A batch can half-land, which is what separates it from `revise_choices`. Reached by what the agent reads out of the customer's prose or proposes itself, where a collision between two values should not cost the customer the rest of what they said. No gesture reaches it ([one-gesture-one-action](../one-gesture-one-action/requirements.md)).

```
revise_choices (changes: {(Variable, Option)}, source: Source, drop: {Variable})
  requires  every Variable and Option declared; the changes hold with what is
            kept, or nothing happens
  asserts   chose/attributed for every change, atomically
  retracts  chose/attributed for every dropped variable; the candidate
```
*Total.* On conflict it asserts nothing and returns solver-computed repair options instead, ordered by how many existing choices they keep. Every gesture that sets a value reaches it, on a term already decided and on one that is not.

```
clear_choices (variables: {Variable})
  retracts  chose(current, v, _), attributed(current, v, _)
```

```
propose_completion (objective: Objective)
  requires  the current choices are satisfiable
  asserts   the candidate facts, pinning a derivation (see Derived facts)
```
The other objective is solved too, and the difference between them is reported without being stored.

```
ingest_rfq (clauses, document_text, budget_cap: EUR?)
  requires  the agreement has no document and no recorded choices — a
            document seeds a fresh elevator or none
  asserts   a Clause per clause of the document, with cites/quote; carries
            where a variable bears on it; requires and reconciled(_, pending)
            where it also states a value; note where the model cannot carry
            what the extraction named; chose/attributed with source=document
            for the largest subset of requirements that can hold together;
            budget_cap; document_text on the workspace; the candidate
```
Objective for the subset: fewest deviations, cheapest completion as tie-break.

```
reconcile_requirement (variable: Variable, move: accept|revise|open,
                       value: Option?)
  requires  the document states at least one requirement on this variable;
            accept further requires a value already offered on it, and one not
            every clause asks for — there is nothing to waive otherwise
  asserts   reconciled(c, Mark) for the Clauses on that variable the move
            answers — one disagreement, answered once, but the mark is a fact
            of a clause and a clause asking for the value the agreement lands
            on has nothing to answer ([document-clauses](../document-clauses/design.md)).
            accept marks the rest waived and asserts chose(current, v,
            offered), re-attributed to the customer; revise marks the rest
            revised and asserts chose(current, v, value) the way revise_choices
            does; open marks every clause on the variable pending and asserts
            nothing else
```
*Total* the way `revise_choices` is, and by the same code path: a revise that collides asserts nothing and comes back as repair options.

### Structural

Whole documents move; no entry is written, because rearranging drafts is not a change to any one of them.

```
fork_draft (name: Name) : (draft: Draft)
  asserts   the new Draft with a copy of the current draft's asserted facts,
            forked_from, and current(workspace, new)
```
```
switch_draft (name: Name)      moves current(workspace, _)
discard_draft (name: Name)     destroys a Draft; requires it is not current
name_workspace (name: Name)    asserts named(workspace, name)
```

### History

Neither writes an entry: a reversal moves the cursor over entries that are already there, so undoing and redoing one batch ten times leaves ten cursor moves and one entry.

```
undo_change ()  /  redo_change ()
  requires  an entry within reach whose delta is not empty
  asserts   that entry's retracted facts, after the solver has re-validated
            them
  retracts  its asserted facts
  moves     standing(e, _) for every entry the step passes, the fact-less ones
            walked over included
```
The log walked is the current draft's, read fresh from the store, so the action reversed is the last one taken on this agreement from any conversation. A later content action leaves what the cursor passed `abandoned` rather than destroying it, so what was tried and taken back stays readable.

```
keep_as_is ()
  asserts   nothing.  retracts  nothing.
  logs      an entry with no facts
```
An action whose entire content is that it occurred, which the paper admits and the record now holds. It exists to stop a declined change being answered with an undo, which would reverse the change *before* the one declined — and having no facts, it is no step back to anywhere, so the cursor walks past it rather than spending a step on it.

### Reached by no tool

```
create_workspace () : (workspace: Workspace)   POST /workspaces, from the list
rename_workspace (workspace, name: Name)       PATCH /workspaces/{id}, from the list
                                               or the agreement's own head
delete_workspace (workspace)                   DELETE /workspaces/{id}, from the list
                                               or the agreement's own head
register_thread (workspace, thread)            POST, on a conversation's first message
attach_rfq (workspace, text)                   inside ingest_rfq only
```
`rename_workspace` asserts `named(workspace, name)` — the same fact
`name_workspace` asserts, reached by the operator rather than by the agent. It
is the one fact in this vocabulary with two doors, and finding 14 says what
that costs.
`delete_workspace` destroys the Workspace and everything inside the record with
it, writes no entry, and is reached by no tool: a conversation cannot destroy
the agreement it is about. It is the only action with no undoing, because the
log a reversal walks is inside what it destroys.
Every write also stamps `moved_at` on the conversation that caused it. That is a side effect of the store's one door, not an action of its own.

## Queries

Queries change nothing. The paper admits them only as conditions on actions, and here they are what the agent reads before it speaks.

| Query | Returns |
|---|---|
| `get_configuration ()` | the current draft: choices with their sources, forced values, candidate, what is undecided, the deviation register, the budget line |
| `describe_product ()` | the declared population — every Variable, Option and Rule with its Label, price and CO₂e, plus the assessment assumptions. The only source for a footprint figure |
| `compare_drafts (a, b?)` | the differing rows of two drafts with both prices and both footprints. Requires a priced candidate on each |
| `ask_choices (variables, prompt)` | a card payload of currently valid options. See settlement 4 |

## Gestures

What the customer does, and the action it reaches. Every card click dispatches a structured user message the agent maps onto one atomic tool call, so the sentence *is* the interface, and its wording and the prompt's are one artifact ([agreement-document](../agreement-document/design.md)).

| Gesture | Sentence | Action | In the transcript |
|---|---|---|---|
| Pick from an in-chat control | `Set <term> to <value> (term=value)` | `revise_choices` | hidden |
| Edit a value on the sheet | `Canvas edit: Set …` | `revise_choices` | hidden |
| Answer a deviation on the sheet | `Reconcile deviation: accept the offered …`, `Reconcile deviation: change … to …`, `Reconcile deviation: leave … open` | `reconcile_requirement` | visible |
| Take a repair | `Apply repair: drop …; set …` | `revise_choices` | visible |
| Decline a repair | `Abandon the revision — keep the configuration as it is.` | `keep_as_is` | visible |
| Fork, switch, discard, compare | `Keep this draft and start another from it`, `Switch to draft "…"`, `Discard draft "…"`, `Compare draft "…" with the current one` | `fork_draft`, `switch_draft`, `discard_draft`, `compare_drafts` | visible |
| Undo, redo | `Undo the last change`, `Redo the undone change` | `undo_change`, `redo_change` | visible |
| Take a suggestion | ordinary prose | whatever the agent judges | visible |
| Type | ordinary prose | whatever the agent judges | visible |
| Open an editor | — | none; publishes `editing(...)` | — |
| Start an elevator | — | `create_workspace` | — |
| Rename an elevator | — | `rename_workspace` | — |
| Delete an elevator | — | `delete_workspace` | — |

The two hidden rows are the two sentences that only set a value, and they are hidden for one reason: the surface that dispatched each is showing what it did, so a row restating it would be the chat doing that surface's job ([agreement-document](../agreement-document/design.md)). They differ in what follows. A sheet edit is answered with silence and its wordless turn is hidden too; a pick is answered in words, and the tool row after one stays.

## What the enumeration settles

1. *A choice is two facts, not an individual.* Recording a second value for a variable replaces the first rather than creating a second thing, and the code keys choices by variable within a draft, so `(Draft, Variable)` is the address and `chose` and `attributed` are what is said at it. Consequence for the pending [choice-provenance spec](../choice-provenance/requirements.md): the customer's frozen words are a third fact on the same address — `grounded(Draft, Variable, Quote)` — which is why that spec is right that new words replace old ones. Words do not accumulate, because there is no individual for them to accumulate on.

2. *Solver output is a fact of its own class.* The paper's facts are asserted and retracted by actions; `status`, `separates`, `undecided` and the candidate are computed. Filing them as ordinary facts would make constitution #1 unsayable, because *the solver is the source of truth for validity* is a claim about which class of facts the agent may never write.

3. *A batch is one action.* Three things already agree on the unit: undo reverses the last batch, the card grammar dispatches one atomic tool call per message, and `parallel_tool_calls` is off in `agent/main.py`. The ontology adopts that unit, and the log records it — one tool call, one entry. Atomicity of *effect* is a separate matter, and the two content actions differ on it: `set_choices` can half-land and `revise_choices` cannot. Which of them a gesture reaches is settled by [one-gesture-one-action](../one-gesture-one-action/requirements.md), and it is always the total one.

4. *Asking is an action; `ask_choices` is the query that implements it.* Putting a question with its options to the customer is a happening they observe, and the card that carries it has identity, a lifetime and a staleness rule. But the tool changes no state, so no fact records that the question was asked. What follows is finding 5.

## Where the artifacts disagree

Findings, not repairs. Each repair is a change to a surface or a tool, with its own spec. A finding whose repair has landed keeps its number and says what repaired it, because the others are cited by number.

1. *Repaired.* One sentence reached two actions, `set_choices` or `revise_choices`, picked by the model, and the two differ in whether a conflict comes back as repair cards or as a dead end. Every `Set …` sentence now reaches `revise_choices`, decided term or not ([one-gesture-one-action](../one-gesture-one-action/design.md)). The entry keeps its number because the findings below are cited by theirs.

2. *One action, two standings in the record.* A sheet edit and a reconciliation are both a customer changing one value on the document. The first is hidden and answered with silence, the second is visible and confirmed, and the canvas picks between them *per variable* — a term the RFQ speaks to reconciles, every other one edits. The reasoning is recorded and deliberate ([agreement-document](../agreement-document/design.md), [rfq-reconciliation](../rfq-reconciliation/design.md)): bookkeeping against negotiation. Stated here it becomes a claim that can be tested — whether the customer experiences one click as two kinds of move — rather than a rule to be remembered.

3. *Repaired.* The history held states rather than actions: a snapshot was choices, candidate and requirements, and `undo_change` described what it reversed by diffing the state it left against the state it restored, so the record could say a value moved and not which action moved it or whose move that was. Each draft now keeps a log of typed actions over named facts, undo walks a cursor over it, and a reversal names the move and its source ([action-log](../action-log/design.md)). The entry keeps its number because the findings below are cited by theirs.

4. *Repaired.* A declined change left nothing behind: `keep_as_is` asserts nothing by design, so the fact that the customer considered a change and declined it existed only in the transcript, which is the ephemeral half of the system ([agreement-workspace](../agreement-workspace/design.md)). It now lands an entry with no facts, through a store door that cannot touch the configuration, and the cursor walks past it ([action-log](../action-log/design.md)). The same rule covers a batch that re-recorded what the agreement already held, which the snapshot history dropped for want of a way to hold an action that changed nothing.

5. *A question already put is not a fact.* Nothing records that `ask_choices` showed a control, so *what is still open* is derivable from what is undecided but not from what has been asked and left unanswered. The log does not lift this and was not meant to: a query changes no state, and giving one a write path would collapse the distinction settlement 4 draws ([action-log](../action-log/requirements.md)). What changed is that the limit is now reachable — a draft's record holds actions, so a question put is the one kind of happening it still cannot hold. The pending [open-points spec](../open-points/requirements.md) derives open points from the workspace record, and inherits it.

6. *Repaired.* Requirements had no identity: they were addressed by variable, so `reconcile_requirement` marked every clause bearing on one together, and a document asking two different values of one term had one clause waived that the agreement met. A clause is now an individual with a uuid, and a move marks the clauses it answers ([document-clauses](../document-clauses/design.md)). The move is still one answer to one disagreement on one variable — settlement 4 stands, and no gesture was added; what gained a per-clause address is the mark. The entry keeps its number because the findings below are cited by theirs.

7. *Repaired.* A mapped requirement and an unmapped clause were the same individual held in two lists, so `ingest_rfq` had to *demote* one it could not map from the first to the second. There is one list of clauses now, and mapping is which facts a clause gains rather than which list it is in, so nothing moves between kinds ([document-clauses](../document-clauses/design.md)).

8. *Half the agent's reasons have an individual to cite.* Constitution #6 asks discretionary defaults to trace to named `D`-rules the way refusals trace to `R`-rules. The model declares 54 rules, all `R`. The [product-model design](../product-model/design.md) records the absence as a standing gap; in this vocabulary it is sharper than a gap, because the agent is asked to cite an individual that does not exist.

9. *Repaired.* A clause the document left to the bidder was held nowhere: the prompt called it *a gap, not a requirement* and told the agent not to map it, so no individual came into existence for it and it joined no `unmapped` list either, because a variable did carry it. It survived in `document_text` and in nothing that could be addressed, while the same paragraph asked the agent to raise it afterwards. It is now a clause carrying `carries` and no `requires`, reported at ingestion and marked on the sheet beside its term ([document-clauses](../document-clauses/design.md)). *Gap* is retired as a name: what ingestion reports as still open is `undecided`, and this clause is one the document *leaves to us*. What is not repaired is that answering it leaves no mark, so the record cannot say whether it was raised — the shape of finding 5, and the substrate [open points](../open-points/requirements.md) still needs.

10. *Repaired.* The prompt sorted a document's clauses two ways — outcome terms it works from, hardware figures it derives and asks about — and `safety` was named by neither, so a clause about rescue or firefighters' operation fell under no rule while `layerOf` filed it in the collapsed hardware schedules. `safety` is now an outcome term in both artifacts: the prompt's outcome rule names it, with the instruction never to ask what a safety obligation is there to achieve, and `LAYER_OF_GROUP` puts the group in the operative terms ([document-clauses](../document-clauses/design.md), decision 5). All eight `Group` values are now accounted for on one side or the other.

11. *The durable individual answers to three names.* It is a `Workspace` in the store, in `name_workspace` and in the list the customer opens it from; "the agreement" throughout the prompt's Drafts and State sections; and "this elevator's entry" in `name_workspace`'s own docstring, which is the wording the agent reads at the moment it calls the tool. The three are one individual and nothing but the table above says so. Renaming is barred by names already spent — `workspace` is a store key and a tool name — so what the finding asks for is that the ontology stay the place the identity is stated, not that any of the three give way.

12. *Nobody is an individual.* The prototype has no `Customer`, `Operator` or `Approver`. `Source` is a *value* — `user`, `agent`, `document` — so `attributed(Draft, Variable, Source)` says a choice came from the customer's side and cannot say which customer, and `moved_by(Entry, Source)` says the same of a move. The paper takes the other position: the actors that perform actions are usually represented as individuals (§4.1, note 7). Nothing here can be a fact about a person, which is the ontological shape of a gap the [phase plan](../../discovery/phase-plan.md) already records from the job crossing — the approver has two shapes, internal and external, and no artifact anywhere, and delegation is served only on the agent's side of the boundary. Until the individual exists, the constitution's *the customer* in #4 and *the user* in #5 name nothing this document carries, and they stand as they are rather than being reworded onto `Source`, which would say something false.

13. *Deleting a workspace orphans its conversations.* The Conversation row above says a thread ceases never, and that stays true after `delete_workspace`: the LangGraph checkpoints of every conversation the workspace held survive it. What is destroyed is `belongs_to(Conversation, Workspace)`, so those threads exist and are reachable from nothing the app draws — the elevator list is the only door to a conversation, and the deleted elevator is not on it. This is the ephemeral half of the system outliving the durable half, which is the opposite of the order everything else here assumes. It is left as it is rather than repaired: the store has never owned thread storage ([agreement workspace](../agreement-workspace/design.md)), and reaching into LangGraph's checkpointer would be a second write path to a store the prototype otherwise only reads.

14. *One fact, two actions with different names.* `named(Workspace, Name)` is asserted by `name_workspace`, which the agent calls as identity emerges, and by `rename_workspace`, which the operator reaches from the list or the head of the agreement ([agreement workspace](../agreement-workspace/design.md)). Everywhere else here a fact has one action that writes it, and constitution #15 asks that the software name a happening once. Two names for one assertion is the cost of the two doors, and it is paid rather than repaired: both names are already spent — `name_workspace` rides in thread checkpoints, `rename_workspace` is the store call underneath both — so unifying them would be a migration to remove a duplication that no caller can observe. What keeps the pair honest is that they reach one store call, so neither can leave a name the other reads differently, and neither is authoritative over the other: last write wins, as everywhere in this prototype where two conversations touch one record.
