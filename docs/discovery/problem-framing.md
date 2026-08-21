# Problem framing

Status: working assertions, revised 2026-08-14. It frames the *interaction-design* problem only, and treats the service model and footprint dimension as fixed context, set out under *Contextual statements*.

## 1. Problem statement

A person responsible for a building's vertical transportation has to commit to an agreement whose terms are coupled by hundreds of constraints they can't see. The two interfaces available to them each fail at the opposite end.

- A *form-based configurator* holds state well and shows the whole decision, but demands vocabulary the person doesn't have and a decision order they can't supply. The architect knows beds, floors and lobbies, and the form asks for rated load and door type. It also assumes decisions arrive in its order, when real projects settle shaft depth before anyone has agreed on speed.
- *Pure chat* removes the vocabulary barrier, since you can describe the building in your own words, but it forgets what was decided, hides the state, and is linear. Nothing shows what has been decided, changing an early answer means re-litigating the transcript, and two candidate agreements can't be held side by side.

The core conflict: *configuration is nonlinear, stateful and constraint-coupled, and conversation is linear, ephemeral and unstructured.* Putting an LLM in front of a configurator relocates that conflict rather than resolving it.

### Five whys

1. Why can't people configure an elevator service themselves? They don't know the vocabulary or which decisions matter.
2. Why does that block them? The interface makes them supply the parameters, so the burden of translation is theirs.
3. Why is that burden theirs? Because the interface has no way to work from a situation, only from values.
4. Why can't chat take over? Because chat drops the two things a configurator is actually for: a visible record of the whole decision, and the ability to revise any part of it without starting over.
5. Why is revision the hard part? Because a change ripples through constraints the user never saw, and an interface with no persistent structure has nowhere to show the ripple.

The last why is the design problem: *nonlinear revision, made legible, is what a conversational configurator has to deliver.*

### What this is not

This isn't "make configuration easier with AI", and it isn't a chatbot wrapper on an existing CPQ flow. The claim under test is narrower: that a conversational surface plus a synchronized structured surface, over a solver whose answers are checkable, can support a decision process that neither surface supports alone.

## 2. Project objectives

These are written as testable starting assumptions, with the assumption inside each one named.

| Objective                                                                                                 | Hidden assumption to probe                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Produce a research prototype demonstrating conversational navigation of a constrained configuration space | That a prototype is the right evidence at all. Could a paper analysis or a wizard-of-oz study answer the question more cheaply? Provisionally no: the argued novelty is the *interaction*, which has to be operable to be judged. |
| Fidelity: working software over four scripted scenarios, illustrative data, single product family         | That four scenarios cover the design claim. Verify that each scenario maps to at least one assertion under test, and retire any that maps to none.                                                                                          |
| The solver decides validity; the agent elicits, translates and explains                                   | Settled by constitution #1. It is restated here because it is the source of most interaction constraints rather than an implementation detail.                                                                                              |
| Ship as a forkable template for the pattern                                                               | That template quality and research-prototype quality are compatible. They conflict at the margins, and when they do, the research argument wins.                                                                                  |

Non-objectives: production readiness, real pricing or LCA data, multi-product-family scale, evaluation with real users.

## 3. Contextual statements

Only the context that changes design decisions is recorded here.

*Business.* The offering is a service agreement, not a machine (the [service-agreement spec](../specs/service-agreement/requirements.md)). This is fixed. Its interaction consequence is large: what gets configured are outcome terms — handling capacity, uptime, response time, term, monthly price — with the hardware spec derived beneath them. Elicitation therefore has a natural top layer that the product frame lacked. A second fixed decision, environmental footprint as a decision dimension (the [footprint spec](../specs/environmental-footprint/requirements.md)), means the interface has to hold *two* optimization objectives at once, so a single "best" candidate is no longer meaningful.

*Procurement.* Agreements don't begin with a person at a configurator. They begin with an inbound requirements document. A new build is tendered — the customer's side issues an RFQ — and under the service frame that document speaks outcome terms, the layer the interface already configures. This is in frame as an *entrance* rather than a reframe: the document seeds the workspace the operator later revises, so acquisition and revision are one document's life. Its interaction consequence is a flip in the conversation's opening job — from the user explaining what they need to the parties reconciling *deviations* between what the document asks and what the catalogue can promise ([a document-seeded candidate with named deviations is better than manual compliance checking](assertions/seeded-candidate-with-named-deviations.md)). Prescriptive RFQs — hardware parameters written by a consultant, often against a competitor's catalogue — are a second, harder case held for later. Their upward translation into outcome terms is the articulation barrier demonstrated on a real artifact.

*User.* There are three goal-based personas. The [delivery lead](jtbd/persona-delivery-lead.md) needs early certainty, because shaft dimensions get poured in concrete. The [design specifier](jtbd/persona-design-specifier.md) iterates constantly on incomplete information and speaks only building language. And the [building operator](jtbd/persona-building-operator.md)'s struggle sits in the stages a product configurator abandons: monitor, modify, conclude. The service frame makes the operator the primary persona, and the operator's characteristic move is *revision of an existing agreement* rather than first-time configuration. The design target is therefore the reviser rather than the newcomer.

*Domain.* Elevator configuration is the founding benchmark of knowledge-based configuration — VT and Sisyphus-VT, at about 280 parameters and 88 constraints — and it was never a linear wizard, because the original method is propose, check, repair. Industry practice, in Tacton and Configit, converged on needs-based entry, continuous validity and entry from any angle. The interaction pattern isn't novel to this project. What is missing in the literature is its *frontend*.

