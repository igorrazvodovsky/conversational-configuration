# Ontology of phenomena — design

Rules how the vocabulary is held: where the enumeration lives, that it describes rather than renames, the one class it adds to the paper, what the deferral of concepts costs, and that the constitution is inside the vocabulary rather than above it. Read it before adding a phenomenon, before proposing a rename, before rewording the agent's prompt or the constitution, and before writing the [code of conduct](../code-of-conduct/requirements.md).

Status: implemented, and enforced for names by `tests/couplings.test.ts` ([offline checks](../offline-checks/design.md), decision 4a). The enumeration is [ontology.md](ontology.md), the binding is constitution #15, and the findings are recorded rather than repaired. Verification and known gaps are at the end.

## Decision 1: the enumeration is a fourth file, beside the spec

`ontology.md` sits in this feature directory, where constitution #11 names three files. The alternative was `docs/ontology.md` at the docs root, beside `demo-scenarios.md`, on the argument that a vocabulary binding on everything should not live inside one feature.

Beside the spec wins because the enumeration has a spec — the requirements that say what it must cover and the decisions here that say how it is kept true — and separating the artifact from its own spec would leave both harder to keep honest. The root would also have implied a third documentation layer, which is a change to the method for no gain: the file is cited by path from constitution #15 and reached in one hop from anywhere.

What makes the fourth file legitimate rather than a precedent for a fifth is that it is a *reference* artifact. It is not requirements, not decisions, and not a plan; it is the vocabulary those three are written in. A feature that wants a fourth file for anything else should be told no.

## Decision 2: the ontology's names are the code's names

Every action is named by its tool, every variable and option by its code, every rule by its id. The ontology contributes signatures, requires-and-asserts rules, the gesture mapping and the findings.

Fact relations are the exception, and they are new names — `chose`, `attributed`, `moved_at`. They have to be, because the code has no names for them: a fact lives there as a dict key, a nested structure or a computation, and none of those is a relation with a name. So the rule is narrower than *no new names*: nothing already named is renamed, and a phenomenon the code leaves unnamed is named here for the first time.

Two of the derived relations do not fit that rule and were wrongly filed under it. `statuses` and `unavailable` are dict keys that name the relations `status` and `separates` — `Configuration.unavailable` is described in the [agent-tools design](../agent-tools/design.md) as a variable → option → named-rules map, which is a relation with a name. So those two *are* renames, and the ontology carries the code's key beside each rather than pretending the code was silent. What justifies them is not decision 2 but readability: `unavailable` names the options, not the rules against them, and a relation over `(Draft, Variable, Option, Rule)` is the thing constitution #6 is about. They stay renames on the record, and the state keys stay as they are under names already spent.

Two reasons. Tool names ride in thread checkpoints and store keys, so a rename is a migration, and `price` is the standing case: it means euros per month since the [service-agreement spec](../service-agreement/requirements.md) and stays `price` because renaming breaks resumption of threads written before it. And a vocabulary whose adoption cost is a rename of everything is a vocabulary that does not get adopted — the paper's own argument for why its ingredients are deliberately familiar.

The consequence is that constitution #15 is cheap to comply with today and does real work tomorrow: the names are already what everyone uses, so the obligation bites only when someone invents a new one, which is exactly when it should.

## Decision 3: derived facts are a class the paper does not have

In the paper every fact is asserted and retracted by an action. Here the solver computes `status`, `separates`, `undecided` and the candidate from the recorded choices, and no action writes them. They are named as their own class rather than filed among asserted facts.

The reason is constitution #1. *The solver is the single source of truth for validity* is a claim about which facts the agent may never assert, and it can only be stated if those facts are a nameable class. Collapsing the distinction would leave the constitution's first principle with no vocabulary to be true in.

The candidate is the awkward member and is documented as such in the enumeration: `propose_completion` makes a derivation durable, and a later choice that diverges from it drops it rather than recomputing it. It is a derived fact that is stored, which is why a draft can show no price.

*The class exists because decision 6 deferred concepts, and it dissolves when that deferral closes.* Under the paper's section 4.4 the actions are partitioned into concepts and their facts follow them, so `status`, `separates`, `undecided` and the candidate belong to a `Solving` concept and only its actions may assert them. That is constitution #1 stated as modularity — which concept may write a class — rather than as a fourth class the paper does not have. #1 survives the change and is expressed better, so this decision should be read as a placeholder rather than as a position: it is what the vocabulary needs while the actions sit in one namespace. The cost of closing it is that the solver has no actions today. It is called synchronously inside tools and nothing records a solve, so making `Solving` a concept puts a logged action on a hot path.

