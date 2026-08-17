# Undo

Status: approved and implemented ([design](design.md)). Replaces the seed; the research it waited on is retrieved ([living-document-undo.md](../../research/living-document-undo.md), closing the undo half of [gaps E6](../../research/gaps.md#e6)).

Discovery commits to undo in three places and nothing implements it: the [direction](../../discovery/direction.md) §1 makes both parties' actions "visible and undoable"; the [conversation move inventory](../../discovery/models/Conversation%20moves.md) §2 lists *Undo — reverses any move, the agent's included*; the [ripple storyboard](../../discovery/models/Ripple%20storyboard.md) F7 has undo reversing an applied repair batch in one move. Serves discovery principles [the agent proposes and the user decides](../../discovery/principles/agent-proposes-user-decides.md) — cheap reversal is that principle's named resolution of its tension with [always show a valid whole](../../discovery/principles/always-show-a-valid-whole.md), and the second half of its test, *can the user always tell who chose a value, and undo it in one move?*, is unanswerable until this exists — and [revision is an ordinary move, not a restart](../../discovery/principles/revision-is-an-ordinary-move.md).

## Scope decisions

- *The unit of reversal is the applied batch* — one committed mutating tool call, which is what every acceptance already is: a canvas edit, an applied repair, an adopted frame, a completion, a reconciliation move, a saved frame. The storyboard's F7 batch — the user's change, the rippled values, the agent's fill — reverses as one. The teardown found no shipped tool that revokes a single accepted proposal while keeping later work; the granular affordances of the genre all sit before the accept boundary, which this system already provides (repair options, `ask_choices`, the register's moves). The moves model's per-decision *revoke* (§5) is a different move — it converts an agent fill into a standing proposal rather than restoring history — and stays out of scope.
- *History is workspace-level and crosses conversations.* Undo must survive what the agreement survives, so history lives in the workspace store beside the configuration; thread checkpoints have the wrong scope (the [agreement-workspace spec](../agreement-workspace/requirements.md) demoted them to historical records). The most recent applied batch may have landed from another conversation; undo reverses it regardless — the same last-write-wins stance the store already takes for writing. *Narrowed by [parallel-drafts](../parallel-drafts/requirements.md) (approved 2026-08-16, not yet built): history becomes per draft rather than per workspace, because a switch between drafts is not a change to a document and an undo taken after one would otherwise restore another document's state. It still crosses conversations, and each draft's history stays linear — what branches is the document, not the history.*
- *History is per-batch snapshots of the configuration, not a frames ride-along and not a move log.* A frame is a deliberately lossy snapshot — assignment and price, with no choices, no provenance, no statuses, no register state — and adopting one rewrites every source to `user`, so the frames machinery cannot restore a prior state faithfully; extending it until it could would make it a per-batch snapshot under another name. A log of inverse operations would need an inverse per tool where a snapshot needs one hook at the store's single write-through point (constitution #10). A useful consequence: `adopt_frame` is a batch like any other, so its wholesale re-sourcing becomes reversible.
- *Redo exists, as undo's own undo.* Undo is a move, and the inventory says every move reverses; without redo, undo would be the one destructive move in the system. History is linear: a new applied batch discards the redo tail. This also matches the genre — forward navigation is uniform across the surveyed tools.
- *Depth is bounded.* A small fixed number of batches, chosen in design; states worth keeping past that horizon are what named frames are for.
- *Undo is a visible move.* It dispatches a visible structured message mapped onto one atomic tool call, like an applied repair and unlike the hidden `Canvas edit:` path: after a restore the document shows only the restored state, so the chat must carry what was reversed. Typed prose ("undo that", "put it back") lands on the same tool — the control and the sentence are one move.

## Stories

- As a customer, when the agent has just changed the agreement in a way I don't want — an applied repair, a delegated fill, a completion — I take it back in one move, and the document returns exactly to its prior state, provenance and all, not to an approximation of it.
- As a returning operator, when another conversation moved the agreement, I can walk it back batch by batch from the conversation I have open — history belongs to the agreement, not to any transcript.
- As a customer, undoing is safe to explore: an undo too far is reversed by redo, and nothing a restore brings back bypasses validation.

## Acceptance criteria

Reversal:

- GIVEN an applied batch, WHEN the customer undoes, THEN the workspace configuration returns to its exact pre-batch state as one atomic move — choices with their sources (and their quotes, once [choice-provenance](../choice-provenance/requirements.md) lands), candidate, frames, and register state restored; statuses re-derived by the solver.
- GIVEN the storyboard's F7 case — an outcome-term change and its repair applied as one batch — WHEN undone, THEN the whole batch reverses in one move: the user's change, the rippled values, and the agent's fill go together, never partially.
- GIVEN repeated undo, THEN each step walks one batch further back, to the bounded depth; GIVEN redo after an undo, THEN the undone state returns exactly; GIVEN a new applied batch after an undo, THEN the redo tail is discarded.

Across conversations:

- GIVEN a batch applied in one conversation, WHEN another conversation of the same workspace undoes, THEN it reverses — the last applied batch is the last applied batch whoever applied it. Existing staleness rules are unchanged.
- GIVEN conversations switched or deleted, or a dev-server restart, THEN history survives — it lives with the workspace.

Validity:

- GIVEN a restore, THEN it re-validates through the solver like any other batch — statuses recomputed, never copied blind. Undo is a move, not a bypass.
- GIVEN a restored choice set the current model no longer admits, WHEN undo runs, THEN it is refused with the conflict named from the core and the agreement stays as it was ([always show a valid whole](../../discovery/principles/always-show-a-valid-whole.md), constitution #6).

Affordance:

- GIVEN non-empty history, THEN the canvas chrome offers undo — and redo while a redo tail exists — and activating either dispatches a visible structured message mapped onto one atomic tool call, the same grammar every card and canvas control uses. With empty history the control is absent, not disabled.
- GIVEN "undo that" or an equivalent typed in chat, THEN the agent makes the same tool call.
- GIVEN a clean undo, THEN the agent's reply names what was reversed and nothing more — the document already shows the restored state ([the canvas holds the state and the chat explains it](../../discovery/principles/canvas-holds-state-chat-explains.md)).

## Relationship to other specs

- [nonlinear-interaction](../nonlinear-interaction/requirements.md): frames remain the named, deliberate snapshot for comparison; undo is the automatic, unnamed history beside them. `adopt_frame` becomes reversible like every other batch.
- [agreement-workspace](../agreement-workspace/requirements.md): the store gains a history field beside `configuration`; write-through and last-write-wins are unchanged.
- [agreement-document](../agreement-document/requirements.md): the structured grammar gains the undo and redo messages; the canvas hosts the control. Prompt wording and message copy stay coupled — change them together.
- [choice-provenance](../choice-provenance/requirements.md) (draft): quotes ride the snapshots untouched. An undo that restores a superseded choice restores its words with it, consistent with that spec's rule that a choice carries its current grounds — the restored words are current again.
- [demo-scenarios](../demo-scenarios/requirements.md): undo's criteria are tool-call- and state-level, so the harness can assert them; whether that is a new scenario or an extension of an existing one is design's to decide.

## Out of scope

- Selective undo — reversing an earlier batch while keeping later ones. It reintroduces merge semantics, and the teardown found it shipped nowhere.
- Per-decision *revoke* within a batch ([conversation moves](../../discovery/models/Conversation%20moves.md) §5) — a proposal-conversion move that belongs with the delegation machinery, not a history move.
- Branching history, unbounded depth, and a visible history-timeline UI — the transcript and the frames strip already narrate the past.
- Undo of non-configuration workspace state: the workspace's name, the ingested RFQ document text, thread registration.
- Concurrent undo from simultaneously open conversations beyond last-write-wins (the [agreement-workspace](../agreement-workspace/requirements.md) stance, unchanged).
- Undo of conversation-side artifacts — messages and cards. The transcript is the negotiation, not the record.
