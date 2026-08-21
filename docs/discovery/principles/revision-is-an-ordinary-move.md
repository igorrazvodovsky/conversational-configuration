# Revision is an ordinary move, not a restart

Revision is the primary interaction rather than an escape hatch. A change shows what it breaks, proposes repairs, and applies atomically.

*Grounded in* the [building operator persona](../jtbd/persona-building-operator.md), whose job — monitor, modify, conclude — is mostly modification of something that already exists. Constitution #7 is its engineering statement.

*Rules out* "this will reset your configuration", and silent invalidation.

*Test.* Is revising a two-week-old agreement as smooth as making a new one?

*What the walkthrough of 2026-08-20 found.* The repair path worked and its exit didn't.

A speed the shaft couldn't carry produced a repair set with its rules, applying it landed as one batch, and undo reversed the change, what it dropped and what it rippled, together, with redo restoring it.

Abandoning was unreliable. The card's own last row, "Keep everything as it is — abandon this change", dispatches a sentence the agent is meant to answer by doing nothing, and in two of four samples it called `undo_change` instead, silently reversing the previous change and leaving the agreement unpriced. The second time it said the prior priced configuration was back while the sheet showed no price at all. Both failures fell in one conversation, and two fresh conversations answered correctly, one with no tool call and one with a no-op `revise_choices`. Declining a change was therefore a coin toss between nothing happening and the silent invalidation this principle rules out, arriving through the control that exists to prevent it.

It was repaired the same day, and structurally rather than by wording, since two of the four samples had already behaved: the abandon sentence maps onto `keep_as_is`, whose update carries a message and nothing else. Applying a repair also reprices rather than un-pricing, so the other half of the step behaves as the scenario describes.

## Related

- [The principle index](../direction.md)
- [showing the ripple at the moment of revision makes nonlinear change workable](../assertions/ripple-at-the-moment-of-revision.md) — the assertion underneath it
- [One revision drawn frame by frame](../models/Ripple%20storyboard.md)
