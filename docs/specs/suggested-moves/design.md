# Suggested moves — design

Status: implemented.

## Decision 1: templated pills over model-generated ones

`useConfigureSuggestions` accepts two shapes. The static one takes a list and an optional dependency array; the dynamic one takes `instructions`, `minSuggestions`, `maxSuggestions` and `available`, and has the runtime generate pills from a model call. Both are exported at 1.65.0 — the choice is real, and the dynamic form is the one the docs lead with.

The static form wins here, recomputed from state through its `deps` argument. Three reasons, in order of weight:

*The pairing rule needs to be a guarantee.* The requirement that cost and footprint pills appear together or not at all is a never-move dressed as a rendering rule. Under templates it is a property of the code. Under generation it is an instruction the model usually follows, and the failure is silent and looks like a reasonable strip.

*The strip must not churn, and a stable order needs a deterministic source.* The requirement that pills settle once when a run ends assumes the same state produces the same strip. A model call does not offer that even at temperature zero once the transcript is part of its input, so a generated strip would reshuffle across recomputations that changed nothing.

*Cost.* A generated strip is one extra model call every time the agreement changes, including after every canvas edit, for a surface the customer may never look at.

What this does *not* buy is automated verification. The catalogue is TypeScript evaluated in the browser; the conversation checks are Python asserting on tool calls, payloads and state from live runs, and the repo carries no frontend test runner. Neither can see the strip. Templates make it *reviewable by reading* — the pairing rule is a line of code rather than a hoped-for behaviour — and that is the whole of the checking advantage. Adding a frontend test runner for this one surface would run against constitution #9, which assigns UI to running the app, and #10.

The counter-argument is real and should be recorded: templated pills will read stiffer than generated ones, and the whole point is to speak in the building's vocabulary about *this* building. If the walkthrough finds the strip reads as boilerplate, the fallback is the dynamic form with the pairing enforced by post-filtering the generated list rather than by instruction.

## Decision 2: the templates follow the recitals' discipline

The [agreement document spec](../agreement-document/requirements.md) already requires that recitals prose is produced by deterministic templates over state and model display data, never composed by the model — constitution #6 extended to the record. Pills are chat-side, not the record, so that rule does not bind them. They should follow it anyway, for decision 1's reasons, and reuse the same source of phrasing: the model's display labels and glosses, so a pill and the term it refers to call the same thing by the same name.

The catalogue lives in its own module, `src/lib/suggested-moves.ts`, rather than beside the projection helpers in `lib/configurator.ts`. With review-by-reading standing in for an automated check, one file that holds every family — and nothing else — is worth more than proximity to the helpers it calls.

A move pill's title *is* its message: the chip shows the sentence it sends. That is what makes the strip teach — the customer reads a sentence they could have typed, and clicking it is indistinguishable from typing it. The four entry prompts keep their existing short title over a long message, which the first acceptance criterion preserves unchanged; every pill this spec adds is short enough to be its own chip.

## Decision 3: the move catalogue is the inventory, filtered by state

Each pill family is a predicate over the configuration plus the text to offer when it holds. The initial set, drawn from the [conversation move inventory](../../discovery/models/Conversation%20moves.md) §2 and matched to state this project already computes:

| Family | Offered when | Move |
|---|---|---|
| Entry prompts | Nothing said, nothing recorded, no candidate | The four existing prompts, unchanged, and nothing beside them |
| Answer the document | A requirement of the customer's document is still in deviation | The first such clause, named, asking for what it asked for |
| The trade-off pair | A candidate exists | *Make it cheaper* and *lower the carbon*, always both |
| Ask why | A value is solver-forced or agent-chosen | Why that term reads as it does — the term named, not the value (see the notes below) |
| Revise by intent | A usage profile is in effect and it is not the heaviest | What heavier traffic would change |

The table is the starting point, not a fixed set; what it must preserve is that every family maps to a move the inventory already lists, so a pill can never offer something the system has no move for.

The first two families are retired by the move being made — an answered clause leaves deviation, an accepted trade-off changes the candidate — and the last two are not, which is decision 7's subject.

