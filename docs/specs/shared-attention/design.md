# Shared attention — design

Status: implemented and verified against the running app on 2026-08-14; the verification record and the measured gaps are at the end.

## Decision 1: the read channel is CopilotKit's app context, not agent state

The agent learns what the operator has open through `useAgentContext({description, value})` from `@copilotkit/react-core/v2`. The mechanism is present in the installed stack end to end and needs no agent-side work: the hook publishes into the runtime's context list, and the installed `copilotkit` Python package's `CopilotKitMiddleware.before_agent` reads `state["copilotkit"]["context"]` and injects it ahead of the turn as an `App Context:` block. Both halves were checked in `node_modules/@copilotkit/react-core` at 1.65.0 and in `agent/.venv/.../copilotkit/copilotkit_lg_middleware.py`.

The alternative — putting the attention target into `AgentState` and seeding it like `workspace_id` — is wrong on the same grounds the [chat surface design](../chat-surface/design.md) rejected it for the pane's mode. Constitution #3 puts *shared configuration* in the agent; where someone is looking is not configuration. Worse, agent state is checkpointed per thread, so a scroll target would become part of the conversation's historical record and would be replayed on every re-entry, and the workspace-precedence subscriber in `use-workspace-attachment.ts` would have to learn to ignore it.

`workspace_id` stays in state, and this is not a migration. Tools consume it to write through to the workspace store, which makes it a tool input rather than a prompt hint.

## Decision 2: the payload is two entries, and the shrinking is the point

The obvious version of this feature publishes everything the frontend knows — expanded schedules, scroll position, the deviation register, the visible configuration. Each of those was dropped for its own reason, and what survives is small enough to pay for on every turn.

| Candidate | Verdict |
|---|---|
| Open editor's variable and its layer | Kept. The strongest signal, and the one that resolves demonstratives. |
| Transcript staleness | Kept. Already computed by `useWorkspaceAttachment`; tells the agent its own transcript is historical. |
| Configuration, statuses, provenance, deviation register | Dropped. All already in `AgentState.configuration`; a second copy is a second thing to disagree with. |
| Expanded schedules | Dropped. Disclosure is per-schedule local state in `schedules.tsx` and lifting it buys a weaker signal than the open editor already gives. |
| Scroll position | Dropped. Continuous, low-information, and it would churn the context on every turn. |
| Chat mode | Dropped, and forbidden by the requirements. The [chat surface design](../chat-surface/design.md) decision 1 keeps the mode out of the agent's reach deliberately; publishing it as context would reintroduce exactly what that decision excludes. |

The one lifted value is the open editor. `OptionEditor` is opened from all three layers through the shell's routed dispatch, so the shell is where the lift lands — a single value beside the `pending` overlay `config-canvas/index.tsx` already holds, not a context provider.

*How the lift works, as built.* Every layer's editor renders `OptionEditor` exactly while it is open — a schedule row's collapsible and a prose token's popover both unmount it on close — so a mount/unmount effect in that one component is the entire signal: `onEditorOpen`/`onEditorClose` on the `DocumentView`, the shell keeping the last one opened. The shell holds the value twice, as state (for the `useAgentContext` publication) and as a ref (for the reveal's editor-pin check at run end, when the state can be a render behind — a run disables and unmounts every editor, and they remount and re-report on the same commit the reveal fires in). The staleness entry publishes from the workspace view in `src/app/workspaces/[id]/page.tsx`, where `useWorkspaceAttachment` already computes it. `useAgentContext` at 1.65.0 mints no React ids, so both publications are safe in the hydrated tree.

*One caveat the requirements' "two things and no others" needs.* The A2UI starter catalog mounted in `layout.tsx` publishes its own five context entries (catalog, schema, guidelines), so the agent's App Context block is not literally two entries — this spec's channel contributes exactly two, and nothing configurator-side may add more, but the block as a whole is diluted by starter noise until that surface is unmounted.

*Editor genre difference the stories glossed over.* A popover editor (`ValueToken` in prose and terms) closes on any outside click, including a click into the chat composer, so "an editor open while I type" holds only for schedule-row editors, whose inline collapsibles stay open. The popover still covers the card-click and canvas-edit flows, where the context is captured at dispatch before `onDone` closes it.

