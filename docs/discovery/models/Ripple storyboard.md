Status: drafted 2026-08-13, for critique. It answers *how much of the consequence set to show, and in what form* — the ripple-disclosure question in [problem-framing.md](../problem-framing.md) §5 — by drawing one revision frame by frame, with the moment of divergence rendered at the candidate disclosure levels, the built level among them ([../phase-plan.md](../phase-plan.md) §3 task 2). This is the storyboard of the project's central claim ([ripple at the moment of revision](../assertions/ripple-at-the-moment-of-revision.md)): nonlinear revision becomes tolerable when the ripple is shown at the moment of revision, with repairs proposed.

## 0. Scenario and scope

One revision: the *mid-contract revision* job story ([../jtbd/job-stories.md](../jtbd/job-stories.md) §2, building-operator persona). The spine deliberately matches the second [demo scenario](../../specs/demo-scenarios/requirements.md) and the modernization example in [nonlinear interaction](../../specs/nonlinear-interaction/design.md), so the storyboard describes an interaction the code can almost already run. The outcome-terms layer is the [service agreement](../../specs/service-agreement/requirements.md)'s, now live on the canvas; the footprint deltas use the [footprint spec](../../specs/environmental-footprint/requirements.md)'s data, implemented 2026-08-13; the hardware ripple uses the live R-ids from `agent/src/product_model/elevator.json`. Numbers are illustrative. Geometry per [surface-architecture.md](Surface%20architecture.md): Chat+ split, static cards, repair sets as document-side artifacts — the last of these a pending amendment to the [canvas](../../specs/configuration-canvas/requirements.md) and [nonlinear-interaction](../../specs/nonlinear-interaction/requirements.md) specs, drawn here as target.

Opening state: a live agreement, mid-term. Installation type *modernization*, rated speed *1.6 m/s*, outcome terms including a peak wait target, monthly price and footprint attached, provenance tags throughout.

## 1. The frames

*F1 — Re-entry.* The operator reopens the agreement. Canvas: the document exactly as left ([the canvas is the durable state](../assertions/canvas-is-the-durable-state.md), resumption per [nonlinear interaction](../../specs/nonlinear-interaction/requirements.md)); no onboarding, no start ([any door is an entrance](../principles/any-door-is-an-entrance.md)). Chat: idle, or answers "where were we?" from state. No move has been made.

