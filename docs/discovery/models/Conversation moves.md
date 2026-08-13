Answers *where does initiative sit, and what is the agent allowed to do unasked?* — including the delegation boundary — and decides the initiative default left open in [problem-framing.md](../problem-framing.md) §5 Q1.

## 1. The board and the pieces

A move is an event on the shared document. The user's edits and the agent's actions are the same kind of event, applied to the same object, equally visible and equally undoable ([direction.md](../direction.md) §1). The transcript carries the *argument* about moves; the document carries their *result* ([the canvas remembers, the chat explains](../principles/canvas-remembers-chat-explains.md)).

That split is a surface ruling, not a metaphor. The artifacts moves produce — a pending question, a proposed repair set, a comparison — are document-side objects: they appear, evolve and retire on the canvas, and chat carries their narration. Their per-artifact form is canvas anatomy's question (§7); *where they live* is settled here.

Every value on the document carries a provenance tag — the mechanism that resolves the standing tension between [always show a valid whole](../principles/always-show-a-valid-whole.md) and [the agent proposes, the user disposes](../principles/agent-proposes-user-disposes.md):

| Provenance | Meaning | Who can change it |
|---|---|---|
| *user-chosen* | The user set it, in chat or on the canvas | User; agent only by proposing |
| *agent-chosen* | The agent picked it as a discretionary default, reason attached | Either; one move to reverse |
| *solver-forced* | Entailed by constraints given everything else; not a choice | Nobody, until an upstream value moves |
| *derived* | Computed hardware beneath the outcome terms ([outcome-level elicitation works](../assertions/outcome-level-elicitation.md)) | Nobody directly; editable on demand per constitution #4 |

The test for [the agent proposes, the user disposes](../principles/agent-proposes-user-disposes.md) — *can the user always tell who chose a value, and undo it in one move?* — is answered by this tag being visible on the canvas, not recorded in the transcript.

## 2. User moves

All user moves are legal at all times ([any door is an entrance](../principles/any-door-is-an-entrance.md)). No move is refused because of when it is made; a move may be *answered* with a no, which always carries its core ([every "no" carries its reason](../principles/every-no-carries-its-reason.md)).

| Move | Example | Effect on the document |
|---|---|---|
| Describe the situation | "300-bed hospital, eight floors" | Agent translates into outcome terms; nothing is set without becoming visible |
| Set a value | "Uptime 99.5%" · edits a canvas field | Value set, *user-chosen*; solver revalidates |
| Constrain without choosing | "Shaft can't exceed 1800 mm" · "under €2k/month" | Domain narrowed; solver may force or grey out values downstream |
| Ask why | "Why can't I have the glass cab?" | No document change; explanation from the named core |
| Revise by intent | "Make it cheaper" · "lower the carbon" | Agent proposes candidate changes as a ripple; nothing applies until accepted ([changing your mind is not a restart](../principles/revision-is-not-a-restart.md)) |
| Fork and compare | "Show me both" | Second candidate held beside the first, differing variables named ([trade-offs shown as a pair](../principles/trade-offs-shown-as-a-pair.md)) |
| Undo | — | Reverses any move, the agent's included |
| Delegate a scope | "You handle the interior" | Grants a mandate — see §5 |
| Review the agent's work | Filters canvas to *agent-chosen* | No change; a review pass — see §5 |
| Accept | "Yes" | The current candidate becomes the agreement. Always possible, because what is shown is always valid ([always show a valid whole](../principles/always-show-a-valid-whole.md)) |

## 3. Agent moves

The column that matters is *unasked?* — what the agent may do without being invited to. Grounding: [the agent proposes, the user disposes](../principles/agent-proposes-user-disposes.md) permits filling forced values, proposing completions and flagging dead ends unasked, and forbids silent discretionary choice.