## Decision 3: the reveal is derived from the state diff, not called by the agent

This reverses the mechanism the audit that prompted this spec proposed. `useFrontendTool` is the documented CopilotKit seam for letting an agent reach into the page, and it is exported at 1.65.0, so the option is real. It is rejected anyway.

A reveal that depends on the model remembering to call a tool is a reveal that sometimes does not happen, and from outside there is no way to tell a deliberate withholding from a forgotten call. That is the wrong reliability for the thing carrying [showing the ripple at the moment of revision makes nonlinear change workable](../../discovery/assertions/ripple-at-the-moment-of-revision.md): if the assertion fails a walkthrough, we would not know whether the disclosure level was wrong or the tool call was skipped. It also spends model attention and tokens on something the canvas can compute exactly, against constitution #10, and it would put a UI-control tool in a tool list whose contents constitution #1 depends on staying about the agreement.

The canvas already renders as a projection of `agent.state.configuration`. Comparing the projection before and after a run yields the affected values exactly, with no model involvement, no new tool and nothing to get wrong. The requirements' rule that the agent may not move the view without having changed something falls straight out of the mechanism rather than having to be enforced against it.

*The diff, as built.* The shell keeps a baseline `Configuration` in a ref and advances it on every idle render, which is what keeps workspace seeds and transcript hydration out of the diff: only a transition out of `isRunning` compares, over `liveValue` per model variable, so a proposal, a forced value and a value that vanished when a candidate was dropped all count as changes, while a provenance-only change (the same value re-recorded under a new source) does not.

The precedent is in the code. `ScheduleGroup` in `config-canvas/schedules.tsx` already opens itself when it holds an unanswered requirement, on the argument that a deviation the operator cannot see is a deviation they cannot answer. Revealing a change the agent just made is that argument applied to the agent's own moves, and it should use the same shape.

*What this gives up.* The agent cannot single out which of several changes matters most, so the requirements settle for document order. It also cannot point at something it did not change, which the requirements forbid anyway. If a walkthrough shows the agent genuinely needs to nominate a target, the narrow addition is a field on the tool result it already returns, read by the canvas — still not a frontend tool, because the reveal stays deterministic given the result.

## Decision 4: disclosure follows the existing `open ?? derived` pattern

`ScheduleGroup` holds `useState<boolean | undefined>(undefined)`, where `undefined` means untouched and the rendered state falls back to a value derived from the register. The reveal extends the fallback rather than lifting the state or setting it imperatively:

```
const expanded = open ?? (deviating || holdsRevealedValue)
```

An untouched schedule follows the document; a schedule the operator has explicitly opened or closed obeys them, permanently. That is the requirements' rule about an explicit collapse, obtained for free, and it avoids the hydration hazard the existing comment documents — the state initializer does not re-run, so a default read from anything the server cannot see would mismatch on load.

One addition proved necessary: the expansion must outlive the mark, or the schedule would re-collapse when the reveal faded — a reveal collapsing something is exactly what the requirements forbid. So alongside the fallback, an effect latches `open` to true (`setOpen(o => o ?? true)`) while an untouched schedule holds a revealed value; the fallback expands it in the reveal's own render (the scroll queries the DOM in that same commit and needs the rows present), the latch makes the expansion permanent, and an explicit collapse (`open === false`) defeats both, with the header carrying the mark and a "changed in here" note instead.

## Decision 5: the mark is transient view state, and the scroll happens once

The revealed values carry a mark that fades, held in the same ephemeral overlay `pending` already occupies and discarded on the same boundary. It is not provenance, not a status, and nothing in the model or the workspace record.

The scroll fires once per run, on the transition out of `isRunning`, using `scrollIntoView` against the ref of the topmost affected row. Firing on state change instead would scroll repeatedly through a streamed run, and firing per affected value would tour the document.