## Decision 4: the constitution principle is appended, under its own heading

Principle #15 goes after the process principles rather than among the product ones, where a naming rule arguably belongs. Inserting it as #8 — the position its subject suggests — would renumber every principle after it, and specs, `CLAUDE.md` and the ontology itself cite #1, #2, #6, #9, #11 and #12 by number. Renumbering would falsify every one of those citations silently, and a citation that points at the wrong principle is worse than none.

It carries its own heading, *Meaning: one vocabulary*, rather than joining *Process*, because naming is neither a product decision nor a step in the spec workflow. The heading also leaves the place where a concepts principle would go, if one is ever written.

## Decision 5: findings are recorded, not repaired

The misalignments that came out of the pass are listed at the end of [ontology.md](ontology.md), and none was fixed here. Each is a change to a surface, a tool or the product model, with its own requirements and its own approval, and repairing them inside a documentation change would be exactly the drift constitution #12 forbids.

Two are prior deliberate decisions restated in this vocabulary rather than defects: the sheet-edit and reconciliation split ([agreement-document](../agreement-document/design.md), [rfq-reconciliation](../rfq-reconciliation/design.md)), and reconciling every clause on a variable together. Recording them as findings is still right. The vocabulary's use is that a deliberate conflation and an accidental one look the same in it, which is what makes the deliberate one testable instead of merely reasoned.

The one with a measured cost was the first: `Set <term> to <value>` reaching either `set_choices` or `revise_choices` on the model's judgment, where the two differ in atomicity and in whether the customer gets repair cards. The [conversation-checks design](../conversation-checks/design.md) already records a regression of exactly that shape, caught by a tool-call assertion. It became the first repair spec, [one-gesture-one-action](../one-gesture-one-action/design.md), and the finding is retired in place.

*Four repair specs have since landed, and the decision is holding as written.* [action-log](../action-log/design.md) closed 3 and 4, and [document-clauses](../document-clauses/design.md) closed 6, 7, 9 and 10 in one change, because those four were one shape: the record held a document's clauses as two lists with no identity, and the prompt sorted them by two rules that left a third kind homeless. Each repair kept the finding's number and says what repaired it, which is what makes the list citable while it shrinks.

## Decision 6: concepts are deferred, and the deferral has a price