| Move | Unasked? | Effect on the document |
|---|---|---|
| Translate situation → outcome terms | Yes | Populates outcome layer from the user's description, visibly |
| Derive hardware | Yes, by design ([outcome-level elicitation works](../assertions/outcome-level-elicitation.md)) | Fills the derived layer beneath the outcome terms |
| Fill forced values | Yes | Sets values the solver entails, tagged *solver-forced*; chat narrates the *why* (the rule that forced it), never the *what* — the canvas already shows the value ([the canvas remembers, the chat explains](../principles/canvas-remembers-chat-explains.md)) |
| Apply conventional defaults | Yes, tagged | Sets low-stakes discretionary values, tagged *agent-chosen* with a reason (§5) |
| Propose a complete candidate | Yes, once anchored (§6) | Puts a whole valid draft on the canvas for reaction ([always show a valid whole](../principles/always-show-a-valid-whole.md), [a candidate beats a question sequence](../assertions/candidate-beats-questions.md)) |
| Propose repairs on a ripple | Yes to propose; applies only on acceptance | Shows what a revision breaks and how to fix it, atomically ([changing your mind is not a restart](../principles/revision-is-not-a-restart.md)) |
| Flag a dead end or conflict | Yes | No change; the named rules that caused it, from the core ([every "no" carries its reason](../principles/every-no-carries-its-reason.md)) |
| Ask a question | Only when a discretionary value has no defensible default | Critique over interrogation (constitution #5): a question is the fallback move, not the default move |
| Explain | On request, and with every no | No change |
| Escalate a delegated decision | Yes — obligatory when triggered (§5) | Returns a decision to the user with the options laid out |

*Never-moves*, regardless of mandate:

- Resolve the cost/footprint trade-off on the user's behalf — that would silently apply the weighting [trade-offs shown as a pair](../principles/trade-offs-shown-as-a-pair.md) exists to keep visible. This is the irreducible user decision.
- Change a *user-chosen* value by any means other than a proposal.
- Assert feasibility or validity on its own authority (constitution #1).
- Restate in chat what the canvas already shows ([the canvas remembers, the chat explains](../principles/canvas-remembers-chat-explains.md)).

## 4. Solver moves

The third party at the table moves involuntarily — on every event, whoever caused it: validate the draft, force what is entailed (`consequences`), grey out what is unreachable, and produce a named core for every no. The solver initiates nothing and is never idle. The agent narrates solver moves; it does not make them.

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

*Delegate.* The user grants a mandate over a named scope ("you pick the interior", "optimize for carbon within the budget"). A mandate widens what the agent may set *agent-chosen* without asking; it never crosses the [trade-offs shown as a pair](../principles/trade-offs-shown-as-a-pair.md) line — "optimize for carbon within the budget" is legal precisely because the user has just made the trade-off themselves and delegated only its execution.

*Fill.* Within a mandate the agent sets values tagged *agent-chosen*, each with a reason. Discretionary choices have no unsat core to ground their reasons, so the same discipline as [every "no" carries its reason](../principles/every-no-carries-its-reason.md) needs a different mechanism: default heuristics live in the product model as named rules (D-ids beside the R-ids — declarative data per constitution #2, admissible grounds per #6 as amended), and the agent verbalizes them rather than composing a justification. A reason that cannot be traced to a D-rule is a reason the agent may not give.

*Escalate.* The obligatory inverse of delegation. Triggers: the agent encounters a choice inside its mandate that moves the cost/footprint pair in opposite directions; no D-rule covers the choice; or the mandate leads into a dead end. Escalation returns the decision with the options and both deltas laid out — it is the fixed-rule approximation of Horvitz's confidence-conditional initiative (§6).

*Review.* Reviewing delegated work reuses the ripple machinery: the agent's fills are a diff on the document, presented as a set with consequences — exactly what [ripple at the moment of revision](../assertions/ripple-at-the-moment-of-revision.md) builds for the user's own revisions. Reviewed on the canvas via the *agent-chosen* filter, not by reading the transcript ([the canvas is the durable state](../assertions/canvas-is-the-durable-state.md)). Per-action confirmation dialogs are rejected: they reintroduce the wizard through the back door.

*Revoke.* The user withdraws a mandate or takes back a single decision. Values already filled stay on the document — the draft must remain a valid whole ([always show a valid whole](../principles/always-show-a-valid-whole.md)) — but revocation converts them from settled defaults into standing proposals the user is invited to react to.

## 6. The initiative default — decided

Three options were on the table:

1. *Wait until asked.* The agent answers, fills forced values, and otherwise holds back. Rejected: it recreates the interrogation pattern, gives the user nothing to critique, and abandons the load-bearing claim that [a candidate beats a question sequence](../assertions/candidate-beats-questions.md) without testing it.
2. *Propose first, once anchored.* Chosen. As soon as the situation description grounds a candidate — roughly, building type plus scale — the agent proposes a *complete, valid, provenance-marked* draft and negotiation proceeds by critique. This is propose-check-repair given a conversational surface, and the only default under which the demo can exercise [a candidate beats a question sequence](../assertions/candidate-beats-questions.md) and [always show a valid whole](../principles/always-show-a-valid-whole.md) at all.
3. *Confidence-conditional (Horvitz).* Right in principle; not honestly implementable with no interaction data to condition on. The escalation triggers in §5 are its fixed-rule stand-in.

*Standing tension, named but not settled.* A complete candidate must be completed against *some* objective, and the first never-move (§3) forbids the agent from resolving the cost/footprint weighting itself. The two collide precisely at the first proposal — which arrives at the moment of highest anchoring risk. The current implementation completes on cheapest price, which under this model is a silent 100%-cost weighting: a known violation, not a decision. Two candidate settlements, neither yet chosen: the first proposal arrives as a *pair* — one cost-leaning, one footprint-leaning — making [trade-offs shown as a pair](../principles/trade-offs-shown-as-a-pair.md) the opening move rather than a later feature; or *anchored* is redefined to include an expressed budget-or-carbon leaning, so the weighting is user-supplied before any completion runs. The ripple storyboard and comparison model should inform the choice.

Failure signals to watch in the walkthrough ([phase-plan.md](../phase-plan.md) §3 task 6): the early proposal anchors the user into accepting agent defaults they should have contested — the stated failure mode of [a candidate beats a question sequence](../assertions/candidate-beats-questions.md), or the first proposal arrives before the situation supports it and reads as presumptuous. Either would reopen this decision toward a later anchor point, not toward waiting.

## 7. Edges this model does not settle

- How a mandate is *afforded* — a canvas control on a section, a chat utterance, or both. Canvas anatomy territory, as is the per-artifact canvas form of the document-side artifacts named in §1.
- Whether delegation should deepen for the returning operator (the primary persona). Session-map territory.
- The accountability framing: an *agent-chosen* term in a signed service agreement carries a weight the provenance tag alone may not discharge.
- Unit of revision and ripple disclosure ([problem-framing.md](../problem-framing.md) §5 Q2–Q3) — the ripple storyboard's job, though §5's review move constrains it: whatever disclosure level is chosen must also work for reviewing delegated work.

## Related

- [surface-architecture.md](Surface%20architecture.md) — the pattern and form inside which §1's placement ruling sits
- [the agent proposes, the user disposes](../principles/agent-proposes-user-disposes.md) — the principle this model operationalizes; it also enacts [always show a valid whole](../principles/always-show-a-valid-whole.md), [the canvas remembers, the chat explains](../principles/canvas-remembers-chat-explains.md), [every "no" carries its reason](../principles/every-no-carries-its-reason.md), [any door is an entrance](../principles/any-door-is-an-entrance.md) and [trade-offs shown as a pair](../principles/trade-offs-shown-as-a-pair.md)
- [../direction.md](../direction.md) §3 — the model index
- [../problem-framing.md](../problem-framing.md) §5 — Q1 is decided here; Q2–Q4 are not
- [../phase-plan.md](../phase-plan.md) §3 — task 1 of the current cycle
