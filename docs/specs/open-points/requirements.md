# Open points — requirements

Status: draft, awaiting approval.

Serves discovery assertion [an agreement that carries its open points can be resumed without rereading the conversation](../../discovery/assertions/open-points-carried-by-the-document.md), and enacts [the canvas holds the state and the chat explains it](../../discovery/principles/canvas-holds-state-chat-explains.md) on the resumption flow constitution #7 names as core. The concept behind it — a runtime representation of the customer's open goals — is the session-map edge of the [conversation move inventory](../../discovery/models/Conversation%20moves.md) §7 given a state substrate, ahead of any session-map presentation.

## Concept

An *open point* is a question on the agreement that some party still has to answer, carried by the document rather than by the conversation. A kind of open point exists only when the move inventory already offers the move that closes it — a point with no closing move is a nag, not a question.

Two boundaries define the concept:

- *Undecided variables are not open points.* [Always show a valid whole](../../discovery/principles/always-show-a-valid-whole.md) means the candidate answers them; a list of unfilled slots would rebuild the interrogation this project rejects (constitution #5).
- *Open points gate nothing.* Every move stays legal whatever is open ([configuration can start from any variable, in any order](../../discovery/principles/start-from-any-variable.md)). The list says what is worth doing, never what is allowed.

Open points are *derived, never stored* — the register discipline of [rfq-reconciliation](../rfq-reconciliation/design.md): recomputed from the workspace record on every read, so they cannot go stale and no move has to remember to update them. One new stored fact is required: *acceptance*. That the customer has taken the agreement is recorded nowhere today, so the central open point of every negotiation — conclude it — would have no closing condition; the [move inventory](../../discovery/models/Conversation%20moves.md) §2 marks Accept unbuilt for exactly this reason, and the [suggested-moves spec](../suggested-moves/design.md) withheld its pill for the same one.

Vocabulary: the discovery-level concept is the customer's open *goals*; the document renders them in the contract genre's own term, open *points* (the negotiation issues list). The spec is named for what the customer sees.

## The catalogue

| Open point | Scope | Open while | Closed by |
|---|---|---|---|
| A deviation to reconcile | current draft | a clause of the customer's document still reads *deviation* (one point per clause) | the reconcile moves |
| An unpriced draft | current draft | recorded choices stand with no candidate extending them | `propose_completion` |
| Drafts to choose between | workspace | more than one draft exists | discarding down to one, or accepting one |
| Over the document's cap | current draft | the candidate's price exceeds the document's stated monthly cap | a candidate at or under the cap |
| An agreement not yet taken | workspace | a priced candidate stands and no acceptance covers it | acceptance |

The table is the starting set, on the suggested-moves discipline: a kind may join only if its closing move is already in the inventory.

## Stories

1. *The returning operator.* I open a workspace weeks later and the document itself tells me what is still open and what each point awaits, so I orient without rereading any conversation.
2. *The customer concluding.* I can take the proposed agreement, and the record afterwards distinguishes the agreement in force from a draft under discussion.
3. *The agent orienting.* My read of the configuration includes what is open, so "where do we stand" is answered from state rather than from transcript memory.

## Acceptance criteria

Open points:

- GIVEN a workspace in any of the catalogue's five conditions, WHEN the open points are derived, THEN each point names its kind, what it concerns (the clause, the draft, the figure) and the move that closes it — and the derivation is a pure function of the workspace record, stored nowhere.
- GIVEN the operator opens a workspace with open points and sends no message, THEN the document shows them (they ride the hydration seed, as the drafts mirror does).
- GIVEN a workspace with no open points, THEN the document shows no open-points scaffold — an empty list is invisible, not an empty box.
- GIVEN a move that closes a point (a clause reconciled, a completion proposed, a draft discarded to one, an acceptance), THEN the point is gone on the next read, with no update step anywhere.
- GIVEN any set of open points, THEN no move is refused or hidden because of them.

Acceptance:

- GIVEN a priced candidate on the current draft, WHEN the customer takes the agreement, THEN the workspace records the accepted agreement — the draft it came from, the assignment, price, footprint and when — and the document reads as an agreement in force rather than a proposal.
- GIVEN no priced candidate, WHEN the customer tries to accept, THEN the answer names what is missing (propose a completion first) rather than refusing silently.
- Acceptance freezes a copy, on the discipline of the RFQ block: it changes no choice, re-sources nothing, and touches no history.
- GIVEN an accepted agreement, WHEN the customer revises, THEN revision proceeds exactly as before ([revision is an ordinary move, not a restart](../../discovery/principles/revision-is-an-ordinary-move.md)) and the accepted block does not move.
- Acceptance dispatches on the established grammar: a visible sentence mapped onto one atomic tool call, whether the sentence is typed, clicked from the strip, or dispatched from the document's chrome.

The agent:

- GIVEN open points, WHEN the agent reads the configuration, THEN the read includes them, pending deviations first.
- GIVEN the document showing its open points, THEN the chat does not recite them ([the canvas holds the state and the chat explains it](../../discovery/principles/canvas-holds-state-chat-explains.md)) — the agent narrates a point only when the conversation is about it.

## Out of scope, named

- *The session map's presentation.* How a returning operator's arrival surface is laid out is the next discovery cycle's territory ([phase-plan](../../discovery/phase-plan.md)); this spec supplies its substrate and renders the points only as part of the document. The form they take on the canvas is a design decision inside [canvas anatomy](../../discovery/models/Canvas%20anatomy.md)'s frame.
- *The cost/footprint pair as an open point.* Its closing fact — the customer engaged the trade-off — is recorded nowhere, and deriving whether the pair currently differs puts a solver call behind a read. Waits for the comparison model (phase-plan task 3).
- *Review of agent fills, and mandates.* No delegation state exists to derive from ([move inventory](../../discovery/models/Conversation%20moves.md) §5 is design, not yet mechanism).
- *Post-acceptance divergence.* Once acceptance is a frozen block, the difference between it and the live agreement is derivable exactly as the RFQ register is — a natural follow-on, not part of this spec.
- *Unifying suggested-moves onto the derivation.* The strip already computes several of the same conditions; folding it onto open points is a refactor to weigh after both exist.
- *What acceptance means commercially* (signatures, terms of record) — the [service-agreement spec](../service-agreement/requirements.md)'s frame; here acceptance is only the recorded fact the open points and the Accept move need.
