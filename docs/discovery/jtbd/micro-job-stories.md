# Micro-job stories

Status: desk-research hypothesis. Play: *Align Teams to Job Stories*, in Klement's form — `When [circumstance + job stage], I want to [micro-job], so I can [need]` — three to eight per design problem, with circumstances in enough detail to design from. Every story in [job-stories.md](job-stories.md) is decomposed here to that grain and crossed to the [move inventory](../models/Conversation%20moves.md), and the reverse crossing, of moves that no micro-job claims, follows the five stories. The scenario-scale stories do the roadmap play's work and keep it, and this layer sits beneath them.

Every circumstance here is hypothesized rather than observed, which is the standing constraint the [phase plan](../phase-plan.md) records. Each traces either to a phrase in the persona note it belongs to, or to elevator-industry practice already cited in the [research base](../../research/README.md), and a circumstance that traced to neither was cut. That permits using these as critique heuristics and walkthrough criteria. It forbids reading them as findings about the people named.

## How the tables read

*Purpose* is the operator-type tag from task-model practice. An epistemic move informs a decision and wants a reversible, low-commitment control, and a pragmatic move commits and wants a visible, attributable one.

*Moves that serve it* cites the inventory's own move names from [Conversation moves](../models/Conversation%20moves.md), between *User moves* and *Delegation moves*, and links the spec that implements each one.

*Verdict* is Served, Partial, Unserved or Split, and it reports what is built. A drafted spec or a drafted model that would change the verdict is named in the moves cell or in the finding, never in the verdict itself, because otherwise the five stories stop being comparable with each other.

One shape the four don't cover recurs, and it is finding 8's second half arriving in the table: a micro-job *served without a move*, by a projection of state or by state being restored. Neither is an event on the document, so neither has a row in the inventory to cite, and the job is answered all the same.

## Story 1 — needs, not nomenclature

A hospital wing is being planned by people who can state what the lift has to do and can't state a rated load. Personas: the [design specifier](persona-design-specifier.md), who embodies the articulation barrier, with the [delivery lead](persona-delivery-lead.md) beside them; job-map stages Define and Prepare, reaching into Confirm.

*Say what it must do without naming a part* (Define). When I can describe what the lift has to carry and who has to be able to use it alone, but not a rated load, a car code or a door width, I want to state that in the building's own terms and have it recorded as a commitment, so the specification starts from what I know rather than from what I would have to learn first.

*Get a dimension the structure can be poured around* (Define). When the shaft has to enter the structural drawing months before the lift is bought, and changing it later means breaking concrete, I want an envelope I can commit to now that survives the decisions still to come, so the building's design is not waiting on a purchase.

*Iterate without paying for each round* (Prepare). When the scheme changes every week and each earlier round of this cost a quotation request and a wait, I want every version priced as I state it, so exploring a variant costs a sentence rather than a procurement cycle.

*Hand over what I have no opinion about* (Prepare). When the cabin finishes belong to somebody else's discipline and I have a building to get through structural design, I want to hand that scope over and have it decided, so my attention stays on what only I can decide.

*Check what was chosen on my behalf* (Confirm). When I am the one who signs the specification and part of it was filled in for me, I want everything chosen on my behalf gathered as a set I can walk, so delegating a scope does not mean losing the last word over it.

*Know that what I approve is buildable* (Confirm). When the specification goes to a compliance check and to whoever funds it, I want each requirement to carry the rule that produced it, so approval rests on the rules rather than on my confidence in the tool.

*See the thing, not only the terms* (Prepare). When I am placing a lift in a lobby I am designing and the agreement gives me millimetres, I want to see the car as an object, so I can judge fit and design intent the way I judge everything else in the drawing.

