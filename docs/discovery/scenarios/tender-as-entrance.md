# Tender as entrance

The customer's own requirements document is a way in. The agreement is seeded from it, every term carrying the clause that put it there, and what the rules can't meet comes back as a named deviation with the rules behind it: a position to negotiate rather than a verdict.

*Grounds* the [tender as entrance](../jtbd/job-stories.md) job story. Performer: the [delivery lead](../jtbd/persona-delivery-lead.md), whose project has already issued the document.

*Situation.* An RFQ for a lift modernization has gone out, and it is over-constrained. It asks for a speed the existing shaft can't carry, and it says in another clause that the shaft isn't being altered. Nothing has been configured, and the document is the first thing the system sees.

*Goal.* Negotiate the differences between the document and what can be built, instead of re-answering a specification that has already been written once.

*Expected outcome.* A priced valid agreement seeded from the document, with every seeded term sourced to it by clause. A deviation register that is the solver's partition of the document rather than a reading of it. And each deviation answerable three ways — take what is offered, change the requirement, leave it open — with a waived requirement staying on the register, answered rather than forgotten.

## The walkthrough

1. The customer hands over the document. The system doesn't start eliciting, and seeds from what the document states.
2. The sheet fills, each term marked as the document's, with its clause number.
3. The deviation is shown against the term it affects: what the document asked, what the agreement offers, and the two rules that separate them. Nothing calls the document non-compliant.
4. The budget ceiling the document states is checked against the candidate and reported as commercial pressure rather than as a rule, because the model has no budget variable.
5. The customer accepts the offered value. The requirement is waived and stays listed as waived.
6. The customer revises a different requirement the agreement already meets. Because the document speaks to that term, the change is negotiation and stays in the record.
7. The remaining questions are only about what the document left open.

## What it demonstrates

Principles: [configuration can start from any variable, in any order](../principles/start-from-any-variable.md) taken to its limit, [every refusal names the rules that caused it](../principles/refusals-name-their-rules.md), and [always show a valid whole](../principles/always-show-a-valid-whole.md).

Assertions it exercises: [a document-seeded candidate with named deviations is better than manual compliance checking](../assertions/seeded-candidate-with-named-deviations.md), and [unsat cores are sufficient for trust](../assertions/cores-are-sufficient-for-trust.md).

## Working hypotheses

The assertion under this scenario is the one furthest from being settled by anything the prototype can do. Deviation registers are real tender practice and only their computation is new, so the artifact is credible. Whether a reader trusts the seeded commitments instead of re-checking each one against their own document needs users, which this prototype doesn't evaluate with. The same holds for whether the register reads as negotiable positions or as the vendor's refusal.

The document is a fixture written for the purpose. It is modelled on tender practice rather than taken from a real procurement, so what it happens to leave open is a choice made by whoever wrote it.

Walked in the app on 2026-08-20, twice. The second attempt performed steps 1 to 4 and 6 as written, including the waiver staying on the sheet as "waived, still listed" with a Reopen beside it.

Step 5 couldn't be performed at all: a requirement the agreement already meets is a recorded choice, and the option editor disabled every alternative to a recorded choice, so the term the step asks the customer to revise offered nothing to pick.

The first attempt failed to map clause 1.2, the failure the presenter script already warns about, and the consequence is worth recording, because the sheet didn't merely omit a deviation. It stated the opposite of the clause — "installed into the shaft of the new building" — derived by the solver from the speed and badged `auto`.

Step 2's other half also failed on both attempts: the deviation on the sheet gave the clause, the asked value and the offered one, and named no rules, so the reasons the scenario points at lived only in the chat and only as paraphrase.

Two of those were fixed the same day. A decided term offers its alternatives again, so step 5 can be performed, and the deviation carries its rules on the sheet — R04 and R28 under the rated speed, which is what the step points at. The clause-mapping fragility is untouched, being a model call.

## How it is played

It is presenter walkthrough 5 in [docs/demo-scenarios.md](../../demo-scenarios.md), and automated as `tender_as_entrance` by the [conversation checks](../../specs/conversation-checks/requirements.md), which reach the register by re-seeding the requirements the agent recorded and comparing. The partition has to be the solver's rather than the model's account of it.

## Related

- [The scenario index and the coverage table](../direction.md)
- [The procurement context this enters from](../problem-framing.md)
