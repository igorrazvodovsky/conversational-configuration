# Micro-job stories — probe on the mid-contract revision

Status: desk-research hypothesis, and deliberately a *probe*: one story from [job-stories.md](job-stories.md) decomposed to the grain the play actually prescribes, to test whether that grain yields findings the scenario grain hides. Play: *Align Teams to Job Stories* — Klement's form, `When [circumstance + job stage], I want to [micro-job], so I can [need]`, three to eight per design problem, circumstances in enough detail to design from. The scenario-scale stories in [job-stories.md](job-stories.md) do the roadmap play's work and keep it; this layer sits beneath them.

Every circumstance here is hypothesized from the [operator persona](persona-building-operator.md) and industry practice, not observed — the standing constraint ([phase-plan](../phase-plan.md) §2). What that permits: using these as critique heuristics and walkthrough criteria. What it forbids: reading them as findings about operators.

## The story decomposed

Story 2, *mid-contract revision*: tenant complaints about wait times rise after the building's use changed; the operator wants to fix it without a capital project. Persona: [building operator](persona-building-operator.md); job-map stages Monitor and Modify, reaching into Confirm.

*Tell a service failure from an outgrown agreement* (Monitor). When complaints about morning wait times have accumulated for weeks and I cannot tell whether the machine is underperforming what was promised or the building has outgrown what we agreed, I want to hold the agreement's promised terms against how the building is actually used, so I can know which conversation to open — a complaint or a revision.

*Reach the governing term from the symptom* (Modify). When I know the symptom — queues at the morning peak — but not which term of the agreement governs it, and the catalogue's names mean nothing to me, I want to state the symptom in my own words and be shown the term it implicates, so I can start the revision without first learning elevator vocabulary.

*See the whole consequence before committing* (Modify). When I have found the term to change but the agreement is mid-term and I fear what one change drags along, I want the full consequence shown at the moment I propose the change, with nothing applied until I accept, so I can decide once rather than discover the damage in stages.

*Judge whether the fix is worth it* (Modify). When the fix raises the monthly fee and my budget answers to an opex review, I want the price and footprint deltas held beside what we pay now, so I can weigh the fix against the complaint it answers before I champion it.

*Explore without giving up what stands* (Modify). When I want to see what a heavier-traffic version of the agreement looks like while the one in force must stay untouched, I want a second version to work on beside the first, so exploring costs nothing and commits nothing.

*Carry the decision to whoever signs* (Confirm). When the revision needs sign-off from a board or an owner who was not in the conversation and will not open the tool, I want the change, its reason and both deltas in a form I can take to them, so approval does not require replaying the negotiation in a meeting.

*Apply it once, attributably* (Modify). When we agree on the change, I want it applied as one batch with who chose each value recorded, so that at renewal nobody re-litigates what was decided or by whom.

*Confirm the rest still stands* (Monitor). When the change has been applied to an agreement whose other terms I have not thought about in months, I want to see exactly what moved and that nothing else did, so I can close the matter without proofreading the whole document.

## The crossing to moves

Each micro-job against the [move inventory](../models/Conversation%20moves.md) and the surface that implements it. *Purpose* is the operator-type tag from task-model practice: an epistemic move informs a decision and wants a reversible, low-commitment control; a pragmatic move commits and wants a visible, attributable one.

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

## Findings

1. *The diagnosis micro-job splits at the product model's boundary.* Holding the agreement's terms against the building's described usage is in scope and partially served; holding promises against measured performance is not — the prototype has no telemetry and no actuals anywhere in its data. Worth recording as a stated scope boundary rather than leaving silent, because it is the first thing a real operator in this circumstance would ask for.
2. *One genuinely new unserved need: the approver.* The operator is not the last decision-maker, and no artifact in discovery or specs so far names the person they must convince — the boards in the [persona](persona-building-operator.md)'s circumstances appear nowhere downstream of it. Everything the tool argues stays inside the tool. This is adjacent to the accountability edge the [move inventory](../models/Conversation%20moves.md) §7 already lists, and it is invisible at scenario grain because the scenario ends where the conversation ends.
3. *The Monitor-stage gap, confirmed bottom-up.* The two weakest-served micro-jobs are the two Monitor-stage ones — matching what the [job map](job-map.md) predicts top-down (a configurator serves Define through Confirm) and what the durable answer to both would be: the session map, whose substrate the [open-points spec](../../specs/open-points/requirements.md) drafts.
4. *The grain discriminates.* At scenario grain, every move served story 2 and the crossing said nothing. At this grain each micro-job maps to at most a few moves, served/partial/unserved verdicts are decidable, and the walkthrough ([phase-plan](../phase-plan.md) §3 task 6) gains criteria falsifiable in a sitting — the play's own intended use.

What one scenario cannot show: moves that serve *no* micro-job. That check needs the other stories decomposed, and it is the half of the crossing that would justify a task-model artifact proper — this note is the other half, run once to see whether the method pays.

## Related

- [job-stories.md](job-stories.md) — the scenario-scale layer above this one
- [job-map.md](job-map.md) — the stages the circumstances anchor to
- [../models/Conversation moves.md](../models/Conversation%20moves.md) — the inventory the crossing reads
