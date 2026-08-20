# Design direction

Status: working assertions, revised 2026-08-13. Answers the problem framed in [problem-framing.md](problem-framing.md).

## 1. Concept

*A negotiation over a living document.*

The durable object is the agreement, not the conversation. It sits on the canvas: outcome terms above, derived hardware beneath, price and footprint attached. It is always complete, always valid, and always editable from any point. The chat is a channel onto that document — a place to say what you want in your own words, to hear what a change would cost, and to be told why something cannot be done. The solver is the third party: it checks every draft and reports only what it can prove.

What the concept changes:

- The transcript stops being the record. It becomes the negotiation, and negotiations are not records.
- There is no "start" and no "finish". You join a document already in some state and leave it in another — which is exactly what mid-contract revision and renewal are ([jtbd/consumption-journey.md](jtbd/consumption-journey.md)).
- Both parties act on the same object. The agent's moves and the user's edits are the same kind of event, and both are undoable.
- Disagreement is normal and productive. "You can't have that" is a legitimate move as long as it comes with a reason.

Experientially, this should read as negotiating with a well-prepared counterpart who knows the rules, states them plainly, and does not overstate what it can do — rather than as filling in a form, interviewing an expert, or querying a database.

### Concepts explored and set aside

| Concept | Why it was attractive | Why rejected | What we kept from it |
|---|---|---|---|
| *The wizard with an assistant* — chat helps you through an ordered flow | It is what the industry ships, and it guarantees a complete spec at the end | It preserves the imposed decision order, the framing's second failure mode, and makes revision a matter of going back | Nothing structural. The completeness guarantee reappears as [always show a valid whole](principles/always-show-a-valid-whole.md), obtained by solver completion rather than by ordering |
| *The expert you interview* — the agent holds all state, you extract it by asking | Pure conversation, no second surface to design, and it reads as the natural LLM shape | It makes state invisible, prevents comparison, and puts the whole articulation burden on the user's questions | The elicitation voice: the agent still translates situation into terms ([elicitation uses the building's vocabulary](principles/elicit-in-the-buildings-vocabulary.md)) |
| *The spreadsheet that talks* — the canvas is primary, chat a command line onto it | Close to how a returning operator will actually work, and the operator is the primary persona | As a whole concept it gives up the elicitation that makes the tool usable to a first-timer | Its useful half: for a returning user, chat should be optional |

## 2. Principles

Rules for design decisions, each specific enough to reject an idea and to be about this product in particular. Constitution #5, #6 and #7 are the engineering statements of *always show a valid whole*, *every refusal names the rules that caused it* and *revision is an ordinary move*; these are the interaction-side formulations.

One note per principle, in [principles/](principles/). Each holds its grounding, what it rules out, and its test. Cite the note, not this section.

| Principle | Its test |
|---|---|
| [Always show a valid whole](principles/always-show-a-valid-whole.md) | Can the user, at any moment, say yes and get something real? |
| [Elicitation uses the building's vocabulary, not the catalogue's](principles/elicit-in-the-buildings-vocabulary.md) | Can someone who has never bought an elevator answer every question we ask? |
| [The canvas holds the state and the chat explains it](principles/canvas-holds-state-chat-explains.md) | Could you delete the transcript and still have everything the user needs to check? |
| [Every refusal names the rules that caused it](principles/refusals-name-their-rules.md) | Does the reason survive being checked against the model file? |
| [Configuration can start from any variable, in any order](principles/start-from-any-variable.md) | Can a session that starts with "the shaft is 1800 by 1700" go as well as one that starts with the building type? |
| [Revision is an ordinary move, not a restart](principles/revision-is-an-ordinary-move.md) | Is revising a two-week-old agreement as smooth as making a new one? |
| [Trade-offs are shown as a pair, not collapsed into a score](principles/trade-offs-shown-as-a-pair.md) | After seeing the comparison, can the user say *which options* differ and what each costs? |
| [The agent proposes and the user decides](principles/agent-proposes-user-decides.md) | Can the user always tell who chose a value, and undo it in one move? |

One standing tension, stated in full on both notes: [always show a valid whole](principles/always-show-a-valid-whole.md) pulls toward the agent choosing a lot early, [the agent proposes and the user decides](principles/agent-proposes-user-decides.md) pulls against silent choice, and provenance is the resolution.

## 3. Models to make

Each model isolates one decision. Listed with the question it answers and its current state, so it is visible which parts of the direction are still asserted rather than shown.

