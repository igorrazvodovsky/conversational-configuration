# Discovery plan

Status: current cycle plan, revised 2026-08-13. Discovery here is continuous rather than a phase with an end date — see §2.

## 1. Activity balance — the diagnostic

Brown's four activities, applied to what this project has actually done. This section is the plan's reason for existing.

| Activity | What exists | Verdict |
|---|---|---|
| Gathering | Five research threads, industry configurator practice, standards and dimension data, solver evaluation, a JTBD analysis ([../research/](../research/README.md), [jtbd/](jtbd/README.md)) | Well served. Further reading has low marginal value |
| Processing | Job ladder, job map, three personas, consumption journey, architecture synthesis | Adequate. The synthesis is thorough but was performed once, before anything was built |
| Exploring | Three concepts named and set aside ([direction.md](direction.md) §1). In the model layer: the surface geometry and form chosen from the industry-wide pattern field ([models/Surface architecture.md](models/Surface%20architecture.md)), the initiative default from three ([models/Conversation moves.md](models/Conversation%20moves.md) §6), the ripple's disclosure from three ([models/Ripple storyboard.md](models/Ripple%20storyboard.md) §2). In the spec design notes: a named alternative each for the canvas-edit protocol, the control vocabulary and where control selection lives, the repair cap and ripple filtering, and comparison placement, plus one rejected solver alternative set | *Partly served.* Option generation is real at the level of mechanism, usually one alternative per decision. At the level of presentation it has only just started, and only in the model layer |
| Focusing | Constitution, the feature register in [../specs/README.md](../specs/README.md) — most of it implemented | Well served — arguably ahead of exploring, which is the imbalance |

## 2. Planning constraints

What the plan can actually support:

- Solo work, no budget, no team to align. Workshops, design studios and stakeholder alignment sessions are unavailable in their normal form — the substitutes are written alternatives-and-rationale, and critique from a knowledgeable reader.
- No access to real job performers. Every user-facing claim stays a hypothesis. This caps what discovery can settle, and the honest response is to name the assertions rather than to launder them into findings ([problem-framing.md](problem-framing.md) §4).
- Time is intermittent, in prototyping sessions rather than in weeks. A plan denominated in dates would be fiction; this one is denominated in cycles.
- Appetite for discovery is real but bounded: the point of the project is a demonstrable prototype. Discovery that does not make the next build decision easier is theater.
- Most of the feature register is already implemented. Discovery is retrofitting a frame around live work, so its output has to be compatible with what exists or explicit about what it invalidates.

## 3. The plan

Not a phase. A repeating cycle, with each pass required to touch all four activities at some scale.

*Current cycle — close the exploration gap, then approve the drafts.*

