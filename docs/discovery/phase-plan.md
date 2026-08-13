# Discovery plan

Status: current cycle plan, revised 2026-08-13. Discovery here is continuous rather than a phase with an end date — see §2.

## 1. Activity balance — the diagnostic

Brown's four activities, applied to what this project has actually done. This section is the plan's reason for existing.

| Activity | What exists | Verdict |
|---|---|---|
| Gathering | Five research threads, industry configurator practice, standards and dimension data, solver evaluation, a JTBD analysis ([../research/](../research/README.md), [jtbd/](jtbd/README.md)) | Well served. Further reading has low marginal value |
| Processing | Job ladder, job map, three personas, consumption journey, architecture synthesis | Adequate. The synthesis is thorough but was performed once, before anything was built |
| Exploring | One rejected solver alternative set; three concepts named and set aside (retroactively, in [direction.md](direction.md) §1) | *Underserved.* Almost no option generation. The interaction structure was adopted from the literature rather than chosen among alternatives |
| Focusing | Constitution, eight specs, five implemented features | Well served — arguably ahead of exploring, which is the imbalance |

The finding: this project went *gather → focus*, skipping exploration. Every significant interaction decision — canvas anatomy, ripple presentation, initiative default, comparison layout — was made once, inline, while implementing, without alternatives on the table. That is Brown's classic failure mode of overinvesting in one quadrant, and it is why three of the six models in [direction.md](direction.md) §3 have never been drawn.

It also explains a concrete symptom: spec 006 (demo scenarios) has sat in draft awaiting approval. Scenarios are a focusing artifact, and they are hard to commit to when the direction underneath them was never explicitly chosen. [direction.md](direction.md) now supplies that direction; 006 can be judged against it.

The corrective for the current cycle: *explore before building the next thing.* Not more research.

## 2. Planning constraints

What the plan can actually support:

- Solo work, no budget, no team to align. Workshops, design studios and stakeholder alignment sessions are unavailable in their normal form — the substitutes are written alternatives-and-rationale, and critique from a knowledgeable reader.
- No access to real job performers. Every user-facing claim stays a hypothesis. This caps what discovery can settle, and the honest response is to name the assertions rather than to launder them into findings ([problem-framing.md](problem-framing.md) §4).
- Time is intermittent, in prototyping sessions rather than in weeks. A plan denominated in dates would be fiction; this one is denominated in cycles.
- Appetite for discovery is real but bounded: the point of the project is a demonstrable prototype. Discovery that does not make the next build decision easier is theater.
- Five features are already implemented. Discovery is retrofitting a frame around live work, so its output has to be compatible with what exists or explicit about what it invalidates.

## 3. The plan

Not a phase. A repeating cycle, with each pass required to touch all four activities at some scale.

*Current cycle — close the exploration gap, then approve the drafts.*

| # | Task | Activity | Output |
|---|---|---|---|
| 1 | Draw the conversation move inventory: every move each party can make, who may initiate it, and what it does to the document | Exploring | Model + a decision on the initiative default |
| 2 | Storyboard the revision-with-ripple flow at three levels of disclosure (full consequence set / minimal core / narrated summary) and choose one | Exploring → focusing | Ripple storyboard; resolves [problem-framing.md](problem-framing.md) §5 Q3 |
| 3 | Sketch two alternative comparison layouts against P7 and pick one | Exploring → focusing | Comparison model |
| 4 | Judge spec 006's four scenarios against the principle coverage table ([direction.md](direction.md) §4); add or amend a scenario to cover P5 | Focusing | 006 ready for approval |
| 5 | Re-read specs 007 and 008 against the eight principles; note any acceptance criterion that violates one | Processing | Amendments, or a principle revised |
| 6 | Walkthrough of the running prototype against the four scenarios, recording where the interaction contradicts a principle | Gathering | Evidence against A1–A7 — the only real evidence available without users |

Task 6 is the cycle's gathering component and it is deliberately not more reading. With no access to job performers, structured self-walkthrough of the built thing is the highest-yield input available.

*Next cycle, provisionally.* Whatever task 6 falsifies. If A4 survives the walkthrough, the session map and resumption flow are the next unexplored territory.

## 4. Milestones

Communication points, not gates. Shared artifacts that keep evolving, per Brown's preference over one-off deliverables.

| Milestone | Artifact | State |
|---|---|---|
| Framing settled enough to act on | [problem-framing.md](problem-framing.md) | Reached 2026-08-13 |
| Direction chosen and defensible | [direction.md](direction.md) | Reached 2026-08-13 — one concept, eight principles |
| Design concept made concrete | The three missing models (§3 tasks 1–3) | Open |
| Definition of done agreed | Spec 006 approved | Blocked on the milestone above |
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

Current read: continue. The exploration gap in §1 is unresolved, and three of the six models remain undrawn.

## Related

- [problem-framing.md](problem-framing.md) · [direction.md](direction.md) · [brief.md](brief.md)
- [../../specs/README.md](../../specs/README.md) — the execution layer this feeds
