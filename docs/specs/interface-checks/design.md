# Interface checks — design

Rules the jsdom tier: the mocked AG-UI stream, the two vitest projects and why they disagree about the DOM, where the payloads come from, and what each check asserts. Read it before adding an interface check or changing the vitest projects.

## 1. jsdom is enough, and that was checked before anything was built

CopilotKit reads the AG-UI stream with `fetch` and `Accept: text/event-stream`
(`@copilotkit/core`), not with `EventSource`. jsdom implements no `EventSource`,
so had it been the other way round, this tier would have needed a browser and
the constitution amendment behind it would have been the wrong one.

A throwaway spike settled it before any of this was written: a streaming `fetch`
against a running `AGUIMock`, under vitest's jsdom environment, delivers
`RUN_STARTED, STATE_SNAPSHOT, RUN_FINISHED` intact, and identically under the
node environment. `tests/interface/mount.test.tsx` is the durable version of
that spike, one step further along — a real `CopilotKit` tree rendered in jsdom,
driving the mock and reading state back. A failure there means the harness
broke, not that a hook is wrong.

## 2. The mock is a local agent, not a runtime

`AGUIMock` serves a bare AG-UI agent endpoint. `runtimeUrl` expects a CopilotKit
runtime, which is a larger surface, so pointing `runtimeUrl` at the mock is the
wrong seam. The right one is `agents__unsafe_dev_only`, which takes an
`AbstractAgent` directly: the checks build an `HttpAgent` on the mock's URL and
hand it over. `@copilotkit/react-core/v2` re-exports `@ag-ui/client`, so
`HttpAgent` comes from the same import as everything else.

`runtimeUrl` in `src/app/layout.tsx` became configuration anyway, defaulting to
the app's own route. That serves running the *app* against a mock, which is a
different job from running the checks, and it is what the requirements asked
for.

## 3. Two projects, because the two tiers disagree about the DOM

`vitest.config.mts` declares `offline` (node) and `interface` (jsdom) as
separate projects rather than one config with an override. The node environment
of the older tier is a decision recorded in its own design, so the way to add a
DOM without weakening it is to give the new tier its own project and leave the
old one untouched.

Two things the interface project needs and the offline one must not have:

- `server.deps.inline` for `@copilotkit` and `@ag-ui`. The packages import their
  own stylesheet, and Node can't load a `.css` file, so inlining them makes Vite
  do the transform.
- An empty PostCSS plugin list. Once Vite transforms that stylesheet it reaches
  for the app's Tailwind config and fails. These checks assert on state and on
  text, never on style, so the bypass costs nothing.

`testTimeout` is 30s here, against the 5s default, because attaching runs
several awaited round trips before it settles. The checks finish in about a
second each; the ceiling exists to keep a genuine hang legible rather than to
accommodate a slow one.

## 4. Payloads come from the agent; only the orderings are composed

The requirements asked that event shapes be recorded off the live stack through
`enableRecording`, so that no fixture is a second hand-authored declaration of
what the agent emits. That criterion was met by a different and cheaper route,
and the deviation is deliberate.

The traps this tier exists for are unfaithful orderings by construction. No
recording of a healthy agent produces a connect that wipes state mid-attach,
which is the point of checking it. So a recording could never have supplied the
sequences, only the payloads.

The payloads were already available. `agent/tests/grammar_dump.py` carries four
agreements the agent actually built, and the coupling checks already hold their
own fixtures against them (offline-checks design, *The fixtures are held
against agreements the agent actually built*). The interface checks take
their configurations from the same dump, so the risky half of every fixture is
agent-built. The event envelope around it comes from aimock's own AG-UI
constructors, which is library code rather than anything written here.

What that leaves hand-written is the `WorkspaceRecord` envelope — ids, names,
draft pointers, one thread — served from an in-memory `fetch` router over
`/api/workspaces*` and the two thread-checkpoint routes. That envelope is thin,
and its shape is held by the typecheck, by `tests/workspaces.test.ts`, and by
`test_http_app.py` on the store's own routes.

The live recording was therefore not run, and no money was spent on this tier.
If a future check needs a faithful *sequence* rather than a faithful payload,
`enableRecording({upstream, proxyOnly: false})` against `/api/copilotkit` is the
route, and it costs one live run.

`agentDump()` moved out of `tests/couplings.test.ts` into `tests/agent-dump.ts`
so both tiers read the dump through one loader. It spawns `uv` once per vitest
project, so `npm test` runs it twice, and this tier inherits the offline tier's
standing condition that a frontend-only checkout can't run it.