Two inventory moves are deliberately absent, for the same reason. *Fork and compare* now has its mechanism and a canvas affordance ([parallel-drafts](../parallel-drafts/design.md): the draft switcher forks, switches, compares and discards), and still waits on where a comparison is *placed* — [phase-plan](../../discovery/phase-plan.md) task 3. Offering the pill is this spec's call once that lands. *Accept* waits until accepting means something in state: nothing today distinguishes a candidate from an agreement the customer has taken, so the pill would send a sentence with nowhere to land, and the agent would have to answer it with warmth alone.

Emptiness is the canvas's test, not a second one: choices recorded, or a candidate standing. The two surfaces have to agree about what an untouched workspace is, and an RFQ-seeded workspace is correctly not one — its document-sourced choices are choices. State that has not arrived yet falls to the entry prompts rather than to an empty strip, so a reload never blanks the surface on its way up.

*The entry prompts need a second test the other families do not: an empty transcript.* An agreement with nothing recorded is not necessarily an untouched one. A customer who described the building and got a question back has recorded nothing, and the strip that greets them with a Munich hotel is this spec's opening complaint, arriving one turn in instead of three revisions in. So the entry branch reads `agent.messages` as well as the configuration, and between the first message and the first recorded choice the strip is empty — the criterion that an empty strip is correct, doing the work it was written for.

The order is the table's order, and the cap is three *families*, never three pills. A cap counted in pills could emit *make it cheaper* and drop *lower the carbon*, which is the first never-move arrived at by rendering; the pair is one entry that yields two pills, so no cap can reach between them.

## Decision 4: dispatch is the plain path, and this is a constraint not a convenience

A pill sends its own displayed text as an ordinary user message. It does not use the `Canvas edit: `, `Apply repair: ` or `Reconcile deviation: ` grammar that `card-dispatch.ts` owns.

Those prefixes exist because a card stands for one atomic tool call and the agent's prompt is written to map them onto it — the coupling `CLAUDE.md` records between card copy and prompt wording. A pill stands for nothing of the sort: it is a sentence the customer could have typed, and the value of it being exactly that is that the customer learns they could have typed it. Routing pills through the structured grammar would make them commands with a UI disguise, and would silently extend the prompt-coupling surface to a second component.

This also keeps the strip out of the agreement's mechanics entirely. Nothing here can dispatch a state change; the agent decides what a pill's sentence means, the same way it decides what a typed sentence means, and the solver decides whether it is allowed.

## Decision 5: the catalogue is evaluated only while the agent is idle

During a run the previous result is held, so a run has exactly one transition, at its end, whatever the stream does in between. A canvas edit therefore moves the strip on the same boundary as everything else the canvas discards and re-derives.

The obvious alternative — key `useConfigureSuggestions`'s `deps` on the configuration — would satisfy nothing, since `agent.state.configuration` is a fresh object on every streamed delta. But no `deps` argument is passed at all, and that is worth stating because it looks like an omission. The hook builds its config inside a memo whose dependencies already include the config object, itself a fresh literal every render; `deps` only appends to that list. What actually prevents re-registration is downstream: the hook serializes the built config and compares it with the last one, so an unchanged strip registers nothing however often it is handed over. A signature in `deps` would be a second, weaker copy of a check the library already performs. The signature is still computed — it is what decides whether the held result is replaced — but it stays inside this component.

That comparison covers every case in which the strip's contents move, and one case in which they do not is where it leaves a hole: decision 8.

Registration lives in `components/workspace/suggested-moves.tsx`, a component that renders `null`, rather than beside the tool renderers in `use-configurator-ui.tsx` as a hook the workspace page calls. The tool renderers register statically and subscribe to nothing; a state-derived strip has to call `useAgent()`, which re-renders its caller on every agent event, during a streaming reply every token. This is the render-scope rule the [chat surface design](../chat-surface/design.md) states for the header — its decision 5 pushed the unread watcher down into a leaf for the same reason, and its decision 7 made "nothing in the container may subscribe to agent state" the invariant. A leaf that draws nothing is the smallest thing that can subscribe.

