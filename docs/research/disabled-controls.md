# What a control should do when the answer is no

Status: retrieved 2026-08-30; the decision was taken the same day and went further than this note's verdict, on the operator's own reasoning — a disabled state rarely explains anything, and someone who wants to click a control should be allowed to. Nothing in the app is now disabled to mean *no* ([constitution #17](../specs/constitution.md), applied in [the component library](../specs/ui-component-library/design.md) decision 9). Answers one question — when an interface knows that an option cannot be taken, whether the control for it should be disabled, and what has to accompany it either way — and reads the answer against the four controls that refuse an option in this repo.

*Two literatures answer this question and they answer it opposite ways.* The web accessibility and design-system side is unanimous against disabling and has almost no measurement behind it; every practitioner count in section 1 is opinion, and the one usability test anybody cites reaches us third-hand. The interactive-configuration side disables on purpose and has a formal argument for it. The note's contribution is that the formal argument is about the solution space rather than about legibility, and that this prototype satisfies it by the other route.

## Verdict

The line that matters is not disabled against enabled. It is whether the system, at the moment it says no, can say what would make the answer yes — and whether the control is the place that offer is reachable from.

- *Where a repair is computable, disabling discards it.* This is the case of a solver-ruled-out option here. `SOLVER.repairs` returns the retractions and substitutions that would admit the value, and the prompt already routes every `Set <term> to <value>` sentence to `revise_choices`, which produces exactly that on collision (`agent/src/configuration.py:1455`, `agent/main.py:153`). A disabled chip is a refusal with the answer to *what would have to change* sitting one gesture away and no gesture available. Nothing in either literature argues for blocking a move whose failure is itself informative.
- *Where the state will clear on its own, disabling is the sanctioned case, and it is conditional.* Every source that permits disabling permits it here — an action in flight, a double submission — and every one of them attaches a condition: the control has to say it is working, by a label or a spinner, not by going grey (section 1).
- *Where there is no move behind the control at all, there is nothing to enable.* A draft with no priced candidate cannot be compared. The literature's requirement on that case is only that the reason is on the page, which is a condition this repo already meets in the one place it arises.

*What no source in either literature supports* is the shape the argument is usually had in: choosing between disabled and enabled without first asking what the system could offer instead. Both sides agree on the underlying rule and disagree about which control expresses it. Nielsen states it as a prohibition — "a disabled control must not be a communication dead end" — and it is the same rule the [refusals principle](../discovery/principles/refusals-name-their-rules.md) already holds this prototype to.

## 1. The accessibility position, and what it actually rests on

Four sources, in decreasing order of authority, agreeing.

*The article that opened this* ([Smashing Magazine, Friedman, 2021](https://www.smashingmagazine.com/2021/08/frustrating-design-patterns-disabled-buttons/), *retrieved*) argues that a disabled control blocks without saying why, that inline validation is faulty often enough that a hard block strands people with no workaround, and that the alternative is to keep the control live and answer on activation with what is wrong and where. It permits disabling for double-submission, genuine unavailability and objective completeness checks, each conditional on visible feedback. Its fallback where a disabled control is unavoidable — explanatory text, `aria-disabled` in place of `disabled` so the control stays focusable, and a route out — is the same list the others arrive at.

*The GOV.UK Design System* ([button component](https://design-system.service.gov.uk/components/button/), *retrieved*) rules on it in two sentences: "Disabled buttons have poor contrast and can confuse some users, so avoid them if possible", and "Only use disabled buttons if research shows it makes the user interface easier to understand." It is a burden-of-proof ruling rather than a prohibition, and it puts the burden on the side that disables.

*Roselli* ([Don't Disable Form Controls](http://adrianroselli.com/2024/02/dont-disable-form-controls.html), 2024, *retrieved*) adds the mechanism: default disabled styling is a poor signal, authors rarely say why, focus is removed, and — the observation that bears on this repo's method — "WCAG is less useful because disabled controls exempt contrast requirements". For a submit button he recommends keeping it enabled and using `preventDefault()` with a message. He allows disabling outside forms while holding that "the barrier for an author doing it should be sufficiently high as to warrant exploring all other options first".

*Orange's guidelines* ([disable elements](https://a11y-guidelines.orange.com/en/articles/disable-elements/), *retrieved*) name the same three failures for a disabled submit button — "low contrast, a button being unreachable via keyboard, and no information being provided to the user" — and point at `readonly` as the pattern that stays keyboard-reachable and announced.

*The counterweight is Nielsen, and it is the only source that looks for evidence* ([Inactive GUI Controls: Show, Disable, or Hide?](https://www.uxtigers.com/post/inactive-buttons), *retrieved*). His framework separates by permanence rather than by principle: hide what a person can never have, because it is a role or subscription boundary; disable what is sometimes available and sometimes not, because a control that appears and disappears destroys visibility of system status; keep live and validate on activation where the form is complex enough that preempting every state is worse than answering after one. He requires an explanation and a route in every case.

*His evidence section is the part to read carefully, because it is mostly not evidence.* Two numbers circulate from that article and neither is a measurement.

| Number | What it actually is |
|---|---|
| 60 / 32 / 8 in favour of always-clickable, disabled, hidden | A social-media poll. Nielsen's own note is that none of the commenters claimed to be arguing from observation |
| 76% recommend disabling with an explanation, 24% enabled-with-error, 0% hiding | A tally by Gemini over 50-odd sources, in a deep-research pass Nielsen ran and reports as such. It counts practitioner opinion, and it is machine-generated. It has since been quoted elsewhere stripped of both facts, which is how it came back to us in a search before this note traced it |

The one empirical claim on the pro-disable side is a team's usability test reported by Bondkowski, which Nielsen relays: users performed significantly better with muted primary-colour disabled buttons. There is no sample size, no writeup and no primary source; it reaches us through one summary of one comment. Nielsen's own conclusion after looking is that "there is no credible empirical evidence" on the question at all.

So the unanimity in this section is a unanimity of reasoning. That does not make it wrong — the reasoning is about keyboard reachability and contrast, which are checkable facts rather than preferences — but it is worth knowing that a design system's ruling and a blog post's are the same kind of claim here, and that the count that looks like a survey is a language model reading blog posts.

## 2. What the standard says, and where this repo already exceeds it

WCAG 2.2 SC 1.4.3 exempts a disabled control from contrast outright: "Text or images of text that are part of an inactive user interface component ... have no contrast requirement" ([Understanding 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), *retrieved*). Roselli's complaint about that exemption is that it licenses the illegibility he describes.

Two consequences for this prototype.

*The contrast numbers behind [decision 8 of the component library](../specs/ui-component-library/design.md) are voluntary.* It holds a ruled-out option to 4.5 and reaches 6.74 in dark and 4.83 in light. The standard asks for nothing there. This is the same position the repo takes on the [refusals principle](../discovery/principles/refusals-name-their-rules.md) — a refusal is content, and content has to be readable — and it is worth recording as a deliberate excess rather than as compliance.

*The exemption most likely survives a switch to `aria-disabled`,* because the exception is worded in terms of an *inactive* component and ARIA defines `aria-disabled` as an element that is perceivable but not operable. React Spectrum's maintainers read it the other way — that a control which behaves interactively must meet contrast ([discussion #9232](https://github.com/adobe/react-spectrum/discussions/9232), *retrieved*) — but that is a design system's own bar, not the standard's. It does not bind here either way, since the tokens clear 4.5 already.

*What `aria-disabled` does and does not do* ([MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-disabled), *retrieved*): nothing automatically. It does not prevent focus, activation or submission, and it changes no styling. Every one of those is the author's to implement. Its single effect is that the element is announced as disabled while staying wherever the author leaves it in the focus order.

*And a correction to a claim this repo has been making.* The [component library](../specs/ui-component-library/design.md) rests decision 5's repair on `aria-describedby` from a disabled control, and the strong form of the argument for changing that — that a description on a disabled element is never announced — is not supported. NVDA and JAWS read in browse mode by arrow key and by single-letter jump, `B` for buttons, and reach elements regardless of the tab order ([Accessibility Developer Guide](https://www.accessibility-developer-guide.com/knowledge/screen-readers/desktop/browse-focus-modes/), *retrieved*); VoiceOver reaches them the same way. The defensible claim is narrower and still sufficient: a disabled control is outside the *tab* order, so a keyboard user tabbing through a card never lands on it and the description is never announced on focus. Whether each screen reader announces a `describedby` on a disabled element in browse mode was not tested and is registered as a gap.

## 3. The configuration field disables on purpose, and its reason does not transfer

The other literature answers the question the opposite way, and it is not being careless.

*Backtrack-free interactive configuration is a formal property, and offering only the valid values is how it is delivered.* Hadzic and Andersen, [AAAI 2006](https://cdn.aaai.org/AAAI/2006/AAAI06-010.pdf) (*retrieved*, read in full), state the requirement directly: the domains a configurator calculates should be "complete (all valid configurations should be reachable through user interaction)" and "backtrack-free (a user is never forced to change an earlier choice due to incompleteness in the logical deductions)". A valid domain is the set of values "with which ρ can be extended to become a total valid assignment", and the interaction it produces is the one this question is about — "at each step of the interaction, the configurator reports the valid domains to the user", who "selects a value from the calculated valid domain". Values outside it are not offered.

*Their justification for it is asserted, not measured, and it is a different claim from the one this note is testing.* The paper's own sentence is that the guarantee "reduces cognitive effort during the interaction and increases usability" — a claim about not being stranded and not having to backtrack, made without a study, in a paper whose contribution is an algorithm. Nothing in that line of work claims a greyed-out option reads better, explains itself, or reaches a keyboard. Configit's Virtual Tabulation ships the same guarantee commercially, and the [configuration field note](configuration-field.md) already records its behaviour: invalid combinations can never be selected, and there is no backtracking.

*The same field arrives at the other answer wherever an inconsistency is allowed to happen.* Felfernig, Schubert and Zehentner ([AIEDAM 26(1), 2012](https://arxiv.org/abs/2102.09005), *retrieved*, introduction and sections 2–3 read) open on the case the valid-domain line prevents: "when interacting with a configurator application, the given set of customer requirements (represented as constraints) can become inconsistent with the configuration knowledge base". Their answer is a diagnosis — "a set Δ ⊆ C_R, s.t. C_KB ∪ (C_R − Δ) is consistent", minimal when no proper subset of it is one — computed over the customer's own recorded requirements rather than over the model. Their worked example is a car configuration whose three requirements admit three minimal diagnoses, each naming a different pair to give up, and their algorithm exists because a user wants a preferred few rather than all of them. Marcus and McDermott's VT, which designed real elevators, is propose-and-revise for the same reason ([configuration field](configuration-field.md)).

*So the two poles are one field's two answers, and which one applies is a question about the system rather than about the interface.* Where a repair cannot be computed, offering only valid values is the only way to keep the user out of a dead end. Where it can, the dead end does not exist: the customer is not stranded by a refused click, because what comes back names what to give up and offers to give it up. The guarantee that justified restricting the domain is satisfied by the other route, and what restricting it costs is the offer. This prototype's solver does both operations — `valid_options` for the first, `explain` and `repairs` for the second ([solver choice](solver-choice.md)) — and its repairs are ordered by retention, which is the preference over diagnoses that paper's algorithm exists to compute. The interface currently spends only the first.

## 4. What ships

Read from documentation, not exercised.

| Source | Position | What it turns on |
|---|---|---|
| [GOV.UK](https://design-system.service.gov.uk/components/button/) | Avoid; disable only if research shows it helps | Burden of proof on disabling |
| [Orange](https://a11y-guidelines.orange.com/en/articles/disable-elements/) | Sparingly; not on submit buttons; `readonly` where the value is just not editable | Keyboard reachability |
| [React Spectrum](https://github.com/adobe/react-spectrum/discussions/9232) | Disabled stays disabled and gets no tooltip; explain through a `ContextualHelp` control beside it, or ship an enabled button with a different label | Touch: a long-press tooltip collides with text selection, link preview and context menus, so it is not a general channel |
| [Nielsen](https://www.uxtigers.com/post/inactive-buttons) | Hide the never-available, disable the sometimes-available, validate on activation in complex forms | Permanence of the condition |
| [Smashing](https://www.smashingmagazine.com/2021/08/frustrating-design-patterns-disabled-buttons/) | Keep live, answer on activation; disable only for in-flight and genuine unavailability, with feedback | Whether a way forward exists |

*Where they converge is the touch case.* React Spectrum's reason for refusing the tooltip is not the one the accessibility sources give, and it is the strongest of them: on a touch screen the gesture that would raise the explanation is already spoken for. That is an argument against `title` as a channel rather than against disabling, and it is the argument [constitution #16](../specs/constitution.md) already made independently.

## 5. What this prototype can actually do

Four controls refuse an option, and they are not one edit.

- *`ChipRow` and `OptionList`* (`src/components/generative-ui/ask-choices.tsx`) and *`OptionEditor`* (`src/components/config-canvas/document-parts.tsx`) pass `disabled` to a shadcn `Button`. Dropping the attribute is mechanical; every `disabled:` variant in the same class strings stops applying at the same moment, including `disabled:cursor-not-allowed` and the two deliberate `disabled:opacity-100` overrides [decision 8](../specs/ui-component-library/design.md) kept.
- *`ScaleControl`* is not the same edit. Its options are Radix `ToggleGroupItem`s, and the item's `disabled` prop is what gates the group's `onValueChange`, so removing it changes what the group emits rather than only how the item looks.
- *`KEEP_TITLE` loses its last reason.* It exists because a disabled control has no pointer events and raises no native tooltip. A control that is operable has both, so the `title` works and the `aria-describedby` is announced on focus without a workaround. What was built took this further than the note's verdict: the refused option is not `aria-disabled` either, because a control that dispatches and returns repairs is not disabled in either sense.
- *The refusal list is unaffected either way.* `RefusalList` renders from the payload's rules, not from the control's state, so the sentences stay where they are and gain the property they were written for.

*The one this survey missed is the most-seen.* The chat composer's send button greys itself on an empty field, and it is not in the four above because this app does not pass its `disabled` — `CopilotChatInput` computes it, as `isProcessing ? !canStop : !canSend`. That puts it in the "nothing picked yet" class rather than the refusal class, and it is the case the Smashing article is written about. It is reachable: the slot's props can be intercepted before they reach the button.

*What the agent side needs is nothing.* `revise_choices` returns repair options on collision and `agent/main.py` maps the `Set <term> to <value>` sentence onto it unconditionally, whether or not the value is currently valid. A click on a refused option would traverse a path that is already built and already tested by the scenario suite's repair assertions.

## 6. What this note does not establish

- *Whether allowing the refused click reads better.* No study compares restrictive option presentation with repair-based presentation, in configurators or anywhere else. Registered as [no comparison of restrictive and repair-based presentation](gaps.md#no-restrictive-vs-repair-comparison). It is the second control-level dispatch question this project has hit with no literature behind it, beside [no comparison of chip dispatch](gaps.md#no-chip-dispatch-comparison).
- *What shipped configurators do with an incompatible option.* Manufacturer configurators are the obvious comparison and their behaviour is not documented; forum reports describe conflicts being resolved by silent removal, which is a third pattern neither literature discusses. Registered as [unobserved configurator behaviour](gaps.md#unobserved-configurator-behaviour).
- *The Bondkowski usability test.* The only empirical result on the pro-disable side, unretrievable as anything more than a relayed summary. Registered as [the unretrievable disabled-button test](gaps.md#unretrievable-disabled-button-test).
- *What screen readers do with a description on a disabled control in browse mode.* Section 2 states the narrow claim that holds; the wider one was not tested, and testing it needs NVDA, JAWS and VoiceOver rather than reading.
- *Whether the in-flight controls here are the sanctioned case or the criticised one.* Every source permits disabling during a run on condition of visible feedback. `creating`, `deleting` and `isRunning` go grey and change no label. Whether the chat's own run indicator discharges that condition for the canvas is a question about this layout, and nothing retrieved answers it.

## Related

- [Configuration as a research field](configuration-field.md), which holds both poles of section 3 — Configit's backtrack-free filtering and VT's propose-and-revise — and is the note this one extends
- [What Z3's three operations license the interface to claim](solver-choice.md): `valid_options` is the restrictive pole's operation and `explain` with `repairs` is the other's, and this prototype has both
- [Every refusal names the rules that caused it](../discovery/principles/refusals-name-their-rules.md), whose test — does the reason reach someone who is not holding a mouse — is the accessibility half of section 1 stated as a project rule
- [What a suggestion chip should do when it is clicked](suggestion-dispatch.md), the other question about what one gesture on one control should mean, and the other one with no literature under it