| Micro-job | Purpose | Moves that serve it | Verdict |
| --- | --- | --- | --- |
| Say what it must do without naming a part | epistemic | *Describe the situation* → *translate situation into outcome terms* → *derive hardware*, the cascade [outcome-level elicitation works](../assertions/outcome-level-elicitation.md) claims ([service-agreement](../../specs/service-agreement/requirements.md)) | Served |
| Get a dimension the structure can be poured around | pragmatic | *Propose a complete candidate*; *fill forced values*; the solver greying out what an envelope makes unreachable | Partial — the envelope is valid and nothing marks it as committed; see finding 5 |
| Iterate without paying for each round | epistemic | *Revise by intent* and *set a value*, each answered by a priced whole ([always show a valid whole](../principles/always-show-a-valid-whole.md)); *fork and compare* to hold two rounds at once | Served |
| Hand over what I have no opinion about | pragmatic | *Delegate a scope* → *fill*, tagged *agent-chosen* with a reason | Partial — the handover and the tag work; the reason is composed rather than quoted, see finding 6 |
| Check what was chosen on my behalf | epistemic | *Review the agent's work*, specified in [Conversation moves](../models/Conversation%20moves.md), *Delegation moves*, as a filter to *agent-chosen*. A badge on every row of all three layers answers it one value at a time, and overriding one in a sentence works ([the agent proposes and the user decides](../principles/agent-proposes-user-decides.md)); nothing gathers them | Unserved as a pass, served row by row — see finding 6 |
| Know that what I approve is buildable | epistemic | *Explain*, *ask why* and *flag a dead end*, quoting the model's own rule labels wherever a rule exists — in the editor, the in-chat cards, the deviation mark and the agent's answer alike ([every refusal names the rules that caused it](../principles/refusals-name-their-rules.md), repaired 2026-08-20) | Partial — every value the rules force carries its rule, and the agent's discretionary picks are the one class with no rule to carry; see finding 6 |
| See the thing, not only the terms | epistemic | None. The render answers it ([visual-configuration](../../specs/visual-configuration/design.md)), and a projection is not an event on the document | Served without a move — see finding 8 |

## Story 2 — mid-contract revision

Tenant complaints about wait times rise after the building's use changed, and the operator wants to fix it without a capital project. Persona: [building operator](persona-building-operator.md); job-map stages Monitor and Modify, reaching into Confirm.

*Tell a service failure from an outgrown agreement* (Monitor). When complaints about morning wait times have accumulated for weeks and I cannot tell whether the machine is underperforming what was promised or the building has outgrown what we agreed, I want to hold the agreement's promised terms against how the building is actually used, so I can know which conversation to open — a complaint or a revision.

*Reach the governing term from the symptom* (Modify). When I know the symptom — queues at the morning peak — but not which term of the agreement governs it, and the catalogue's names mean nothing to me, I want to state the symptom in my own words and be shown the term it implicates, so I can start the revision without first learning elevator vocabulary.

*See the whole consequence before committing* (Modify). When I have found the term to change but the agreement is mid-term and I fear what one change drags along, I want the full consequence shown at the moment I propose the change, with nothing applied until I accept, so I can decide once rather than discover the damage in stages.

*Judge whether the fix is worth it* (Modify). When the fix raises the monthly fee and my budget answers to an opex review, I want the price and footprint deltas held beside what we pay now, so I can weigh the fix against the complaint it answers before I champion it.

*Explore without giving up what stands* (Modify). When I want to see what a heavier-traffic version of the agreement looks like while the one in force must stay untouched, I want a second version to work on beside the first, so exploring costs nothing and commits nothing.

*Carry the decision to whoever signs* (Confirm). When the revision needs sign-off from a board or an owner who was not in the conversation and will not open the tool, I want the change, its reason and both deltas in a form I can take to them, so approval does not require replaying the negotiation in a meeting.

*Apply it once, attributably* (Modify). When we agree on the change, I want it applied as one batch with who chose each value recorded, so that at renewal nobody re-litigates what was decided or by whom.

*Confirm the rest still stands* (Monitor). When the change has been applied to an agreement whose other terms I have not thought about in months, I want to see exactly what moved and that nothing else did, so I can close the matter without proofreading the whole document.

