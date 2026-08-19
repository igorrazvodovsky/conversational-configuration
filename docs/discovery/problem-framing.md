# Problem framing

Status: working assertions, revised 2026-08-14. Frames the *interaction-design* problem only; the service model and footprint dimension are fixed context (see §3).

## 1. Problem statement

A person responsible for a building's vertical transportation has to commit to an agreement whose terms are coupled by hundreds of constraints they cannot see. The two interfaces available to them each fail at the opposite end:

- A *form-based configurator* holds state well and shows the whole decision, but demands vocabulary the person does not have and a decision order they cannot supply. The architect knows beds, floors and lobbies; the form asks for rated load and door type. It also assumes decisions arrive in its order, when real projects settle shaft depth before anyone has agreed on speed.
- *Pure chat* removes the vocabulary barrier, since you can describe the building in your own words, but it forgets what was decided, hides the state, and is linear. Nothing shows what has been decided, changing an early answer means re-litigating the transcript, and two candidate agreements cannot be held side by side.

The core conflict: *configuration is nonlinear, stateful and constraint-coupled; conversation is linear, ephemeral and unstructured.* Putting an LLM in front of a configurator relocates that conflict rather than resolving it.

### Five whys

1. Why can't people configure an elevator service themselves? — They don't know the vocabulary or which decisions matter.
2. Why does that block them? — The interface makes them supply the parameters, so the burden of translation is theirs.
3. Why is that burden theirs? — Because the interface has no way to work from a situation; only from values.
4. Why can chat not simply take over? — Because chat drops the two things a configurator is actually for: a visible record of the whole decision, and the ability to revise any part of it without starting over.
5. Why is revision the hard part? — Because a change ripples through constraints the user never saw, and an interface with no persistent structure has nowhere to show the ripple.

The last why is the design problem: *nonlinear revision, made legible, is what a conversational configurator has to deliver.*

### What this is not

Not "make configuration easier with AI". Not a chatbot wrapper on an existing CPQ flow. The claim under test is narrower: that a conversational surface plus a synchronized structured surface, over a solver whose answers are checkable, can support a decision process that neither surface supports alone.

## 2. Project objectives

Written as testable starting assumptions, with the assumption inside each one named.

| Objective | Hidden assumption to probe |
|---|---|
| Produce a research prototype demonstrating conversational navigation of a constrained configuration space | That a prototype is the right evidence at all — could a paper analysis or a wizard-of-oz study answer the question cheaper? Provisionally no: the argued novelty is the *interaction*, which has to be operable to be judged. |
| Fidelity: working software over four scripted scenarios, illustrative data, single product family | That four scenarios cover the design claim. Verify each scenario maps to at least one assertion in §4; retire any that maps to none. |
| Audience: a design and research argument, demonstrable to a knowledgeable observer | That the observer is the evaluator. There is no access to real job performers, so every user-facing claim stays a hypothesis (see [jtbd/](jtbd/README.md) status note). |
| The solver decides validity; the agent elicits, translates and explains | Settled — constitution #1. Restated here because it is the source of most interaction constraints, not an implementation detail. |
| Ship as a forkable template for the pattern | That template-quality and research-prototype-quality are compatible. They conflict at the margins; when they do, the research argument wins. |

Non-objectives: production readiness, real pricing or LCA data, multi-product-family scale, evaluation with real users.

## 3. Contextual statements

Only the context that changes design decisions.

*Business.* The offering is a service agreement, not a machine (the [service-agreement spec](../specs/service-agreement/requirements.md)). This is fixed. Its interaction consequence is large: what gets configured are outcome terms — handling capacity, uptime, response time, term, monthly price — with the hardware spec derived beneath them. Elicitation therefore has a natural top layer that the product frame lacked. A second fixed decision, environmental footprint as a decision dimension (the [footprint spec](../specs/environmental-footprint/requirements.md)), means the interface must hold *two* optimization objectives at once; a single "best" candidate is no longer meaningful.

*Procurement.* Agreements do not begin with a person at a configurator; they begin with an inbound requirements document. A new build is tendered — the customer's side issues an RFQ — and under the service frame that document speaks outcome terms, the layer the interface already configures. This is in frame as an *entrance*, not a reframe: the document seeds the workspace the operator later revises, so acquisition and revision are one document's life. Its interaction consequence is a flip in the conversation's opening job — from the user explaining what they need to the parties reconciling *deviations* between what the document asks and what the catalogue can promise ([a document-seeded candidate with named deviations is better than manual compliance checking](assertions/seeded-candidate-with-named-deviations.md)). Prescriptive RFQs — hardware parameters written by a consultant, often against a competitor's catalogue — are a second, harder case held for later: their upward translation into outcome terms is the articulation barrier demonstrated on a real artifact.

*User.* Three goal-based personas: the [delivery lead](jtbd/persona-delivery-lead.md), who needs early certainty because shaft dimensions get poured in concrete; the [design specifier](jtbd/persona-design-specifier.md), who iterates constantly on incomplete information and speaks only building language; the [building operator](jtbd/persona-building-operator.md), whose struggle sits in the stages a product configurator abandons — monitor, modify, conclude. The service frame makes the operator the primary persona, and the operator's characteristic move is *revision of an existing agreement* rather than first-time configuration. The design target is therefore the reviser, not the newcomer.

*Domain.* Elevator configuration is the founding benchmark of knowledge-based configuration (VT, Sisyphus-VT: ~280 parameters, 88 constraints) and it was never a linear wizard — the original method is propose, check, repair. Industry practice (Tacton, Configit) converged on needs-based entry, continuous validity, and entry from any angle. The interaction pattern is not novel to this project; what is missing in the literature is its *frontend*.