*What the leaf buys, stated accurately.* It does not make the workspace page cheap during a streaming reply, and an earlier draft of this decision claimed it did. The page calls `useWorkspaceAttachment`, whose first line is `useAgent()`, and a hook runs in its caller — so the page, chat and canvas included, already re-renders on every agent event and would do so if this component did not exist. What the leaf guarantees is that the strip adds nothing to that, and that the feature is on the correct side of the rule when the attachment hook's subscription is eventually unpicked. `CLAUDE.md` now records the hook as the standing exception rather than stating an invariant the page breaks.

*It joins the hydrated tree, and that was checked rather than assumed*, because the page's standing rule is that nothing minting a React id may. Hydration mismatches do appear while working on this page, and they are the dev server's rather than the page's: the first load after any edit reports one and the next load with the same code does not, the server HTML is byte-stable across the edit that supposedly caused it, a bare `<div>` in the same position reproduces it identically, and a production build reports nothing at all. Three of those four rule this component out; the fourth says there is nothing to fix.

## Decision 6: `available` stays explicit

`useConfigureSuggestions` defaults a static config to `before-first-message`. Every pill this spec adds exists only after the first message, so dropping the `available: "always"` the current call already carries would delete the feature silently, leaving a strip that still works on an empty workspace and never appears again.

## Decision 7: a move that changes nothing is offered once, and the family then moves on

Two families ask rather than act. *Ask why* names a term nobody in the conversation chose; *revise by intent* asks what heavier traffic would change. The agent answers both in prose and neither answer touches `choices` or `candidate`, so the predicate that produced the pill still holds when the reply lands and the same sentence is offered again, and again, for as long as the agreement stands. The other two families are stopped by the agreement moving: an answered clause leaves deviation, an accepted trade-off changes the candidate.

So those two families read a second input — the sentences the customer has already sent, taken from `agent.messages`. A pill's message is exactly what a click sends, which makes the test an exact-match lookup rather than anything that has to interpret the transcript. The component builds the set; the catalogue stays a pure function of its two arguments.

*Where the test sits inside the family is the whole of the decision.* `askWhy` walks the product model and returns the first forced or agent-chosen term, so filtering its output would retire the family after one question, when an agreement usually carries several unexplained terms — and the customer would be told about one and left to discover the rest. The check goes inside the loop instead: a term whose question has been asked is skipped, and the family offers the next. `reviseByIntent` has one sentence, so for it the two placements coincide and asking it retires the family until the usage profile changes.

This reads the transcript, which is the one thing the strip is otherwise careful not to do — the pills are a function of the agreement. It stays defensible because what it reads is not the conversation's content but whether a specific sentence has been sent, and the alternative is a pill that lies about being available: the move it names has already been made.

## Decision 8: the falling edge of a run reloads the strip

`CopilotKitCore.runAgent` clears the agent's suggestions as it starts and reloads them at the tail of `processAgentResult`. The abort and error paths return before that tail. So a reply the customer stops, or one that fails, ends with the suggestions cleared and nothing scheduled to bring them back — and because such a run leaves the agreement untouched, the strip's signature is unchanged, `useConfigureSuggestions` registers nothing, and the reload that registration would have triggered never happens either. The strip stays gone until the next completed run or the next canvas edit.

Freezing the catalogue during a run (decision 5) is what exposes this. Before the freeze, mid-run recomputation moved the signature often enough that some later render re-registered and reloaded by accident; that was never a mechanism, only a side effect that happened to cover the case.

The fix is a reload on the transition of `agent.isRunning` from true to false, calling `copilotkit.reloadSuggestions(agent.agentId)` — the public counterpart of the `clearSuggestions(agent.agentId)` the run's start called, on the same key, guarded the same way for an agent with no id. On a run that completed normally this is a second reload of the same static list, arriving beside the library's own. It is invisible, and that was measured rather than reasoned: across a completed run the pills change count exactly twice, once to nothing when the run starts and once back when it ends. `reloadSuggestions` clears and re-adds a static config synchronously, so the second reload's clear and re-add fall inside one React update and never reach the screen.