*Technology.* Z3 gives three operations the interaction can lean on directly: incremental `check` for continuous validity, `consequences` for greying out what is no longer reachable, and named unsat cores for explanations that trace to business rules. Shared agent state (CopilotKit v2) makes chat and canvas two views of one object rather than two stores to reconcile. These are enabling constraints: the interaction design should exploit what the solver can prove, and claim nothing more.

*Content.* About 20 user-facing decisions over 30 to 80 constraints. Footprint and price data are illustrative with plausible relative magnitudes, and RFQ documents are authored fixtures of the same epistemic status, because there is no access to real tenders. It is small enough that the whole configuration fits on one canvas, which is a fidelity limitation worth stating: a real platform exposes 20 to 40 decisions over 250 or more parameters, and the canvas wouldn't fit.

## 4. Assertions under test

These are the interaction-design hypotheses the prototype exists to examine. Each is provisional, and each is a note in [assertions/](assertions/) holding its evidence, its falsification condition, and what rests on it. Cite the note rather than this section.

| Assertion | Evidence today |
|---|---|
| [The canvas, rather than the transcript, is the durable locus of state](assertions/canvas-is-the-durable-state.md), with the chat for negotiation and explanation | Research threads D and E, implemented by the [agreement document](../specs/agreement-document/requirements.md) and [nonlinear interaction](../specs/nonlinear-interaction/requirements.md) |
| [Showing a valid candidate to react to works better than asking a sequence of questions](assertions/candidate-works-better-than-questions.md) | Strong in the recommender literature (critiquing surveys), untested here |
| [Generated in-chat controls work better than free text](assertions/generated-controls-work-better-than-free-text.md) when the user lacks vocabulary | Chen et al. 2025 shows large margins on comparison-heavy tasks |
| [Nonlinear revision becomes workable when the ripple is shown *at the moment of revision*](assertions/ripple-at-the-moment-of-revision.md), with repairs proposed | The design bet of [nonlinear interaction](../specs/nonlinear-interaction/requirements.md), with no evidence yet |
| [Explanations grounded in unsat cores are sufficient for trust](assertions/cores-are-sufficient-for-trust.md), with no invented justification needed | Constitution #6, and consensus in the configuration literature |
| [Outcome-level elicitation works](assertions/outcome-level-elicitation.md): people can specify an agreement in outcome terms and let hardware derive | Tacton's needs-based practice, plus the service frame |
| [Two objectives, cost and footprint, held as an explicit pair make the trade-off legible](assertions/two-objectives-as-a-pair.md) where a single score would hide it | The carbon-presentation literature, all of it food labelling, so the transfer to a capital good is itself an assumption |
| [The representation of the agreement selects the user's moves](assertions/representation-selects-moves.md): a document elicits negotiation, and a form elicits form-filling | Reasoning plus the dialogue literature on common ground, untested here. It is the basis of the genre choice in [Canvas anatomy](models/Canvas%20anatomy.md) |
| [A document-seeded candidate with named deviations is better than manual compliance checking](assertions/seeded-candidate-with-named-deviations.md): an inbound document seeds the agreement, and its unmet requirements become a solver-computed deviation register | Deviation registers are existing tender practice, produced by hand. There is no evidence for the seeded flow, and the [rfq-reconciliation spec](../specs/rfq-reconciliation/requirements.md) exists to test it |
| [A choice that quotes its source can be revisited without re-arguing attribution](assertions/choices-that-quote-their-source.md): grounds at the level of quoted words are what keep delegation tolerable | The document channel implements it, as an RFQ clause plus quote, verified in the app, and tender compliance practice cites clauses. The prose channel is untested, and the [choice-provenance spec](../specs/choice-provenance/requirements.md) exists to test it |
| [An agreement that carries its open points can be resumed without rereading the conversation](assertions/open-points-carried-by-the-document.md): the document names what is still unanswered, and acceptance is a recorded fact rather than a conversational one | Genre practice, in issues lists and clarification logs, untested here. The [open-points spec](../specs/open-points/requirements.md) exists to test it |

Three carry the most weight: [showing a candidate works better than asking a sequence of questions](assertions/candidate-works-better-than-questions.md), [showing the ripple at the moment of revision makes nonlinear change workable](assertions/ripple-at-the-moment-of-revision.md), and [two objectives held as a pair make the trade-off legible](assertions/two-objectives-as-a-pair.md). If the ripple claim fails, the project loses its novelty. If the candidate claim fails, the conversational surface is decoration.

## 5. Open questions the framing does not settle

- What is the unit of revision — a single variable, a named frame, or an intent expressed in outcome terms?
- When the customer's own past statement and the live agreement disagree, what is that statement: a deviation to reconcile, as a document clause is, or history superseded by the later move? The RFQ register's frozen-reference mechanism assumes an immutable counterparty position, and conversational intent is mutable, so a cross-channel stated-needs register needs supersession semantics before it can exist. It is named out of scope in the [choice-provenance spec](../specs/choice-provenance/requirements.md).

## Related

- [One note per assertion](assertions/), the *Assertions under test* table expanded
- [What we have committed to in response](direction.md), and the [principles](principles/) that follow
- [The evidence base](../research/README.md), and [its gap register](../research/gaps.md)
- [Job, personas and journey, as atomic notes](jtbd/README.md)