*Technology.* Z3 gives three operations the interaction can lean on directly: incremental `check` for continuous validity, `consequences` for greying out what is no longer reachable, and named unsat cores for explanations that trace to business rules. Shared agent state (CopilotKit v2) makes chat and canvas two views of one object rather than two stores to reconcile. These are enabling constraints: the interaction design should exploit what the solver can prove and claim nothing more.

*Content.* ~20 user-facing decisions over ~30–80 constraints; footprint and price data are illustrative with plausible relative magnitudes, and RFQ documents are authored fixtures of the same epistemic status — there is no access to real tenders. Small enough that the whole configuration fits on one canvas, which is a fidelity limitation worth stating: a real platform exposes 20–40 decisions over 250+ parameters, and the canvas would not fit.

*Process.* Solo prototyping, no budget, no access to job performers, spec-anchored workflow, with most of the feature register implemented and the rest in flight ([../specs/README.md](../specs/README.md), the current statuses). Discovery has to be cheap and continuous; there will be no discovery phase with a start and an end date.

## 4. Assertions under test

The interaction-design hypotheses the prototype exists to examine. Each is provisional, and each is a note in [assertions/](assertions/) holding its evidence, its falsification condition, and what rests on it. Cite the note, not the section.

| Assertion | Evidence today |
|---|---|
| [The canvas, rather than the transcript, is the durable locus of state](assertions/canvas-is-the-durable-state.md); the chat is for negotiation and explanation | Research (thread D/E), implemented by the [agreement document](../specs/agreement-document/requirements.md) and [nonlinear interaction](../specs/nonlinear-interaction/requirements.md) |
| [Showing a valid candidate to react to works better than asking a sequence of questions](assertions/candidate-works-better-than-questions.md) | Strong in the recommender literature (critiquing surveys), untested here |
| [Generated in-chat controls work better than free text](assertions/generated-controls-work-better-than-free-text.md) when the user lacks vocabulary | Chen et al. 2025 shows large margins on comparison-heavy tasks |
| [Nonlinear revision becomes workable when the ripple is shown *at the moment of revision*](assertions/ripple-at-the-moment-of-revision.md), with repairs proposed | The design bet of [nonlinear interaction](../specs/nonlinear-interaction/requirements.md); no evidence yet |
| [Explanations grounded in unsat cores are sufficient for trust](assertions/cores-are-sufficient-for-trust.md) — no hallucinated justification needed | Constitution #6; consensus in the configuration literature |
| [Outcome-level elicitation works](assertions/outcome-level-elicitation.md): people can specify an agreement in outcome terms and let hardware derive | Tacton's needs-based practice, plus the service frame |
| [Two objectives (cost, footprint) held as an explicit pair make the trade-off legible](assertions/two-objectives-as-a-pair.md) where a single score would hide it | Carbon-presentation literature, all of it food labelling — the transfer to a capital good is itself an assumption |
| [The representation of the agreement selects the user's moves](assertions/representation-selects-moves.md): a document elicits negotiation, a form elicits form-filling | Reasoning plus the dialogue literature on common ground; untested here — the basis of the genre choice in [models/Canvas anatomy.md](models/Canvas%20anatomy.md) |
| [A document-seeded candidate with named deviations is better than manual compliance checking](assertions/seeded-candidate-with-named-deviations.md): an inbound document seeds the agreement, its unmet requirements become a solver-computed deviation register | Deviation registers are existing tender practice, produced by hand; no evidence for the seeded flow — the [rfq-reconciliation spec](../specs/rfq-reconciliation/requirements.md) exists to test it |
| [A choice that quotes its source can be revisited without re-arguing attribution](assertions/choices-that-quote-their-source.md): grounds at the level of quoted words are what keep delegation tolerable | The document channel implements it (RFQ clause + quote, verified in app); tender compliance practice cites clauses; the prose channel is untested — the [choice-provenance spec](../specs/choice-provenance/requirements.md) exists to test it |
| [An agreement that carries its open points can be resumed without rereading the conversation](assertions/open-points-carried-by-the-document.md): the document names what is still unanswered, and acceptance is a recorded fact rather than a conversational one | Genre practice (issues lists, clarification logs); untested here — the [open-points spec](../specs/open-points/requirements.md) exists to test it |

Three carry the most weight: [showing a candidate works better than asking a sequence of questions](assertions/candidate-works-better-than-questions.md), [showing the ripple at the moment of revision makes nonlinear change workable](assertions/ripple-at-the-moment-of-revision.md), and [two objectives held as a pair make the trade-off legible](assertions/two-objectives-as-a-pair.md). If the ripple claim fails, the project loses its novelty; if the candidate claim fails, the conversational surface is decoration.

## 5. Open questions the framing does not settle

- What is the unit of revision: a single variable, a named frame, or an intent expressed in outcome terms?
- When the customer's own past statement and the live agreement disagree, what is that statement — a deviation to reconcile, as a document clause is, or history superseded by the later move? The RFQ register's frozen-reference trick assumes an immutable counterparty position; conversational intent is mutable, so a cross-channel stated-needs register needs supersession semantics before it can exist (named out of scope in the [choice-provenance spec](../specs/choice-provenance/requirements.md)).

## Related

- [assertions/](assertions/) — one note per assertion, the §4 table expanded
- [direction.md](direction.md) — what we have committed to in response, and [principles/](principles/)
- [../research/](../research/README.md) — the evidence base, and [its gap register](../research/gaps.md)
- [jtbd/](jtbd/README.md) — job, personas, journey (atomic notes)
