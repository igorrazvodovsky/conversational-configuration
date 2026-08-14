# Shared attention: the agent and the user looking at the same place

Status: draft — awaiting approval.

The document is three layers deep with its schedules collapsed, and the agent cannot see any of it. It does not know which value the operator has an editor open on, and it does not know whether the term it just changed is on screen or two screens down. It answers as though the agreement were one flat sheet, always fully visible.

The gap runs both ways. When a revision forces three hardware values inside a collapsed schedule, the change lands where nobody is looking, and the only way the agent can report it is to say in chat what the canvas already shows — which the conversation move inventory lists among the agent's never-moves. When the operator asks "why is this one greyed out?" with an editor open, the agent has to guess which one, or ask.

This spec opens one narrow channel in each direction. The agent learns what the operator currently has open and whether the transcript above refers to a superseded agreement. The document brings into view what the agent has just changed. No configuration moves, nothing durable is written, and the agent gains no new authority over the agreement.

Serves discovery principle [the canvas holds the state and the chat explains it](../../discovery/principles/canvas-holds-state-chat-explains.md): the principle's division of labour only holds if what the canvas shows is actually visible, and pointing at a changed value is the alternative to restating it in chat. Serves [configuration can start from any variable, in any order](../../discovery/principles/start-from-any-variable.md) in its non-verbal form — starting from the value you are pointing at, without having to name it. Puts [showing the ripple at the moment of revision makes nonlinear change workable](../../discovery/assertions/ripple-at-the-moment-of-revision.md) properly under test: the [ripple storyboard](../../discovery/models/Ripple%20storyboard.md) frames F3 and F5 place the pending revision and its repairs on the document, and a document-side artifact below the fold is not showing the ripple at the moment of revision.

## Stories

- As an operator with the traction schedule open and an editor on rated speed, I ask "why can't I go faster?" and the agent answers about rated speed, without my naming it and without being asked which value I mean.
- As an operator whose revision forces three values in a collapsed annex, the document takes me to them and marks them, instead of the chat listing them back to me.
- As an operator reading the recitals while the agent works, I am not thrown somewhere else unless something I need to see actually changed there.
- As an operator who has deliberately collapsed a schedule, it stays collapsed. What I have chosen to put away, the tool does not reopen.
- As an operator reopening an old conversation the agreement has moved past, the agent knows the transcript above is historical and does not reason from it as though it were current.
- As a developer, none of this becomes agent state, enters the workspace record, or shows up in an undo history.

## Acceptance criteria

What the agent may read:

- GIVEN a workspace is open, WHEN the agent runs, THEN it receives two things and no others: the value the operator currently has an editor open on (with the layer it sits in), and whether this conversation is stale against the workspace.
- GIVEN the operator has no editor open, THEN the first entry says so rather than reporting a stale target.
- GIVEN this channel, THEN it never carries configuration values, statuses, provenance or the deviation register. All of those already reach the agent as state, and a second copy is a second thing to disagree with.
- GIVEN this channel, THEN it never carries the chat's geometry. Sidebar, floating, full screen and hidden are the user's alone ([chat surface](../chat-surface/requirements.md)), and the agent may not know which one it is speaking from, because knowing invites acting on it.
- GIVEN the operator opens or closes an editor, WHEN nothing else happens, THEN no agent run starts. This channel is read on the next turn the user causes; it is never a trigger.
- GIVEN the agent answers a question containing a demonstrative — "this one", "that clause" — WHEN it can resolve it from the open editor, THEN it does; WHEN it cannot, THEN it asks which value is meant rather than picking one.

What the document may do:

- GIVEN the agent's turn changes or proposes one or more values, WHEN the run ends, THEN the document brings the affected values into view if they are not already, expanding the schedule that holds them, and marks them transiently so they can be found on arrival.
- GIVEN several values changed, WHEN the reveal happens, THEN the view goes to the topmost affected value in document order and the rest are marked in place. The document does not tour them.
- GIVEN every affected value is already in view, WHEN the run ends, THEN nothing moves.
- GIVEN the operator has explicitly collapsed a schedule, WHEN a change lands inside it, THEN it stays collapsed and the schedule header carries the mark instead. An explicit collapse is a decision, and revealing over it would be the tool overruling the user about their own screen.
- GIVEN the operator has an editor open, WHEN the run ends, THEN no reveal moves the page under the open editor.
- GIVEN a reveal, THEN it only ever scrolls and expands. It never collapses, never hides, never switches away from a layer, and never changes the chat's mode.
- GIVEN the agent's turn changed nothing, THEN nothing moves. Directing attention is a consequence of a move, never a move of its own; an agent that wants the operator to look somewhere without changing anything says so in words.
- GIVEN a reveal, THEN it is not a move: it does not appear in the transcript, does not enter the undo history, and leaves no trace in state once the mark fades.

## Proposed discovery amendment

The [conversation move inventory](../../discovery/models/Conversation%20moves.md) §3 has no move for directing the operator's attention, and its never-moves forbid restating in chat what the canvas already shows. Between them the agent has no legal way to point at a value below the fold, which is a gap in the model rather than a restriction anyone intended.

On approval, §3 gains one row — *reveal a change it just made*, unasked yes, bounded to values it changed in that turn, with no effect on the document beyond what is visible — and §7's open edge about the returning operator gains a note that the read half of this channel is the first thing the session map has to work with.

## Relationship to other specs

- [Agreement document](../agreement-document/requirements.md) owns the three layers, the schedules' disclosure and the option editor this spec reads and moves. The precedent is already there: a schedule holding an unanswered deviation opens itself, on the argument that a deviation the operator cannot see is one they cannot answer. Revealing a change is the same argument applied to the agent's own moves.
- [Chat surface](../chat-surface/requirements.md) is untouched and constrains this one. Its rule that no agent turn, tool call or card click changes the chat's mode stands; this spec adds no exception and deliberately withholds the mode from the agent.
- [Nonlinear interaction](../nonlinear-interaction/requirements.md) produces the ripples whose consequences this reveals.
- [Agreement workspace](../agreement-workspace/requirements.md) already computes the staleness flag this channel reports.

## Out of scope

- *Which schedules are expanded.* It is the weakest attention signal and the most expensive to collect, because disclosure is per-schedule local state that would have to be lifted for the agent to see it. The open editor answers the same question better and costs one lifted value.
- *Scroll position as a continuous signal.* It changes constantly, means little on its own, and would put churn into every turn's context for no decision it could inform.
- *The agent moving the view without having changed anything*, and any form of guided tour, walkthrough or step-through of the document.
- *Highlighting as an explanatory device* — colouring the ripple's causal chain, drawing lines between a term and the hardware it forced. That is ripple-disclosure work and belongs with the storyboard's open question, not here.
- *Presence between users.* One operator per screen; nothing here is about seeing where someone else is looking.
- *Persisting any of it.* The channel is transient in both directions by construction.
