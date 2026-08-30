# Document clauses: one kind of thing, with identity

Status: implemented ([design](design.md)). It repairs findings 6, 7, 9 and 10 of the [ontology](../ontology-of-phenomena/ontology.md).

The customer's requirements document arrives as clauses, and the record held them as two lists. `requirements` held one entry per clause that mapped to a product variable, `unmapped` one per clause no variable carried, and ingestion *demoted* an entry from the first list to the second when the extraction named a variable or a value the model does not declare. Neither entry had identity: a requirement was addressed by the variable it bears on, so `reconcile_requirement` marked every clause on that variable together, including a clause the agreement already met. And a third kind of clause existed that neither list could hold — one the document explicitly leaves to us ("open to proposal", "state your assumption") — where a product variable does carry the clause but the document asks nothing of it. The agent was told not to map it, so no requirement came into existence and it joined no unmapped list either. It survived in the frozen document text and in nothing that could be addressed, while the same prompt paragraph asked the agent to raise it later.

Those were findings 6, 7 and 9 of the [ontology of phenomena](../ontology-of-phenomena/ontology.md), and one shape repairs all three. A clause is one kind of individual with identity, and the two facts the ontology already names are optional on it:

| A clause | `carries(Clause, Variable)` | `requires(Clause, Variable, Option)` |
|---|---|---|
| that states a value of a term the model has | yes | yes |
| that no product variable carries | no | no |
| that leaves the decision to us | yes | no |

Finding 10 was the same territory on the agent's side. The prompt sorted a document's clauses by two rules — one for outcome terms, one for a document that specifies hardware directly — and the model's `safety` group was named by neither, so a clause about rescue operation or firefighters' operation fell under no rule at all while the sheet filed it in the collapsed hardware schedules.

Serves discovery assertion [an agreement that carries its open points can be resumed without rereading the conversation](../../discovery/assertions/open-points-carried-by-the-document.md): a clause the document leaves to us is a question someone still has to answer, and it is the one the assertion's own boundary test admits most clearly, since the document asked it rather than the interface wanting a blank filled. Serves discovery assertion [the representation of the agreement selects the user's moves](../../discovery/assertions/representation-selects-moves.md), because a clause with no identity is a clause the document cannot offer a move on, and the register's rows are where the customer objects and corrects. Constrained by [every refusal names the rules that caused it](../../discovery/principles/refusals-name-their-rules.md): a clause that asks nothing can produce no deviation and no reason, and must not enter the register as though it had.

## Stories

- As a delivery lead whose tender leaves the contract term to the supplier, that clause is on the agreement as something still to answer, rather than as a requirement I never made or a line that exists only in the pasted text.
- As a delivery lead whose tender asks two different speeds in two clauses, answering the deviation answers the clause that deviates, and the clause the agreement already meets is not marked waived along with it.
- As a delivery lead whose tender states a firefighters' lift obligation, the agent answers it as the obligation it is, rather than asking what the figure is there to achieve or falling under no rule and being answered arbitrarily.
- As the person reading the record, a clause the extraction could not map is the same kind of thing as one it could, carrying fewer facts, so nothing has to be demoted between lists and nothing is lost by being unmappable.

## Acceptance criteria

The record:

- GIVEN an ingested document, THEN its clauses are one list, each clause carrying an identity minted at ingestion, and no clause moves between lists at any point. What distinguishes the kinds is which facts a clause carries, per the table above.
- GIVEN a clause that names a term and a value the model declares, THEN it seeds, deviates, registers and reconciles exactly as a requirement did before this change, which alters no behavior of the mapped case beyond where its mark lands.
- GIVEN a clause no product variable carries, THEN it keeps its clause number, its quote and the note saying why nothing carries it, and is reported to the agent as it was before.
- GIVEN a clause the document leaves to us, THEN it is recorded carrying the variable it bears on and no value; it seeds no choice, produces no deviation, and enters the register as no row. It is reported to the agent at ingestion as a clause to raise, and it appears on the agreement beside the term it bears on, in the presentation the register already uses on that layer rather than as a new surface.
- GIVEN an extraction that names a variable or a value the model does not declare, THEN the clause stays one clause and loses only the facts the model cannot carry, with the note recording what could not be mapped. Nothing is silently dropped, which is what the [rfq-reconciliation spec](../rfq-reconciliation/requirements.md) already requires of the two-list shape.
- GIVEN a workspace record written before this change, WHEN it is read, THEN its two lists are lifted into one list of clauses at read time and written back in the new shape by that same read, with identities minted and no fact synthesized that the old record does not state. Its log entries are the exception, and they lapse: an entry stating a clause's facts without an identity cannot be converted without inventing the identity, which is the rule the store's adapter already follows for frames and snapshots.
- GIVEN a clause's identity, THEN it is minted once and persists: two reads of one record return the same identities, and no door a configuration arrives through mints a second set for a document the record already holds. An identity that changed per read would make the store diff one document against another and log a rewrite of the whole document on the next ordinary edit.