| # | Task | Activity | Output |
|---|---|---|---|
| 1 | Draw the conversation move inventory: every move each party can make, who may initiate it, and what it does to the document | Exploring | Done 2026-08-13 — [models/Conversation moves.md](models/Conversation%20moves.md); initiative default decided (§6), first-proposal objective left as a named tension |
| 2 | Storyboard the revision-with-ripple flow at three levels of disclosure — full consequence set / minimal core / narrated summary — with the built level as candidate one, and choose | Exploring → focusing | Drafted 2026-08-13 — [models/Ripple storyboard.md](models/Ripple%20storyboard.md); minimal core first, full set one move away, narration never load-bearing. Answers the ripple-disclosure question in [problem-framing.md](problem-framing.md) §5, subject to critique |
| 3 | Sketch two alternative comparison layouts against [trade-offs shown as a pair](principles/trade-offs-shown-as-a-pair.md) and pick one. Needed footprint in the model first, since a one-objective comparison cannot test it — unblocked since the [footprint spec](../specs/environmental-footprint/requirements.md) landed 2026-08-13 | Exploring → focusing | Comparison model |
| 4 | Judge the [demo scenarios](../specs/demo-scenarios/requirements.md) against the principle coverage table ([direction.md](direction.md) §4); add or amend a scenario to cover [any door is an entrance](principles/any-door-is-an-entrance.md) | Focusing | Done 2026-08-13 — scenario 4 recast as renewal-as-revision opening from a bare shaft-dimension statement; scenario 1 gained provenance + one-turn override; scenario 3's footprint delta registered as a deferred assertion. [Demo scenarios](../specs/demo-scenarios/requirements.md) ready for approval |
| 5 | Re-read the [service-agreement spec](../specs/service-agreement/requirements.md) and [footprint](../specs/environmental-footprint/requirements.md) specs against the eight principles; note any acceptance criterion that violates one | Processing | Done 2026-08-13 — no principle revised. The footprint spec conforms; the service-agreement spec was amended: principle citations added, provenance required on the canvas criterion (its display criterion was satisfiable by an implementation hiding who chose the derived hardware), the unsettled first-proposal objective named so approval doesn't silently settle it, and the comparison seam between the two drafts stated in both |
| 6 | Walkthrough of the running prototype against the four scenarios, recording where the interaction contradicts a principle | Gathering | Evidence against [the assertions](assertions/) — the only real evidence available without users |
| 7 | Bring the RFQ entrance into frame: acquisition begins with an inbound requirements document, flipping the opening conversation from elicitation to reconciliation of deviations | Processing → focusing | Done 2026-08-14 — [problem-framing.md](problem-framing.md) §3 gains the procurement statement, an eighth assertion added ([a seeded candidate with named deviations beats compliance-checking by hand](assertions/deviations-beat-compliance-checking.md)), [any door is an entrance](principles/any-door-is-an-entrance.md) extended with the document door, and the [rfq-reconciliation spec](../specs/rfq-reconciliation/requirements.md) approved, its design drafted (the maximal-subset objective decided there), and the tender-as-entrance scenario added to the [demo scenarios](../specs/demo-scenarios/requirements.md) and the [direction.md](direction.md) §4 coverage table |
| 8 | Draw the canvas anatomy: what genre the agreement is rendered in, which readings each part serves, and what "editable" means for a projection of solver state | Exploring → focusing | Done 2026-08-14 — [models/Canvas anatomy.md](models/Canvas%20anatomy.md); layered contract genre chosen (recitals, operative terms, schedules) over the built spec sheet, a ninth assertion added ([the representation of the agreement selects the user's moves](assertions/representation-selects-moves.md)), and the [agreement-document spec](../specs/agreement-document/requirements.md) drafted, awaiting approval |

*Next cycle, provisionally.* Whatever task 6 falsifies. If [ripple at the moment of revision](assertions/ripple-at-the-moment-of-revision.md) survives the walkthrough, the session map and resumption flow are the next unexplored territory.

## 4. Milestones

Communication points, not gates. Shared artifacts that keep evolving, per Brown's preference over one-off deliverables.

| Milestone | Artifact | State |
|---|---|---|
| Framing settled enough to act on | [problem-framing.md](problem-framing.md) | Reached 2026-08-13 |
| Direction chosen and defensible | [direction.md](direction.md) | Reached 2026-08-13 — one concept, eight principles |
| Design concept made concrete | The models in [direction.md](direction.md) §3 | Open. [Surface architecture](models/Surface%20architecture.md), the [move inventory](models/Conversation%20moves.md), the [ripple storyboard](models/Ripple%20storyboard.md) and the [canvas anatomy](models/Canvas%20anatomy.md) are drafted; the comparison view and session map are not |
| Definition of done agreed | The [demo scenarios](../specs/demo-scenarios/requirements.md) approved | Reached 2026-08-14 — approved; the harness and one scenario built, the rest and the presenter document outstanding ([../specs/README.md](../specs/README.md)) |
| Standing summary current | [brief.md](brief.md) | Living; update at the end of each cycle |

## 5. Stop and continue signals

Discovery stops, for now, when:
- a cycle produces no revision to the framing or direction;
- the pull toward elaborating details is stronger than the pull toward reframing;
- the open questions in [problem-framing.md](problem-framing.md) §5 are answered by decisions rather than by more reading.

Discovery continues when:

- an interaction decision cannot be argued from any principle — the direction is incomplete;
- the same debate recurs across sessions without resolution;
- a walkthrough contradicts an assertion and nothing replaces it;
- building feels uninspired in a way that traces to weak understanding, rather than to ordinary implementation difficulty.

Current read: continue. The exploration gap in §1 is narrowing but unresolved on the side that matters: the comparison view is undrawn — footprint's data now exists, so the two-objective layout can finally be judged against [trade-offs shown as a pair](principles/trade-offs-shown-as-a-pair.md), but no alternatives have been sketched — the session map has not been started, and the first proposal's objective is settled only as a disclosed default ([models/Conversation moves.md](models/Conversation%20moves.md) §6); whether it should instead arrive as a pair waits on that comparison model.
