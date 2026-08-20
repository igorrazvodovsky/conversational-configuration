# The agent proposes and the user decides

The agent may fill forced values, propose completions and flag dead ends without asking. It may not make discretionary choices silently, and every action it takes is visible on the canvas and can be undone.

*Grounded in* mixed-initiative principles.

*Rules out* silent defaults for aesthetic or budget-sensitive choices. It is also why green variable-value ordering, which biases the solver toward lower-carbon options, is deferred: a search bias is a silent discretionary preference ([footprint spec](../../specs/environmental-footprint/requirements.md), *considered and deferred*).

*Test.* Can the user always tell who chose a value, and undo it in one move? Both halves are answerable. The first is answered by the provenance tag being visible on the canvas rather than recorded in the transcript ([../models/Conversation moves.md](../models/Conversation%20moves.md) §1) — though only as far as *who*: on what words is the open half of [a choice that quotes its source can be revisited without re-arguing attribution](../assertions/choices-that-quote-their-source.md), still in draft. The second is answered by the [undo spec](../../specs/undo/requirements.md) as built: the unit of reversal is the applied batch, and the agent's own moves reverse like any other.

*Standing tension with [always show a valid whole](always-show-a-valid-whole.md),* which pulls toward the agent choosing a lot early. The resolution is visible provenance plus cheap reversal.

*What the walkthrough of 2026-08-20 found.* Provenance reads correctly move by move. Values the agent picked when asked to carry `agent`, an override in the customer's own words flipped that row to `you` and moved nothing else, and document-seeded terms carry `document` with their clause. The deciding half broke twice. A batch of choices the solver rejects is discarded whole, including the choices that did not conflict, and the completion that follows fills those variables with its own picks: the customer's stated office, Frankfurt, European codes and 1000 kg car left no trace in the workspace record, which held one choice, and the sheet then asserted a residential building at 630 kg. And clicking "Keep everything as it is — abandon this change" led the agent to `undo_change` in two of four samples, reversing the previous change instead of doing nothing. Both are reversible, which is the resolution this principle relies on, and neither is a choice the customer made. Both were repaired the same day: the innocent half of a rejected batch is recorded and the declined half comes back named with its rules, and declining a change is answered by a tool that holds no state and so cannot move the agreement ([agent-tools](../../specs/agent-tools/design.md), [nonlinear-interaction](../../specs/nonlinear-interaction/design.md)).

## Related

- [../direction.md](../direction.md) §2 — the principle index
- [../models/Conversation moves.md](../models/Conversation%20moves.md) — the model that applies this principle move by move
- [a choice that quotes its source can be revisited without re-arguing attribution](../assertions/choices-that-quote-their-source.md) — sharpens the provenance half of the test from *who chose a value* to *on what words*
