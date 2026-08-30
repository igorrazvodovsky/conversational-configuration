# Demo scenarios — the presenter's script

Five walkthroughs of the running prototype, one per [scenario note](discovery/scenarios/). Each note is grounded in a job story and mapped to the principles it demonstrates and the assertions it exercises ([direction](discovery/direction.md), *Examples that make the direction concrete*). Each is also an automated check: `cd agent && uv run --env-file ../.env pytest -m scenario` drives the same turns against the agent graph and asserts the same outcomes ([conversation checks](specs/conversation-checks/requirements.md)). This document and the harness are two performances of the same notes, so when they disagree, one of them has drifted from its note.

Run the app with `npm run dev`, which puts the UI on 3000 and the agent on 8123. Unless a scenario says otherwise, it starts from *New elevator* on the `/` list, which opens a workspace with an empty agreement. Nothing carries over between scenarios, and a scenario left half-finished is easiest to abandon by starting a new elevator rather than by undoing.

Say two things once, at the start of the first scenario, so they don't have to be repeated. The canvas on the left is the agreement itself in three layers — recitals, numbered operative terms, collapsed schedules — and it is the durable record, while the chat on the right is where the consequences are explained. And every price in the system is a monthly service fee, never a purchase price.

## Reading the steps

Each turn is either something typed into the composer or a click on a control. Typed turns are given verbatim. The agent's wording back varies, and the script never depends on it. What to point at is what the solver produced, which doesn't vary: a value on the sheet, a card, a rule label, a figure.

Prices are quoted where the walkthrough pins the choice set that produces them. Where the agent has latitude about what else it records, the fee moves, and the script says so rather than naming a figure.

---

## 1. Needs, not nomenclature

Scenario note: [needs-not-nomenclature](discovery/scenarios/needs-not-nomenclature.md).

*The claim.* A customer who knows their building and nothing about elevators can reach a priced, valid agreement without learning the product's vocabulary. The agent translates needs into choices, announces what the rules then force, and the customer keeps the last word over anything the agent picked.

*Setup.* A new elevator. The *Hospital bed lift* entry chip is the shortest way in, and this walkthrough types its own opening instead, so the building is stated in one turn.

1. Type: *We're planning a new wing for a district hospital in Germany. The lift serves the ward block — six floors above ground, about twenty metres from the bottom landing to the top one, and it has to take a bed with a nurse walking either side of it. It runs all day and it has to be usable by patients on their own.*

   Point at the recitals filling in from prose the customer would have said anyway, and at the operative terms that appeared without being asked about. The reply names what the rules forced rather than asking about it.

2. Whatever the agent asks next, answer it in ordinary words, or click the chips it offers. Don't type a value code at any point, because the scenario's whole claim is that none is needed.

3. Type: *You choose the cabin — the wall finish and the floor — whatever suits a ward block that gets cleaned every night.*

   The agent picks. Hover the provenance mark beside the car wall finish, which answers *why this value is here*, and show that it reads as the agent's choice rather than the customer's.

4. Type: *That's fine. Put the whole agreement together for us.*

   A priced agreement appears. Expand the schedules and point at the cascade the customer never asked for and never named: a bed-depth car (1400 × 2400 mm or larger, rule R15), a door at least 1100 mm wide (R16), and an accessibility package (R17), each carrying the rule that put it there.

5. Type: *One change: the car walls should be brushed stainless steel.*

   One turn, no restart, nothing else moves. The provenance mark on that term now reads as the customer's.

*End state.* A valid priced agreement for a hospital lift, every term traceable to whoever chose it, reached without the customer typing a variable name or an option code. The harness checks that last claim over every turn at once, against the live product model rather than a list written down here.

---

## 2. Mid-contract revision

Scenario note: [mid-contract-revision](discovery/scenarios/mid-contract-revision.md).

*The claim.* Changing something already decided is an ordinary move. When the change collides with earlier decisions, the system doesn't refuse. It computes the ways forward, names the rules behind each, and lets the customer pick or walk away.

*Setup.* A new elevator, then the *Office modernization* entry chip, or the opening turn below.

