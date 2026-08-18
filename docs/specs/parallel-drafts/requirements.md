# Parallel drafts

Status: implemented 2026-08-17.

The built system gives a workspace one agreement and, beside it, *frames*: deliberately lossy snapshots carrying an assignment and a price with no choices, no provenance, no statuses and no register state. A frame cannot be rendered as a document, cannot be worked on, and can only be taken up by `adopt_frame`, which rewrites every source to `user`. So an operator who wants to hold a practical agreement and a premium one cannot; they can park a flattened copy of one and swap the live agreement for it.

This spec makes the workspace an installation holding N *drafts* of its agreement, exactly one of them current. A draft is a full configuration — choices with their provenance, candidate, register state, its own undo history — so both sides of a comparison are live documents that can be edited, resumed and reasoned about, not snapshots of one. Switching which draft is current is a move; it replaces nothing.

Serves discovery principles [revision is an ordinary move, not a restart](../../discovery/principles/revision-is-an-ordinary-move.md) — holding a second draft is how a revision gets tried without being committed to — and [trade-offs are shown as a pair, not collapsed into a score](../../discovery/principles/trade-offs-shown-as-a-pair.md), which needs two things worth comparing before it can be shown at all. Enacts the assertion [the canvas, rather than the transcript, is the durable locus of state](../../discovery/assertions/canvas-is-the-durable-state.md) for the alternatives themselves, which today survive only as flat snapshots. Constitution #7 already names comparing parallel candidates a core flow rather than an edge case.

