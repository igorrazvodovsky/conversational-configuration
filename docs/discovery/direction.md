# Design direction

Status: working assertions, revised 2026-08-13. Answers the problem framed in [problem-framing.md](problem-framing.md).

## 1. Concept

*A negotiation over a living document.*

The durable object is the agreement, not the conversation. It sits on the canvas: outcome terms above, derived hardware beneath, price and footprint attached. It is always complete, always valid, and always editable from any point. The chat is a channel onto that document — a place to say what you want in your own words, to hear what a change would cost, and to be told why something cannot be done. A third party sits at the table: the solver, which checks every draft and never bluffs.

What the concept changes:

- The transcript stops being the record. It becomes the negotiation, and negotiations are not records.
- There is no "start" and no "finish". You join a document already in some state and leave it in another — which is exactly what mid-contract revision and renewal are ([jtbd/consumption-journey.md](jtbd/consumption-journey.md)).
- Both parties act on the same object. The agent's moves and the user's edits are the same kind of event, and both are undoable.
- Disagreement is normal and productive. "You can't have that" is a legitimate move as long as it comes with a reason.

Experientially: negotiating with a well-prepared counterpart who knows the rules cold, states them plainly, and never pretends. Not filling in a form. Not interviewing an expert. Not querying a database.

### Concepts explored and set aside

- *The wizard with an assistant.* Chat helps you through an ordered flow. Rejected: it preserves the imposed decision order, which is the framing's second failure mode, and it makes revision a matter of going back.
- *The expert you interview.* The agent holds all state and you extract it by asking. Rejected: it makes state invisible, defeats comparison, and puts the whole articulation burden on the user's questions.
- *The spreadsheet that talks.* The canvas is primary and chat is a command line onto it. Kept as a partial truth — it is close to how a returning operator will actually use the thing — but as a whole concept it gives up the elicitation that makes the tool usable to a first-timer.

The living-document concept absorbs the useful half of the third: for a returning user, chat should be optional.

## 2. Principles

Rules for design decisions. Sharp enough to reject an idea, specific enough to be about this product. Constitution #5, #6 and #7 are the engineering statements of P1, P4 and P6; these are the interaction-side formulations.

*P1 — Always show a valid whole.*
Every candidate the user sees is complete and solver-valid; partial or invalid states are never displayed as a proposal. Grounded in the critiquing literature: people react well to concrete artifacts and poorly to open questions. Rules out progressive form-filling and "you have 6 of 20 fields left". Test: can the user, at any moment, say yes and get something real?

*P2 — Speak the building's language, not the catalogue's.*
Elicitation starts from the situation — building type, floors, traffic, budget per month — and derives nomenclature. Technical terms appear as derived results the user can inspect, not as questions. Grounded in the articulation barrier and in the specifier persona. Rules out any first question containing "rated load". Test: can someone who has never bought an elevator answer every question we ask?

*P3 — The canvas remembers; the chat explains.*
Anything the user needs to check goes on the canvas. Anything the user needs to understand goes in chat. Neither surface duplicates the other's job. Rules out chat messages that restate the current spec, and canvas tooltips that carry the reasoning. Test: could you delete the transcript and lose nothing but the argument?

*P4 — Every "no" carries its reason.*
Unavailability, forcing, and conflict are always accompanied by the named rules that caused them, traced to a solver core. Rules out greyed-out options with no explanation, and any justification the LLM composed rather than verbalized. Test: does the reason survive being checked against the model file?

*P5 — Any door is an entrance.*
The user may start from any variable, in any order, and edit anything at any time. Nothing is locked because of when it was decided. Rules out required-field ordering and modal steps. Test: can a session that starts with "the shaft is 1800 by 1700" go as well as one that starts with the building type?

*P6 — Changing your mind is a normal move, not a restart.*
Revision is the primary interaction, not an escape hatch. A change shows what it breaks, proposes repairs, and applies atomically. Grounded in the operator persona, whose job is mostly modification. Rules out "this will reset your configuration", and silent invalidation. Test: is revising a two-week-old agreement as smooth as making a new one?

*P7 — Trade-offs are shown as a pair, never collapsed into a score.*
Cost and footprint are held side by side, with the differing variables named. No weighted composite, no single "best". Grounded in the two-objective context (spec 008) and the risk of hiding the decision the user is there to make. Rules out a sustainability score. Test: after seeing the comparison, can the user say *which options* differ and what each costs?

*P8 — The agent proposes; the user disposes.*
The agent may fill forced values, propose completions and flag dead ends without asking. It may not make discretionary choices silently, and every action it takes is visible on the canvas and undoable. Grounded in mixed-initiative principles. Rules out silent defaults for aesthetic or budget-sensitive choices. Test: can the user always tell who chose a value — and undo it in one move?

Standing tension to watch: P1 (always show a valid whole) pulls toward the agent choosing a lot early, while P8 pulls against silent choice. The resolution is provenance — show the whole, mark clearly what the agent picked, make it cheap to change. If that resolution fails in use, one of the two principles is wrong.

## 3. Models to make

Each model isolates one decision. Listed with the question it answers and its current state, so it is visible which parts of the direction are still asserted rather than shown.

| Model | Decision it settles | State |
|---|---|---|
| Configuration state model — frames, provenance, derived vs chosen | What is the unit of revision and comparison? | Exists in code (spec 005); not drawn |
| Canvas anatomy — outcome terms, derived hardware, price/footprint, status vocabulary | How does one screen show a whole agreement plus its validity? | Built (004/007); no diagram, no alternatives explored |
| Conversation move inventory — the full set of moves each party can make | Where does initiative sit, and what is the agent allowed to do unasked? | Missing. The highest-value model to make next |
| Ripple storyboard — a revision, frame by frame, from utterance to applied repair | How much of the consequence set to show, and in what form? | Missing. This is the project's central claim (A4) and it has never been drawn |
| Comparison view — two candidates, differing variables, two deltas | How is a two-objective trade-off read at a glance? | Partially built; visual model unresolved (P7) |
| Session map — entry points, resumption, mid-contract revision, renewal | How does a returning operator re-enter a live agreement? | Missing |

The three missing models are all *exploring* work, and their absence is the finding in [phase-plan.md](phase-plan.md) §1.

## 4. Examples that make the direction concrete

The scripted scenarios in spec 006 are the direction's worked examples, and each should be readable as a demonstration of specific principles:

| Scenario ([jtbd/job-stories.md](jtbd/job-stories.md)) | Principles it demonstrates | Assertions it exercises |
|---|---|---|
| Needs, not nomenclature | P2, P1, P8 | A2, A3, A6 |
| Mid-contract revision | P6, P4, P3 | A4, A5 |
| Comparing agreements | P7, P1 | A2, A7 |
| Renewal as revision | P5, P6, P3 | A1, A4 |

Every principle is covered except P5, which only appears incidentally in the fourth scenario. Either a scenario should start from an unusual entry point, or P5 is a claim the demos will not support — worth deciding before 006 is approved.

## Related

- [problem-framing.md](problem-framing.md) — the problem this responds to
- [phase-plan.md](phase-plan.md) — how the missing models get made
- [../../specs/constitution.md](../../specs/constitution.md) — the engineering invariants these principles align with
