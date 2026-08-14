# Suggested moves: the pills say what you can do next

Status: implemented.

The suggestion strip above the composer holds four fixed prompts: a hotel new build, a hospital bed lift, an office modernization, and a question about what can be configured. They are entry prompts, and they are right exactly once — on an empty workspace, before anything has been said. Every moment after that they are wrong, and a customer three revisions into a settled agreement is still being offered "we're planning a new 6-storey hotel in Munich".

This is observed rather than inferred: in a walkthrough on 2026-08-14, a Berlin office agreement that had already named its building and recorded a service level was still showing all four entry chips beneath the agent's follow-up question.

Meanwhile the [conversation move inventory](../../discovery/models/Conversation%20moves.md) §2 sets out the moves a user may make — set a value, constrain without choosing, ask why, revise by intent, fork and compare, accept — and none of them is ever offered anywhere. The strip is the one surface that could show what is available now, and it shows what was available first.

This spec makes the pills a function of the agreement's current state: entry prompts while there is nothing, moves on this agreement once there is.

Serves discovery principle [the agent proposes and the user decides](../../discovery/principles/agent-proposes-user-decides.md). A pill is the weakest proposal the tool can make — it commits nothing, changes nothing, and costs nothing to ignore — which is what makes it the right place to widen what the customer knows they are allowed to ask for. Serves [configuration can start from any variable, in any order](../../discovery/principles/start-from-any-variable.md): a strip whose contents only make sense at the beginning asserts that there is a beginning. Extends the reach of [generated in-chat controls work better than free text](../../discovery/assertions/generated-controls-work-better-than-free-text.md) from answering the agent's question to opening the customer's own move — an extension of that assertion rather than a restatement of it, and one this spec puts under test rather than assuming.

## Stories

- As a customer who has just been shown a complete candidate, I can see that "make it cheaper" and "lower the carbon" are things I am allowed to say, without having to work out that this is a tool you can argue with.
- As a customer whose agreement was seeded from our tender, I am offered the outstanding deviation as a move, rather than having to find it in the margin of an annex.
- As a customer who ignores the pills entirely, nothing changes: they cost me a glance and they never occupy the place where I type.
- As a customer weighing money against carbon, the strip never nudges me toward one of them, because it never offers one without the other.
- As a presenter running a scripted demo, an empty workspace still opens with the four entry prompts the scenarios start from.

## Acceptance criteria

- GIVEN a workspace where nothing has been said and nothing recorded, WHEN the strip renders, THEN it shows the entry prompts it shows today, unchanged in wording. *Both tests, not just the second:* a customer who has described the building and been asked a question back has recorded nothing, and offering them a Munich hotel is this spec's own opening complaint arriving one turn in rather than three revisions in. Between the first message and the first recorded choice the strip is empty, which the last criterion here already calls correct.
- GIVEN a workspace whose agreement has choices, WHEN the strip renders, THEN every pill is a move available on this agreement now, drawn from the user-move inventory and phrased against what is actually in state.
- GIVEN any pill, THEN it is a move the customer could make, in the customer's voice and in the building's vocabulary — never a question the agent wants answered. Asking is the agent's fallback move (constitution #5), and moving it into the suggestion strip would reintroduce interrogation one pill at a time.
- GIVEN any pill, WHEN it is clicked, THEN it sends exactly the text it displays as an ordinary user message, on the same path a typed message takes. No pill is a shorthand for a tool call the customer could not have expressed in words, and no pill dispatches a structured message of the kind cards use. The four entry prompts are the standing exception, as the first criterion requires: they keep the short label over a longer message they have always had.
- GIVEN pills that bear on cost or on footprint, WHEN the strip renders, THEN they appear as a pair or not at all. A strip that offers "make it cheaper" without "lower the carbon" resolves the trade-off by omission, which is the agent's first never-move ([trade-offs are shown as a pair, not collapsed into a score](../../discovery/principles/trade-offs-shown-as-a-pair.md)).
- GIVEN any pill, THEN it proposes a move and never promises an outcome. A suggested move that turns out to be infeasible is answered the way any other infeasible move is, with the named rules that caused it (constitution #1 and #6) — the strip asserts no feasibility of its own.
- GIVEN the agent is mid-run, WHEN state is streaming, THEN the pills do not churn under the customer's eye; they settle once when the run ends.
- GIVEN a run that ends without completing — the customer pressed stop, or the run failed — WHEN it ends, THEN the strip returns as it does after a run that completed. An interrupted reply changed nothing about the agreement, and the pills are a function of the agreement; a strip that stays away until the next successful run is a surface the customer has no way to ask back.
- GIVEN a state from which no move can be offered, WHEN the strip renders, THEN it shows nothing. An empty strip is correct; stale pills are not.
- GIVEN a pill whose move changes nothing in the agreement — a question about a term, a hypothetical about the building — WHEN it has been sent, THEN it is not offered again; the family moves on to the next term it can ask about, or falls silent. Answering a question does not move state, so nothing else would stop these families repeating the same sentence indefinitely. The families that name a change to the agreement need no such rule, because making the change is what stops them holding.
- GIVEN the agreement changes through the canvas rather than through chat, WHEN the edit lands, THEN the pills follow it. The strip reads the agreement, not the transcript.

## Relationship to other specs

- [Chat pane](../chat-pane/requirements.md) owns what the suggestion strip is *made of* — the pill component, its place above the composer, its styling. This spec owns only what the pills say, which that spec and [chat surface](../chat-surface/requirements.md) both explicitly leave unassigned.
- [Agreement document](../agreement-document/requirements.md) owns the in-chat controls the agent raises with `ask_choices`. Those answer the agent's question; these open the customer's move. The two must not converge: a pill that answers a pending question is that spec's control in the wrong place.
- [Demo scenarios](../demo-scenarios/requirements.md) sets its scenarios up from a suggestion chip on a fresh workspace, which the first acceptance criterion preserves.
- [RFQ reconciliation](../rfq-reconciliation/requirements.md) supplies the outstanding-deviation state one family of pills reads.

## Out of scope

- *Pills anywhere but above the composer.* Moves offered on the canvas are document-side artifacts and belong to the [conversation move inventory](../../discovery/models/Conversation%20moves.md) §1 placement ruling, not here.
- *Anything learned across sessions.* Pills are a function of the agreement in front of the customer and of nothing else. Preference learning would give a pill a provenance nobody can read, against [choice provenance](../choice-provenance/requirements.md)'s direction.
- *Delegation offers* — "you handle the interior" is a legal user move, but a mandate granted from a pill is a mandate granted without its scope being visible, and the delegation affordance is an open edge in the move inventory §7.
- *The welcome screen copy*, the composer placeholder, and any suggestion inside the composer as autocomplete.
- *Ranking or scoring the moves.* The strip offers a handful in a stable order; it does not tell the customer which one is best.
