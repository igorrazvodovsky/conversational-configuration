# Ontology of phenomena: one vocabulary for what the prototype does

Status: approved and implemented ([design](design.md), [the ontology itself](ontology.md)). The binding is constitution #15.

The prototype's behavior is described in five places and reconciled in none: the agent's system prompt in `agent/main.py`, the tools and state types in `agent/src/configuration.py`, the durable record in `agent/src/workspace_store.py`, the card grammar in `src/lib/configurator.ts` together with the canvas copy that dispatches it, and the specs under `docs/specs/`. Each names the same happenings differently. Recording a choice is `set_choices` in the code, "record every commitment as it is made" in the prompt, `Set <term> to <value>` and `Canvas edit: …` on the surface, and "the edit grammar every value on it uses" in a spec. Nothing states that these are one thing, and nothing would notice if they stopped being one.

This spec adopts the ontology of phenomena from Meng et al., [*Making Software Meaningful*](https://arxiv.org/abs/2606.11051) — individuals, values, actions and facts — as this prototype's single vocabulary, on the terms the [ui-component-library spec](../ui-component-library/requirements.md) adopted shadcn as its component vocabulary. The local copy is in the source vault, at `Dropbox/PARA/3 Resources/Papers/pdfs/2606.11051v1.pdf`. It produces one document — `ontology.md`, beside this spec — that enumerates the four kinds of phenomena for the prototype as built, and obliges every other artifact to use that document's names. That is a fourth file in a feature directory where constitution #11 names three, and it is deliberate: the enumeration is a reference artifact rather than a requirement, a design or a work plan, and burying it in any of the three would make it unciteable.

Two things make the enumeration worth having beyond tidiness. It is *diagnostic*: where the artifacts disagree about what an action is, the disagreement is a design defect, and today it has nowhere to be written down. The known instance is on the document canvas, where the same click reconciles a requirement on one term and edits the sheet on the next, and the two mean different things to the record — negotiation against bookkeeping. And the project has already placed the bet the paper argues for. The [conversation checks](../conversation-checks/requirements.md) assert on tool calls, payloads and state, never on prose, and that position was measured rather than assumed. Those checks are already asserting over an action-and-fact vocabulary that no artifact writes down.

Concepts, the partitioning of actions into modules, and the synchronizations that compose them are deferred by decision and are not in this change.

Serves the assertion [the representation of the agreement selects the user's moves](../../discovery/assertions/representation-selects-moves.md) — facts are what the agreement represents and actions are the moves it offers, so an enumeration of both is the pair the assertion is about, stated once instead of implied by each surface. Serves it rather than settling it: the [phase plan](../../discovery/phase-plan.md) records that the assertion needs readers who are not the author. Constrained by [every refusal names the rules that caused it](../../discovery/principles/refusals-name-their-rules.md), which is why solver-derived state cannot be filed as an ordinary fact: what the solver computes and what an action asserts have to stay distinguishable, or constitution #1 loses its wording.

## Stories

- As the person writing a spec, the prompt, a tool or a card, I name a happening once and every other artifact uses that name, so a change to one of them is visibly a change to all of them rather than a drift that nobody sees.
- As a reader asking why a value is on the agreement, I get the action that put it there and the facts that action asserted, in the same words the interface used when it happened.
- As a reviewer of the interaction, I can tell when one gesture the customer makes lands on two different meanings, or when one meaning is reached under several unrelated names, because both are visible as a mismatch in the enumeration rather than as a feeling that something is off.
- As an LLM given this repository, the vocabulary of the domain is stated rather than inferred from five partial descriptions, which is what the paper claims makes generated work legible.

## Acceptance criteria

The enumeration:

- GIVEN the ontology document, THEN it lists every individual type, value type, action and fact type of the prototype, each derived from what is built — `agent/src/configuration.py`, `agent/src/workspace_store.py`, `agent/src/product_model/elevator.json`, `src/lib/configurator.ts` — and nothing that is not. A phenomenon with no code behind it is a proposal, and belongs in a spec rather than here.
- GIVEN an action, THEN it carries a signature naming its inputs and outputs, the facts it requires, and the facts it asserts and retracts, in the paper's rule form. Prose about when the agent should call it stays in the prompt; the signature is what is shared.
- GIVEN a fact type, THEN it is a relation over individuals and values, never a record with attributes hanging off an individual, because the individuals here — a workspace, a draft, a conversation, a requirement — already participate in more than one kind of fact.

Coverage:

- GIVEN every tool in `configuration_tools`, THEN each appears exactly once, as an action or as a query. Queries are named as queries: the paper admits them only as conditions on actions, and several of these tools change nothing.
- GIVEN the card grammar's dispatch sentences — the `Set …` lines, `Canvas edit:`, `Apply repair:`, the abandon sentence, `Reconcile deviation:`, the four draft moves, undo and redo — THEN each is stated as the action it reaches, and its visibility in the transcript is a fact the ontology records rather than a rendering detail it omits.
- GIVEN the store's mutations, THEN each is stated as the action that reaches it, including the ones no tool names directly: registering a conversation on its first message, and stamping which conversation last moved the agreement.

Alignment, which is the diagnostic part:

- GIVEN a gesture available to the customer, WHEN the ontology states the action it reaches, THEN a gesture that reaches more than one action, or an action reached by gestures that mean different things to the record, is named as a misalignment together with what it costs.
- GIVEN a misalignment, THEN it is recorded and not repaired here. Each repair is a change to a surface or a tool, with its own spec and its own approval.

Ubiquity:

- GIVEN the constitution, THEN it carries a principle making the vocabulary binding: behavior is named once, and every artifact names it by the ontology's names. The principle is *appended*, never inserted — specs and `CLAUDE.md` cite the constitution by number, and renumbering would falsify every citation of #1, #3, #6, #9 and #12. It therefore lands after the process principles, under a heading of its own rather than filed as one, because naming is neither a product decision nor a step in the spec workflow.
- GIVEN the constitution's own principles, THEN they are inside the vocabulary rather than above it: #15 names this file in what it binds, and #1 to #14 use the enumeration's names. The paper admits no exemption for a founding document — its meaning is "applied consistently across all activities and artifacts" — and an exempt constitution would export its names into the specs that cite it, which #15 does bind ([design](design.md), decision 7).
- GIVEN a spec, an agent prompt paragraph, a tool docstring, a card sentence or a conversation check that names a happening of the prototype, THEN it uses the ontology's name for it, and a name that appears nowhere in the ontology is a defect in one or the other.
- GIVEN a name the checks can enumerate — a tool, an element of the grammar, a key of a configuration or of the durable record — THEN a check asserts the ontology names it, so the obligation above fails a run rather than waiting on a reader. What the check cannot reach is substance: a wrong signature or a fact in the wrong class passes it ([offline checks](../offline-checks/requirements.md)).
- GIVEN the ontology describing an action or a fact the code does not have, or missing one it does, THEN the ontology is wrong and is reconciled to what was built, in the session that built it, on the terms constitution #12 already sets for a spec.
- GIVEN the code naming one meaning in two ways, or one name covering two meanings, THEN the ontology is right and the code carries a finding. The two cases are distinct: mis-description is this document's defect, misalignment is what it exists to record.

Names already spent:

- GIVEN a phenomenon whose name is persisted — a key in the workspace store, a variable or value code in the product model, a tool name in a thread checkpoint — THEN the ontology records the name as it stands. `price` means euros per month and stays `price`, because renaming it breaks resumption of threads written before the [service-agreement spec](../service-agreement/requirements.md). Aligning a name that is wrong is a separate change with a migration story, and this document is where the case for one gets made.

## What it has to settle

Four questions have no answer in the code today, and every one of them has a consequence downstream. The ontology answers each and records why.

- *Whether a recorded choice is an individual or a pair of facts.* `Choice` is a record of a value and a source. The paper's individuals are non-composite and carry identity alone, which would make a choice `chose(draft, variable, value)` and `source(...)` instead. The pending [choice-provenance spec](../choice-provenance/requirements.md) inherits the answer: the customer's frozen words are a fact about a choice if a choice has identity, and a fact about a draft and a variable if it does not.
- *What solver-derived state is.* `statuses`, `unavailable`, the candidate and its price and footprint are computed rather than asserted, and `unavailable` is documented as derived and never stored. The paper's facts are added and removed by actions, so derived facts are an extension to it and have to be named as one.
- *Whether a batch is one action.* `set_choices` records several variables in one call and `ingest_rfq` asserts a document's worth of facts in one, against the paper's action as an atomic occurrence. Three things in the prototype already agree on a unit — undo reverses the last *batch*, the card grammar dispatches one atomic tool call per message, and `parallel_tool_calls` is off — and the ontology says what that unit is.
- *Whether asking is an action.* `ask_choices` changes no state and returns a card payload, but showing the customer a question is a happening they observe, and the [suggested-moves spec](../suggested-moves/requirements.md) and the ask card both depend on which it is.

## Out of scope

- *Concepts and synchronizations*, sections 4.4 and 4.5 of the paper, deferred to a separate conversation by decision. Naming what they would buy here, so the deferral is a decision and not an oversight: constitution #1, #5 and #6 — the solver decides validity, every candidate shown is solver-valid, and no reason may be given that traces to no rule — are enforced today by wording in a system prompt and by a reader's attention. As reactions over named actions and facts they would be stated where a check can reach them.
- *The concept-structured codebase* of the paper's section 5.2, and its TypeScript engine. This project's structure is settled by the constitution and by CopilotKit, and nothing here proposes moving it.
- *An action log.* Discharged, in its own change: each draft now keeps an append-only log of typed actions over named facts, and undo walks a cursor over it ([action-log](../action-log/requirements.md)). It waited on the batch question above, which settlement 3 answers.
- *Renaming anything persisted*, per the criterion above.
- *Codes of conduct for agents*, the paper's section 5.3. Adjacent, since this prototype is an agent acting on a shared document, and out of frame until concepts are.