It answers one of the open questions the framing does not settle ([problem-framing](../../discovery/problem-framing.md) §5): the canvas represents several live drafts, not one configuration with history. It is also the direction the evidence base already points: [interaction-literature](../../research/interaction-literature.md) thread E recommends modelling the configuration as versioned frames rather than a flat slot set and names keeping two candidates alive for comparison, and [gaps L3](../../research/gaps.md#l3) records that frame tracking solved parallel hypothetical states a decade before LLMs and never got an interface. That note grounds the direction; it cannot settle the presentation, which [gaps D2](../../research/gaps.md#d2) classes as an exploration gap.

## Scope decisions

- *Drafts replace frames; they do not sit beside them.* Two overlapping ways to hold an alternative is the worse mechanism (constitution #10), and every property that makes a frame unfit — lossiness, unworkability, the re-sourcing on adopt — is a property a draft does not have. `save_frame` / `adopt_frame` / `compare_frames` become fork / switch / compare over drafts.
- *The word* draft *is new, because* candidate *is taken.* `Configuration.candidate` already means the solver's completion of the current choices, and it keeps that meaning. Drafts are the parallel documents; the candidate is the solver's completion within one of them. The discovery layer uses "candidate" loosely for both senses; this spec's vocabulary is the code's.
- *Exactly one draft is current, and current is workspace-level.* Conversations remain ephemeral views onto the workspace ([agreement-workspace](../agreement-workspace/requirements.md)) and are not pinned to a draft; the agent's tools act on whichever draft is current, and the canvas renders it. One writer at a time, last write wins, unchanged.
- *The agent names a draft when it forks it,* from the conversation, the way it names the workspace — never by asking the customer to invent a name. This reverses the *automatic frame naming* exclusion in [nonlinear-interaction](../nonlinear-interaction/requirements.md), which was drawn when a frame was a chip in a strip rather than a document one navigates between.
- *Forking, switching and discarding are structural moves, not history moves.* Undo walks the current draft's own history and never crosses into another draft's. Discard is the reverse of fork and is in scope, because uncapped creation with no removal is how parallel states rot.
- *Parallel, not successive.* [agreement-workspace](../agreement-workspace/requirements.md) keeps successive agreements about one installation — renewal as a new document, change of counterparty — out of scope, and this spec does not reopen that. Drafts are alternatives under one negotiation, all of them the same agreement.
- *Comparison presentation is unchanged.* The existing chat card compares two drafts as it compared two frames. Where a comparison is placed and how a two-objective layout reads is [phase-plan](../../discovery/phase-plan.md) task 3, still undrawn, and this spec deliberately leaves it open.

## Stories

- As a building operator, I keep the practical agreement and the premium one side by side as real documents — I can open either, read its terms and its provenance, edit it, and come back to it — rather than parking a flattened copy of one.
- As an operator exploring a revision I am not ready to commit to, I fork the agreement, make the change on the fork, and leave the current draft untouched until I decide.
- As an operator, when I switch which draft is current, nothing is overwritten and nothing is re-attributed: each draft still says who chose what, and undo on one never reaches into the other.
- As an operator with an RFQ on file, I can see that one draft meets nine of eleven requirements at one price and another meets all eleven at a different price, because each draft answers the same document on its own terms.

## Worked examples

Two walkthroughs of the mechanism the stories state abstractly. Both open on a workspace holding a priced, solver-valid agreement; the option prices are the product model's and any monthly total would be illustrative.

*Comparing two service levels.* The spine of [demo-scenarios](../demo-scenarios/requirements.md) scenario 3 and of the *comparing agreements* [job story](../../discovery/jtbd/job-stories.md), recast onto drafts.

1. The operator has an agreement at the standard service level — 24/7 call-out, 8 h response, €300 a month — and asks to see what a premium version would look like without giving this one up. The agent forks. The canvas head now names the new draft, and the switcher beside it lists the draft it came from with that draft's price. The operator was not asked to invent a name and the chat does not remark on the one it was given; what the transcript carries is the fork itself, as a visible sentence.
2. On the fork the service level goes to premium (4 h response, remote diagnostics, €550 a month), remote monitoring is added, and call dispatching becomes destination control. The ripple is shown and applied as it would be on any other document. The switcher meanwhile shows the fork by name alone: a draft edited since its last completion has no price to report, and one returns when the agent next proposes a candidate.
3. The operator switches back to the first draft to re-read what it promises on response time. Nothing is overwritten and nothing is re-attributed — the values the agent chose still say the agent chose them, and a clause-sourced value still cites its clause. The switch is visible in the transcript, which is what keeps one conversation readable once it has acted on two documents.
4. They compare. The existing comparison card lists only what differs, with the price delta and the footprint delta held apart rather than summed, serving [trade-offs are shown as a pair, not collapsed into a score](../../discovery/principles/trade-offs-shown-as-a-pair.md); each side is named by its draft. Choosing one is a switch rather than an adoption, so the other survives the choice — the operator takes both into the next meeting and discards the one they did not take afterwards.

*Trying a revision without committing to it.* In the *mid-contract revision* job story, tenants complain about lunchtime waits and the fix ripples into the shaft. Today the operator has to apply the repair to the live agreement and rely on undo to get back. With drafts they fork first and take the repair on the fork, so the pre-revision agreement stays a document they can open, read and put in front of a colleague rather than a state reachable only by walking backwards. Undo still walks one draft's own history: taken on the fork it reverses the repair, and taken after switching back it reverses whatever that draft last had applied to it. The two histories never meet, and neither the fork nor the switch appears in either of them.

## Acceptance criteria

Drafts and the current one:

- GIVEN a workspace, THEN it holds at least one draft and exactly one of them is current; a workspace created before this feature opens with its existing agreement as its only draft, named "Original".
- GIVEN any draft, THEN it has a name from the moment it exists — every tool addresses drafts by name, so an unnamed draft would be an unreachable one.
- GIVEN an open workspace, WHEN the canvas renders, THEN it shows the current draft, names it, and shows what other drafts exist with a way to switch between them.
- GIVEN any mutating tool, WHEN it runs, THEN it acts on the current draft and no other draft's state changes.

Forking and switching:

- GIVEN a current draft, WHEN the customer asks to keep it and try something else, THEN a new draft is forked from it carrying the *full* configuration — choices with their sources, candidate, register state — and the agent names it from the conversation without asking the customer for a name.
- GIVEN a fork, THEN the forked draft becomes current and the draft it came from is unchanged and still openable.
- GIVEN two drafts, WHEN the customer switches to the other, THEN it becomes current with every choice's provenance intact — no value is re-sourced by the switch — and the canvas shows it.
- GIVEN a draft that is not current, WHEN the customer discards it, THEN it is removed and the current draft is unaffected. The last remaining draft cannot be discarded.
- GIVEN a card left live in one conversation, WHEN a draft is forked or switched to from another conversation of the same workspace, THEN reopening the first conversation finds that card inert — including in the window after a fork, when the two drafts hold identical configurations.
- GIVEN such a card, WHEN the operator reads it, THEN the reason it gives names both drafts: the one this conversation was working on and the one that is now current. This is [agreement-workspace](../agreement-workspace/requirements.md)'s criterion that an inert card says why, made specific by drafts having names.

History and provenance:

- GIVEN applied batches on one draft, WHEN the customer undoes, THEN it walks that draft's own history ([undo](../undo/requirements.md)'s criteria unchanged within a draft), to the same bounded depth.
- GIVEN work applied to draft A, WHEN the customer switches to draft B and undoes, THEN it reverses B's last applied batch, not A's.
- GIVEN a switch or a fork, THEN neither appears in any draft's undo history and neither discards a redo tail.

Comparison:

- GIVEN two drafts, WHEN compared, THEN the existing comparison renders as it does today — only the differing variables, both values, the price delta and the footprint delta — with each side named by its draft.
- GIVEN a workspace with an ingested RFQ, WHEN two drafts are compared, THEN each side's deviation register derives from that document against that draft's own choices.

Persistence:

- GIVEN a dev-server restart, THEN every draft, which one is current, and each draft's history survive.
- GIVEN a conversation of a workspace, WHEN it runs, THEN it sees the current draft, and a draft forked in one conversation is available in every other conversation of that workspace.

## Relationship to other specs

- [nonlinear-interaction](../nonlinear-interaction/requirements.md): frames are removed and their three tools are replaced. Its candidate-frames stories and criteria are rewritten against drafts; revision-with-repair and resumption are untouched. Its *automatic frame naming* exclusion is reversed (see scope decisions).
- [agreement-workspace](../agreement-workspace/requirements.md): the store's `configuration` becomes a set of drafts with a current pointer. Its *one agreement per workspace* scope decision holds — one agreement, now drafted more than one way — and its anticipation of agreements-as-versions as an additive change is the parallel axis of the same idea; the successive axis stays closed. Write-through, staleness and last-write-wins are unchanged in kind, though staleness gains a case content comparison alone cannot see — a fork is identical to its source until one of them is edited — and its criterion that an inert card says why becomes a sentence naming both drafts.
- [undo](../undo/requirements.md): its *history is workspace-level* scope decision becomes *history is per-draft*, with the reason that a pointer move is not a change to a document. This is not the *branching history* that spec excludes — each draft's history stays linear, with a redo tail discarded by a new batch exactly as now; what branches is the document, not the history.
- [agreement-document](../agreement-document/requirements.md): the canvas head gains the draft's name and a switcher, and the structured grammar gains the fork, switch and discard sentences. Its exclusion of *multiple named candidates* is amended — that line defers the whole of this to nonlinear-interaction, and half of it now lands here; where a comparison is *placed* stays excluded in both. Prompt wording and control copy stay coupled — change them together.
- [rfq-reconciliation](../rfq-reconciliation/requirements.md): the register is derived, not stored, so each draft answers the ingested document on its own choices with no change to how reconciliation works. A second draft is a second answer to the same RFQ.
- [environmental-footprint](../environmental-footprint/requirements.md): the cheapest-versus-greenest pair is still a four-step sequence over the renamed tools, and the docstring and prompt trigger that teach it move with them.
- [demo-scenarios](../demo-scenarios/requirements.md): the harness asserts on tool calls, so the renames move assertions; whether the comparison scenario becomes a two-draft scenario is design's to decide.
- [suggested-moves](../suggested-moves/requirements.md): *fork and compare* is held back pending a surface. This spec supplies the mechanism and the canvas affordance; whether the pill is offered is that spec's call once this lands.

## Out of scope

- Where a comparison is placed and how a two-objective comparison is laid out ([phase-plan](../../discovery/phase-plan.md) task 3).
- Comparing more than two drafts at once, carried over from [nonlinear-interaction](../nonlinear-interaction/requirements.md).
- Merging drafts, in whole or in part — partial acceptance is a named-open half of [gaps E6](../../research/gaps.md#e6) and ships nowhere in the genre surveyed.
- Pinning a conversation to a draft, and per-draft transcripts.
- Renaming a draft after it is forked. The agent names it at the fork, when it knows what the fork is for.
- Successive agreements about one installation (renewal, change of counterparty), unchanged from [agreement-workspace](../agreement-workspace/requirements.md).
- Undo of structural moves: a discarded draft does not come back.
- Migrating the `frames` of workspaces created before this feature.
- Concurrent editing of two drafts from two conversations beyond last-write-wins.
