# The accessible surface — design

Rules how a state and a reason are *expressed*: which channels may carry meaning, what inertness and unavailability look like, the floor under text size, and the focus indicator. Read it before expressing a state as an opacity, putting an explanation on a `title`, revealing a control on hover, or adding a text size. It rules expression only — which reasons exist is [agent-tools](../agent-tools/design.md), which messages are hidden is [agreement-document](../agreement-document/design.md), and the primitives themselves are the [component library](../ui-component-library/design.md).

The numbers below are computed from the oklch tokens in `src/app/globals.css`, converted to sRGB and composited the way a browser composites nested `opacity`. They are not eyeballed and not from a crawler: no automated check reaches an inert card, because a card goes inert only when the agreement moves past the conversation that drew it.

## Decision 1: one channel is never enough, and four channels are never allowed alone

Every defect this feature repairs is one habit: a thing the interface knows, encoded in a channel that does not survive contact with a keyboard, a touch screen, or ordinary uncorrected vision. The rule is stated as a prohibition because that is how it gets applied at a call site.

*Opacity may not carry a state.* It composes multiplicatively down the tree and nothing at a call site can see what it will be multiplied by.

*Hover may not be the only route to a reason or a control.* There is no hover on a touch screen and none on a disabled element in any browser.

*A line style may not be the only difference between two meanings.* Dotted against dashed, at 12px and 40% alpha, is not a difference.

*Colour may not be the only difference either*, which is the ordinary form of the rule and the one this codebase was already keeping.

What replaces each is a token or a sentence. A token composes predictably because it resolves to one colour; a sentence survives every input device there is.

## Decision 2: inertness is stated, not faded — because a fade cannot be made to work

The first attempt was to keep the fade and raise it until the composite passed. It cannot be raised far enough. Sweeping the alpha on `CardShell`'s `Card`, with every child opacity removed so only one remains, against `--muted-foreground` — the token the staleness sentence, the option labels and every secondary note use:

| card `opacity` | dark | light |
|---|---|---|
| 0.60 (as built) | 3.13 | 2.32 |
| 0.75 | 4.27 | 2.99 |
| 0.85 | 5.18 | 3.60 |
| 0.90 | 5.67 | 3.96 |
| none | 6.74 | 4.83 |

Small text needs 4.5. Light theme does not reach it at any opacity below 1, because `--muted-foreground` on white is 4.83 to begin with and has no headroom to spend. So the fade goes, and inertness is carried by three things that were all already present and were being drowned by it:

- every control in the card is genuinely `disabled`, which the browser exposes to assistive technology without being asked;
- the card carries its `reason` sentence, which says in words what the fade said in grey, and now says it at 4.83:1 rather than 2.32:1;
- the card's edge goes dashed, which is a change to a boundary rather than to any text.

`repair-options.tsx` had already reached the same conclusion for its own buttons and written half the reason down: two fades over one string left the rules line barely readable, *and* a spent repair is still the record of what was offered. The first half was about compounding and this decision removes it — with the card no longer fading, a lone `disabled:opacity-50` on a button compounds with nothing. The second half stands on its own and is the general case. A spent card is the record of the turn it belongs to, and a record you cannot read is not one.

So the `disabled:opacity-100` overrides in `repair-options.tsx` and `draft-comparison.tsx` are kept, and their comments are rewritten to the argument that still holds. A spent card's controls stay legible; what says they are spent is the dashed edge, and the `disabled` state the browser exposes without being asked.

*Unavailability follows the same rule.* An option ruled out was `opacity-40`; it becomes `text-muted-foreground` with the strike kept — 6.74 dark, 4.83 light, and no longer multiplied by anything above it.

## Decision 3: a refusal is visible text, and the disabled control points at it

[ui-component-library](../ui-component-library/design.md) decision 5 chose the native `title` because Radix `Tooltip` will not fire on a disabled trigger. That premise is correct and the conclusion drawn from it was too narrow: the alternative to a tooltip is not a different tooltip, it is not being a tooltip. The rules go on the page.

Under each control that refuses something, a list names each unavailable option and the rules that rule it out, in `refusalText`'s existing words. The disabled control carries `aria-describedby` pointing at its own line, so a screen reader reading the control reads the same sentence a sighted keyboard user reads, and there is one sentence rather than two. `title` stays as a convenience for the mouse; it is no longer the only channel, so nothing depends on it.

