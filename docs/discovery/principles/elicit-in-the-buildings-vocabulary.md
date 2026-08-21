# Elicitation uses the building's vocabulary, not the catalogue's

Elicitation starts from the situation — building type, floors, traffic, budget per month — and derives nomenclature from it. Technical terms appear as derived results the user can inspect, rather than as questions.

*Grounded in* the articulation barrier ([interaction literature](../../research/interaction-literature.md), thread D) and in the [design specifier persona](../jtbd/persona-design-specifier.md), who speaks building language and never part nomenclature.

*Rules out* any first question containing "rated load".

*Test.* Can someone who has never bought an elevator answer every question we ask?

*What the walkthrough of 2026-08-20 found.* Nothing asked of the customer needed the catalogue. A hospital wing described in beds, floors and hours reached a priced valid agreement without a code being typed, and the nomenclature appeared where it belongs, as derived results in the schedules with plain-language glosses beside them.

The codes arrived from the other direction. Clicking a control card or a repair option dispatches a message that is rendered in the customer's own bubble and spells them out: "Set Contract term to 10 years (contract_term=y10)", "Apply repair: drop installation=modernization; set Rated speed to 3.0 m/s (rated_speed=mps3_0)". The card grammar is the agent's protocol, and the transcript attributed it to the customer. It was repaired the same day, in display only: the bubble renders the sentence without its codes, and the message the agent receives is unchanged ([chat pane](../../specs/chat-pane/design.md)).

## Related

- [The principle index](../direction.md)
- [outcome-level elicitation works](../assertions/outcome-level-elicitation.md) — the claim that the outcome layer is answerable
