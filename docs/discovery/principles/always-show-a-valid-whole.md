# Always show a valid whole

Every candidate the user sees is complete and solver-valid. Partial or invalid states are never displayed as a proposal.

*Grounded in* the critiquing literature: people react well to concrete artifacts and poorly to open questions. Constitution #5 is its engineering statement.

*Rules out* progressive form-filling, and "you have 6 of 20 fields left".

*Test.* Can the user, at any moment, say yes and get something real?

*What the walkthrough of 2026-08-20 found.* Two ways of failing it. A candidate does not survive an ordinary change: applying the 3.0 m/s repair, stating a shaft dimension, and clicking one cabin finish on the document all dropped it, and the consideration line went back to "No priced proposal yet — ask for one in chat" with half the operative terms at "not yet decided". The canvas case is the worst of the three, because the direct-edit protocol asks the agent to stay silent on a clean apply, so nothing re-completes: every edit made on the document leaves the document unpriced and sends the customer to the chat to get the price back. There are stretches of the conversation when saying yes buys nothing. And a whole can be valid without being real. When an opening batch was rejected by the solver the choices in it were discarded together, and the next completion filled the gaps itself, so a sheet headed "Frankfurt office — new build" went on to describe a residential building with a 630 kg car — priced, solver-valid, and about a building nobody had described. Both were repaired the same day: a change to a priced agreement completes again inside the same batch, so the fee moves with an edit rather than disappearing, and a batch with a collision in it now records the choices that were never in question ([agent-tools](../../specs/agent-tools/design.md)).

*Standing tension with [the agent proposes and the user decides](agent-proposes-user-decides.md).* Showing a complete valid candidate means the agent chooses a lot, early, while that principle pulls against silent choice. The resolution is provenance: show the whole, mark clearly what the agent picked, and make it cheap to change ([../models/Conversation moves.md](../models/Conversation%20moves.md) §1). If that resolution fails in use, one of the two principles is wrong.

## Related

- [../direction.md](../direction.md) §2 — the principle index
- [showing a candidate works better than asking a sequence of questions](../assertions/candidate-works-better-than-questions.md) — the assertion this principle depends on
