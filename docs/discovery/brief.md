# Discovery brief

Standing summary of the interaction-design discovery for the conversational configurator. Revised 2026-08-13. Read this first; the other three artifacts hold the detail.

## 1. The challenge, the outcome, the direction

*The challenge.* Configuring a complex product-service is nonlinear, stateful and constraint-coupled. Conversation is linear, ephemeral and unstructured. Form-based configurators hold the state but demand vocabulary and a decision order the user does not have; chat removes the vocabulary barrier but loses the record, the structure, and the ability to revise. Putting an LLM in front of a configurator relocates that conflict rather than resolving it.

*The outcome we want.* A person can describe a building in their own words, receive a valid service agreement they can react to, change their mind about anything at any point, see exactly what the change breaks and what it costs in both money and carbon, and come back weeks later to revise the same living document. Every "no" they hear traces to a named rule.

*The direction.* One concept — *a negotiation over a living document* — with eight principles that make it decidable. The canvas holds the agreement; the chat holds the negotiation; the solver sits at the table as a third party that checks every draft and never bluffs.

*What is settled and out of frame.* The service business model (the [service pivot](../specs/eaas-pivot/requirements.md)), footprint as a decision dimension (the [footprint spec](../specs/environmental-footprint/requirements.md)), and the solver-as-source-of-truth architecture are fixed. Discovery covers only their interaction consequences.

## 2. The problem, elaborated

Three conditions make this problem what it is.

*The articulation barrier is structural, not incidental.* The architect specifying an elevator speaks in beds, floors and lobbies; the configurator asks for rated load and door type. This is not a labelling problem to solve with better microcopy — the translation between situation and parameter is genuinely the expert's work, and the interface has been handing it to the novice. The service frame helps: outcome terms (capacity, uptime, response time, monthly price) are a layer the customer can actually speak in, with hardware derived beneath.

*The primary user is a reviser, not a newcomer.* The service frame makes the building operator the central persona, and their job — monitor, modify, conclude — is mostly modification of something that already exists. First-time configuration is the atypical case. An interface optimized for onboarding is optimized for the wrong user.

*Revision is where the design problem actually lives.* Changing an early decision ripples through constraints the user never saw. A linear transcript has nowhere to show that ripple, so revision degrades into starting over. This is the point at which conversational configuration either earns its existence or does not, and it is the project's novelty claim.

Seven assertions carry the design — one note each, indexed in [problem-framing.md](problem-framing.md) §4. Three are load-bearing: that showing a valid candidate beats interrogation ([a candidate beats a question sequence](assertions/candidate-beats-questions.md)), that ripple shown at the moment of revision makes nonlinear change tolerable ([ripple at the moment of revision](assertions/ripple-at-the-moment-of-revision.md)), and that two objectives held as an explicit pair beat a collapsed score ([two objectives held as a pair](assertions/two-objectives-as-a-pair.md)). The second is the one whose failure would cost the project its claim; the third is the least supported by anything but reasoning.

## 3. The direction, in short

The document is durable; the conversation is not. Both parties act on the same object, and both kinds of action are visible and undoable. There is no start and no finish — you join a document in one state and leave it in another, which is what mid-contract revision and renewal already are. The surfaces that carry this are settled: a split workspace, with agent-generated UI as purpose-built components whose options are computed from solver state rather than composed by the model ([models/Surface architecture.md](models/Surface%20architecture.md)).

Eight principles, each written to reject ideas — one note each in [principles/](principles/), indexed in [direction.md](direction.md) §2:

1. [Always show a valid whole](principles/always-show-a-valid-whole.md).
2. [Speak the building's language, not the catalogue's](principles/speak-the-buildings-language.md).
3. [The canvas remembers; the chat explains](principles/canvas-remembers-chat-explains.md).
4. [Every "no" carries its reason](principles/every-no-carries-its-reason.md).
5. [Any door is an entrance](principles/any-door-is-an-entrance.md).
6. [Changing your mind is a normal move, not a restart](principles/revision-is-not-a-restart.md).
7. [Trade-offs are shown as a pair, never collapsed into a score](principles/trade-offs-shown-as-a-pair.md).
8. [The agent proposes; the user disposes](principles/agent-proposes-user-disposes.md).

The tension to watch is between the first and the last: showing a complete valid candidate means the agent chooses a lot, early. The resolution is visible provenance plus cheap reversal. If that fails in use, one of the two principles is wrong.

Rejected concepts, kept on the record: the wizard with an assistant (preserves the imposed order), the expert you interview (hides the state), the spreadsheet that talks (gives up elicitation, but is closer than the others to how a returning operator will use the tool — so chat should be optional for them).

## 4. Supporting detail

The evidence base is five research threads plus industry practice ([../research/](../research/README.md)) and a JTBD analysis ([jtbd/](jtbd/README.md)). Three points do most of the work.

The configuration literature settled the architecture question a decade before LLMs: the symbolic engine owns validity, the language layer elicits and explains. What it never produced was the frontend — published prototypes are pipelines and pure chat. That gap is the design opportunity, and it is why this project's contribution has to be an *interaction* contribution, judged as one.

Industry practice converged independently on the same interaction shape: needs-based entry, continuous validity, entry from any angle, propose-check-repair rather than a wizard. Elevators are the founding benchmark of the field, and the original 1988 system was already propose-and-revise. The prototype is not inventing a flow; it is giving a known flow a conversational surface.

The user's job outlasts the purchase. [Laddering](jtbd/job-ladder.md) from "configure an elevator" reaches "keep people and goods moving through a building over its life". A product configurator serves define-through-confirm and exits precisely where the operator's struggle begins. That is the argument the service pivot rests on, and it is also what makes revision the primary interaction rather than an edge case.