| Micro-job                                         | Purpose                                     | Moves that serve it                                                                                                                                          | Verdict                                                                                          |
| ------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Tell a service failure from an outgrown agreement | epistemic                                   | *Ask why* explains why a term reads as it does; *describe the situation* translates new usage. Nothing holds promise against actual performance              | Split — see finding 1                                                                            |
| Reach the governing term from the symptom         | epistemic                                   | *Describe the situation*; *revise by intent* (the suggested-moves family asks its question for the operator)                                                 | Served                                                                                           |
| See the whole consequence before committing       | epistemic, then pragmatic on accept         | *Revise by intent* → *propose repairs on a ripple*; refusals carry their rules                                                                               | Served — the [ripple assertion](../assertions/ripple-at-the-moment-of-revision.md)'s home ground |
| Judge whether the fix is worth it                 | epistemic                                   | *Propose a complete candidate* (both objectives, the disclosure teaser); the trade-off pair; *fork and compare*                                              | Served                                                                                           |
| Explore without giving up what stands             | epistemic in intent, pragmatic in mechanics | Fork, switch, compare, discard ([parallel-drafts](../../specs/parallel-drafts/design.md))                                                                    | Served                                                                                           |
| Carry the decision to whoever signs               | epistemic                                   | None. The comparison card lives in a transcript; the document states the current position, not the pending change as an argued case; nothing leaves the tool | Unserved                                                                                         |
| Apply it once, attributably                       | pragmatic                                   | *Revise* as one atomic batch; provenance tags; undo                                                                                                          | Served                                                                                           |
| Confirm the rest still stands                     | epistemic                                   | The [shared-attention](../../specs/shared-attention/requirements.md) reveal — transient marks bounded to the turn's changes; undo's restoration sentence     | Partial — the answer exists only in the moment                                                   |

## Story 3 — comparing agreements

An office agreement is priced and reasonable, and the operator wants to see what a premium direction costs before committing to either. Persona: [building operator](persona-building-operator.md); job-map stages Modify and Confirm.

Two of story 2's micro-jobs are the same operator one circumstance away and are not repeated here. *Judge whether the fix is worth it* weighs a proposed change against the agreement in force; *explore without giving up what stands* is about the cost of looking. This story is the choice itself, between two candidates neither of which is in force, where nothing is at stake in exploring and everything is at stake in picking.

*See only what actually differs* (Confirm). When the two versions agree about most of the agreement and I am choosing between them, I want only the terms that separate them put in front of me, so the decision is about a handful of differences rather than about reading two documents against each other.

*Tell what the extra money buys in service* (Confirm). When one version costs more per month and the terms that differ are named in the vendor's vocabulary, I want to know what the difference means for the building — who answers at night, how long a stuck car waits — so I am comparing service rather than nomenclature.

*Hold cost against carbon without being handed a winner* (Confirm). When the cheaper agreement is not the lower-carbon one and my organization has commitments on both, I want the two figures beside each other and no combined score, so the weighting stays a decision I made rather than one the tool made for me.

*Ask about the comparison without losing it* (Confirm). When I see two figures that disagree — more expensive and lower carbon — my next move is to ask why, and I want the comparison still in front of me while I hear the answer, because interrogating it is part of deciding from it.

*Choose without spending the other option* (Modify). When I take one of the two, I want the other left exactly as it was, so choosing is not a one-way door and going back costs nothing if the reasoning changes.

