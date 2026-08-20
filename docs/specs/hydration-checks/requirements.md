# Hydration checks: the one check that loads the app

Status: built 2026-08-20, awaiting approval of this file. The decision it records — automate hydration, leave components and hooks on the running app — is argued in [design.md](design.md) §1, and the measurements behind the mechanism are in §2.

Constitution #9 sent UI behavior to the running app, and for everything a person can see that is still the right place. Hydration is the exception, and it is an exception on three counts. It is not behavior: it is whether React accepted the server's HTML or threw it away. Its symptom is a line in a console nobody is obliged to open, on every page load rather than on an unlucky one. And the two rules that protect it — nothing that mints an id may join the hydrated tree, and markup shared above id-minting descendants is shared as a class string rather than as a component ([chat-surface](../chat-surface/design.md) decision 4, [agreement-document](../agreement-document/design.md)) — are rules about the shape of the tree, which no reviewer can apply by reading a diff and no developer can be relied on to re-verify by hand. The chat-surface spec's own verification list says as much about the check it prescribes: *this fails as a report rather than as a break, so it is only ever caught by looking.*

Serves discovery principle [the canvas holds the state and the chat explains it](../../discovery/principles/canvas-holds-state-chat-explains.md). The canvas can hold the state only while the page it is drawn on hydrates: a mismatch is React discarding the server's tree and rebuilding it, which costs the panel geometry and the transcript's landing position — the two things the surface is built around — and leaves the operator a document they cannot act on until they reload.

## Stories

- As a developer adding a component to the workspace page, I learn from a failing check that it moved the tree the ids are derived from, instead of learning it from a console line on a page that otherwise looks right.
- As a developer, I can tell a real mismatch from the dev server's own inconsistency, because the check absorbs the first load rather than believing it.
- As a developer with no provider key and no agent running, I can still run the check, and CI runs it on every push.

## Acceptance criteria

- GIVEN the configurator's pages — the elevator list and a workspace — WHEN the check runs, THEN each is loaded in a browser against the app's own dev server, and any hydration mismatch React reports fails the check, naming the page and quoting what React said.
- GIVEN no provider key, no agent process and no workspace store, WHEN the check runs, THEN it runs anyway: the tree it measures is the one drawn before any fetch resolves, which is the same tree a populated workspace hydrates.
- GIVEN the dev server's documented inconsistency on the first load after an edit, WHEN the check runs, THEN the first load of each route is discarded and the verdict is taken from a later one.
- GIVEN console output that is not about hydration — with no agent running, every page logs a failed request to the workspace store — WHEN the check runs, THEN it is ignored: this check has exactly one opinion.
- GIVEN a push or a pull request, WHEN CI runs, THEN it runs this check as its own job, so a failure names itself.
- GIVEN the check, THEN it renders no component in isolation, mocks nothing, and asserts nothing about what any page looks like or does.

## Out of scope, named

- *Component and hook tests.* Decided against rather than deferred, in [design.md](design.md) §1: the failures these specs actually record are properties of the whole page, and a harness for a component that subscribes to agent state would assert against a mock of the thing under test. Logic worth checking leaves the hook for a module the [offline checks](../offline-checks/requirements.md) already cover — the standing pattern, not a new one.
- *The chat's mount identity and the transcript's scroll position* ([chat-surface](../chat-surface/design.md) decision 2). What breaks is a scroll offset, and an offset needs a transcript, which needs a conversation, which is the conversation checks' cost tier. Node identity alone could be asserted here for the price of a running workspace store, and buys the weaker half of the rule; see [design.md](design.md) §4.
- Visual regression, accessibility audits, and end-to-end flows through the app. Nothing here drives the product; it loads two pages.
- The production build. Measured, not assumed: it reports strictly less than the dev server ([design.md](design.md) §2).