The partitioning of actions into concepts and the synchronizations that compose them (the paper's sections 4.4 and 4.5) are out of this change by decision. What the deferral costs, so it stays a decision:

Constitution #1, #5 and #6 — the solver decides validity, every candidate shown is solver-valid, no reason may be given that traces to no rule — are today enforced by wording in a system prompt and by a reader's attention. As reactions over named actions and facts they would be stated where a check can reach them: *`propose_completion` may show a candidate only where the solver has admitted it*, *no message may quote a rule not in `separates`*. The vocabulary those sentences need now exists; the mechanism that would enforce them does not.

The action log was deferred with them, though it never needed concepts. It needed settlement 3 — a batch is one action — and once that was settled it was built, closing findings 3 and 4 ([action-log](../action-log/design.md)). Reactions are the step after it: stating constitution #1, #5 and #6 as rules over the trace needs the trace first.

The trace now exists, so the deferral has run out of reason to stand and this decision is closing rather than standing. What closes it is the [code of conduct](../code-of-conduct/requirements.md), which takes the partition, the reactions and the paper's section 5.3 together. Read that spec's opening for why the three arrive as one change: the fourth fact class of decision 3 and the unrecorded citation of constitution #6 are both consequences of this deferral, not positions held against the paper.

## Decision 7: #15 binds the constitution, and #1 to #14 were audited under it

As first written, #15 listed what the vocabulary binds — a spec, a paragraph of the agent's prompt, a tool signature, a card sentence, a check — and did not name the file that contains it. So the document that makes the vocabulary binding sat outside the vocabulary, and carried names that would have failed it.

The paper settles this and the constitution does not: what is missing from software, on its opening page, is a meaning "shared between all stakeholders — users, designers, engineers, and more — and applied consistently across all activities and artifacts". That admits no exemption for the founding document. The alternative was to declare the constitution exempt, on the argument that principles are written for people to reason with and the ontology for artifacts to be checked against. It was rejected because the specs cite the constitution by number and quote its wording, so its names propagate into the layer #15 already binds — an exempt constitution exports its names into everything that is not exempt.

The consequence is that a constitutional amendment is now a naming change as well as a policy one, and the reconciliation obligation of #15 reaches it: a session that changes what an action is changes the constitution too, if the constitution names that action.

## The constitution audit

#1 to #14 were written before the vocabulary existed and have now been read against the enumeration. What changed:

- *#1 named the agent twice.* "The LLM" was a second name for what `Source` calls `agent` and the prompt calls the agent throughout; it is now "the agent". The principle also now names the class decision 3 exists to make it sayable — `status`, `separates`, `undecided` and the candidate are derived facts and nothing but the solver writes one — where before it said "feasibility", a third name for validity.
- *#2 named the product model in the model's own words and the ontology's inconsistently.* "domains" and "constraints" are now "options" and "rules", which is what the individuals are called. The JSON key stays `constraints` under names already spent; the enumeration is where the individual is named.
- *#4 called a variable a parameter.* Now "technical variables".
- *#6 named the unsat core and nothing else.* It now names `separates` and the state key `unavailable` that carries it, so the principle and the field it is enforced through are one name apart rather than two vocabularies apart. It also gained the recording obligation — see below.
- *#7 named a view as the durable locus.* "The canvas, not the chat transcript, is the durable locus of state" has not been true since the workspace store landed and "frames" were retired by [parallel-drafts](../parallel-drafts/design.md); the locus is the workspace record and the canvas is a rendering of the current draft. The principle now says so, and keeps the claim the specs cite it for — that the agreement is read from the document rather than from the transcript. Its "parallel candidates" were Drafts, and `candidate` is a derived fact of a draft rather than a synonym for one; the principle now says drafts.
- *#9 called a card inert by another name.* "card staleness" is `inert(Card, Reason)`.

What the audit deliberately left standing: *the customer* in #4 and *the user* in #5, because there is no individual for either and rewording them onto `Source` would say something false. That is finding 12.

*What #6 now obliges and the code does not do.* The recording clause — the rule the agent quoted lands as an action on the current draft — is adopted from the paper's §5.3.2, where the trace and the code share a vocabulary so that any action can be pinned to the clause that authorised it. Today the citation is rendered from live derived state by `rulesAgainst` in `src/lib/configurator.ts` and lands in no log, so #6 states a discipline nothing can be checked against. It is stated ahead of its mechanism deliberately, on the precedent #6 already sets with D-ids: the principle says what grounding means, and the specs record where the prototype falls short of it. The mechanism is the [code of conduct](../code-of-conduct/requirements.md), whose first reaction this is.

The principle deliberately does not say *where* the citation is recorded, and the reactions spec inherits the reason. A citation carries no facts, so it would be irreversible in the sense the log already has — `keep_as_is`'s door, `append_action`, exists for exactly that shape and rightly does not stamp the conversation. But `_append` truncates every log to `LOG_RETENTION` entries whether an entry is reversible or not, and the [agent-tools design](../agent-tools/design.md) measures roughly seventy unavailable options on a filled-out agreement. Citations landing in the draft's log would evict the content entries undo walks, and undo would run out of reach because the agent explained itself. So the venue is an open question with a known constraint on it: either citations go somewhere that is not the undo log, or retention learns to count the two kinds of entry separately.

## Verification

The enumeration was derived by reading, not by generation: `agent/src/configuration.py` for the state types, the tools and the commit path; `agent/src/workspace_store.py` for the durable record and the three store-only actions; `agent/src/product_model/elevator.json` for the declared population, whose counts the enumeration states and `tests/couplings.test.ts` now matches against the model; `src/lib/configurator.ts` for the gesture grammar and the three document layers; `agent/src/http_app.py` for the actions no tool names; and `src/components/generative-ui/card-dispatch.ts` for card lifetime.

Four claims were checked against the code rather than assumed, and two of them were wrong on the first pass and corrected: that a conversation can be deleted, which no path in the repository does, and that `ingest_rfq` guards only against a second document, when it also refuses an agreement with recorded choices. The two that held: `reconcile_requirement` marks every requirement on a variable, and the model declares no `D`-rules.

No automated check sees this document. That is the same position `docs/discovery/` is in, and it is why constitution #15 puts the reconciliation obligation on the session that changes the code.

## The prompt audit

Constitution #15 binds the agent's system prompt, and the prompt was written before the vocabulary existed. It has now been read against the enumeration, paragraph by paragraph. The prompt is the right artifact to audit first because it is the one where a name has behavioral consequence: the model acts on the wording.

*Four namings, in the Method paragraphs.* "Record every commitment as it is made" is now "Record every choice as it is made" — what is recorded is `chose(Draft, Variable, Option)`, and *commitment* names nothing the enumeration carries. Two bullets described an action without naming it and now name it: `ask_choices` in the one about letting the control show the options, `propose_completion` in the one about offering a full service agreement. The prompt already names tools inside *when*-prose elsewhere — "Call describe_product, then ingest_rfq once", "Call get_configuration if you do not have them in front of you" — so the Method section's silence was inconsistency rather than a convention. And "the cheapest/greenest pair" is now "the pair the two objectives give: the cheapest completion and the lowest-footprint one", because `Objective` has two values, `price` and `co2`, and *greenest* was a third name for one of them. The Voice rule forbidding "green" is not what this edit answers: that rule governs what the agent says to the customer, and the bullet is an instruction to it. *Greenest* is settled internal shorthand in the [environmental-footprint requirements](../environmental-footprint/requirements.md) and the [agent-tools design](../agent-tools/design.md), and aligning those on `Objective` is a wider naming question this change does not open.

The [agent-tools design](../agent-tools/design.md) quotes both of the reworded bullets and was reconciled with them, per constitution #12.

*What the audit left alone, deliberately.* The *Messages that are not conversation* section is written in tool names already, so it had the least to gain, and it is what the model keys on to pick a tool, so it had the most to lose. Its first bullet is what finding 1's repair restructures. The Method bullet on revising rather than recording afresh is where the model's judgment was asked for. Rewording either here and again when that spec landed would have been two changes to buy one; [one-gesture-one-action](../one-gesture-one-action/design.md) rewrote both.

*Coverage, which #15 does not reach.* `clear_choices` and `name_workspace` appear in no paragraph of the prompt; each is reachable only through its own docstring. That is a gap in what the prompt teaches rather than a name used wrongly, and closing either changes behavior and needs its own spec.

*Three findings*, recorded in the enumeration as 9, 10 and 11: the bidder's-choice clause that becomes neither a requirement nor an unmapped one, the `safety` group that the prompt's outcome-or-hardware sorting names on neither side, and the durable individual carrying three names. None was repaired here, per decision 5; the first two were repaired by [document-clauses](../document-clauses/design.md), which reworded both paragraphs.

*Two mis-descriptions on the ontology's side*, which is where auditing prose against an enumeration pays: `reconcile_requirement` listed the three Marks and never said which move produces which, and omitted both the accept precondition and that a colliding revise returns repair options; and the transient-facts preamble claimed all three facts are read by the agent, when `inert` is computed in the browser and no run sees it. Both are reconciled under constitution #15, which sends mis-description to the ontology.

*Verification.* No free check sees a prompt edit. `tests/couplings.test.ts` asserts the prompt still teaches every element of the card grammar, and none of these edits is in that section, so it holds — checked. The paid runs that would see them, `pytest -m scenario` and `compare_refs.py`, were not run: for four naming edits confined to Method, an A/B costing money to detect a difference nobody predicts is disproportionate, and the [agent-tools design](../agent-tools/design.md) records that a previous A/B over a prompt de-duplication found nothing in prose assertions and caught its one real regression on a tool-call assertion. What stands in for that run is the list of sections left untouched above: nothing the model uses to select a tool was reworded. If a scenario run is ever made over this change, the two edits worth watching are the `ask_choices` and `propose_completion` namings, because naming a tool inside prose that describes it can make the agent reach for it sooner.

## Known gaps

- *Enforcement reaches names and stops there.* `tests/couplings.test.ts` makes the ontology a fourth party to the coupling checks ([offline checks](../offline-checks/design.md), decision 4a): every tool, every element of the grammar, every key of a configuration and of the durable record, and the model's counts are asserted to be named here. A name that arrives without being named fails. A signature that is wrong, a fact in the wrong class, or a finding that has stopped being true all pass, and the stronger check needs the deferred concepts layer.
- *The specs are not audited against the enumeration.* Constitution #15 binds every spec in the register, and all of them were written before the vocabulary existed. The check reaches names it can enumerate and no spec at all. The prompt and the constitution have now been read against it (*The prompt audit* and *The constitution audit* above); the twenty-odd feature specs have not, and finding 9 is evidence they will repay it — *gap* means two things in the [rfq-reconciliation design](../rfq-reconciliation/design.md) alone. The specs that quote the reworded halves of #1, #6 and #7 are the place to start, since those quotations are now a principle behind — `chat-attachments` cites #1 in the word *feasibility* this audit removed, twice. The [feature register](../README.md) is in the same position and is easy to miss for not being a spec: it still describes `nonlinear-interaction` by *parallel candidates* and `interface-checks` by *card staleness*, both of them names this audit replaced.
- *Frontend individuals are enumerated only where they cross into state.* Components, panes and geometries are not phenomena of the software in the paper's sense, and the boundary was drawn at what the agent or the store can see. A card is in because it has identity and a staleness rule; a resizable panel is out. The line is defensible and it is a judgment.