*F2 — The utterance.* User move, *revise by intent*: "Since the clinic moved into floors 3–4, tenants complain about the lunchtime wait. What would fixing that take?" Building language only ([speak the building's language](../principles/speak-the-buildings-language.md)); no parameter is named, no parameter is asked for.

*F3 — Translation, visibly.* Agent, unasked: maps the complaint to an outcome-term change — tighten the peak wait target from ~40 s to ~25 s. The intended change appears *on the document* as a pending-revision artifact ([conversation-moves.md](Conversation%20moves.md) §1) — the affected term highlighted, old and proposed values both visible. Nothing is applied ([changing your mind is not a restart](../principles/revision-is-not-a-restart.md)). Chat carries one line naming the interpretation and inviting correction; it does not restate the canvas ([the canvas remembers, the chat explains](../principles/canvas-remembers-chat-explains.md)).

*F4 — The collision.* Solver, involuntary: the tightened target derives a rated speed ≥ 2.5 m/s, which requires a deeper pit and taller headroom (R03, R04) than modernization of the existing shaft can provide (R27, R28). The revision is infeasible as stated, and the unsat core names exactly these rules plus the recorded choice they collide with (*modernization*). **This frame is where the three disclosure levels diverge — drawn three ways in §2.**

*F5 — Repairs as proposals.* Agent, narrating the solver: repair options, each a complete valid whole ([always show a valid whole](../principles/always-show-a-valid-whole.md)), each carrying what gives, the rules by name ([every "no" carries its reason](../principles/every-no-carries-its-reason.md)), and *both* deltas ([trade-offs shown as a pair](../principles/trade-offs-shown-as-a-pair.md)):

- *Repair A — convert to new build.* Drop modernization; pit deepened to 2100 mm, headroom raised to 4600 mm; wait target met in full. Higher monthly price, materially higher embodied carbon.
- *Repair B — meet the demand partway.* Keep modernization; settle the wait target at the best value reachable at 1.6 m/s plus a traffic-control change. Small price delta, no construction, no carbon step.
- *Abandon the revision* — always present, always last, as the built repair set already does.

*F6 — The argument.* The user may push back before choosing: "why can't you just make it faster?" — answered from the core (R27: modernization cannot deepen the existing pit), not composed. This exchange lives in the transcript and only there; the repair options themselves sit on the document.

*F7 — Atomic application.* The user picks Repair B. The outcome-term change and the repair land as one solver-validated batch ([changing your mind is not a restart](../principles/revision-is-not-a-restart.md), as built): wait target *user-chosen*, the rippled values *solver-forced*, the traffic-control choice *agent-chosen* with its D-rule reason. The pending-revision artifact retires; the canvas shows the new whole. Undo reverses the entire batch in one move.

*F8 — The residue.* The document holds the new state and its provenance; the transcript holds the argument that produced it. The test for [the canvas remembers, the chat explains](../principles/canvas-remembers-chat-explains.md) applies literally: delete the transcript and nothing is lost but the argument.

## 2. The divergence: F4–F5 at four candidate levels

*Level 0 — the level [nonlinear interaction](../../specs/nonlinear-interaction/requirements.md) built.* Top-3 repairs by retention, each carrying its ripple filtered to the values that change, no aggregate price delta, rendered as chat cards. As a disclosure *amount* this is nearly right — deltas per repair, not the world. Its failure modes are omissions and placement: no delta pair, so the two objectives the decision turns on are absent ([trade-offs shown as a pair](../principles/trade-offs-shown-as-a-pair.md)); and the repair set lives in the transcript, where it scrolls away while still undecided — the artifact the user is deciding *with* is in the surface that forgets ([surface-architecture.md](Surface%20architecture.md) §2, [the canvas is the durable state](../assertions/canvas-is-the-durable-state.md)).

*Level A — full consequence set.* Every touched variable, old → new: rated speed 1.6 → 2.5, pit 1600 → 2100 (R03), headroom 3800 → 4600 (R04), installation modernization → new build, plus price and carbon lines — about eight rows at prototype scale. Failure mode: this is the named failure of [ripple at the moment of revision](../assertions/ripple-at-the-moment-of-revision.md) ("ripple explanations overwhelm") and of [cores are enough for trust](../assertions/cores-are-enough-for-trust.md) ("rule-level explanations read as machine noise"). And the prototype flatters it: eight rows are survivable, the real platform's hundreds are not, so prototype-scale comfort with Level A is not evidence for it.

*Level B — minimal core.* Only the collision and what must give: "A 25-second wait needs more speed than an existing shaft allows — the pit and headroom can't be extended in a modernization (R03, R04, R27, R28). One of these has to move: the wait target, or the modernization." Failure mode: the user can see *why* it broke but not what fixing it *costs* — and the cost pair is precisely the decision they are there to make ([trade-offs shown as a pair](../principles/trade-offs-shown-as-a-pair.md)). Bare Level B pushes the user to interrogate each repair — the very question sequence that [showing a candidate to react to](../assertions/candidate-beats-questions.md) exists to avoid.

*Level C — narrated summary.* Prose only, in chat: "Unfortunately that speed isn't possible in your building without major work; I'd suggest…". Failure mode: the justification is only as trustworthy as its composition — exactly what [every "no" carries its reason](../principles/every-no-carries-its-reason.md) rules out; it duplicates the canvas's job ([the canvas remembers, the chat explains](../principles/canvas-remembers-chat-explains.md)); and it leaves nothing scannable for later review ([the canvas is the durable state](../assertions/canvas-is-the-durable-state.md)). Level C is not a disclosure level so much as the pure-chat failure the project frames against.

## 3. The decision — the built spine, completed and relocated

The chosen form keeps Level 0's disclosure amount and repairs its omissions; the layers map onto the surfaces:

- *Default, at the moment of revision:* the core in plain words with its named rules (Level B), plus repairs with their ripple filtered to deltas (Level 0's spine) — each repair now carrying *both* deltas, price and carbon ([trade-offs shown as a pair](../principles/trade-offs-shown-as-a-pair.md)). This is what the user needs to choose with, and nothing more.
- *One move away:* Level A, per repair — expanding a repair shows its full consequence set as a document diff. Depth on demand, never by default.
- *Placement:* the pending revision and its repair set are document-side artifacts that retire on resolution; chat narrates the *why* only, paraphrasing named rules — Level C demoted to the narration channel [the canvas remembers, the chat explains](../principles/canvas-remembers-chat-explains.md) already assigns it, never the carrier of the ripple.

Why this and not the others as default: it matches the decision the user actually faces (which repair), it is the only level that survives the honest scale argument, and it keeps the surface division clean — chat explains, canvas remembers. Level 0 unamended fails twice by omission: it shows no delta pair, so the cost/carbon trade-off the decision turns on is invisible ([trade-offs shown as a pair](../principles/trade-offs-shown-as-a-pair.md)), and it leaves the undecided repair set in the transcript rather than on the canvas ([the canvas is the durable state](../assertions/canvas-is-the-durable-state.md)). A-first was rejected for overwhelm and scale-dishonesty; C-only for trust and duplication.

## 4. The second test: reviewing a delegated batch

[conversation-moves.md](Conversation%20moves.md) §5 requires the chosen disclosure to also serve *review* of delegated agent fills — a diff of eleven interior values, not one revision. Per-item minimal cores do not transfer: eleven cores read as noise. The layering does transfer if the grouping unit changes: the review pass groups *agent-chosen* values by the D-rule that produced them ("standard interior for retail traffic: five values"), each group carrying its reason, with the full value list one move down — reason-first, detail on demand, same shape as §3. If grouping by D-rule cannot carry a real batch, this decision reopens.

## 5. Failure signals for the walkthrough

For [phase-plan.md](../phase-plan.md) §3 task 6, this model predicts its own refutations:

- Every repair gets expanded every time → the B-default is too terse; the balance shifts toward A.
- The user re-asks in chat what the cards already show → the named-rule paraphrase undershoots the narrative demand — the failure mode named by [cores are enough for trust](../assertions/cores-are-enough-for-trust.md).
- Repair cards are ignored and a fresh configuration started → the claim that [showing the ripple at the moment of revision makes revision tolerable](../assertions/ripple-at-the-moment-of-revision.md) fails outright, and with it the novelty claim.
- Comfort with full-set disclosure at 23 variables must not be recorded as evidence for Level A — the scale caveat stands.

## 6. What this changes downstream

- The chosen layering gives content to the amendment [surface-architecture.md](Surface%20architecture.md) §2 already marks as pending on the [canvas](../../specs/configuration-canvas/requirements.md) and [nonlinear interaction](../../specs/nonlinear-interaction/requirements.md): the pending-revision artifact and repair set move document-side, each repair gains the delta pair and a full-set expansion. Spec work, citing this model and [ripple at the moment of revision](../assertions/ripple-at-the-moment-of-revision.md), to be written after the model survives critique — and the delta pair now has both halves to render from: the [service agreement](../../specs/service-agreement/requirements.md)'s monthly-price terms and the [footprint spec](../../specs/environmental-footprint/requirements.md)'s data.
- The comparison view (task 3) inherits the same layering as a hypothesis — differing variables first, full sheets one move down — to be tested against the alternatives [trade-offs shown as a pair](../principles/trade-offs-shown-as-a-pair.md) allows, not assumed.
- One configuration with history versus several live candidates ([problem-framing.md](../problem-framing.md) §5) remains open; F3's pending-revision artifact leans toward "one document with pending states", which task 3 should confirm or break.

## Related

- [conversation-moves.md](Conversation%20moves.md) — the moves each frame is made of; §5 supplies the second test
- [surface-architecture.md](Surface%20architecture.md) — the geometry the frames assume, and the pending amendment §3 gives content to
- The principles this storyboard is drawn against: [always show a valid whole](../principles/always-show-a-valid-whole.md), [the canvas remembers, the chat explains](../principles/canvas-remembers-chat-explains.md), [every "no" carries its reason](../principles/every-no-carries-its-reason.md), [changing your mind is not a restart](../principles/revision-is-not-a-restart.md), [trade-offs shown as a pair](../principles/trade-offs-shown-as-a-pair.md); and the assertions it puts under test: [the canvas is the durable state](../assertions/canvas-is-the-durable-state.md), [a candidate beats a question sequence](../assertions/candidate-beats-questions.md), [ripple at the moment of revision](../assertions/ripple-at-the-moment-of-revision.md), [cores are enough for trust](../assertions/cores-are-enough-for-trust.md)
- [../direction.md](../direction.md) §3 — the model index
- [The nonlinear-interaction spec](../../specs/nonlinear-interaction/requirements.md) — the implemented substrate the storyboard extends
