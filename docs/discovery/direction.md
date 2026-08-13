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

| Concept | Why it was attractive | Why rejected | What we kept from it |
|---|---|---|---|
| *The wizard with an assistant* — chat helps you through an ordered flow | It is what the industry ships, and it guarantees a complete spec at the end | It preserves the imposed decision order, the framing's second failure mode, and makes revision a matter of going back | Nothing structural. The completeness guarantee reappears as [always show a valid whole](principles/always-show-a-valid-whole.md), obtained by solver completion rather than by ordering |
| *The expert you interview* — the agent holds all state, you extract it by asking | Pure conversation, no second surface to design, and it reads as the natural LLM shape | It makes state invisible, defeats comparison, and puts the whole articulation burden on the user's questions | The elicitation voice: the agent still translates situation into terms ([speak the building's language](principles/speak-the-buildings-language.md)) |
| *The spreadsheet that talks* — the canvas is primary, chat a command line onto it | Close to how a returning operator will actually work, and the operator is the primary persona | As a whole concept it gives up the elicitation that makes the tool usable to a first-timer | Its useful half: for a returning user, chat should be optional |

## 2. Principles

Rules for design decisions. Sharp enough to reject an idea, specific enough to be about this product. Constitution #5, #6 and #7 are the engineering statements of *always show a valid whole*, *every "no" carries its reason* and *changing your mind is not a restart*; these are the interaction-side formulations.

One note per principle, in [principles/](principles/). Each holds its grounding, what it rules out, and its test. Cite the note, not this section.

| Principle | Its test |
|---|---|
| [Always show a valid whole](principles/always-show-a-valid-whole.md) | Can the user, at any moment, say yes and get something real? |
| [Speak the building's language, not the catalogue's](principles/speak-the-buildings-language.md) | Can someone who has never bought an elevator answer every question we ask? |
| [The canvas remembers; the chat explains](principles/canvas-remembers-chat-explains.md) | Could you delete the transcript and lose nothing but the argument? |
| [Every "no" carries its reason](principles/every-no-carries-its-reason.md) | Does the reason survive being checked against the model file? |
| [Any door is an entrance](principles/any-door-is-an-entrance.md) | Can a session that starts with "the shaft is 1800 by 1700" go as well as one that starts with the building type? |
| [Changing your mind is a normal move, not a restart](principles/revision-is-not-a-restart.md) | Is revising a two-week-old agreement as smooth as making a new one? |
| [Trade-offs are shown as a pair, never collapsed into a score](principles/trade-offs-shown-as-a-pair.md) | After seeing the comparison, can the user say *which options* differ and what each costs? |
| [The agent proposes; the user disposes](principles/agent-proposes-user-disposes.md) | Can the user always tell who chose a value — and undo it in one move? |

One standing tension, stated in full on both notes: [always show a valid whole](principles/always-show-a-valid-whole.md) pulls toward the agent choosing a lot early, [the agent proposes, the user disposes](principles/agent-proposes-user-disposes.md) pulls against silent choice, and provenance is the resolution.

## 3. Models to make

Each model isolates one decision. Listed with the question it answers and its current state, so it is visible which parts of the direction are still asserted rather than shown.