This is the second half of a repair the [refusals principle](../../discovery/principles/refusals-name-their-rules.md) started. Its walkthrough found refusals that named no rule *and* refusals that no keyboard or touch user could reach; the first was fixed the same day by putting named cores into state, and the second was left. `separates` has been reaching the browser correctly ever since and stopping at the last hop.

*Ids without `useId`.* [chat-surface](../chat-surface/design.md) forbids minting a React id in the hydrated tree. Every id here is derived from data already in hand — a `toolCallId` and a variable name in the chat, a variable name in the sheet — so it is stable across server and client by construction and the rule is not approached.

*What this retires.* `KEEP_TITLE` existed because a disabled control has no pointer events and therefore raises no native tooltip. With the reason on the page the workaround is no longer load-bearing, but it is kept: restoring hover costs nothing, a mouse user reading a tooltip is a real convenience, and removing it would be a change with no beneficiary. Decision 5 of the component library is reconciled to say that `title` is now a second channel rather than the only one.

*And what it makes redundant.* `ScaleControl` carried a 10px sentence — "greyed segments are outside the currently valid range" — which described a distinction the CSS did not draw: `bg-secondary` against `--card` is 1.19:1 in dark and 1.10:1 in light. The refusal list replaces it. The segments are told apart by a muted foreground, a strike and a dashed edge, the same vocabulary the chips use, rather than by a background tint: no tint reaches 3:1 against the card without going darker than the disabled state should be.

## Decision 4: reading matter is 14px, chrome is 12px, and nothing is smaller

The canvas already worked this way and nothing said so. Its clauses, recitals and schedule rows are `text-sm`; its labels, notes and controls are `text-xs`. The chat did not: `messages.tsx` pulled CopilotKit's prose down to `text-xs!` to match "a 12px canvas", and the canvas's reading matter is 14. The override stays — the library's own 16px is wrong here — and lands on 14 instead, which is what it was aiming at.

Four call sites were below 12px: the completion label in `terms.tsx`, the provenance badge in `document-parts.tsx`, the scale legend in `ask-choices.tsx` and the rule labels behind a repair in `repair-options.tsx`. The last is the sharpest, because those rule labels are what the refusals principle exists to surface, set at 10px in a muted grey. All four go to `text-xs`.

The floor is mechanical, so `tests/legibility.test.ts` holds it: no live source file may set a text size below 12px.

## Decision 5: the focus ring is a zinc step darker, and its halo stops being transparent

`--ring` against white is 2.63:1, and the `ring-ring/50` halo drawn beside it is 1.55:1. A focus indicator needs 3:1 against what it sits on, so in light theme the app had no conforming focus indicator anywhere.

Both are token changes and both stay inside the zinc ramp the [component library](../ui-component-library/design.md) decision 2 adopted, so this is a step change rather than a palette deviation: light `--ring` becomes zinc-500, the value `--muted-foreground` already carries there, and dark `--ring` becomes zinc-400 to match on its side. Light reaches 4.83, dark 6.74 against a card and 7.56 against the page. The `/50` on the ring utility goes, since a halo at 1.55 contributes nothing but a blur.

## Decision 6: a value's kind is told by a word, and the inline token stops pretending to distinguish six

`TOKEN_STYLE` declared six kinds. Four of them — `user`, `agent`, `document`, `forced` — rendered identically apart from an `opacity-90`, and the remaining two split on dotted against dashed. So the sheet was drawing three distinctions at most and claiming six, and the kind's name lived only on a `title`.

The inline token keeps the distinction it can actually draw and that a reader of a contract needs: *the agreement states this* against *this is not decided yet*. Who chose it moves entirely to `ProvenanceBadge`, which carries an icon and a word and is where [choice-provenance](../choice-provenance/requirements.md) puts provenance anyway. The token gains an `sr-only` span carrying `KIND_TITLE`'s sentence, so its accessible name reads "an office building, you chose this" — including on the `forced` branch, which is a non-interactive `span` and had no channel at all.

## Decision 7: the toolbar is revealed by focus as well as hover

