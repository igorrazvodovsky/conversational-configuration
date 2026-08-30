# One gesture, one action: a dispatched change applies whole or shows repairs

Status: implemented and verified 2026-08-21. The [design](design.md) records the routing as built, including the tool-side guard the live run made necessary.

Every card click and every sheet edit dispatches a structured user message that the agent maps onto one atomic tool call. One sentence in that grammar reaches two different actions. `Set <term> to <value> (term=value)`, minted by `choiceMessage` and wrapped by `canvasEditMessage`, is meant to reach `set_choices` when the term is undecided and `revise_choices` when it is decided, and nothing in the sentence says which. The prompt asks the agent to judge.

The two differ in what the customer gets. `revise_choices` is total: on a conflict it changes nothing and comes back with solver-computed repair paths, ordered by how many existing choices they keep and rendered as cards the customer can click. `set_choices` is partial: it records what can hold, refuses the rest with the rules that separate them, and offers no move forward. Both behaviors are right for what they were built for, and the customer's own click picks between them by accident.

The cost is measured twice over in the [conversation-checks design](../conversation-checks/design.md). A scripted A/B across two arms of eighteen conversations caught one real regression, and it was this one: the agent recorded a revision with `set_choices` and lost the repair cards, while every prose assertion beside it passed. The same document's third known gap is the other half — a conflicting `set_choices` on a term the conversation hadn't decided is refused with its rules rather than answered with repairs, and the renewal scenario steps around it by picking a 630 kg car.

This feature makes a dispatched value change total, whichever term it lands on. In the built vocabulary that means every `Set …` sentence reaches `revise_choices`, and `set_choices` becomes what its own rationale describes: the action for what the agent translates out of the customer's prose, where partial application protects the choices that had nothing to do with a collision. A clicked change has no such claim on partial application — every value in it was picked deliberately, so half of it landing is worse than being shown the way through. It repairs [finding 1 of the ontology](../ontology-of-phenomena/ontology.md), which is where the misalignment is recorded.

Serves discovery principle [revision is an ordinary move, not a restart](../../discovery/principles/revision-is-an-ordinary-move.md), whose words are that a change *shows what it breaks, proposes repairs, and applies atomically* — a guarantee the built grammar delivers only when the agent judges correctly. Tests the assertion [showing the ripple at the moment of revision makes nonlinear change workable](../../discovery/assertions/ripple-at-the-moment-of-revision.md) at its weakest joint: the ripple can only be shown where the action that computes it is the one the click reached. The [phase plan](../../discovery/phase-plan.md) records this finding as unanswered by any principle. That reading is narrower than it looked — the principle settles the guarantee, and what no principle settles is whether the customer's sentence should also *say* which move it is, which this spec leaves to design and answers no.

## Stories

- As a customer changing a value I already decided, I get the same repair paths whether I clicked a chip in chat or edited the sheet. What I get doesn't depend on how the agent read the state.
- As a customer picking a value on a term nobody has decided yet, a collision gives me somewhere to go rather than a refusal I have to be talked out of.
- As the person changing the prompt, the sentence and the tool, I read one row of the gesture table and know which action a click reaches, instead of a paragraph that asks the agent to work it out.
- As the person writing conversation checks, the assertion that a gesture reached the right tool is about the grammar rather than the model's judgment, so it stops being a check a prompt reword can regress.

## Acceptance criteria

What a dispatched change does:

- GIVEN a value the customer changes through an in-chat control or the agreement sheet, WHEN it conflicts with what the agreement already says, THEN nothing changes and repair paths come back as cards, whether or not the term was decided before.
- GIVEN a change carrying several `Set …` lines from one multi-variable control, THEN it is total too: it applies whole or applies nothing, as one action and one history entry.
- GIVEN a change that applies cleanly, THEN nothing else moves. A canvas edit stays hidden from the transcript and answered with empty text, an in-chat pick stays visible, and neither gains an acknowledgment.
- GIVEN the change lands, THEN the [conversation-checks design](../conversation-checks/design.md)'s third known gap — a conflicting pick on an undecided term dead-ending — closes for every dispatched gesture, and that document is reconciled, because it records the dead end as correct against the tool contract.

Which action a gesture reaches:

- GIVEN the ontology's gesture table, WHEN this lands, THEN every row names exactly one action, and finding 1 is retired rather than reworded.
- GIVEN the prompt's rule for the `Set …` sentence, THEN it names one action unconditionally, and the clause asking the agent to weigh whether a term is already decided goes away with the ambiguity it exists to resolve.
- GIVEN the prompt alone did not hold the rule — the model reached for `set_choices` on the opening turn of a fresh conversation across four runs and three strengthenings — THEN the routing is enforced in the tool: `set_choices` refuses a message that is nothing but `Set …` lines or carries the `Canvas edit:` prefix, and names `revise_choices`. The [design](design.md) records the evidence and what the mechanism costs.
- GIVEN the agent recording choices it translated out of the customer's prose, THEN `set_choices` keeps its partial semantics and its rationale, and this feature rules nothing about that path. A prose turn that opens on the word *Set* is prose: the refusal is keyed on the sentence's shape, the parenthesised code included, not on its first word.

The sentence itself:

- GIVEN the routing is unconditional, THEN the sentence needs no new wording, and design has to justify any change to it rather than assume one. The mint sites can tell a decided term from an undecided one — the canvas holds the configuration, the ask card's payload carries a status per option — so a wording change is available and is not required.
- GIVEN design does change the wording, THEN the sentence still reads as something the customer could have said, and its opener joins `CARD_PREFIXES` in `spokenText`. A sentence opening with a word that list doesn't carry bypasses code-stripping and puts `contract_term=y10` in the customer's own bubble, which is the defect `spokenText` exists to prevent. The offline coupling check already covers it.
- GIVEN a transcript that already holds sentences in the current wording, WHEN it is resumed, THEN it still reads correctly and the agent still maps those sentences.
- GIVEN the other card sentences — `Apply repair:`, `Reconcile deviation:`, the draft moves, undo and redo — THEN each already names one action and none of them changes.

Reconciliation, per constitution #15:

- GIVEN this lands, THEN the prompt's *Messages that are not conversation* rule, the ontology's gesture table and action signatures, and the coupling tables on both sides of the language boundary change together, in one change. Card copy and prompt wording are one artifact.
- GIVEN the grammar is mirrored in Python for the conversation checks (`agent/tests/scenario_grammar.py`), THEN the mirror moves with it, and the scenarios that dispatch state-critical turns through it keep passing.

Verification:

- GIVEN the change is to which tool a sentence reaches, THEN a conversation check asserts the tool actually called — the assertion shape that caught the regression when every prose assertion beside it passed.
- GIVEN the conflict paths, THEN a check covers a conflicting pick on a decided term and a conflicting pick on an undecided one, and both end in repair options.
- GIVEN the multi-variable control, THEN a check covers a batch that half-conflicts and asserts nothing landed.

## Out of scope

- *Collapsing `set_choices` and `revise_choices` into one action.* Partial and total both have a reason, and this feature routes between them rather than choosing one.
- *The prose path.* What the agent calls when the customer types a sentence stays the agent's judgment.
- *The other findings*, 2 through 11. Each is its own change.
- *An action log.* Knowing which action moved a value after the fact is finding 3, deferred with concepts.