| Micro-job | Purpose | Moves that serve it | Verdict |
| --- | --- | --- | --- |
| See only what actually differs | epistemic | *Fork and compare*: `compare_drafts` returns only the differing variables, each side priced at its own term ([parallel-drafts](../../specs/parallel-drafts/design.md)) | Split — the answer is computed and correct, the reading is not; see finding 7 |
| Tell what the extra money buys in service | epistemic | *Explain*, and the document's own glosses ([agreement-document](../../specs/agreement-document/design.md)); the comparison itself lists variables and adders in catalogue nomenclature ([Comparison view](../models/Comparison%20view.md), *Candidate one*) | Partial — the meaning is available beside the comparison, never inside it |
| Hold cost against carbon without being handed a winner | epistemic | The monthly delta and the footprint delta as a pair, with resolving them the agent's first never-move ([trade-offs are shown as a pair](../principles/trade-offs-shown-as-a-pair.md), [environmental-footprint](../../specs/environmental-footprint/requirements.md)) | Served |
| Ask about the comparison without losing it | epistemic | None. *Ask why* and *explain* work, and asking a question retires the card that carried the comparison and scrolls it away ([Comparison view](../models/Comparison%20view.md), *Candidate one*, observed) | Unserved — see finding 7 |
| Choose without spending the other option | pragmatic | Switch and discard, with each draft keeping its own provenance and history ([parallel-drafts](../../specs/parallel-drafts/requirements.md)) | Served |

## Story 4 — renewal as revision

Renewal approaches on an agreement configured in an earlier session and left in some state, and the building is used differently than when the terms were set. Persona: [building operator](persona-building-operator.md); job-map stage Conclude, reaching back into Modify.

*Pick up an agreement I have not opened in months* (Conclude). When the last conversation about this building was months ago and I may not have kept it, I want the agreement itself to tell me where things stood, so resuming does not depend on a transcript being there.

*Find out what is still unanswered* (Conclude). When the agreement is complete and valid but plainly not finished, I want to be told what is still open and what each open point is waiting on, so I can tell "nothing left to decide" apart from "nobody has decided it yet".

*Start from whatever I happen to remember* (Conclude). When what I remember about this installation is a dimension rather than a term, I want to state it flatly and have it land on the right term, so re-entry does not begin with the tool re-establishing what it already knows.

*Adjust the terms to how the building is used now* (Modify). When the use has drifted from what the terms assume and we are reopening the agreement anyway, I want to change the terms in place and see what that drags with them, so renewal is a revision of what we have rather than a new sale.

*Tell whether we are being asked to pay more for the same thing* (Conclude). When the renewal price differs from what we have been paying, I want the proposed agreement held against the one in force, so the negotiation is about what changed rather than about the total.

*Take it, and have the record say so* (Conclude). When whoever signs a multi-year commitment on our side has agreed to it, I want to take the agreement and have the record afterwards distinguish what is in force from what is still under discussion, so the next revision starts from a signed position rather than from a draft.

| Micro-job | Purpose | Moves that serve it | Verdict |
| --- | --- | --- | --- |
| Pick up an agreement I have not opened in months | epistemic | None, and none needed: the workspace restores values, forced values, provenance, drafts and their prices without a move being made ([agreement-workspace](../../specs/agreement-workspace/design.md)). What does not come back with them is the reasoning — the repair set that argued a change lives in the transcript ([the canvas is the durable locus of state](../assertions/canvas-is-the-durable-state.md)) | Served without a move, for values; the argument behind them does not restore |
| Find out what is still unanswered | epistemic | *Ask a question* answered from `get_configuration`, which reaches category grain and names no term ([renewal as revision](../scenarios/renewal-as-revision.md)); the [open-points spec](../../specs/open-points/requirements.md) drafts the substrate that would name them | Partial — see finding 3 |
| Start from whatever I happen to remember | pragmatic | *Set a value* on any variable, with the solver forcing what follows ([configuration can start from any variable, in any order](../principles/start-from-any-variable.md)) | Served |
| Adjust the terms to how the building is used now | epistemic, then pragmatic on accept | *Revise by intent* → *propose repairs on a ripple*, the story 2 machinery reached from a different circumstance | Served |
| Tell whether we are being asked to pay more for the same thing | epistemic | None. *Fork and compare* compares two proposals; there is no agreement in force to compare either of them against | Unserved — see finding 4 |
| Take it, and have the record say so | pragmatic | *Accept*, which the inventory marks unbuilt: nothing in state distinguishes a candidate from an agreement the customer has taken | Unserved — the [open-points spec](../../specs/open-points/requirements.md)'s acceptance half is drafted against exactly this |

