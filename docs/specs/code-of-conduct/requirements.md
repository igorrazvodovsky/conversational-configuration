# Code of conduct: the prototype's rules over its own actions

Status: draft, awaiting approval.

Constitution #1, #5 and #6 are the three claims this prototype makes about its own behavior: the solver alone decides validity, every candidate shown is solver-valid, and no reason may be given that traces to no rule. Nothing enforces any of them. They are wording in a system prompt that a model may or may not follow, plus a reader's attention, plus — for one of them, once — a paid scenario run that happened to assert on a tool call. The [ontology of phenomena](../ontology-of-phenomena/ontology.md) gave the three a vocabulary to be stated in and the [action log](../action-log/requirements.md) gave them a record to be stated over. What is missing is the mechanism, and the paper has one.

This spec adopts sections 4.4 and 4.5 of Meng et al., [*Making Software Meaningful*](https://arxiv.org/abs/2606.11051) — concepts, and the synchronizations that compose them — and section 5.3, which applies them to an agent as a *code of conduct*: a small document naming the activities the agent performs, stating the conditions under which it is permitted to perform them, and recording what it did in the same vocabulary. That is this prototype's setting exactly. It is an agent acting on a document the customer will be held to, and what it did and whether it had the right to do it are answerable today only from a record the agent itself narrates.

Two of this project's departures from the paper are consequences of deferring that layer rather than positions taken against it, and closing the deferral removes both. The [ontology design](../ontology-of-phenomena/design.md) invented a fourth fact class — derived facts, asserted by no action — to keep constitution #1 sayable; under section 4.4 those facts belong to a `Solving` concept and *only its actions may write them*, which is #1 stated as modularity and needs no fourth class. And constitution #6's citation lives outside the record entirely, which is what its own recording clause now names as a shortfall. Neither is repaired by adding a layer. Both are repaired by finishing one.

Serves discovery principle [every refusal names the rules that caused it](../../discovery/principles/refusals-name-their-rules.md) and discovery principle [always show a valid whole](../../discovery/principles/always-show-a-valid-whole.md): each is a rule this prototype follows by being written carefully, and this change is what makes a violation fail a run instead of waiting on a reader. Serves discovery assertion [an agreement that carries its open points can be resumed without rereading the conversation](../../discovery/assertions/open-points-carried-by-the-document.md) by giving it the one substrate it lacks — a question the agent has put and nobody has answered.

## Stories

- As the person changing a tool or a prompt paragraph, a check fails when my change lets the agent show a candidate the solver never admitted, or quote a rule the core does not contain, instead of the drift surviving until someone reads carefully or pays for a scenario run.
- As a reader of the agreement's record, the reason the customer was given is in the record beside the choice it was given about, in the words the interface used, so what happened and what would have made it legitimate are both readable and comparable.
- As a customer, a question the agent put to me and I did not answer is something the agreement knows about, rather than something that exists only in a transcript the workspace treats as ephemeral.
- As the person adding a tool, the concept it belongs to says which facts it may write, so writing a derived fact from agent code is a violation with a name rather than a thing a reviewer might notice.

## Acceptance criteria

The partition:

- GIVEN every action and every query the ontology enumerates, THEN each belongs to exactly one concept, named for a single functional concern, and the facts it moves belong to that concept with it. Individuals belong to no concept and may participate in several, per the paper.
- GIVEN a fact type, THEN exactly one concept may assert or retract it, and the ontology records which.
- GIVEN the derived facts — `status`, `separates`, `undecided` and the candidate — THEN they belong to the concept that owns the solver and no other concept may write one. That sentence is constitution #1, and it retires the fourth fact class the [ontology design](../ontology-of-phenomena/design.md) added to the paper, which that decision already records as a placeholder.

The reactions:

- GIVEN constitution #1, #5 and #6, THEN each is stated as one or more reactions in the paper's *when / where / then* form, over the actions and facts the ontology names.
- GIVEN constitution #5, THEN its reaction is that a candidate fact may be asserted only by the concept that owns the solver, and that every surface showing a candidate reads those facts and composes none of its own. Its two halves are not equally reachable: the assertion is in the trace and a check can hold it, while the showing happens in a render across the language boundary, where the nearest tier is the [interface checks](../interface-checks/requirements.md) and no reaction reaches at all. The spec states both halves and records which is held by what.
- GIVEN a rule about this prototype's behavior that today lives in the system prompt as an instruction, WHEN it is a rule over actions and facts rather than a matter of voice or judgment, THEN it is declared as a reaction and the prompt paragraph says so rather than restating it.
- GIVEN a reaction, THEN a check can fail on it without a provider key. A reaction that no check can reach is admitted only with the reason recorded, and the count of those is a measure of how far the adoption got.

The citation:

- GIVEN a refusal, a ruled-out option or a forced value the customer is shown a reason for, WHEN the reason is given, THEN an action records the rules cited, which is what constitution #6's recording clause asks for.
- GIVEN that action, THEN it costs the customer no undo step, which fact-less entries already manage, and evicts no content entry from the draft's log, which nothing manages today. That second half is a standing gap of the [action log](../action-log/design.md) rather than one this change introduces: retention trims by entry and the reach counts only reversible entries, so an action that reverses nothing already spends room a reversible one needs. Citations would take it from latent to common.

The asking:

- GIVEN `ask_choices`, THEN it becomes an action that records the question put and a query that reads the currently valid options. The query keeps the name, because the name is spent in thread checkpoints.
- GIVEN a question put and not answered, THEN it is a fact of the record. That closes finding 5 of the [ontology](../ontology-of-phenomena/ontology.md) — the one the [phase plan](../../discovery/phase-plan.md) records as unanswered by the framing — and gives [open points](../open-points/requirements.md) the substrate it currently inherits as a limit.

Ubiquity:

- GIVEN the ontology, THEN it gains the concepts, the reactions and the concept each action belongs to, reconciled in the same session under constitution #15.
- GIVEN a principle of the constitution that this change moves from wording to mechanism, THEN the principle's text stays and this spec records what now enforces it. No principle is weakened because a check now reaches it.

## What it has to settle

- *Where a citation is recorded.* The draft's log trims by entry, so citations landing in it would evict the content entries undo walks and undo would run out of reach because the agent explained itself — the [action log](../action-log/design.md) records the shape of that as a known gap. Either citations go somewhere that is not the undo log, or retention counts the two kinds of entry separately, and this spec picks.
- *Whether the solver gets actions.* Facts follow actions into their concept, so a solve is an action and the derived facts are what it asserts. Today the solver is called synchronously inside tools and nothing records a solve. Whether a logged solve is affordable on that path — `agent-tools` measures a whole transition, statuses, rules map and reprice at 0.29 s to 0.35 s — or whether the concept owns its facts without recording each derivation.
- *What holds a reaction, and what makes it bind.* A document only a reader enforces reproduces what the ontology was written to cure. Whether reactions are declared prose that a check parses and asserts against the trace, or declarations in code the runtime honours as the paper's engine does. The first is the smaller mechanism; the second is the one that cannot be bypassed. Whichever holds them stops at the language boundary, which is why constitution #5's showing half needs an answer of its own.
- *Whether asking records one fact or one per variable.* `ask_choices` takes several variables in one call, and settlement 3 says a batch is one action.

## Out of scope

- *The concept-structured codebase and the TypeScript engine* of the paper's section 5.2. Not on constitution #10's authority, which was the wrong reason and is corrected here: the paper argues concept design is the *simpler* arrangement, not the more complex one. The reason is that this prototype's structure is set by Next.js, CopilotKit and LangGraph, and replacing them is not what this change proposes.
- *The log as the source of truth*, section 5.2.3. A named deviation, not an oversight. That property belongs to the paper's reference framework in greenfield code; retrofitting `configuration = fold(log)` onto this stack, with a truncating log, is a different proposition the paper does not speak to.
- *D-rules.* Constitution #6's discretionary half asks the agent to cite individuals the product model does not declare — 54 constraints, all `R`. That is a change to the model with its own spec. This one covers the half that has individuals to cite, and does not wait on the other.
- *A person individual*, ontology finding 12, and *a principle for the user-readable conceptual model*, the paper's section 5.1.4. Both are live and neither is here.
- *Renaming anything persisted*, on the terms constitution #15 already sets.
