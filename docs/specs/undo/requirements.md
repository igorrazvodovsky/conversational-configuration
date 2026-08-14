# Undo

Status: seed — framing and open questions only, not yet a draft. Research and two design decisions are needed before requirements can be written; this note frames them so the eventual draft starts from the commitments discovery has already made. The approval gate (constitution #12) applies to that draft, not to this note.

Discovery commits to undo in three places, and nothing implements it. The [direction](../../discovery/direction.md) §1 makes both parties' actions "visible and undoable"; the [conversation move inventory](../../discovery/models/Conversation%20moves.md) §2 lists *Undo — reverses any move, the agent's included*; the [ripple storyboard](../../discovery/models/Ripple%20storyboard.md) F7 has undo reversing an applied repair batch in one move. The test of [the agent proposes; the user disposes](../../discovery/principles/agent-proposes-user-disposes.md) — *can the user always tell who chose a value, and undo it in one move?* — is half-answered by provenance and unanswerable on the undo half. The nearest built mechanisms are `clear_choices` (withdraws, does not restore what a batch replaced) and frame adoption (restores, but only to a snapshot someone thought to name).

Serves discovery principles [the agent proposes; the user disposes](../../discovery/principles/agent-proposes-user-disposes.md) — cheap reversal is that principle's named resolution of its tension with [always show a valid whole](../../discovery/principles/always-show-a-valid-whole.md) — and [changing your mind is a normal move, not a restart](../../discovery/principles/revision-is-not-a-restart.md).

## What the draft must decide

1. *Where history lives.* Undo must survive what the agreement survives: several conversations write to one workspace, last write wins, and the durable state is the workspace store — so the history has to be workspace-level. Thread checkpoints exist but have the wrong scope (the historical record of one conversation, demoted by the [agreement-workspace spec](../agreement-workspace/requirements.md)). Candidate mechanisms, smallest first (constitution #10): auto-snapshots riding the existing frames machinery — a frame is already a named snapshot, undo may be an unnamed automatic one — versus a move log of applied batches, versus per-batch configuration snapshots in the store.
2. *The unit of reversal.* Discovery says the applied batch: the storyboard's F7 batch (the user's change, the rippled values, the agent's fill) reverses as one. Open: whether a delegated agent fill inside a larger batch is separately reversible — the moves model's *revoke* (§5) gestures at per-decision withdrawal, which is finer than batch undo.
3. *Affordance and grammar.* One validated path holds everywhere else, so undo presumably dispatches a structured message mapped to one atomic tool call, reachable from chat and from the canvas. Redo, history depth, and whether history crosses conversations are scope decisions for the draft.
4. *Validity on restore.* A restored state re-validates through the solver like any other batch — the model may have changed since it was current. Undo is a move, not a bypass.

## Research first

The reading this seed waits on is already registered: [gaps E6](../../research/gaps.md#e6) — how the shipped living-document implementations (Claude Artifacts, ChatGPT Canvas, Copilot Pages, contract-redlining tools) handle undo of accepted proposals, alongside provenance and re-entry. Its teardown should answer whether batch undo or suggestion-revocation is the native pattern of the genre the canvas is adopting. The mixed-initiative grounding (Horvitz's cheap reversal) already underwrites [the agent proposes; the user disposes](../../discovery/principles/agent-proposes-user-disposes.md).

## Relationship to other specs

- [nonlinear-interaction](../nonlinear-interaction/requirements.md): owns the frames machinery that is the smallest-mechanism candidate substrate.
- [agreement-workspace](../agreement-workspace/requirements.md): owns the store any workspace-level history would live in, and the last-write-wins concurrency stance undo must not silently complicate.
- [configuration-canvas](../configuration-canvas/requirements.md): owns the dispatch grammar an undo affordance would join.