## Story 5 — tender as entrance

The delivery lead's own organization has issued an RFQ for the vertical transportation package, and it is over-constrained. Persona: [delivery lead](persona-delivery-lead.md); job-map stages Define and Locate, entered from the document rather than from a conversation.

*Not answer a specification we have already written* (Locate). When our document already states what we need and answering questions about it would be restating our own words, I want the document to be the way in, so the conversation starts from what we wrote.

*Be told what cannot be met, and why* (Define). When the document asks for something the rules cannot deliver and we wrote it ourselves, I want the departure named with the rules that produce it, so I can take it back to whoever wrote the clause instead of arguing with a verdict.

*Answer each departure so the answer stays on the record* (Define). When I take what is offered rather than what we asked for, I want the requirement to stay listed as answered rather than vanish, so nobody downstream reads silence as compliance.

*Tell a departure from a change of our own mind* (Define). When I revise a requirement the agreement already meets, I want that recorded as negotiation of our own document rather than as an ordinary edit, so our position and our concessions stay distinguishable at the end.

*Keep it under the ceiling the document states* (Locate). When the document names a monthly budget cap and the candidate is over it, I want that reported as commercial pressure rather than as a refusal, so I know it is a conversation with our own finance side.

*Find out what our document left open* (Define). When the document is silent on terms that still have to be decided, I want the questions to be about those and only those, so schedule pressure is not spent re-answering ourselves.

*Send a position back to the body that issued the document* (Confirm). When the response goes to a procurement committee that will never open this tool, I want the commitments, the departures and their reasons in a form that leaves with me, so the negotiation happens on the document where it started.