*As built, with one refinement over the requirements' first wording.* Marked elements carry a `data-reveal` attribute (rows and tokens their own variable, a collapsed schedule's header the list it hides), the shell queries them in document order, and the target is the topmost marked element *not already fully in view* — scrolling to the literal topmost would, after a canvas edit, center the value the operator just clicked and leave the forced hardware below the fold, which is the case the feature exists for. All in view means no scroll; an open editor (read from the ref, since editors remount in the same commit) suppresses the scroll entirely while the marks still apply; `scrollIntoView({behavior: "smooth", block: "center"})` against the Radix scroll viewport. The mark itself is a `bg-primary/10` over a `transition-colors duration-1000`, held in a `revealed` set beside `pending` and dropped by a 6-second timer, so the highlight transitions out and the state is empty again — requirements' "no trace once the mark fades", literally.

## Decision 6: card dispatch runs through the core, not the bare agent

*Done ahead of the rest of this spec* — both dispatch sites now call `copilotkit.runAgent({ agent })`. It is recorded here because it is a precondition for decision 1 rather than an independent cleanup, and because it was nearly missed.

There were *two* sites, not one. `card-dispatch.ts` serves the three in-chat cards; `config-canvas/index.tsx` has its own `dispatch` for the `Canvas edit: ` and `Reconcile deviation: ` messages, and it had the same bare call. The canvas one matters more for this spec: a canvas edit is precisely the turn where what the operator has open is worth the agent knowing. (`headless-chat.tsx` has a third bare call and was left alone — nothing imports it.)

There are two ways a user message enters this system, and they take different paths. The composer does `agent.addMessage(...)` and then `copilotkit.runAgent({ agent })`. `card-dispatch.ts` does the same `addMessage` and then `agent.runAgent()` — the raw AG-UI method, with no arguments.

The core's `RunHandler.runAgent` is what assembles a run's parameters before delegating to the agent:

```js
await agent.runAgent({
  forwardedProps: { ...this._internal.properties, ...forwardedProps },
  tools: this.buildFrontendTools(agent.agentId),
  context: this._internal.getContextForAgent(agent.agentId),
}, …)
```

Called bare, `AbstractAgent.prepareRunAgentInput(undefined)` fills those three from its own defaults — `tools: []`, `context: []`, `forwardedProps: {}`. The `context` array is where `useAgentContext` publishes.

So a card-dispatched turn carries no app context at all. Every `Apply repair: `, `Adopt frame "…"` and `Reconcile deviation: ` message would reach the agent without the attention channel this spec exists to open, while a typed message carries it — and the agent would have no way to tell which kind of turn it was on. That is worse than not having the channel, because it is a channel that works intermittently for reasons invisible from either end.

`useCopilotKit().copilotkit.runAgent({ agent })` closes it. Three other things come back with it, none of which this spec needs but all of which the card path was skipping: the frontend-tool build and the `processAgentResult` execution loop with its follow-up runs; the suggestion engine's `clearSuggestions`/`reloadSuggestions` around the run, which the [suggested moves spec](../suggested-moves/requirements.md) will want; and the `onAgentRunStarted` subscriber notification and the `emitError(AGENT_RUN_FAILED)` path, so a failed card run reports itself the way a failed typed one does. The rejection is caught and logged at the call site, matching the composer.

The stop button was *not* affected: `copilotkit.stopAgent` calls `agent.abortRun()` directly as well as aborting its own controller, so a card-started run stopped correctly even on the old path. Claiming otherwise would have overstated the defect.

Render cost is nil. `useCopilotKit` reads a context whose value is memoized on `[copilotkit, executingToolCallIds]`; the core instance is stable and the executing-tool set only moves when a frontend tool runs, of which there are none. The cards' own ancestor, `useRenderToolCall`, already subscribes to that context.

## Verification record: decision 6

Run against the app on 2026-08-14, since decision 6 landed ahead of the spec and constitution #9 makes the running app the only check UI behaviour gets.

