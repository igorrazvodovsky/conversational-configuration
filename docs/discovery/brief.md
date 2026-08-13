# Discovery brief

Standing summary of the interaction-design discovery for the conversational configurator. Revised 2026-08-13. Read this first; the other three artifacts hold the detail.

## 1. The challenge, the outcome, the direction

*The challenge.* Configuring a complex product-service is nonlinear, stateful and constraint-coupled. Conversation is linear, ephemeral and unstructured. Form-based configurators hold the state but demand vocabulary and a decision order the user does not have; chat removes the vocabulary barrier but loses the record, the structure, and the ability to revise. Putting an LLM in front of a configurator relocates that conflict rather than resolving it.

*The outcome we want.* A person can describe a building in their own words, receive a valid service agreement they can react to, change their mind about anything at any point, see exactly what the change breaks and what it costs in both money and carbon, and come back weeks later to revise the same living document. Every "no" they hear traces to a named rule.

*The direction.* One concept — *a negotiation over a living document* — with eight principles that make it decidable. The canvas holds the agreement; the chat holds the negotiation; the solver sits at the table as a third party that checks every draft and never bluffs.

*What is settled and out of frame.* The service business model (spec 007), footprint as a decision dimension (spec 008), and the solver-as-source-of-truth architecture are fixed. Discovery covers only their interaction consequences.

## 2. The problem, elaborated

Three conditions make this problem what it is.

*The articulation barrier is structural, not incidental.* The architect specifying an elevator speaks in beds, floors and lobbies; the configurator asks for rated load and door type. This is not a labelling problem to solve with better microcopy — the translation between situation and parameter is genuinely the expert's work, and the interface has been handing it to the novice. The service frame helps: outcome terms (capacity, uptime, response time, monthly price) are a layer the customer can actually speak in, with hardware derived beneath.

*The primary user is a reviser, not a newcomer.* The service frame makes the building operator the central persona, and their job — monitor, modify, conclude — is mostly modification of something that already exists. First-time configuration is the atypical case. An interface optimized for onboarding is optimized for the wrong user.

*Revision is where the design problem actually lives.* Changing an early decision ripples through constraints the user never saw. A linear transcript has nowhere to show that ripple, so revision degrades into starting over. This is the point at which conversational configuration either earns its existence or does not, and it is the project's novelty claim.

Seven assertions carry the design ([problem-framing.md](problem-framing.md) §4). Three are load-bearing: that showing a valid candidate beats interrogation (A2), that ripple shown at the moment of revision makes nonlinear change tolerable (A4), and that two objectives held as an explicit pair beat a collapsed score (A7). A4 is the one whose failure would cost the project its claim; A7 is the least supported by anything but reasoning.

## 3. The direction, in short

The document is durable; the conversation is not. Both parties act on the same object, and both kinds of action are visible and undoable. There is no start and no finish — you join a document in one state and leave it in another, which is what mid-contract revision and renewal already are.

Eight principles, each written to reject ideas ([direction.md](direction.md) §2):

1. Always show a valid whole.
2. Speak the building's language, not the catalogue's.
3. The canvas remembers; the chat explains.
4. Every "no" carries its reason.
5. Any door is an entrance.
6. Changing your mind is a normal move, not a restart.
7. Trade-offs are shown as a pair, never collapsed into a score.
8. The agent proposes; the user disposes.

The tension to watch is between 1 and 8: showing a complete valid candidate means the agent chooses a lot, early. The resolution is visible provenance plus cheap reversal. If that fails in use, one of the two principles is wrong.

Rejected concepts, kept on the record: the wizard with an assistant (preserves the imposed order), the expert you interview (hides the state), the spreadsheet that talks (gives up elicitation, but is closer than the others to how a returning operator will use the tool — so chat should be optional for them).

## 4. Supporting detail

The evidence base is five research threads plus industry practice ([../research/](../research/README.md)) and a JTBD analysis ([jtbd/](jtbd/README.md)). Three points do most of the work.

The configuration literature settled the architecture question a decade before LLMs: the symbolic engine owns validity, the language layer elicits and explains. What it never produced was the frontend — published prototypes are pipelines and pure chat. That gap is the design opportunity, and it is why this project's contribution has to be an *interaction* contribution, judged as one.

Industry practice converged independently on the same interaction shape: needs-based entry, continuous validity, entry from any angle, propose-check-repair rather than a wizard. Elevators are the founding benchmark of the field, and the original 1988 system was already propose-and-revise. The prototype is not inventing a flow; it is giving a known flow a conversational surface.

The job analysis relocated the user. [Laddering](jtbd/job-ladder.md) from "configure an elevator" reaches "keep people and goods moving through a building over its life" — a job that outlasts the purchase. A product configurator serves define-through-confirm and exits precisely where the operator's struggle begins. That is the argument the service pivot rests on, and it is also what makes revision the primary interaction rather than an edge case.

The honest limitation: no real job performers have been consulted. Personas, journey and assertions are desk-research hypotheses, and the brief keeps calling them that.

## 5. Where this stands and what happens next

The discovery finding that matters most is about the work itself: this project moved from gathering straight to focusing, with almost no exploration in between. Every significant interaction decision was made once, inline, during implementation, with no alternatives on the table — and three of the six models the direction needs have never been drawn ([phase-plan.md](phase-plan.md) §1). That also explains why spec 006 has been stuck in draft: scenarios are a focusing artifact and they are hard to commit to when the direction beneath them was never explicitly chosen. The direction now exists, so 006 can be judged.

Next cycle, in order:

1. Draw the conversation move inventory and decide the initiative default.
2. Storyboard revision-with-ripple at three levels of disclosure; choose one.
3. Sketch two comparison layouts against principle 7; choose one.
4. Judge spec 006's scenarios against principle coverage, then approve. Principle 5 is currently uncovered by any scenario — either add one or drop the claim.
5. Check specs 007 and 008 acceptance criteria against the eight principles.
6. Walk the running prototype through all four scenarios and record every contradiction with a principle. This is the cycle's only real evidence against A1–A7, and with no user access it is the best available.

Discovery continues rather than stops: the exploration gap is open, and the four questions in [problem-framing.md](problem-framing.md) §5 are unanswered.

## Related

- [problem-framing.md](problem-framing.md) · [direction.md](direction.md) · [phase-plan.md](phase-plan.md)
- [../../specs/README.md](../../specs/README.md) — the execution layer
