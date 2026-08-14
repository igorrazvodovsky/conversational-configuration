# The agent proposes; the user disposes

The agent may fill forced values, propose completions and flag dead ends without asking. It may not make discretionary choices silently, and every action it takes is visible on the canvas and undoable.

*Grounded in* mixed-initiative principles.

*Rules out* silent defaults for aesthetic or budget-sensitive choices. It is also why green variable-value ordering — biasing the solver toward lower-carbon options — is deferred: a search bias is exactly a silent discretionary preference ([footprint spec](../../specs/environmental-footprint/requirements.md), *considered and deferred*).

*Test.* Can the user always tell who chose a value — and undo it in one move? The first half is answered by the provenance tag being visible on the canvas, not recorded in the transcript ([../models/Conversation moves.md](../models/Conversation%20moves.md) §1); the undo half is unbuilt, seeded as the [undo spec](../../specs/undo/requirements.md).

*Standing tension with [always show a valid whole](always-show-a-valid-whole.md),* which pulls toward the agent choosing a lot early. The resolution is visible provenance plus cheap reversal.

## Related

- [../direction.md](../direction.md) §2 — the principle index
- [../models/Conversation moves.md](../models/Conversation%20moves.md) — the model that operationalizes this principle move by move
- [a choice that carries its words can be revisited without re-litigation](../assertions/choices-carry-their-words.md) — sharpens the provenance half of the test from *who chose a value* to *on what words*
