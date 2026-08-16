# The agent proposes and the user decides

The agent may fill forced values, propose completions and flag dead ends without asking. It may not make discretionary choices silently, and every action it takes is visible on the canvas and can be undone.

*Grounded in* mixed-initiative principles.

*Rules out* silent defaults for aesthetic or budget-sensitive choices. It is also why green variable-value ordering, which biases the solver toward lower-carbon options, is deferred: a search bias is a silent discretionary preference ([footprint spec](../../specs/environmental-footprint/requirements.md), *considered and deferred*).

*Test.* Can the user always tell who chose a value, and undo it in one move? Both halves are answerable. The first is answered by the provenance tag being visible on the canvas rather than recorded in the transcript ([../models/Conversation moves.md](../models/Conversation%20moves.md) §1) — though only as far as *who*: on what words is the open half of [a choice that quotes its source can be revisited without re-arguing attribution](../assertions/choices-that-quote-their-source.md), still in draft. The second is answered by the [undo spec](../../specs/undo/requirements.md) as built: the unit of reversal is the applied batch, and the agent's own moves reverse like any other.

*Standing tension with [always show a valid whole](always-show-a-valid-whole.md),* which pulls toward the agent choosing a lot early. The resolution is visible provenance plus cheap reversal.

## Related

- [../direction.md](../direction.md) §2 — the principle index
- [../models/Conversation moves.md](../models/Conversation%20moves.md) — the model that applies this principle move by move
- [a choice that quotes its source can be revisited without re-arguing attribution](../assertions/choices-that-quote-their-source.md) — sharpens the provenance half of the test from *who chose a value* to *on what words*