`TOOLBAR_OVERLAY` in `messages.tsx` was `opacity-0` with `pointer-events-none`, lifted on `group-hover/message`. The copy button stayed in the tab order throughout, so tabbing through a reply moved focus onto an invisible control. `focus-within` variants are added beside the hover ones. [chat-pane](../chat-pane/design.md) decision 7 is unaffected in substance: the toolbar is still out of flow and still takes no vertical space, and this only adds a second trigger for the reveal it already performs.

## Decision 8: structure the screen reader can use

*The comparison table.* `draft-comparison.tsx` had `th` for its column headers without `scope`, and the variable-name column as `td`. A cell announced its value with no indication of which variable or which draft it belonged to, which is the entire content of a comparison. Column headers take `scope="col"`, the label column becomes `th scope="row"`.

*The render.* `visual-configuration` states that the render "draws nothing the agreement does not state", which makes the agreement mode its text alternative — a fact the markup never declared. The canvas container becomes `role="img"` with a name built from the viewpoint and the car, and a visually hidden line names the agreement mode as the equivalent. Nothing attempts to describe geometry in words; the equivalent already exists and is one button away.

*`CheapestMark`.* An `aria-label` on a bare `svg` is dropped by several browser and screen-reader combinations. It gains `role="img"`.

## Verification

Constitution #9 puts colour, layout and focus in the tier no check sees, so the contrast numbers are computed from the tokens rather than sampled from a screenshot, and the behaviour is verified by running the app.

Two of the rules are mechanical and are held by `tests/legibility.test.ts` in the offline tier: no text size below 12px in live source, and no `opacity-*` class on an element that also carries a text token, which is the shape the compounding took every time it appeared. The check reads source the way `couplings.test.ts` does, and skips the dead starter code the [gotchas](../../../CLAUDE.md) enumerate.

*Computed, not sampled.* Every ratio in this document comes from converting the oklch tokens in `globals.css` to sRGB and compositing nested `opacity` the way a browser does. That is the only way to reach the state the review started from: a card goes inert when the agreement moves past the conversation that drew it, which no crawler and no automated check reaches.

*Held by checks.* `npm test`: 305 passed across 10 files. Two are new.

`tests/legibility.test.ts` (offline) holds the two mechanical rules. It was verified negatively before being trusted — reintroducing `opacity-40` beside the muted token and one `text-[10px]` makes it fail and name both call sites, and removing them makes it pass.

`tests/interface/refusals.test.tsx` (interface) renders `AskChoices` against the mocked stream for each of the three controls and asserts that the rule is text in the document, that the refused control's `aria-describedby` resolves, and that it resolves to the element carrying the visible sentence. Seven assertions, and they would have failed for `ChipRow` and `ScaleControl` before this change while passing for `OptionList`, which is exactly the asymmetry the review found.

`npm run typecheck` and `uv run pytest` (307 passed) are clean; nothing here touches the agent.

*Built.* `next build` compiles, and the built stylesheet was read back to confirm the `:focus-visible` rule ships *unlayered* — the one property of it that matters, since a rule inside `@layer base` would lose to every primitive's `outline-none` and fail silently.

## Known gaps

*The browser pass has not been run.* Constitution #9 puts hydration, layout and colour on the running app, and this change touches all three: two new wrapper `<div>`s (`ChipRow`, `OptionEditor`), a refusal list whose length grows with the number of ruled-out options, a card that now marks inertness with an edge rather than a fade, and a global focus outline. The compiled build and both check tiers are clean, and none of that is the same as having looked. What to look at, in order:

- A `ScaleControl` on a capacity scale with several segments out of range: `refusalsOf` emits one line per refusal, so a compact control can now carry several sentences under it. The mid-contract revision transcript, where the speed collision fires, is the case with real refusals.
- The two new wrappers. `OptionEditor` renders inside `PopoverContent` and inside a schedule row's disclosure; a wrapper breaks the layout if either parent treated the option row as a flex child.
- An inert card in both themes, which is the state the review opened on. The fade is gone and a dashed `border-muted-foreground` edge replaces it.
- Focus on a filled control, which is what the unlayered outline exists for.
- Hydration on the workspace page. Nothing here mints a React id — every id is derived from a tool call id, a variable name or a layer — but the rule is worth confirming rather than asserting. Reload before believing a mismatch: the first load after an edit reports one under `next dev` and the next is clean.