The alternative considered was to fold a nonce into the config so that the library's serialize-and-compare sees a change. It would work, and it would make a mechanism out of exactly the accident the freeze removed.

## Verification

By running the app (constitution #9), which is the whole of the check — see decision 1 for why the conversation checks cannot reach this surface. Checked against saved workspaces covering each family, plus one conversation driven end to end:

- An empty workspace opens with the four entry prompts and nothing beside them.
- A workspace with a candidate and no outstanding deviation offers *make it cheaper* and *lower the carbon* and, where a value is forced or agent-chosen, the question about it. Neither trade-off pill ever appeared alone.
- An RFQ-seeded workspace with a pending deviation led with its clause, ahead of the pair.
- A workspace with two recorded choices, no candidate and nothing forced showed an empty strip, which is the intended answer rather than a failure.
- A conversation one turn old, where the customer had described the building and the agent had asked a question rather than recording anything, showed the four entry prompts — the failure this spec was written about, reproduced. The transcript test in decision 3 is the fix, and the state is now empty-strip.
- Across a run the strip is absent, and returns once when the run ends — whether the run completed or the customer stopped it mid-stream. Checked on a workspace carrying a candidate, so the pair was standing before the run and had to come back: a workspace with nothing recorded cannot show this, because there an empty strip is the correct answer either way.
- The run's end is one transition and not two, despite decision 8 firing a reload beside the library's own. Counted rather than watched, since a blink is shorter than a screenshot: a mutation observer on the pill count logged exactly `2 → 0` when the run started and `0 → 2` when it ended, six seconds apart, with nothing in between.
- Clicking a pill sent a visible user message identical to the chip's own text, and the agent answered it as it answers the sentence typed.
- *Why this service level?*, asked from the strip, was answered and not offered again; the family moved to *Why this drive type?*, the next term nobody chose. Asking *What would change if the traffic were heavier?* retired that pill while the usage profile stood. In both cases the rest of the strip was unaffected — the trade-off pair, which the agent's reply had just brought into range by proposing a completion, stayed put.

*One thing the record cannot show cheaply.* A workspace with recorded state opened by reload lands with `isRunning` stuck true (the known gap below) and no strip at all, so every check above was run through the header's *New conversation* instead. That path keeps workspace state on the canvas and gives the strip a settled agent to read.

The one thing the harness could reach is the far side of the dispatch criterion — that a pill's sentence, sent as ordinary user text, lands on the tool call it should. That is a claim about the agent, not about the strip, and whether it earns a scenario of its own is a separate call.

## Notes from implementation

*Two silent faults in the chat pane had to be fixed before any of this was visible*, both recorded in the [chat pane design](../chat-pane/design.md) where the slots belong. The project's replacement suggestion pill lacked `pointer-events-auto`, which the library's container requires of its own pill, so every suggestion in the app rendered correctly and did nothing when clicked. And the replacement welcome screen took only the `input` prop, dropping the bound suggestion view, so an empty workspace — the one state where the entry prompts are exactly right — was the one state that never showed them. Both predate this spec.

*A known gap, and it is not this spec's.* Reloading a page onto an existing conversation sometimes leaves `agent.isRunning` true indefinitely — the transcript finishes replaying, every tool row shows complete, and the composer still offers a stop button. CopilotKit renders the suggestion view only while idle, so on those loads the strip stays away until the next real run ends. Nothing here sets `isRunning`, and the behaviour predates this work; it is recorded because it is the one thing that can make a correct strip invisible. Decision 8 does not help it and cannot: that fix hangs off the falling edge of `isRunning`, and in this gap the flag never falls. It is also the reason a workspace with recorded state is awkward to open for a manual check — starting a fresh conversation in it is the way round.

*The ask-why pill names the term, not the value.* "Why is the service level 24/7 call-out, 8 h response, 99.5 % uptime?" is a paragraph on a chip; "Why this service level?" is a chip. The value is on the canvas next to the question, which is where values live.
