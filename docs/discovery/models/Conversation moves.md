Answers *where does initiative sit, and what is the agent allowed to do unasked?* — including the delegation boundary — and decides the initiative default left open in [problem-framing.md](../problem-framing.md) §5.

## 1. The board and the pieces

A move is an event on the shared document. The user's edits and the agent's actions are the same kind of event, applied to the same object, equally visible and equally undoable ([direction.md](../direction.md) §1). The transcript carries the *argument* about moves; the document carries their *result* ([the canvas holds the state and the chat explains it](../principles/canvas-holds-state-chat-explains.md)).

That split is a ruling about surfaces, with concrete consequences. The artifacts moves produce — a pending question, a proposed repair set, a comparison — are document-side objects: they appear, evolve and retire on the canvas, and chat carries their narration. Their per-artifact form is canvas anatomy's question (§7); *where they live* is settled here.

Every value on the document carries a provenance tag — the mechanism that resolves the standing tension between [always show a valid whole](../principles/always-show-a-valid-whole.md) and [the agent proposes and the user decides](../principles/agent-proposes-user-decides.md):

| Provenance | Meaning | Who can change it |
|---|---|---|
| *user-chosen* | The user set it, in chat or on the canvas | User; agent only by proposing |
| *agent-chosen* | The agent picked it as a discretionary default, reason attached | Either; one move to reverse |
| *solver-forced* | Entailed by constraints given everything else; not a choice | Nobody, until an upstream value moves |
| *derived* | Computed hardware beneath the outcome terms ([outcome-level elicitation works](../assertions/outcome-level-elicitation.md)) | Nobody directly; editable on demand per constitution #4 |

The test for [the agent proposes and the user decides](../principles/agent-proposes-user-decides.md) — *can the user always tell who chose a value, and undo it in one move?* — is answered by this tag being visible on the canvas, not recorded in the transcript.

A fifth provenance is approved but unbuilt: *document* — a value seeded from the customer's own inbound RFQ, carrying its clause ([rfq-reconciliation](../../specs/rfq-reconciliation/requirements.md)). In this table's terms it sits beside *user-chosen*: the user's organization chose it, upstream of the conversation, and the agent may change it only by proposing — through the reconciliation moves that spec defines.

## 2. User moves

All user moves are legal at all times ([configuration can start from any variable, in any order](../principles/start-from-any-variable.md)). No move is refused because of when it is made; a move may be *answered* with a no, which always carries its core ([every refusal names the rules that caused it](../principles/refusals-name-their-rules.md)).

| Move | Example | Effect on the document |
|---|---|---|
| Describe the situation | "300-bed hospital, eight floors" | Agent translates into outcome terms; nothing is set without becoming visible |
| Set a value | "Uptime 99.5%" · edits a canvas field | Value set, *user-chosen*; solver revalidates |
| Constrain without choosing | "Shaft can't exceed 1800 mm" · "under €2k/month" | Domain narrowed; solver may force or grey out values downstream |
| Ask why | "Why can't I have the glass cab?" | No document change; explanation from the named core |
| Revise by intent | "Make it cheaper" · "lower the carbon" | Agent proposes candidate changes as a ripple; nothing applies until accepted ([revision is an ordinary move, not a restart](../principles/revision-is-an-ordinary-move.md)) |
| Fork and compare | "Show me both" | Second candidate held beside the first, differing variables named ([trade-offs shown as a pair](../principles/trade-offs-shown-as-a-pair.md)) |
| Undo | — | Reverses any move, the agent's included — unbuilt; seeded as the [undo spec](../../specs/undo/requirements.md) |
| Delegate a scope | "You handle the interior" | Grants a mandate — see §5 |
| Review the agent's work | Filters canvas to *agent-chosen* | No change; a review pass — see §5 |
| Accept | "Yes" | The current candidate becomes the agreement — unbuilt: nothing in state distinguishes a candidate from one the customer has taken, so acceptance is conversational only. Always possible in principle, because what is shown is always valid ([always show a valid whole](../principles/always-show-a-valid-whole.md)) |

## 3. Agent moves

The column that matters is *unasked?* — what the agent may do without being invited to. Grounding: [the agent proposes and the user decides](../principles/agent-proposes-user-decides.md) permits filling forced values, proposing completions and flagging dead ends unasked, and forbids silent discretionary choice.