1. Type: *We're modernizing a 1970s office building in Berlin and keeping the existing shaft. 12 floors, busy mornings. The existing lift runs at 1.6 m/s.*

   The sheet records a modernization at 1.6 m/s. Point at the installation type on the recitals layer — it is about to become the thing that has to give.

2. Type: *Actually I need 3.0 m/s.*

   A repair card appears. It offers one path: give up the modernization and the 15–30 m travel band together, and the lift becomes a new build on the high-rise platform with a 2100 mm pit and 4600 mm headroom. Point at the rule labels on the card — R13 on the travel band, and the pit and headroom figures that follow from R03 and R04 against R27 and R28, which are what make 3.0 m/s impossible inside an existing shaft. Point out that the card offers no verdict: the last row is *Keep everything as it is — abandon this change*.

3. Click *Keep everything as it is — abandon this change*.

   Nothing on the sheet moves. This is worth showing before applying the repair, because it is the half of the interaction a compliance-checking tool doesn't have.

4. Click the rated speed on the terms layer and choose 3.0 m/s.

   The same card comes back. Asking from the sheet reaches the repair path the way the typed revision did, which is what makes a click's outcome independent of how the agent read the state ([one-gesture-one-action](specs/one-gesture-one-action/design.md)).

5. Click the repair option.

   It applies as one change: the modernization and the travel band leave, 3.0 m/s arrives, and the pit, headroom, platform and drive appear in the schedules as consequences. Show that the fee moved with it.

6. Click undo in the canvas head (*Reverse the last change to this agreement*).

   Everything the repair did comes back together — the change, what it dropped, and what it rippled. Then click redo (*Put back the change that was undone*) to leave the agreement repaired.

*End state.* A 3.0 m/s new build, reached by revision rather than by starting again, with the abandoned path and the undone step both demonstrated.

---

## 3. Comparing agreements

Scenario note: [comparing-agreements](discovery/scenarios/comparing-agreements.md).

*The claim.* Two whole agreements can be held at once. The comparison is a pair of figures — monthly fee and modelled lifetime footprint — never one score, and switching between the drafts costs nothing and loses nothing.

*Setup.* A new elevator.

1. Type: *An office building in Frankfurt, new build, twelve floors, about 25 m of travel, normal traffic, 1000 kg car. European codes.*

2. Type: *Put the agreement together.*

   A priced agreement. Note the fee; it is the baseline for the delta in step 6.

3. Type: *Keep this one as the practical option — I'd like to see a premium version beside it without losing this.*

   The agent forks rather than revising, and names the new draft itself from the conversation. Point at the canvas head: the draft's name sits beside the agreement's, with a chevron. Nothing was asked about the name, and the agent didn't announce it.

4. Type: *On this one: premium service, connected monitoring, a regenerative drive and brushed stainless steel walls.*

5. Type: *Price this one too.*

6. Open the drafts menu in the canvas head and choose *Compare with Original*.

   The comparison card lists only the variables that differ, each side priced at its own contract term, with the monthly delta at the foot. Point at the footprint figures standing beside the prices rather than folded into them: the regenerative drive buys a lower modelled lifetime footprint and costs more per month, and the card states both rather than resolving them.

7. Open the drafts menu again and switch back to *Original*.

   The whole document changes back, with its own values, its own provenance and its own record of what was done to it. The premium draft is untouched and still in the menu with its own price.

*End state.* One workspace holding two whole agreements, compared on a pair of figures, with either one a click away.

---

## 4. Renewal as revision

Scenario note: [renewal-as-revision](discovery/scenarios/renewal-as-revision.md).

*The claim.* The agreement outlives the conversation. Reopening it answers "where were we" from state rather than by asking again, and the next change lands wherever the customer chooses to start, including on a variable nobody has mentioned yet.

*Setup.* Scenario 3's workspace, or a new elevator taken through its steps 1–5. The demonstration needs an agreement with more than one draft and at least one priced completion.