*A spent card may now draw more attention than a live one.* Its dashed `border-muted-foreground` edge is 6.74:1 in dark where a live card's `ring-foreground/10` is 1.33:1. Dashed reads as provisional rather than as emphasis, which is the reason for choosing it, but whether that holds at a glance in a transcript of several cards is a browser question and is on the list above. A weaker edge is not the answer — this edge is the only state indicator for the two inert conditions that pass no sentence, and `/70` is 2.74:1 in light.

*Whether the global outline is ever clipped.* `Card` sets `overflow-hidden` and `outline-offset: 2px` draws outside the element, so a focusable flush against that boundary would lose its indicator silently. Card contents sit inside `p-3` and should clear it. Silent loss at a containment boundary is a failure this codebase has met before ([chat-pane](../chat-pane/design.md) decision 7), which is why it is written down rather than assumed.

*The four value kinds that rendered identically are now deliberately two.* Decision 6 moves the distinction to the badge and the `sr-only` sentence rather than drawing it inline. Whether a reader of the document misses it there is a question for use, not for this document.

## Notes from implementation

*The fix that could not be tuned.* The first attempt kept inertness as a fade and looked for an alpha that passed. Decision 2's table is that attempt: there isn't one, because `--muted-foreground` on white starts at 4.83:1 and has no headroom. Sweeping it was worth the ten minutes — it turned "this is too dim" into "opacity cannot express this state", which is the rule the whole spec now rests on and the reason the same edit was made in four other places.

*The first draft of decision 2 broke its own criterion.* Removing the fade left the dashed edge at `border-muted-foreground/50`: 2.65:1 in dark, 1.98:1 in light. That is fine for the third inert condition, which also passes a `reason` sentence, and not fine for the other two, which explain themselves from the transcript and carry no words at all — there the edge *is* the state indicator, and this spec sets 3:1 for one. Unqualified, it is 6.74 and 4.83.

*The refusal ids needed a layer, not a variable.* They were first scoped by variable name alone, on the reasoning that one editor per variable is open at a time. `onEditorOpen` reports what is open; it does not enforce it, and a prose token's popover and a schedule row's disclosure are independent. `OptionEditor` takes an explicit `scope` — `"token"` or `"schedule"` — so the claim is enforced by the call site rather than assumed.

The same assumption survived one round longer in `ValueToken`, which hardcoded `"token"`. Three agreement-group values are restated in the recitals as well as stated in the terms ([agreement-document](../agreement-document/design.md), *Marks in the margin*), so one variable has two tokens on one page, and whether both editors can be open at once is a fact about Radix's outside-click handling rather than anything this code guarantees. `ValueToken` takes the scope too, and the recitals pass `"recital"`.

*The kind sentence belongs on the control, not in the prose.* Both branches of `ValueToken` first got the `sr-only` kind. On the non-interactive branch that interpolates "the rules force this value" into every sentence of a document whose premise is that it reads as a contract, and the margin's provenance badge already answers it. It is kept only where the token is a button, and there it describes an affordance somebody is about to act on.

*The focus indicator moved from the token to the app.* Darkening `--ring` fixes `focus-visible:border-ring` on anything with a card behind it, and not on a filled control: on a selected chip the ring against the primary fill is 2.07:1 in dark, because a border is drawn on the button and measured against the button. An outline is drawn outside it. One unlayered `:focus-visible` rule in `globals.css` covers every control at once, which is better than editing twelve installed primitives — they are installed rather than written, and the next `shadcn add` would take the edits back.

*`role="img"` swallows what it contains.* It was first put on the render panel, which also holds the "drawing the car…" line; the role makes a subtree presentational, so the status line went with it. The role belongs on a wrapper around the canvas alone.

*What was checked and left alone.* `icon-xs` is `size-6`, exactly the 24px target-size minimum, so it passes and no change was made. `CheapestMark`'s emerald is 4.71:1 in dark and 3.77:1 in light, both clear of the 3:1 non-text threshold; it gained `role="img"` for the label on a bare `svg` and kept its colour. Whether the transcript announces a streaming reply is CopilotKit's to answer and was not established either way — it is not claimed here and not fixed here.