| Model                                                                                | Decision it settles                                                     | State                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configuration state model — drafts, provenance, derived vs chosen                    | What is the unit of revision and comparison?                            | the unit of comparison is a *draft*, a full configuration with its own provenance and history, of which a workspace holds several with one current ([parallel-drafts](../specs/parallel-drafts/requirements.md))                                                                                                                                                                                                                                                                                                                                                                    |
| Surface architecture — pattern, form, one grammar                                    | What surfaces exist, and in what form does agent-generated UI arrive?   | Drafted ([models/Surface architecture.md](models/Surface%20architecture.md)): geometry and form chosen from the industry-wide field, mechanisms ruled; the chosen patterns' shipped implementations are a registered research target ([gaps E6](../research/gaps.md#e6))                                                                                                                                                                                                                                                                                                            |
| Canvas anatomy — outcome terms, derived hardware, price/footprint, status vocabulary | How does one screen show a whole agreement plus its validity?           | Drafted 2026-08-14 ([models/Canvas anatomy.md](models/Canvas%20anatomy.md)): the agreement rendered in its own genre — recitals, operative terms, schedules — with the built spec sheet demoted to the schedule layer, and editability split into islands now, typed edits later. Puts [the representation of the agreement selects the user's moves](assertions/representation-selects-moves.md) under test. The [agreement-document spec](../specs/agreement-document/requirements.md) has realigned what is built onto this genre; whether it changes the move mix is unmeasured |
| Conversation move inventory — the full set of moves each party can make              | Where does initiative sit, and what is the agent allowed to do unasked? | Drafted ([models/Conversation moves.md](models/Conversation%20moves.md)): move tables, delegation boundary, initiative default decided                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Ripple storyboard — a revision, frame by frame, from utterance to applied repair     | How much of the consequence set to show, and in what form?              | Drafted ([models/Ripple storyboard.md](models/Ripple%20storyboard.md)): three disclosure levels drawn at the point of divergence, minimal-core-first chosen with the full set one move away. The built level is one of the three                                                                                                                                                                                                                                                                                                                                                    |
| Comparison view — two drafts, differing variables, two deltas                        | How is a two-objective trade-off read at a glance?                      | Drafted 2026-08-20 ([models/Comparison view.md](models/Comparison%20view.md)): the shipped chat card observed against a real fourteen-difference comparison and drawn as candidate one, a canvas comparison mode and a redline drawn against it, and the canvas mode chosen — the card's content kept wholesale, its placement rejected for failing in three of the four chat geometries and expiring at the first question about it. The chat keeps one sentence                                                                                                                                                             |
| Session map — entry points, resumption, mid-contract revision, renewal               | How does a returning operator re-enter a live agreement?                | Missing                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |


## 4. Examples that make the direction concrete

Five situated walkthroughs, one note each in [scenarios/](scenarios/). Each grounds a job story in a concrete path, names the principles it demonstrates and the assertions it exercises, and marks what in it is still a working hypothesis. They are the direction made inspectable: a principle no scenario plays through is asserted rather than shown.

A scenario is not a job story and not the solution — it is one way to make a branch of the direction visible, and it becomes an assumption test only where it has a learning question, a method and success criteria. Cite the note, not this section.

| Scenario | Grounds the job story | Principles it demonstrates | Assertions it exercises |
|---|---|---|---|
| [Needs, not nomenclature](scenarios/needs-not-nomenclature.md) | Needs, not nomenclature | [elicitation uses the building's vocabulary](principles/elicit-in-the-buildings-vocabulary.md), [always show a valid whole](principles/always-show-a-valid-whole.md), [the agent proposes and the user decides](principles/agent-proposes-user-decides.md) | [showing a candidate works better than asking a sequence of questions](assertions/candidate-works-better-than-questions.md), [generated in-chat controls work better than free text](assertions/generated-controls-work-better-than-free-text.md), [outcome-level elicitation works](assertions/outcome-level-elicitation.md), [choices that quote their source](assertions/choices-that-quote-their-source.md) |
| [Mid-contract revision](scenarios/mid-contract-revision.md) | Mid-contract revision | [revision is an ordinary move, not a restart](principles/revision-is-an-ordinary-move.md), [every refusal names the rules that caused it](principles/refusals-name-their-rules.md), [the canvas holds the state and the chat explains it](principles/canvas-holds-state-chat-explains.md) | [ripple at the moment of revision](assertions/ripple-at-the-moment-of-revision.md), [unsat cores are sufficient for trust](assertions/cores-are-sufficient-for-trust.md) |
| [Comparing agreements](scenarios/comparing-agreements.md) | Comparing agreements | [trade-offs shown as a pair](principles/trade-offs-shown-as-a-pair.md), [always show a valid whole](principles/always-show-a-valid-whole.md) | [showing a candidate works better than asking a sequence of questions](assertions/candidate-works-better-than-questions.md), [two objectives held as a pair](assertions/two-objectives-as-a-pair.md) |
| [Renewal as revision](scenarios/renewal-as-revision.md) | Renewal as revision | [configuration can start from any variable, in any order](principles/start-from-any-variable.md), [revision is an ordinary move, not a restart](principles/revision-is-an-ordinary-move.md), [the canvas holds the state and the chat explains it](principles/canvas-holds-state-chat-explains.md) | [the canvas is the durable locus of state](assertions/canvas-is-the-durable-state.md), [ripple at the moment of revision](assertions/ripple-at-the-moment-of-revision.md) |
| [Tender as entrance](scenarios/tender-as-entrance.md) | Tender as entrance | [configuration can start from any variable, in any order](principles/start-from-any-variable.md), [every refusal names the rules that caused it](principles/refusals-name-their-rules.md), [always show a valid whole](principles/always-show-a-valid-whole.md) | [a document-seeded candidate with named deviations is better than manual compliance checking](assertions/seeded-candidate-with-named-deviations.md), [unsat cores are sufficient for trust](assertions/cores-are-sufficient-for-trust.md) |

Every principle in §2 is demonstrated by at least one scenario. What the scenarios reach and what they do not is the split between the two right-hand columns: a principle is a rule about the artifact and a scenario can show it holding, while an assertion is a bet about people, and playing a walkthrough through it establishes feasibility rather than truth.

Each scenario is played twice — once by a presenter, from [docs/demo-scenarios.md](../demo-scenarios.md), and once by the [conversation checks](../specs/conversation-checks/requirements.md), which turn the checkable half into assertions that run.

## Related

- [principles/](principles/) — one note per principle, the §2 table expanded
- [scenarios/](scenarios/) — one note per scenario, the §4 table expanded
- [problem-framing.md](problem-framing.md) — the problem this responds to, and [assertions/](assertions/)
- [phase-plan.md](phase-plan.md) — how the missing models get made
- [../specs/constitution.md](../specs/constitution.md) — the engineering invariants these principles align with
