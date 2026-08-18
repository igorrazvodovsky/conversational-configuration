# Nonlinear interaction: revision, candidates, resumption

Status: implemented (approved 2026-08-13; browser-verified same day). The candidate-frames half is superseded by [parallel-drafts](../parallel-drafts/requirements.md), implemented 2026-08-17: frames became drafts — full configurations with their own provenance and history — and the three frame tools were replaced. Revision with repair and resumption are unaffected.

The prototype's actual research contribution ([docs/research/interaction-literature.md](../../research/interaction-literature.md), thread E): revising constrained choices with ripple explanation and repair, comparing parallel candidate configurations, and resuming mid-configuration. Everything before this made revision *safe* (atomic rejection); this feature makes it *productive*.

Serves discovery principle [revision is an ordinary move, not a restart](../../discovery/principles/revision-is-an-ordinary-move.md), and is the named design bet of the central assertion [showing the ripple at the moment of revision makes nonlinear change workable](../../discovery/assertions/ripple-at-the-moment-of-revision.md); resumption also enacts [the canvas is the durable locus of state](../../discovery/assertions/canvas-is-the-durable-state.md). (Cited back-in: the spec predates the discovery layer.)

## Stories

- As a customer, when I change an earlier decision and it collides with later ones, I see what the change would cost rather than simply being told no: which of my other choices would have to give, and concrete repair options I can pick with one tap (constitution #7).
- As a customer, I can keep two candidate configurations alive — "the practical one" and "the premium one" — see them side by side with their differences and price delta, and adopt one to continue from.
- As a customer, when I reopen yesterday's thread, the spec sheet is exactly as I left it and I can ask "where were we?" and get a faithful summary of what's decided, what's forced, and what's still open.

## Acceptance criteria

Revision with repair:

- GIVEN recorded choices that conflict with a requested change, WHEN the new `revise_choices` tool runs, THEN it returns repair options computed by the solver — each option being a minimal set of existing choices to drop or change that makes the revision feasible, with the resulting forced ripple listed — ordered by how many existing choices they keep. At least two options are returned when two exist (including "keep things as they are and abandon the revision" as the always-present last option).
- GIVEN the modernization scenario (modernization + 1.6 m/s recorded, customer asks for 3.0 m/s), WHEN repairs are computed, THEN dropping modernization (i.e. switching to new build) appears as a repair, with the pit/headroom ripple attached.
- GIVEN a repair option is chosen (in chat or via its rendered card), WHEN it is applied, THEN the revision and the repair land as one atomic solver-validated batch — never a half-applied state.
- GIVEN a requested change that does NOT conflict, WHEN `revise_choices` runs, THEN it behaves exactly like `set_choices` (no ceremony for the easy case).

Parallel candidates:

Frames — deliberately lossy snapshots carrying an assignment and a price — were removed by the [parallel-drafts spec](../parallel-drafts/requirements.md), which holds the criteria for this half of the feature: a workspace keeps several whole drafts of its agreement, one of them current, and comparing two of them renders the card this spec designed. Its *automatic frame naming* exclusion below is reversed there: the agent names a draft when it forks it.

- GIVEN two parallel candidates, WHEN compared, THEN a comparison card renders in chat: only the variables that differ, each with both values and the price delta, plus total prices — data computed backend-side, valid by construction.

Resumption:

- GIVEN an existing conversation reopened from its workspace's conversation list, WHEN the canvas mounts, THEN the transcript renders as it was and the canvas shows the agreement's *current* state with provenance badges, candidate, and the draft it belongs to. (Since the [agreement-workspace spec](../agreement-workspace/requirements.md), configuration hydrates from the durable workspace rather than the thread checkpoint; see its design.)
- GIVEN a resumed thread, WHEN the customer asks what's left, THEN the agent answers from `get_configuration` — decided (with who decided), forced, and undecided variables — without re-eliciting anything already settled.

## Out of scope

Comparing more than two drafts at once; canvas-side ripple animation or diff visualization (comparison lives in chat for now); persistence beyond LangGraph thread checkpoints; enumerating every possible repair (top-N by retention suffices).
