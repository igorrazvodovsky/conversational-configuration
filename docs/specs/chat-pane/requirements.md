# Chat pane — requirements

Status: implemented ([design](design.md)).

This spec covers what the chat pane is *made of*: the transcript scroller, the message rows, the composer, the attachment strip and the file rows in a sent message, the suggestions and the welcome screen, recomposed from the slots `CopilotChat` already exposes so the pane carries the project's own vocabulary. Its geometry — sidebar, floating, full screen, hidden — is a separate concern, owned by the [chat surface spec](../chat-surface/requirements.md).

The pane arrived as the CopilotKit starter's and looked it: rounded bubbles, a 16px prose size, and a button vocabulary and palette that were the library's rather than the app's, on the other side of a divider from a canvas that was none of those things.

Serves discovery principle [the canvas holds the state and the chat explains it](../../discovery/principles/canvas-holds-state-chat-explains.md). That principle divides the work between two panes of a single tool. Two visual identities across the divider argue instead that chat is a widget the tool embeds, and invite the user to read the transcript as the product rather than as its explanation.

## Scope

*In:* everything the chat pane renders — the transcript scroller and its scroll behaviour, the message rows for both speakers, the reasoning disclosure, the composer, the attachment strip and the file rows in a sent message, the suggestions and the welcome screen.

*Out:* CopilotKit's internals. The pane is dressed through its own props, with no fork, no patch, and no descendant-selector CSS reaching into `[data-copilotkit]` (constitution #10). Behaviour CopilotKit owns — streaming, markdown, transcription, branch navigation, interrupts, tool-call rendering — is passed through rather than reimplemented. Also out: the three in-chat cards, `ask-choices`, `repair-options` and `frame-comparison`, which are the configurator's own components rendered *through* the pane's tool-call slot. The pane places that slot and doesn't touch what it renders.

## User stories

*As the operator working across the divider,* I want the chat to look like the rest of the tool, so that the two halves read as one interface rather than an app with a chat widget bolted to it.

- GIVEN the split view in either theme, WHEN I look from canvas to chat, THEN both halves are zinc, square and dense — the same type scale, the same button vocabulary, no rounded corner on either side.
- GIVEN I send a message, WHEN the reply streams in, THEN my turn is anchored near the top of the viewport with the previous turn still peeking above it, rather than the transcript being dragged to the bottom on every token.
- GIVEN a long transcript, WHEN I scroll back to re-read an earlier turn, THEN incoming tokens don't steal my scroll position, and a control returns me to the live end.

*As a developer,* I want to change a piece of chat chrome without touching the library.

- GIVEN a piece of chrome I want to replace, WHEN I change it, THEN I do it by passing a project component into the slot CopilotKit documents for it — not by patching the package, and not by writing a selector against its markup.

## Acceptance criteria

- GIVEN the chat pane, WHEN it is inspected, THEN every visible element is a project component or a CopilotKit slot the project styled, and nothing in `globals.css` reaches into CopilotKit's markup to achieve it.
- GIVEN the chat pane after restyling, WHEN a conversation runs end to end, THEN everything that worked before still works: markdown and streaming, the three tool cards, the stop button, suggestions, the welcome screen, thread switching, and a card going stale.
- GIVEN a reply longer than the viewport, WHEN it finishes streaming, THEN the last line is readable rather than hidden behind the composer.
- GIVEN a conversation attaching to a workspace, WHEN its transcript hydrates in more than one batch, THEN the pane comes to rest at the end of that history rather than part-way up it.

## Relationship to other specs

- [UI component library](../ui-component-library/requirements.md) supplies the vocabulary the pane composes from, and the zinc and Lyra identity the pane has to match. The primitives this pane needed — `message-scroller`, `message`, `bubble`, `input-group`, `attachment` — were installed under that spec's rules, and the provenance and unavailability criteria it sets apply here as they do on the canvas.
- [Chat surface](../chat-surface/requirements.md): the pane is mounted once and its geometry is a mode above it. Nothing here may differ between modes.
- [Chat attachments](../chat-attachments/requirements.md) owns which files are accepted and what happens to a rejected one. How an accepted file appears, in the queue and in the sent message, is this spec's.
- [Agreement workspace](../agreement-workspace/requirements.md) owns the hydration this pane has to land correctly after.