1. With the workspace open, reload the browser.

   The sheet comes back exactly: recorded values, forced values, provenance, the drafts menu with both drafts and their prices, and the transcript. Nothing was re-elicited, because nothing was lost.

   The draft name in the canvas head arrives a tick after the rest of the page, because it is drawn only once the client has mounted and the drafts it names exist only on the client. Wait for it rather than reloading again.

2. Type: *Where were we, and what's still open on this one?*

   The answer comes from the agreement rather than from the transcript above it, which matters because another conversation may have moved it since. Point at the answer naming what is undecided: that list is computed from the agreement and was never stated in the conversation.

3. Type: *The shaft is 1800 by 1700.*

   A bare dimension, with no control clicked and no pending question to answer. It lands on the shaft as the customer's own choice. If it collides with what is already recorded, which it will if the car is large enough, the repair card of walkthrough 2 appears here instead, with its rules, and the change is still a revision rather than a restart.

*End state.* The agreement resumed without re-elicitation and then moved from an entry point the conversation never set up.

---

## 5. Tender as entrance

Scenario note: [tender-as-entrance](discovery/scenarios/tender-as-entrance.md).

*The claim.* The customer's own document is a way in. The system seeds the agreement from it, each term carrying its clause, and reports what it can't meet as a named deviation with the rules behind it: a negotiating position rather than a compliance verdict.

*Setup.* A new elevator. The fixture is `agent/fixtures/rfq/office-tower-modernization.txt`, a lift modernization RFQ for a Frankfurt office tower. Paste it into the composer, or attach it with the paperclip; both reach the same tool.

1. Type a sentence of framing and paste the document under it: *We've issued an RFQ for the lift package. Here it is in full — can you tell me what you can do against it?*

   The agent doesn't start eliciting. It reads the catalogue, ingests the document once, and the sheet fills from it. Point at the provenance marks: every seeded term reads as the document's, with its clause number.

   Check before going on that a deviation appeared. The agent occasionally fails to map clause 1.2, the one that keeps the existing shaft, and without it there is no conflict to show and the reply says every requirement is met. If that happens, start a new elevator and paste again rather than improvising, because steps 2 to 4 have nothing to stand on.

2. Point at the deviation on the sheet, under the rated speed: *Your document asked 3.0 m/s*, against the 2.5 m/s the agreement offers. The rules named are R04, which ties speed to minimum headroom, and R28, which says a modernization can't raise the headroom of an existing shaft to 4600 mm. Clause 3.1 asked for the speed, clause 1.2 said the shaft isn't being altered, the two can't both hold, and the document's own author is the person who can decide which gives.

   Point out what is *not* said: nothing here calls the document non-compliant, and nothing suggests it is wrong.

3. Point at the budget line. The document caps the charge at €1,800 per month (clause 6.1) and the seeded candidate is above it. The system states the gap and says plainly that the model has no budget variable, so this is commercial pressure rather than a rule.

4. Click *Accept 2.5 m/s* on the deviation.

   The requirement is waived, and stays on the sheet marked *waived, still listed*. A waived requirement is answered rather than forgotten, which is the difference between this and a compliance matrix where the row disappears.

5. Revise a different requirement the agreement already meets, such as the contract term or the accessibility package, by opening that term's editor on the sheet and picking another value.

   A requirement the agreement meets carries no margin mark and no *Accept* button, because there is nothing to answer. What it does carry is invisible until the click: because the document speaks to that term, the editor dispatches a reconciliation rather than the ordinary hidden canvas edit, so the change appears in the chat as a sentence instead of passing silently. Point that out — the same control, on the same sheet, means something different on a term the customer's own document named.

6. Type: *What's still open at your end?*

   The questions are only about what the document left open. Nothing it settled is asked again, and the waived requirement is still in the summary.

*End state.* A priced valid agreement seeded from the customer's own tender, with one requirement waived by the customer's decision, one revised, and every remaining question drawn from what the document did not say.

---

## What these do not cover

No scenario here reads a conversation's whole arc. Each step asserts one move, so an agent that grew vaguer or more repetitive over twenty turns would pass every check and still demo badly. That judgement is the presenter's, made while walking the script, and it is why this document exists beside the harness rather than being replaced by it.