| Micro-job | Purpose | Moves that serve it | Verdict |
| --- | --- | --- | --- |
| Not answer a specification we have already written | pragmatic | Handing over the document, which the inventory does not list as a move and [rfq-reconciliation](../../specs/rfq-reconciliation/design.md) implements as `ingest_rfq` — [configuration can start from any variable, in any order](../principles/start-from-any-variable.md) at its limit | Served — see finding 8 |
| Be told what cannot be met, and why | epistemic | *Flag a dead end or conflict* as the deviation register, carrying its rules on the sheet since the 2026-08-20 walkthrough | Served |
| Answer each departure so the answer stays on the record | pragmatic | The three reconciliation moves — take what is offered, change the requirement, leave it open — a waived requirement staying listed as waived. Also absent from the inventory | Served — see finding 8 |
| Tell a departure from a change of our own mind | pragmatic | The canvas's per-variable split between `Reconcile deviation: ` and `Canvas edit: `, so the same gesture means different things on one document ([agreement-document](../../specs/agreement-document/design.md)) | Served |
| Keep it under the ceiling the document states | epistemic | *Constrain without choosing* in conversation; against the document's own cap, a reported comparison rather than a constraint, because the model carries no budget variable ([tender as entrance](../scenarios/tender-as-entrance.md)) | Partial — the cap is checked and cannot bind; the [open-points spec](../../specs/open-points/requirements.md) would carry it as a point |
| Find out what our document left open | epistemic | *Ask a question*, the fallback move (constitution #5), retargeted onto the document's silences rather than removed | Served |
| Send a position back to the body that issued the document | epistemic | None. The register is state on the agreement; nothing leaves the tool | Unserved — see finding 2 |

## Moves no micro-job claims

This is the crossing run backwards: walk the inventory and list the moves nothing wants. Two classes come out before the walk starts. The solver's moves are involuntary, firing on every event whoever caused it, so they are neither claimed nor unclaimed in the sense this check means. The never-moves are prohibitions rather than moves. The distinct set is also smaller than the row count suggests: the delegation moves *delegate* and *review* are the user moves *delegate a scope* and *review the agent's work* restated with the boundary drawn, and the delegation move *fill* is the agent move *apply conventional defaults* widened by a mandate.

Of what remains, two moves are claimed by no micro-job across the five stories:

- *Escalate a delegated decision*, an agent move and a delegation move. It is obligatory when triggered, and nothing can trigger it: no mandate exists in state, so there is no scope inside which the agent could meet a choice it has to hand back.
- *Revoke*, a delegation move. It is named unbuilt in the inventory itself. The built withdrawal is a different move: `clear_choices` removes a recorded choice and lets the solver refill the variable, where revoking would leave the value in place and change its standing to a standing proposal.

Both are unbuilt, and both belong to the delegation machinery the inventory describes as design rather than mechanism. The check therefore returns nothing in the class it was designed to find, meaning no built move that no job wants. What it returns instead is the opposite list, which is finding 8.

## Findings

1. *The diagnosis micro-job splits at the product model's boundary.* Holding the agreement's terms against the building's described usage is in scope and partially served. Holding promises against measured performance isn't, because the prototype has no telemetry and no actuals anywhere in its data. It is worth recording as a stated scope boundary rather than leaving silent, because it is the first thing a real operator in this circumstance would ask for.

2. *The approver is unserved, in two shapes.* Story 2 found the operator taking a revision to a board or an owner, story 4 finds whoever signs a multi-year renewal on the same side of the table, and story 5 finds a procurement committee the tender response is owed to. The first two are one need — an internal approver who was not in the conversation, has to be convinced by someone who was, and whose decision has nowhere to land in the record until acceptance exists. Which office that is stays open: the [operator persona](persona-building-operator.md) names a board only for capital projects, and the service frame's argument is that a renewal is opex and avoids exactly that route. The third is a different one: an external body that issued the document, is owed a response in the document's own terms, and will never open the tool. Both shapes end at the same wall, that everything the tool argues stays inside it, and neither has an artifact anywhere in discovery or specs. This is adjacent to the accountability edge the [move inventory](../models/Conversation%20moves.md), *Edges this model does not settle*, already lists, and it is invisible at scenario grain, because the scenarios end where the conversation ends.

3. *The stage gap, confirmed bottom-up at both ends.* The weakest-served micro-jobs are the Monitor-stage ones in story 2 and the Conclude-stage ones in story 4, which matches what the [job map](job-map.md) predicts top-down: a configurator serves Define through Confirm and exits. Reaching that prediction from the micro-jobs rather than from the map adds one thing to it. The durable answer to both ends is the same session map, whose substrate the [open-points spec](../../specs/open-points/requirements.md) drafts, and whose Conclude half needs acceptance before any of it can be derived.

4. *Renewal has nothing to compare the renewal against.* Story 4's central epistemic move is holding the proposed agreement against the one in force, and the comparison the product has is between two drafts — symmetric by construction, neither primary, the verb *switch* ([Comparison view](../models/Comparison%20view.md), *Candidate three*). Renewal's comparison is asymmetric in exactly the way that model reserved for the deviation register: there is a position of record and a set of departures from it, and answering one is negotiation. So renewal wants the redline the comparison model rejected for drafts and kept for the RFQ, and it can't have it until acceptance makes a position of record exist. The [open-points spec](../../specs/open-points/requirements.md) names post-acceptance divergence as a natural follow-on it doesn't cover, and this is the job that wants it.

5. *Nothing on the agreement is marked as committed to.* The specifier and the delivery lead both work against a value that leaves the tool and gets built on — the shaft envelope enters a structural drawing months before anything is bought. Every value on the document is equally revisable, which is what makes revision ordinary, and no value can be marked as one that others have already acted on. This is a scope boundary of the same kind as finding 1 rather than a defect: the prototype models one party's agreement rather than the commitments other disciplines have made against it. It is worth stating, because a lock is the first thing this circumstance asks for, and granting it would collide with [revision is an ordinary move, not a restart](../principles/revision-is-an-ordinary-move.md).

6. *Delegation is claimed by one story and served halfway.* Story 1 is the only story whose micro-jobs reach the delegation moves at all, and it reaches the two halves that are built — the customer hands a scope over, the agent fills it and tags what it chose. The two that aren't built are both about the customer's side of the boundary. There is no review pass gathering agent-chosen values as a set, only a badge per row, and the reason a badge carries is composed by the model rather than quoted from a named heuristic, because the D-rules the inventory requires don't exist in the product model. The inventory listed that review pass without marking it unbuilt, as it marks *accept* and *revoke*, and it now says so. Checking delegated work is where the delegation boundary is actually tested, and it is the half that has no surface.

7. *The comparison's measured failures are job-side failures too.* Three of story 3's five micro-jobs fail in the way [Comparison view](../models/Comparison%20view.md), *Candidate one*, measured: the comparison can't be read whole, it speaks the catalogue rather than the agreement, and it expires when asked about. Those were arrived at by watching the shipped card in the app, and arriving at them again from the operator's jobs is corroboration from an independent direction. It adds a priority argument the layout argument didn't carry: the failure that matters most to the job is the third one, because a comparison the customer can't interrogate isn't a comparison they can decide from.

8. *The inventory had fallen behind what was built.* The reverse check found no orphan move. Running it the other way, from the built tool set back to the inventory, found five user moves the inventory didn't list: handing over a document, the three reconciliation answers, withdrawing a recorded choice, declining a proposed change, and discarding a draft. Four of the five are claimed by micro-jobs here and served, so this was a stale model rather than a gap in the product, and [Conversation moves](../models/Conversation%20moves.md), *User moves*, carries all five. Two distinctions the code draws and the model didn't are worth having in the tables: declining a change that never happened isn't undoing one that did, and withdrawing a choice is neither of those nor the delegation move *revoke*. What the amendment couldn't settle is the second half. The render answers story 1's last micro-job, and the decided comparison mode would answer story 3's fourth. Both are projections that change nothing, so under the inventory's own definition of a move neither is one, and the tables have nowhere to put them. That is an edge the inventory records rather than an answer.

9. *The grain discriminates.* At scenario grain, every move served every story and the crossing said nothing. At this grain each micro-job maps to at most a few moves, verdicts are decidable, and the pattern across five stories is legible: what is unserved concentrates at the two ends of the job map and at the boundary of the tool, rather than scattered through the middle. The prototype walkthrough gains criteria falsifiable in a sitting, which is the play's own intended use.

## The promotion question, and what the evidence says

Whether this crossing is promoted into a discovery model of its own — a task model in the ReTaMeta sense, with goals, tasks, operators, objects, roles and preconditions in one artifact — was left open for the evidence the reverse check would produce. The evidence is finding 8 and the empty result that precedes it.

The recommendation is to leave the crossing here, as an expanded JTBD layer, and not to promote it. There are three reasons. The check found no orphan mechanism, so there is no body of unexplained product behaviour that a task model would be the place to explain. What it did find is a set of amendments and one open definition owed to a model that already exists, which is maintenance of the [move inventory](../models/Conversation%20moves.md) rather than grounds for a second one. And the parts a task model would centralize are each already held somewhere that answers a question: goals in the job ladder and these stories, tasks in the move inventory, runtime preconditions in the suggestion strip's predicates ([suggested moves](../../specs/suggested-moves/design.md)), and roles in the delegation strata. Gathering them would dissolve the question-shaped models the direction is built from, and import a sequencing pressure that [configuration can start from any variable, in any order](../principles/start-from-any-variable.md) exists to refuse.

The decision isn't this note's to make. What the note can say is that after five decompositions the crossing pays for itself as findings, and doesn't pay for itself as an artifact.

## Related

- [The scenario-scale layer above this one](job-stories.md)
- [The stages the circumstances anchor to](job-map.md)
- [The inventory the crossing reads](../models/Conversation%20moves.md), amended by finding 8 and still owed the delegation surfaces finding 6 names
- [The comparison decision stories 3 and 4 are read against](../models/Comparison%20view.md)
