# Interface checks: rendering against a mocked stream

Status: approved and built 2026-08-20. Every criterion here is met, and constitution #9 was amended as *The constitution amendment this requires* describes. One criterion was met by a cheaper route than the one it named: the agreement payloads come from the dump the coupling checks already read rather than from a fresh recording, and no money was spent on this tier ([design.md](design.md), *Payloads come from the agent*).

This is the third tier of checks, sitting between the [offline checks](../offline-checks/requirements.md) and the [conversation checks](../conversation-checks/requirements.md). The offline checks reach every piece of frontend logic that isn't UI and stop there, and the conversation checks drive the live agent and cost money per run. Between them is the frontend's stateful middle: the hooks that attach a conversation to a workspace, hydrate the agreement, and decide when a card has gone inert. None of it is pure logic, so the offline checks can't reach it, and none of it is prose behaviour, so the conversation checks are the wrong instrument and the wrong price.

`@copilotkit/aimock` closes that gap. Its `AGUIMock` serves the AG-UI event stream a CopilotKit frontend consumes, from fixtures, with no provider key and no agent process. CopilotKit's own React packages are checked with vitest, `@testing-library/react` and jsdom, and this tier is that stack pointed at a mocked stream.

The one premise this rests on has been verified rather than assumed. CopilotKit consumes the stream through `fetch` with `Accept: text/event-stream` rather than through `EventSource`, and a streaming `fetch` against `AGUIMock` under vitest's jsdom environment delivers `RUN_STARTED, STATE_SNAPSHOT, RUN_FINISHED` intact. So this tier needs no browser toolchain.

Serves discovery assertion [the canvas is the durable locus of state](../../discovery/assertions/canvas-is-the-durable-state.md). The canvas is the durable locus only if the durable agreement survives a conversation attaching to it, and the hook that guarantees that has three documented ways to fail: the connect wiping hydrated state, the connect overwriting it, and the agent instance swapping identity. All three are orderings of a stream, and no other check in the repo drives one. Also serves principle [always show a valid whole](../../discovery/principles/always-show-a-valid-whole.md), for the staleness rules that take a card out of service when the draft beneath it has moved.

## The constitution amendment this requires

Constitution #9 closed with "UI *behavior* is verified by running the app: no check renders a component." That sentence assumes faking the agent is impractical. It isn't, and CopilotKit publishes the tool, so the clause was amended to permit checks that render against a mocked stream, while keeping hydration, layout and the WebGL render on the running app. That amendment landed with this spec.

## Stories

- As a developer changing `use-workspace-attachment`, I learn from a failing check that a conversation now lands on the checkpoint's agreement rather than the workspace's, instead of discovering it by opening a stale conversation in the app.
- As a developer changing a card's staleness rule, I can drive a draft switch mid-stream and assert the card went inert, without spending a live run to do it.
- As a developer, I can run this tier offline, in CI, on every push, at no cost.

## Acceptance criteria

### Event shapes are recorded; orderings are composed

The traps this tier exists for are unfaithful orderings by construction: no recording of a healthy agent produces a connect that wipes hydrated state. So the two halves are held to different standards.

- GIVEN the agreement a fixture carries, WHEN the fixture is created, THEN it is one the agent actually built, read from the dump the coupling checks already run, rather than a hand-authored reading of what a configuration looks like. A hand-authored payload is a second declaration of the agent's own shape, and that is the failure mode the [offline checks](../offline-checks/design.md) already record twice.
- GIVEN the events wrapped around that payload, WHEN the fixture is created, THEN they come from the mock library's own AG-UI constructors rather than being written out by hand.
- GIVEN those recorded events, WHEN a trap is driven, THEN the *sequence* is composed by the check, and the check states which ordering it is constructing and why the live agent wouldn't produce it.
- GIVEN a fixture, WHEN the checks run, THEN they need no provider key, no agent process and no network.

### What becomes checkable

- GIVEN `use-workspace-attachment`, WHEN the checks run, THEN each of its three documented traps is driven as an ordering of the stream and asserted against: a connect that wipes hydrated state, a connect that overwrites it, and an agent instance that swaps identity mid-attach.
- GIVEN a conversation attaching to a workspace whose current draft has moved since that conversation's last turn, WHEN the attach completes, THEN the configuration in agent state is asserted to be the workspace's current draft rather than the thread checkpoint's.
- GIVEN a card whose draft has moved beneath it, WHEN the checks drive the move, THEN the card is asserted inert, and its staleness sentence asserted against the one the frontend builds.

### Running them

- GIVEN `vitest.config.mts`, which pins `environment: "node"` as a decision rather than a default, WHEN this tier is added, THEN the two environments coexist explicitly: the existing checks keep `node`, and this tier declares `jsdom` per file or as a second project, so no existing check silently acquires a DOM.
- GIVEN `npm test`, WHEN it runs, THEN this tier runs beside the offline checks and starts and stops its own `AGUIMock` server, on top of the agent provisioning `npm test` already requires. A failure to start it names the cause rather than failing the assertions.
- GIVEN the frontend, WHEN it is pointed at a mock, THEN the runtime URL is configuration rather than the literal in `src/app/layout.tsx`, and the default is unchanged for the running app.
- GIVEN a push or pull request, WHEN CI runs, THEN this tier runs in the frontend job.

## Out of scope

Hydration, layout, scroll position and the WebGL render. jsdom has no layout engine and produces no server HTML, so this tier can't see them and doesn't claim to. They stay verified by running the app until a browser tier is specified separately, and that tier waits on an experiment: whether a production React build reports a `useId` mismatch detectably enough to assert on.

Replacing the conversation checks. A mocked stream replays the fixture it was given, so it can't see a system-prompt or docstring edit. That remains the paid tier's job, and this tier isn't a reason to run it less often.

The three-layer document's own projection, which the offline checks already cover from `src/lib/configurator.ts`. Coverage thresholds, visual regression, and the dead starter code.
