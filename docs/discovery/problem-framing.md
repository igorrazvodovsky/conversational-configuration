# Problem framing

Status: working assertions, revised 2026-08-13. Frames the *interaction-design* problem only; the service model and footprint dimension are fixed context (see §3).

## 1. Problem statement

A person responsible for a building's vertical transportation has to commit to an agreement whose terms are coupled by hundreds of constraints they cannot see. The two interfaces available to them each fail at the opposite end:

- A *form-based configurator* holds state well and shows the whole decision, but demands vocabulary the person does not have and a decision order they cannot supply. The architect knows beds, floors and lobbies; the form asks for rated load and door type. It also assumes decisions arrive in its order, when real projects settle shaft depth before anyone has agreed on speed.
- *Pure chat* removes the vocabulary barrier — you can describe the building in your own words — but it forgets, it hides, and it is linear. Nothing shows what has been decided, changing an early answer means re-litigating the transcript, and two candidate agreements cannot be held side by side.

The core conflict: *configuration is nonlinear, stateful and constraint-coupled; conversation is linear, ephemeral and unstructured.* Putting an LLM in front of a configurator does not resolve that conflict — it relocates it.

### Five whys

1. Why can't people configure an elevator service themselves? — They don't know the vocabulary or which decisions matter.
2. Why does that block them? — The interface makes them supply the parameters, so the burden of translation is theirs.
3. Why is that burden theirs? — Because the interface has no way to work from a situation; only from values.
4. Why can chat not simply take over? — Because chat drops the two things a configurator is actually for: a visible record of the whole decision, and the ability to revise any part of it without starting over.
5. Why is revision the hard part? — Because a change ripples through constraints the user never saw, and an interface with no persistent structure has nowhere to show the ripple.

The last why is the design problem. *Nonlinear revision, made legible, is where a conversational configurator earns its existence.*

### What this is not

Not "make configuration easier with AI". Not a chatbot wrapper on an existing CPQ flow. The claim under test is narrower and sharper: that a conversational surface plus a synchronized structured surface, over a solver that never lies, can support a decision process that neither surface supports alone.

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

*Business.* The offering is a service agreement, not a machine (spec 007). This is fixed. Its interaction consequence is large: what gets configured are outcome terms — handling capacity, uptime, response time, term, monthly price — with the hardware spec derived beneath them. Elicitation therefore has a natural top layer that the product frame lacked. A second fixed decision, environmental footprint as a decision dimension (spec 008), means the interface must hold *two* optimization objectives at once; a single "best" candidate is no longer meaningful.

*User.* Three goal-based personas: the [delivery lead](jtbd/persona-delivery-lead.md), who needs early certainty because shaft dimensions get poured in concrete; the [design specifier](jtbd/persona-design-specifier.md), who iterates constantly on incomplete information and speaks only building language; the [building operator](jtbd/persona-building-operator.md), whose struggle sits in the stages a product configurator abandons — monitor, modify, conclude. The service frame makes the operator the primary persona, and the operator's characteristic move is *revision of an existing agreement*, not first-time configuration. Design for revisers, not for newcomers.

*Domain.* Elevator configuration is the founding benchmark of knowledge-based configuration (VT, Sisyphus-VT: ~280 parameters, 88 constraints) and it was never a linear wizard — the original method is propose, check, repair. Industry practice (Tacton, Configit) converged on needs-based entry, continuous validity, and entry from any angle. The interaction pattern is not novel to this project; what is missing in the literature is its *frontend*.

*Technology.* Z3 gives three operations the interaction can lean on directly: incremental `check` for continuous validity, `consequences` for greying out what is no longer reachable, and named unsat cores for explanations that trace to business rules. Shared agent state (CopilotKit v2) makes chat and canvas two views of one object rather than two stores to reconcile. These are enabling constraints — the interaction design should exploit exactly what the solver can prove and claim nothing more.

*Content.* ~20 user-facing decisions over ~30–80 constraints; footprint and price data are illustrative with plausible relative magnitudes. Small enough that the whole configuration fits on one canvas — which is a fidelity limitation to state honestly, since a real platform exposes 20–40 decisions over 250+ parameters and the canvas would not fit.

*Process.* Solo prototyping, no budget, no access to job performers, spec-anchored workflow with specs 001–005 implemented and 006–008 in draft. Discovery has to be cheap and continuous; there will be no discovery phase with a start and an end date.

## 4. Assertions under test

The interaction-design hypotheses the prototype exists to examine. Each is provisional; the evidence column is honest about what currently supports it.

| # | Assertion | Evidence today | How we would know it is wrong |
|---|---|---|---|
| A1 | The canvas, not the transcript, is the durable locus of state; the chat is for negotiation and explanation | Research (thread D/E), implemented in 004/005 | Users scroll the transcript to check what was decided, or ask the agent to restate state that is already on screen |
| A2 | Showing a valid candidate to react to beats asking a question sequence | Strong in the recommender literature (critiquing surveys), untested here | Users ignore the proposal and answer as if interrogated; or the proposal anchors them into accepting bad defaults |
| A3 | Generated in-chat controls beat free text when the user lacks vocabulary | Chen et al. 2025 shows large margins on comparison-heavy tasks | Users type over the controls, or controls fragment the conversation into a form-in-a-window |
| A4 | Nonlinear revision becomes tolerable when the ripple is shown *at the moment of revision*, with repairs proposed | The design bet of spec 005; no evidence yet | Ripple explanations are ignored or overwhelm; users prefer to start a fresh configuration over repairing one |
| A5 | Explanations grounded in unsat cores are sufficient for trust — no hallucinated justification needed | Constitution #6; consensus in the configuration literature | Rule-level explanations read as machine noise and users want a narrative the solver cannot supply |
| A6 | Outcome-level elicitation works: people can specify an agreement in outcome terms and let hardware derive | Tacton's needs-based practice, plus the service frame | Users insist on specifying hardware directly, or cannot judge outcome terms without seeing hardware first |
| A7 | Two objectives (cost, footprint) held as an explicit pair make the trade-off legible where a single score would hide it | Carbon-presentation literature ([../research/footprint/sustainability-prior-art.md](../research/footprint/sustainability-prior-art.md)): unanchored absolute figures are inert, anchoring by comparison works, and combining indicators into one display degrades evaluation. All from food labelling, so transfer to a capital good is itself an assumption | Users want one number and treat the pair as unresolved work |

A2, A4 and A7 are the load-bearing ones. If A4 fails the project loses its novelty claim; if A2 fails the conversational surface is decoration.

## 5. Open questions the framing does not settle

- Where does initiative sit by default — does the agent propose first, or wait? (Horvitz says confidence-conditional; the prototype has to pick a default.)
- What is the unit of revision: a single variable, a named frame, or an intent expressed in outcome terms?
- How much of the ripple to show — the full consequence set, the minimal core, or a narrated summary?
- Does the canvas represent one configuration with history, or several live candidates at once? (005 says frames; the visual model is unresolved.)

These are exploration questions, not research questions. They belong to the direction work, not to more reading — see [phase-plan.md](phase-plan.md) §1.

## Related

- [direction.md](direction.md) — what we have committed to in response
- [../research/](../research/README.md) — the evidence base, and [its gap register](../research/gaps.md)
- [jtbd/](jtbd/README.md) — job, personas, journey (atomic notes)
