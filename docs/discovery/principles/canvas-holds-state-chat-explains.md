# The canvas holds the state and the chat explains it

Anything the user needs to check goes on the canvas. Anything the user needs to understand goes in chat. Neither surface duplicates the other's job.

*Rules out* chat messages that restate the current spec, and canvas tooltips that carry the reasoning.

*Test.* Could you delete the transcript and still have everything the user needs to check?

*What the walkthrough of 2026-08-20 found.* No, in both directions.

Deleting the transcript would have taken the reasoning with it. The rules behind a deviation were spoken in chat and never written beside it on the sheet, which carried clause, asked and offered only, and the reason a value is forced existed nowhere else either.

Meanwhile the chat duplicated what the sheet already said. The opening turn was summarized twice in prose — "a hospital in Europe, new build, heavy all-day traffic, about 20 m travel, 7–12 stops" — though the recitals state the same facts in the same register, and each repair card was walked again in the reply beneath it. Worse, the chat asserted state the document never held, announcing that it had recorded an office and a 1000 kg car after the solver had rejected that batch, and reasoning from the 1000 kg two turns later as though it were on the sheet.

Half of this was repaired the same day: the rules behind a deviation are on the sheet, and the reason an option can't be taken travels with state rather than with the conversation. The duplication isn't fixed, and it isn't a code defect. It is the agent's prose against a prompt that already forbids it, which is the kind of thing only the conversation checks measure.

The surface decision underneath this principle is drawn in [Surface architecture](../models/Surface%20architecture.md), and the per-move assignment of artifacts to panes is in [Conversation moves](../models/Conversation%20moves.md), under *The board and the pieces*.

## Related

- [The principle index](../direction.md)
- [the canvas is the durable locus of state](../assertions/canvas-is-the-durable-state.md) — the assertion this principle enacts
