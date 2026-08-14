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

| Model | Decision it settles | State |
|---|---|---|
| Configuration state model — frames, provenance, derived vs chosen | What is the unit of revision and comparison? | Exists in code ([nonlinear interaction](../specs/nonlinear-interaction/requirements.md)); not drawn |
| Surface architecture — pattern, form, one grammar | What surfaces exist, and in what form does agent-generated UI arrive? | Drafted ([models/Surface architecture.md](models/Surface%20architecture.md)): geometry and form chosen from the industry-wide field, mechanisms ruled; the chosen patterns' shipped implementations are a registered research target ([gaps E6](../research/gaps.md#e6)) |
| Canvas anatomy — outcome terms, derived hardware, price/footprint, status vocabulary | How does one screen show a whole agreement plus its validity? | Drafted 2026-08-14 ([models/Canvas anatomy.md](models/Canvas%20anatomy.md)): the agreement rendered in its own genre — recitals, operative terms, schedules — with the built spec sheet demoted to the schedule layer, and editability split into islands now, typed edits later. Puts [the representation of the agreement selects the user's moves](assertions/representation-selects-moves.md) under test. What is built predates the genre decision; realigning it is the [agreement-document spec](../specs/agreement-document/requirements.md) (draft) |
| Conversation move inventory — the full set of moves each party can make | Where does initiative sit, and what is the agent allowed to do unasked? | Drafted ([models/Conversation moves.md](models/Conversation%20moves.md)): move tables, delegation boundary, initiative default decided |
| Ripple storyboard — a revision, frame by frame, from utterance to applied repair | How much of the consequence set to show, and in what form? | Drafted ([models/Ripple storyboard.md](models/Ripple%20storyboard.md)): three disclosure levels drawn at the point of divergence, minimal-core-first chosen with the full set one move away. The built level is one of the three |
| Comparison view — two candidates, differing variables, two deltas | How is a two-objective trade-off read at a glance? | Chat-side diff built and carrying both deltas since the [footprint spec](../specs/environmental-footprint/requirements.md) landed; its canvas placement deferred ([nonlinear interaction](../specs/nonlinear-interaction/requirements.md)). The two-objective *layout* is unexplored — no alternatives yet sketched against [trade-offs shown as a pair](principles/trade-offs-shown-as-a-pair.md) |
| Session map — entry points, resumption, mid-contract revision, renewal | How does a returning operator re-enter a live agreement? | Missing |

The outstanding *exploring* work is concentrated in two rows — the comparison view, judgeable against [trade-offs shown as a pair](principles/trade-offs-shown-as-a-pair.md) now that footprint exists but still undrawn, and the session map, which has no counterpart in code either. That is the finding in [phase-plan.md](phase-plan.md) §1.

## 4. Examples that make the direction concrete

The scripted scenarios in the [demo-scenarios spec](../specs/demo-scenarios/requirements.md) are the direction's worked examples, and each should be readable as a demonstration of specific principles:

| Scenario ([jtbd/job-stories.md](jtbd/job-stories.md)) | Principles it demonstrates | Assertions it exercises |
|---|---|---|
| Needs, not nomenclature | [elicitation uses the building's vocabulary](principles/elicit-in-the-buildings-vocabulary.md), [always show a valid whole](principles/always-show-a-valid-whole.md), [the agent proposes and the user decides](principles/agent-proposes-user-decides.md) | [showing a candidate works better than asking a sequence of questions](assertions/candidate-works-better-than-questions.md), [generated in-chat controls work better than free text](assertions/generated-controls-work-better-than-free-text.md), [outcome-level elicitation works](assertions/outcome-level-elicitation.md) |
| Mid-contract revision | [revision is an ordinary move, not a restart](principles/revision-is-an-ordinary-move.md), [every refusal names the rules that caused it](principles/refusals-name-their-rules.md), [the canvas holds the state and the chat explains it](principles/canvas-holds-state-chat-explains.md) | [ripple at the moment of revision](assertions/ripple-at-the-moment-of-revision.md), [unsat cores are sufficient for trust](assertions/cores-are-sufficient-for-trust.md) |
| Comparing agreements | [trade-offs shown as a pair](principles/trade-offs-shown-as-a-pair.md), [always show a valid whole](principles/always-show-a-valid-whole.md) | [showing a candidate works better than asking a sequence of questions](assertions/candidate-works-better-than-questions.md), [two objectives held as a pair](assertions/two-objectives-as-a-pair.md) |
| Renewal as revision | [configuration can start from any variable, in any order](principles/start-from-any-variable.md), [revision is an ordinary move, not a restart](principles/revision-is-an-ordinary-move.md), [the canvas holds the state and the chat explains it](principles/canvas-holds-state-chat-explains.md) | [the canvas is the durable locus of state](assertions/canvas-is-the-durable-state.md), [ripple at the moment of revision](assertions/ripple-at-the-moment-of-revision.md) |
| Tender as entrance | [configuration can start from any variable, in any order](principles/start-from-any-variable.md), [every refusal names the rules that caused it](principles/refusals-name-their-rules.md), [always show a valid whole](principles/always-show-a-valid-whole.md) | [a document-seeded candidate with named deviations is better than manual compliance checking](assertions/seeded-candidate-with-named-deviations.md), [unsat cores are sufficient for trust](assertions/cores-are-sufficient-for-trust.md) |

## Related

- [principles/](principles/) — one note per principle, the §2 table expanded
- [problem-framing.md](problem-framing.md) — the problem this responds to, and [assertions/](assertions/)
- [phase-plan.md](phase-plan.md) — how the missing models get made
- [../specs/constitution.md](../specs/constitution.md) — the engineering invariants these principles align with