| Move | Unasked? | Effect on the document |
|---|---|---|
| Translate situation → outcome terms | Yes | Populates outcome layer from the user's description, visibly |
| Derive hardware | Yes, by design ([outcome-level elicitation works](../assertions/outcome-level-elicitation.md)) | Fills the derived layer beneath the outcome terms |
| Fill forced values | Yes | Sets values the solver entails, tagged *solver-forced*; chat narrates the *why* (the rule that forced it), never the *what* — the canvas already shows the value ([the canvas holds the state and the chat explains it](../principles/canvas-holds-state-chat-explains.md)) |
| Apply conventional defaults | Yes, tagged | Sets low-stakes discretionary values, tagged *agent-chosen* with a reason (§5) |
| Propose a complete candidate | Yes, once anchored (§6) | Puts a whole valid draft on the canvas for reaction ([always show a valid whole](../principles/always-show-a-valid-whole.md), [showing a candidate works better than asking a sequence of questions](../assertions/candidate-works-better-than-questions.md)) |
| Propose repairs on a ripple | Yes to propose; applies only on acceptance | Shows what a revision breaks and how to fix it, atomically ([revision is an ordinary move, not a restart](../principles/revision-is-an-ordinary-move.md)) |
| Flag a dead end or conflict | Yes | No change; the named rules that caused it, from the core ([every refusal names the rules that caused it](../principles/refusals-name-their-rules.md)) |
| Reveal a change it just made | Yes | None beyond visibility: the document scrolls to and transiently marks the values this turn changed — bounded to that turn's changes, derived from them rather than chosen ([shared-attention](../../specs/shared-attention/requirements.md)) |
| Ask a question | Only when a discretionary value has no defensible default | Critique over interrogation (constitution #5): a question is the fallback move, not the default move |
| Explain | On request, and with every no | No change |
| Escalate a delegated decision | Yes — obligatory when triggered (§5) | Returns a decision to the user with the options laid out |

*Never-moves*, regardless of mandate:

- Resolve the cost/footprint trade-off on the user's behalf — that would silently apply the weighting [trade-offs shown as a pair](../principles/trade-offs-shown-as-a-pair.md) exists to keep visible. This is the irreducible user decision.
- Change a *user-chosen* value by any means other than a proposal.
- Assert feasibility or validity on its own authority (constitution #1).
- Restate in chat what the canvas already shows ([the canvas holds the state and the chat explains it](../principles/canvas-holds-state-chat-explains.md)).

## 4. Solver moves

The solver moves involuntarily on every event, whoever caused it: validate the draft, force what is entailed (`consequences`), grey out what is unreachable, and produce a named core for every no. It initiates nothing and is never idle. The agent narrates solver moves; it does not make them.

## 5. Delegation moves

Delegation is not one question but a boundary through the provenance strata:

| Stratum | Who decides | Delegable? |
|---|---|---|
| Solver-forced values | The solver | Nothing to delegate — these are not choices |
| Derived hardware | Agent + solver, by design | Already delegated; that is what [outcome-level elicitation](../assertions/outcome-level-elicitation.md) claims |
| Conventional defaults | Agent, unasked | Yes — the default mandate everyone starts with |
| Preference-sensitive choices | User | Only by explicit mandate |
| The cost/footprint trade-off | User | Never ([trade-offs shown as a pair](../principles/trade-offs-shown-as-a-pair.md)) |

So *everything beneath the outcome terms is delegable; the trade-off between them is not.* The moves that manage the boundary:

*Delegate.* The user grants a mandate over a named scope ("you pick the interior", "optimize for carbon within the budget"). A mandate widens what the agent may set *agent-chosen* without asking; it never crosses the [trade-offs shown as a pair](../principles/trade-offs-shown-as-a-pair.md) line — "optimize for carbon within the budget" is legal because the user has just made the trade-off themselves and delegated only its execution.

*Fill.* Within a mandate the agent sets values tagged *agent-chosen*, each with a reason. Discretionary choices have no unsat core to ground their reasons, so the same discipline as [every refusal names the rules that caused it](../principles/refusals-name-their-rules.md) needs a different mechanism: default heuristics live in the product model as named rules (D-ids beside the R-ids — declarative data per constitution #2, admissible grounds per #6 as amended; not yet in the model — the gap is recorded in the [product-model design](../../specs/product-model/design.md)), and the agent verbalizes them rather than composing a justification. A reason that cannot be traced to a D-rule is a reason the agent may not give.

*Escalate.* The obligatory inverse of delegation. Triggers: the agent encounters a choice inside its mandate that moves the cost/footprint pair in opposite directions; no D-rule covers the choice; or the mandate leads into a dead end. Escalation returns the decision with the options and both deltas laid out — it is the fixed-rule approximation of Horvitz's confidence-conditional initiative (§6).

*Review.* Reviewing delegated work reuses the ripple machinery: the agent's fills are a diff on the document, presented as a set with consequences, which is what [showing the ripple at the moment of revision makes nonlinear change workable](../assertions/ripple-at-the-moment-of-revision.md) builds for the user's own revisions. Reviewed on the canvas via the *agent-chosen* filter, rather than by reading the transcript ([the canvas is the durable locus of state](../assertions/canvas-is-the-durable-state.md)). Per-action confirmation dialogs are rejected: they reintroduce the wizard one confirmation at a time.

*Revoke.* The user withdraws a mandate or takes back a single decision. Values already filled stay on the document — the draft must remain a valid whole ([always show a valid whole](../principles/always-show-a-valid-whole.md)) — but revocation converts them from settled defaults into standing proposals the user is invited to react to.

## 6. The initiative default — decided

Three options were on the table:

1. *Wait until asked.* The agent answers, fills forced values, and otherwise holds back. Rejected: it recreates the interrogation pattern, gives the user nothing to critique, and abandons the central claim that [showing a candidate works better than asking a sequence of questions](../assertions/candidate-works-better-than-questions.md) without testing it.
2. *Propose first, once anchored.* Chosen. As soon as the situation description grounds a candidate — roughly, building type plus scale — the agent proposes a *complete, valid, provenance-marked* draft and negotiation proceeds by critique. This is propose-check-repair given a conversational surface, and the only default under which the demo can exercise [showing a candidate works better than asking a sequence of questions](../assertions/candidate-works-better-than-questions.md) and [always show a valid whole](../principles/always-show-a-valid-whole.md) at all.
3. *Confidence-conditional (Horvitz).* Right in principle, but not implementable with no interaction data to condition on. The escalation triggers in §5 are its fixed-rule stand-in.

*Standing tension, settled for now by disclosure.* A complete candidate must be completed against *some* objective, and the first never-move (§3) forbids the agent from resolving the cost/footprint weighting itself. The two collide at the first proposal, which arrives at the moment of highest anchoring risk. The interim settlement, made with the [footprint spec](../../specs/environmental-footprint/design.md): the completion defaults to cheapest, but every proposal also solves the other objective and, when the two assignments differ, discloses how many variables differ and both deltas, which makes the default disclosed rather than silent. Two stronger settlements stay on the table for when the comparison model is drawn: the first proposal arrives as a *pair* — one cost-leaning, one footprint-leaning — making [trade-offs shown as a pair](../principles/trade-offs-shown-as-a-pair.md) the opening move rather than a later feature; or *anchored* is redefined to include an expressed budget-or-carbon leaning, so the weighting is user-supplied before any completion runs. Whether disclosure is enough is a walkthrough question: if the disclosed alternative is never taken up, the default was doing the weighting after all, and this reopens toward one of the two.

Failure signals to watch in the walkthrough ([phase-plan.md](../phase-plan.md) §3 task 6): the early proposal anchors the user into accepting agent defaults they should have contested — the stated failure mode of [showing a candidate works better than asking a sequence of questions](../assertions/candidate-works-better-than-questions.md), or the first proposal arrives before the situation supports it and reads as presumptuous. Either would reopen this decision toward a later anchor point, not toward waiting.

## 7. Edges this model does not settle

- How a mandate is *afforded* — a canvas control on a section, a chat utterance, or both. Canvas anatomy territory, as is the per-artifact canvas form of the document-side artifacts named in §1.
- Whether delegation should deepen for the returning operator (the primary persona). Session-map territory. The read half of the [shared-attention](../../specs/shared-attention/requirements.md) channel — what the operator has open, and whether the transcript is stale — is the first signal a session map has to work with.
- The accountability framing: an *agent-chosen* term in a signed service agreement carries a weight the provenance tag alone may not discharge.
- Unit of revision and ripple disclosure (both in [problem-framing.md](../problem-framing.md) §5) — the ripple storyboard's job, though §5's review move constrains it: whatever disclosure level is chosen must also work for reviewing delegated work.

## Related

- [surface-architecture.md](Surface%20architecture.md) — the pattern and form inside which §1's placement ruling sits
- [the agent proposes and the user decides](../principles/agent-proposes-user-decides.md) — the principle this model operationalizes; it also enacts [always show a valid whole](../principles/always-show-a-valid-whole.md), [the canvas holds the state and the chat explains it](../principles/canvas-holds-state-chat-explains.md), [every refusal names the rules that caused it](../principles/refusals-name-their-rules.md), [configuration can start from any variable, in any order](../principles/start-from-any-variable.md) and [trade-offs shown as a pair](../principles/trade-offs-shown-as-a-pair.md)
- [../direction.md](../direction.md) §3 — the model index
- [../problem-framing.md](../problem-framing.md) §5 — the initiative question is decided here; the others are not
- [../phase-plan.md](../phase-plan.md) §3 — task 1 of the current cycle