- In-chat card (`ask_choices`, service level): clicking an option dispatched the visible `Set Service level to …` message, the agent mapped it onto a single `set_choices` call, and the term plus the recital sentence both took the value with a *you* badge.
- Canvas edit (contract term, 10 years): the editor opened from the term, the value and the recital updated, and *nothing appeared in the conversation* — the hidden-message behaviour the [agreement document spec](../agreement-document/requirements.md) requires on a clean apply.
- Console clean across the canvas edit and its run: no errors, no warnings, no dispatch rejection.

One false alarm worth recording so it is not rediscovered. A `Maximum update depth exceeded` exception appeared earlier in the same session, and it is *not* related: the stack runs through `CopilotChatInput`'s own `handleChange` → `setInternalValue`/`updateSlashState`, i.e. the composer's controlled-input and slash-command state machine, tripped by synthetic keystrokes arriving faster than a human types. The same burst dropped characters from the typed message. It reproduces only under automated typing.

## Decision 7: the prompt needs hard rules, and gpt-5.4-mini said so twice

The first prompt wording — a descriptive "resolve demonstratives to the open editor; treat a stale transcript as historical" under the State section — measurably failed both halves. With an editor open on the energy package, "Why is this one set the way it is?" was answered about the whole configuration and the previously discussed door width, even though the App Context block verifiably carried `{"variable": "energy_package", …}` (checked in the thread's `state.copilotkit.context`). In a stale conversation, "Are we still on the 15-year term?" was answered "yes, €890/month" from the transcript while the run's state held the 10-year term and no candidate.

Both were fixed by the same move: rephrase as a hard rule naming the exact behavior — "the open editor's variable IS the referent; check that entry before answering", and "when stale, call get_configuration before answering anything about the agreement, never answer from remembered figures". After the change the same demonstrative question answered about the energy package by name, and "Where does the agreement stand right now?" in the stale conversation called get_configuration and reported the 10-year state. The App Context block is injected near the top of the conversation, far from the newest question, which is presumably why gentle guidance loses to transcript recency.

## Verification record

Run against the app on 2026-08-14 (constitution #9), one workspace built up from an empty agreement by chat, card click and canvas interaction. `npx tsc --noEmit` clean over the live code.

- A turn that changed nothing (naming the workspace) marked nothing and moved nothing; workspace seeding and transcript hydration after a reload likewise produced no reveal.
- A card-dispatched `set_choices` + proposal marked every changed value across all three layers — recital tokens, term tokens, schedule rows — expanded the collapsed schedules, and nudged the view to the topmost mark not in view. The marks faded; the expansion stayed.
- A hand-collapsed schedule stayed collapsed through a later revision. The header-mark case (a change landing inside a hand-collapsed schedule) did not occur in the walkthrough — the revision left that schedule's values alone — so it is verified only by the shared code path, not by observation.
- Demonstrative resolution and staleness behavior as in decision 7, including the context payloads read back from the thread state.
- A revision that dropped the candidate marked the values that went from proposed to empty — a disappearance is a change worth pointing at, and the diff catches it unasked.
- Not exercised: the reveal-under-open-editor pin (holds by construction — the scroll effect returns early on the editor ref) and the chat-mode sweep (the mode is never published, and the reveal runs entirely canvas-side).

Two environment findings recorded so they are not rediscovered. The composer's known `Maximum update depth exceeded` under synthetic typing reproduced exactly as documented for decision 6 and is unrelated. Separately, on one long-running conversation the dev runtime repeatedly failed runs client-side with `First event must be 'RUN_STARTED'` while the langgraph server completed the same runs and wrote through to the workspace store — the transcript catches up on reload, and a fresh conversation in the same workspace streamed flawlessly. This predates and is untouched by this spec (the same core `runAgent` path carried the earlier verified turns); it is a runtime-proxy defect worth its own investigation.

## Known gaps

- A stale transcript that already contains the agent's *own* contradicting answer can still anchor it: after one wrong "still 15 years" (given before the prompt hardening), a repeat question got the same wrong answer even under the hard rule. Differently shaped questions escape it. Tuning this further is conversation-checks work (`compare_refs` is the instrument that sees prompt edits), not walkthrough work.
- The agent's App Context block carries the A2UI starter catalog's five entries beside this spec's two (decision 1's caveat); the dilution goes away when that starter surface is unmounted.