`mount.test.tsx` is the one place that hand-authors a state payload. It is a
transport probe rather than a fixture standing in for an agreement — the point
is that some snapshot crosses the wire at all — so nothing about the agent's
shape is being declared there.

## 5. Each check states the ordering it composes

Every check that drives a trap says in a comment which sequence it builds and
why a healthy agent doesn't produce it. Without that, a reader can't tell a
deliberate malformation from a misunderstanding of the protocol, and the next
person to touch the file would have to re-derive it from the hook.

That the checks discriminate was verified the way the offline checks verified
their own fixtures, by breaking the thing they watch. With the hook's
`agent.subscribe({ onStateChanged })` swapped for a handler the agent never
registers, exactly the two checks that depend on it fail and the other five
pass. That split is the useful part: the two "survives a connect" checks are the
subscriber's, while landing on the current draft is the seed's work and holds
without it.

One thing can't be asserted, and the attempt is worth recording. A check that
watches the wipe *appear* in the DOM before asserting the recovery fails,
because the subscriber re-seeds synchronously and React never renders the
cleared state. The state never settling wiped is the guarantee, so a check
demanding the wipe be visible would assert the opposite of the design. The
negative control stands in for it.

The agreements are chosen by name, not by position in the dump. `chosen` and
`priced` carry identical choices, because pricing lands in a candidate rather
than in the choices, so a pair drawn from those two would have passed whichever
draft won. The pair is `chosen` and `seeded`, and a check asserts up front that
the two differ, so a future dump that collapses them fails loudly instead of
going quiet.

Two isolation rules turned out to matter, and both were found by watching checks
fail rather than by reasoning:

- Each check gets its own thread id. The CopilotKit core outlives a single
  render, so a shared id let one check's messages decide whether the next one's
  attach ever got past its drain loop.
- `cleanup()` runs between checks. Without it the previous tree stays mounted
  and its hook keeps attaching.

## 6. What is checked

`tests/interface/attachment.test.tsx`, against the real
`useWorkspaceAttachment`, with the workspace store and the thread checkpoint
served from memory:

- The agreement a conversation lands on is the workspace's current draft, not
  the thread checkpoint's.
- A connect that clears state after the seed is survived: the subscriber puts
  the agreement back.
- A connect that overwrites the seed with the checkpoint's whole state is
  survived on the same terms.
- An agent instance swapped in mid-attach gets seeded rather than left empty,
  which is why the attach effect is deliberately not guarded to run once per
  thread.
- A conversation whose draft moved beneath it goes stale, and its reason names
  the draft it was working on and the current one, character for character.

`tests/interface/refusals.test.tsx`, against a rendered `AskChoices`, for each
of the three controls a payload can ask for ([accessible
surface](../accessible-surface/design.md)):

- The rules behind a ruled-out option are text in the document, reachable with
  no hover and no focus. This is the assertion that would have failed for two
  of the three controls before that spec, while the third passed — the rules
  were in state and were arriving only on a `title`.
- The refused control's `aria-describedby` resolves, and resolves to the
  element carrying the visible sentence rather than to a second copy of it.
- A refusal with no product rule to cite still says something, in the words
  `refusalText` gives it.

Legibility itself is colour, which this tier asserts on nowhere by design.

## Verification

- `npm test`: 194 passed across 8 files in about 6s — 187 in `offline`, 7 in
  `interface`. `AGUIMock` starts in `beforeAll`, and a failure to start it
  surfaces as vitest's own suite-level error, naming the cause, rather than as
  failing assertions.
- `npm run typecheck`: clean.
- `uv run pytest` in `agent/`: 249 passed, 5 deselected, unchanged by this work.
- CI needed no new step: the frontend job already runs `npm test` and already
  provisions the agent, which both tiers need. Its comments were corrected to
  say why.

## Known gaps

- The orderings are composed from a reading of the hook's own design. A trap the
  design doesn't name is a trap this tier doesn't check, and the only thing that
  would find one is the running app.
- No check here renders the canvas, the chat pane, or any component that owns
  layout. jsdom has no layout engine and produces no server HTML, so hydration,
  scroll position, `inert` versus `display:none`, and the WebGL render stay
  visible only in the app. The browser tier that would see them is unspecified
  and waits on an experiment: whether a production React build reports a
  `useId` mismatch detectably enough to assert on.
- A mocked stream replays the fixture it was given, so nothing here sees a
  system-prompt or docstring edit. That stays the conversation checks' job.
- `card-dispatch.ts` is still unchecked. Its staleness rule is exercised
  indirectly through the hook's `staleThread`, but the hook itself — a card
  going inert against a live run — remains behavior of the CopilotKit core it
  calls, which the offline checks already declined to check.
