# Shared attention — design

Status: draft, written alongside the requirements and not yet implemented. Verified facts about the installed packages are marked as such; everything else is a decision awaiting its first run.

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

## Decision 3: the reveal is derived from the state diff, not called by the agent

This reverses the mechanism the audit that prompted this spec proposed. `useFrontendTool` is the documented CopilotKit seam for letting an agent reach into the page, and it is exported at 1.65.0, so the option is real. It is rejected anyway.

A reveal that depends on the model remembering to call a tool is a reveal that sometimes does not happen, and from outside there is no way to tell a deliberate withholding from a forgotten call. That is the wrong reliability for the thing carrying [showing the ripple at the moment of revision makes nonlinear change workable](../../discovery/assertions/ripple-at-the-moment-of-revision.md): if the assertion fails a walkthrough, we would not know whether the disclosure level was wrong or the tool call was skipped. It also spends model attention and tokens on something the canvas can compute exactly, against constitution #10, and it would put a UI-control tool in a tool list whose contents constitution #1 depends on staying about the agreement.

The canvas already renders as a projection of `agent.state.configuration`. Comparing the projection before and after a run yields the affected values exactly, with no model involvement, no new tool and nothing to get wrong. The requirements' rule that the agent may not move the view without having changed something falls straight out of the mechanism rather than having to be enforced against it.

The precedent is in the code. `ScheduleGroup` in `config-canvas/schedules.tsx` already opens itself when it holds an unanswered requirement, on the argument that a deviation the operator cannot see is a deviation they cannot answer. Revealing a change the agent just made is that argument applied to the agent's own moves, and it should use the same shape.

*What this gives up.* The agent cannot single out which of several changes matters most, so the requirements settle for document order. It also cannot point at something it did not change, which the requirements forbid anyway. If a walkthrough shows the agent genuinely needs to nominate a target, the narrow addition is a field on the tool result it already returns, read by the canvas — still not a frontend tool, because the reveal stays deterministic given the result.

## Decision 4: disclosure follows the existing `open ?? derived` pattern

`ScheduleGroup` holds `useState<boolean | undefined>(undefined)`, where `undefined` means untouched and the rendered state falls back to a value derived from the register. The reveal extends the fallback rather than lifting the state or setting it imperatively:

```
const expanded = open ?? (deviating || holdsRevealedValue)
```

An untouched schedule follows the document; a schedule the operator has explicitly opened or closed obeys them, permanently. That is the requirements' rule about an explicit collapse, obtained for free, and it avoids the hydration hazard the existing comment documents — the state initializer does not re-run, so a default read from anything the server cannot see would mismatch on load.

## Decision 5: the mark is transient view state, and the scroll happens once

The revealed values carry a mark that fades, held in the same ephemeral overlay `pending` already occupies and discarded on the same boundary. It is not provenance, not a status, and nothing in the model or the workspace record.

The scroll fires once per run, on the transition out of `isRunning`, using `scrollIntoView` against the ref of the topmost affected row. Firing on state change instead would scroll repeatedly through a streamed run, and firing per affected value would tour the document.

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

## Verification plan for the rest

UI behaviour has no automated check (constitution #9), so this is a walkthrough list against the running app:

- Revise a value that forces hardware inside a collapsed schedule; the schedule opens, the page lands on the topmost forced value, the rest are marked.
- Collapse that schedule by hand, revise again; it stays collapsed and the header carries the mark.
- Open an editor, ask a question containing "this one" without naming the variable; the answer is about that variable.
- Open an editor near the bottom of the document, cause a change above it; the page does not move under the editor.
- Ask a question that changes nothing; nothing moves.
- Reopen a conversation the agreement has moved past; the agent's answer treats the transcript above as historical.
- Switch the chat to full screen and hidden and repeat the first case; the reveal happens on the canvas and the mode does not change.