Identity, and what it buys:

- GIVEN a variable more than one clause bears on, WHEN a reconciliation move is made on that variable, THEN each clause is marked by what the move does to that clause: a clause whose requested value is where the agreement lands stays unanswered because it has nothing to answer, and a clause whose value differs takes the move's mark. Before this change every clause on the variable took the same mark, so accepting an offered value marked a clause the agreement meets as waived.
- GIVEN that per-clause marking, THEN the reconciliation *move* is still one answer to one disagreement on one variable, and settlement 4 of the ontology is unchanged. What gains a per-clause address is the mark, not the gesture.
- GIVEN the deviation register, THEN each row names the clause it comes from, as it always has, and rows are stable across reconciliation because a clause's identity does not change. A clause that asks for nothing is in no row, so the canvas — which routes a click by whether the term has one — edits such a term rather than reconciling it.

The agent:

- GIVEN a clause the document leaves to us, THEN the prompt tells the agent to record it as a clause carrying its variable and no value, rather than to leave it unrecorded, and the paragraph that asks the agent to raise it afterwards names the record it can raise it from.
- GIVEN a group of the product model, THEN exactly one rule of the prompt's sort covers a clause about it, and the agreement document's layer for that group agrees with the rule that covers it. `safety` was the group in neither rule; the sorting and the layering are settled together or they disagree again the next time either moves.
- GIVEN the word *gap*, THEN the prompt, the tools and the specs use it for at most one phenomenon. It named two: the variables ingestion reports as still open, which the ontology calls `undecided`, and the clause left to us, which had no name because it had no record.

Reconciliation with the ontology:

- GIVEN this change lands, THEN the [ontology](../ontology-of-phenomena/ontology.md) is reconciled in the same session under constitution #15: the Clause's identity row, the `ingest_rfq` and `reconcile_requirement` signatures, and findings 6, 7, 9 and 10 marked repaired in place, keeping their numbers because the others are cited by theirs.
- GIVEN the checks, THEN `tests/couplings.test.ts` continues to account for every key of the durable record, and the agent's half of the shared contract is what the frontend types are asserted against.

## What it had to settle

Three questions were named unsettled at approval, so approving these requirements decided none of them. Each was answered in the [design](design.md) and is recorded here as answered:

- *Where the `safety` group belongs* — an outcome term, in the prompt's sorting and in `LAYER_OF_GROUP`, which widens the stage-1 boundary the [rfq-reconciliation spec](../rfq-reconciliation/requirements.md) draws by one group. Extending the prompt's hardware rule instead would have had the agent ask what a firefighters' lift is there to achieve, which is a question the customer has no answer to.
- *What a clause left to us is called* — *left to us*, in the prompt, in the tool's report and on the sheet. The word it replaces is *gap*, which named two phenomena and now names neither.
- *Whether the clause list keeps `requirements` as its key* — it does not; the key is `clauses`, and a record written in the old shape is lifted when it is read.

## Out of scope

- *A per-clause reconciliation gesture.* Identity makes one expressible, and the card grammar and the prompt would both have to teach it. The finding's cost is paid by the mark landing correctly; a second gesture on the sheet is a separate change with its own evidence.
- *Finding 5*, a question the agent has put and nobody answered, which the [code of conduct](../code-of-conduct/requirements.md) claims and gives a mechanism.
- *Finding 8*, the discretionary `D`-rules the product model does not declare, which is a change to `elevator.json` and to what the solver names, and which the code of conduct already leaves standing alone.
- *Finding 12*, a person individual, which the [phase plan](../../discovery/phase-plan.md) carries as unserved territory with no artifact anywhere.
- *Finding 2*, the sheet edit and the reconciliation meaning different things to the record, which the [ontology design](../ontology-of-phenomena/design.md) records as a deliberate decision and which needs readers rather than a repair.
- *Prescriptive hardware RFQs*, stage two of the [rfq-reconciliation spec](../rfq-reconciliation/requirements.md). This change settles which rule of the prompt covers a group; it does not build the upward translation.
- *Renaming anything persisted beyond the `rfq` block's own keys*, on the terms constitution #15 already sets.
