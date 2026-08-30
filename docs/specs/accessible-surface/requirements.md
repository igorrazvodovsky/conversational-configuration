# The accessible surface: every state and every reason arrives through a channel that survives

Status: implemented 2026-08-30, from an accessibility review of the running interface. Checks pass in all three tiers; the browser pass constitution #9 requires is outstanding, and the [design](design.md) says what to look at and in what order.

The prototype encodes several things it knows in channels that do not survive contact with a real person: a reduced opacity, a hovered tooltip, a line style, a 10px note. Each was a reasonable local choice and each drops information for someone using a keyboard, a touch screen, or eyes that do not resolve a 2:1 contrast ratio. This feature is the reconciliation: the surface keeps what it says, and says it somewhere reachable.

The review that opened it found ten defects, and they are three habits rather than ten unrelated bugs.

*A reason delivered by `title` on a disabled control reaches nobody but a mouse.* A disabled element is outside the tab order, so there is no focus to raise a tooltip, and a touch screen has no hover at all. Three of the four controls that refuse an option put the rules there and nowhere else. The fourth, `OptionList` in `ask-choices.tsx`, already renders them as visible text, so the shape of the answer is in the same file as the defect.

*Opacity composes multiplicatively.* `CardShell` fades a spent card to 0.6; the option inside it fades itself to 0.4; the price inside that fades to 0.7. Nothing in any one of those decisions is wrong and the product is 0.17. Measured against the zinc tokens, the struck-out option in a stale card sits at 2.06:1 in dark and 1.74:1 in light, where readable body text needs 4.5. Two files already carry the fix and its rationale — `repair-options.tsx` says two fades over the same text left the rules line barely readable — and the two that stack were not reached.

*Meaning carried only by a line style, a fade or a hover is not carried.* The document tells six kinds of value apart by dotted versus dashed underline at 40% alpha; the scale control labels its unavailable segments "greyed" and draws them at 1.19:1 against the card; the message toolbar is revealed on hover and left focusable while invisible.

Serves discovery principle [every refusal names the rules that caused it](../../discovery/principles/refusals-name-their-rules.md), and specifically the defect that principle's own walkthrough recorded and did not close. The 2026-08-20 entry found options "struck through and disabled under a native `title` … which no keyboard or touch user reaches", and the repair that followed moved the *rules* into state without changing the *delivery*. The named core now exists behind every refusal and still arrives by hover. A rule named to nobody is not named, so this is the second half of that repair rather than a new direction.

Also serves [the canvas holds the state and the chat explains it](../../discovery/principles/canvas-holds-state-chat-explains.md). The canvas is the durable record and the document is what the agreement is read from ([constitution](../constitution.md) #7); a record whose provenance marks are indistinguishable and whose spent controls are illegible is not being held, only stored.

Not in frame: an audit against a conformance level as such, a screen-reader certification, or an accessibility statement. This is a prototype whose claim is an interaction contribution, and the interaction is what has to work. WCAG thresholds appear below because they are the available numeric definition of legible, not because conformance is the goal.

## Stories

- As a customer configuring by keyboard, when an option is ruled out I can read which rules ruled it out, in the same place a mouse user reads it.
- As a customer on a touch screen, the same. There is no hover on my device and no control I can reach whose only explanation is a hover.
- As a customer coming back to a conversation the agreement has moved past, I can still read the card — what was offered and what I picked is the record of that turn, and dimming it must not cost me the words.
- As a customer with ordinary uncorrected vision reading a 13" laptop in a lit office, the notes under a control — a rule label, a completion state, a provenance mark — are text I can read rather than text I can locate.
- As a customer tabbing through a reply, I can see where focus is, and a control I can focus is a control I can see.
- As a screen-reader user reading the draft comparison, a cell tells me which variable and which draft it belongs to.
- As the person changing a card, a state I add is expressed as a token or as content, so that the next state added on top of it does not silently halve it.

## Acceptance criteria

*Refusals reach a person without a pointer.*

- GIVEN an option ruled out by named rules, WHEN it is drawn in the chat's chip row, the chat's scale control, or the sheet's option editor, THEN the rules are readable as visible text without hovering, pointing or focusing anything.
- GIVEN that visible text, THEN the disabled control is associated with it by `aria-describedby`, so a screen reader reading the control reads the reason, and the two channels carry one sentence rather than two.
- GIVEN a refusal with no product rule to cite — the structural one-value-per-variable — THEN it says so in the same place and the same words `refusalText` already gives it.
- GIVEN `title` is no longer the only channel, THEN `KEEP_TITLE` and the `disabled:pointer-events-auto` concession it exists to write once are no longer required by that argument, and [ui-component-library](../ui-component-library/design.md) decision 5 is reconciled to what replaces it.

*Nothing that carries meaning composes to illegibility.*

- GIVEN a card that has gone inert, WHEN any text inside it is read, THEN it meets 4.5:1 against what is actually behind it in both themes, and the measurement composites every ancestor's opacity rather than the nearest one.
- GIVEN a state expressed on an ancestor and a state expressed on a descendant, THEN at most one of them is an opacity. A state that has a token — a muted foreground, a muted surface, a border — uses the token.
- GIVEN the scale control's unavailable segments, THEN they are distinguishable from available ones at 3:1 or better, and the sentence describing them describes what is drawn.

*Meaning has a channel that is not colour, opacity, hover or line style alone.*

- GIVEN a value in the document's running text, WHEN its kind is agreed, proposed, forced or open, THEN the kind is available as text, not only as an underline style, and the four kinds that currently render identically are either told apart or acknowledged in the design as deliberately one thing.
- GIVEN the message toolbar, WHEN a keyboard user tabs to it, THEN it is visible; and where it stays hidden it is not focusable.
- GIVEN a focus indicator on any control, THEN it reaches 3:1 against the adjacent surface in both themes.
- GIVEN text below 12px anywhere in live code, THEN there is none. Reading matter is 14px as the document's own clauses already are; chrome stays at 12.

*Structure is available to a screen reader.*

- GIVEN the draft comparison table, THEN column headers and row headers are `th` with `scope`, so a cell announces the variable and the draft it belongs to.
- GIVEN the WebGL render, THEN it declares what it is and what the equivalent is. It draws nothing the agreement does not state, so the agreement mode is the text alternative and the markup says so rather than leaving it implied.
- GIVEN an icon that carries meaning on its own, THEN it is exposed as an image with a name, not as a bare `svg` with a label attribute browsers may drop.

*The rules hold after this change.*

- GIVEN the two rules a check can see — no live source below 12px, and no unconditional opacity on an element that also sets a text token — THEN they are asserted in the [offline checks](../offline-checks/requirements.md) rather than left to a reviewer's eye. Offline and not the interface tier: a Tailwind class is not a computed style in jsdom either, so the rule is about source and is read from source. The rest is verified by running the app under constitution #9, and the design records what was checked and how.
- GIVEN the standing rule that nothing minting a React id may join the hydrated tree ([chat-surface](../chat-surface/design.md)), THEN every id this feature needs is derived from data already in hand — a tool call id, a variable name — and `useId` is not introduced.