| Model | Decision it settles | State |
|---|---|---|
| Configuration state model — frames, provenance, derived vs chosen | What is the unit of revision and comparison? | Exists in code ([nonlinear interaction](../specs/nonlinear-interaction/requirements.md)); not drawn |
| Surface architecture — pattern, form, one grammar | What surfaces exist, and in what form does agent-generated UI arrive? | Drafted ([models/Surface architecture.md](models/Surface%20architecture.md)): geometry and form chosen from the industry-wide field, mechanisms ruled; the chosen patterns' shipped implementations are a registered research target ([gaps E6](../research/gaps.md#e6)) |
| Canvas anatomy — outcome terms, derived hardware, price/footprint, status vocabulary | How does one screen show a whole agreement plus its validity? | Built by the [canvas](../specs/configuration-canvas/requirements.md) and reframed by the [service pivot](../specs/eaas-pivot/requirements.md), with its mechanisms chosen against named alternatives (edit protocol, control vocabulary, control-selection locus — the [canvas design](../specs/configuration-canvas/design.md)). The anatomy itself is undrawn, and what is built predates the service and footprint frames |
| Conversation move inventory — the full set of moves each party can make | Where does initiative sit, and what is the agent allowed to do unasked? | Drafted ([models/Conversation moves.md](models/Conversation%20moves.md)): move tables, delegation boundary, initiative default decided |
| Ripple storyboard — a revision, frame by frame, from utterance to applied repair | How much of the consequence set to show, and in what form? | Drafted ([models/Ripple storyboard.md](models/Ripple%20storyboard.md)): three disclosure levels drawn at the point of divergence, minimal-core-first chosen with the full set one move away. The built level is one of the three |
| Comparison view — two candidates, differing variables, two deltas | How is a two-objective trade-off read at a glance? | Chat-side diff built, its canvas placement deferred ([nonlinear interaction](../specs/nonlinear-interaction/requirements.md)). The two-objective layout is unresolved and unbuildable until footprint exists ([trade-offs shown as a pair](principles/trade-offs-shown-as-a-pair.md)) |
| Session map — entry points, resumption, mid-contract revision, renewal | How does a returning operator re-enter a live agreement? | Missing |

The outstanding *exploring* work is concentrated in two rows — the comparison view, which cannot be judged against [trade-offs shown as a pair](principles/trade-offs-shown-as-a-pair.md) until footprint exists, and the session map, which has no counterpart in code either. That is the finding in [phase-plan.md](phase-plan.md) §1.

## 4. Examples that make the direction concrete

The scripted scenarios in the [demo-scenarios spec](../specs/demo-scenarios/requirements.md) are the direction's worked examples, and each should be readable as a demonstration of specific principles:

| Scenario ([jtbd/job-stories.md](jtbd/job-stories.md)) | Principles it demonstrates | Assertions it exercises |
|---|---|---|
| Needs, not nomenclature | [speak the building's language](principles/speak-the-buildings-language.md), [always show a valid whole](principles/always-show-a-valid-whole.md), [the agent proposes, the user disposes](principles/agent-proposes-user-disposes.md) | [a candidate beats a question sequence](assertions/candidate-beats-questions.md), [generated controls beat free text](assertions/generated-controls-beat-free-text.md), [outcome-level elicitation works](assertions/outcome-level-elicitation.md) |
| Mid-contract revision | [changing your mind is not a restart](principles/revision-is-not-a-restart.md), [every "no" carries its reason](principles/every-no-carries-its-reason.md), [the canvas remembers, the chat explains](principles/canvas-remembers-chat-explains.md) | [ripple at the moment of revision](assertions/ripple-at-the-moment-of-revision.md), [cores are enough for trust](assertions/cores-are-enough-for-trust.md) |
| Comparing agreements | [trade-offs shown as a pair](principles/trade-offs-shown-as-a-pair.md), [always show a valid whole](principles/always-show-a-valid-whole.md) | [a candidate beats a question sequence](assertions/candidate-beats-questions.md), [two objectives held as a pair](assertions/two-objectives-as-a-pair.md) |
| Renewal as revision | [any door is an entrance](principles/any-door-is-an-entrance.md), [changing your mind is not a restart](principles/revision-is-not-a-restart.md), [the canvas remembers, the chat explains](principles/canvas-remembers-chat-explains.md) | [the canvas is the durable state](assertions/canvas-is-the-durable-state.md), [ripple at the moment of revision](assertions/ripple-at-the-moment-of-revision.md) |

Every principle is covered except [any door is an entrance](principles/any-door-is-an-entrance.md), which only appears incidentally in the fourth scenario. Either a scenario should start from an unusual entry point, or it is a claim the demos will not support — worth deciding before that spec is approved.

## Related

- [principles/](principles/) — one note per principle, the §2 table expanded
- [problem-framing.md](problem-framing.md) — the problem this responds to, and [assertions/](assertions/)
- [phase-plan.md](phase-plan.md) — how the missing models get made
- [../specs/constitution.md](../specs/constitution.md) — the engineering invariants these principles align with
