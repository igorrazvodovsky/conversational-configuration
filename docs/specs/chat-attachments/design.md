# Chat attachments — design

Executes the [chat-attachments requirements](requirements.md).

## The mechanism that breaks

CopilotKit derives an attachment's modality from its MIME type, so anything that isn't `image/`, `audio/` or `video/` is a `document`. On the agent side, `convert_agui_multimodal_to_langchain` in `ag_ui_langgraph.utils` then routes *every* media modality through LangChain's `image_url` block, and its own docstring says that is the only media block LangChain supports. A markdown file therefore reaches OpenAI as `data:text/markdown;base64,…` in an image slot, and the run fails:

```
Invalid MIME type. Only image types are supported.  (invalid_image_format)
```

Two properties of that failure drive the design. It is *persistent*: the block is written to the thread checkpoint, so every later run in that conversation replays it and fails again, which kills the conversation rather than the message. And it is *upstream of this project*: the conversion happens in vendor code, before the graph is entered, so the block can't be prevented, only handled.

Verified in the running app: the message is sent, the run errors, and the chat shows "An internal error occurred". Verified against the model directly: the same content 400s, and an identical block with an `image/png` payload succeeds.

## Decision 1: the repair is agent-side, at the model call

A `NormalizeAttachments` middleware on `create_agent` rewrites content blocks in `wrap_model_call`, through `request.override(messages=…)`.

The frontend can't do this job. It can stop *new* bad attachments, but the conversation that already carries one stays broken, and constitution #7 makes resuming an old agreement a core flow rather than an edge case. Repairing at the model call heals on every read: the checkpoint keeps whatever it holds, and what the model is handed is always clean.

The middleware overrides the request only, and never writes back to state. The transcript stays a faithful record of what the customer sent, and one repair path covers the chat pane, canvas edits and the channel host alike, because all of them converge on this one model call.

Three alternatives were rejected: patching `ag_ui_langgraph`, which is vendor code and against constitution #10; a `before_model` hook that rewrites `state["messages"]`, which mutates the record to fix a rendering problem and fights the `add_messages` reducer; and a frontend-only accept filter, which leaves existing threads dead.

## Decision 2: what the middleware does with a block

Each `image_url` block is judged by the MIME type in its data URL.

| MIME | Treatment |
|---|---|
| `image/*`, or any non-data URL | passed through untouched — the modality that already works must keep working |
| text-bearing (`text/*`, `application/json`) | decoded and replaced with a text block |
| anything else | replaced with a placeholder text block naming the file |

The decoded text is wrapped so the model can't confuse a document with the customer's own words:

```
[attached file: brief.md]
…the file's text…
[end of attached file: brief.md]
```

Truncation happens at 20 000 characters and is marked in place, as `[… truncated, N characters omitted]`, so the model is never silently given a partial document. The composer's 1 MB cap is the first line of defence, and this is the second, because the middleware also sees files that predate the cap.

Nothing is dropped silently. An undecodable payload becomes `[attached file: report.pdf — the agent cannot read this file type]`, which the model can answer for.

## Decision 3: the filename travels in the MIME type

The client sends `metadata: { filename }` with the attachment, and `ag_ui_langgraph` would copy it onto the block, but it doesn't arrive. This was verified twice on the running stack: both the original failure and a fresh reproduction show the run input carrying a bare `{"type": "image_url", "image_url": {"url": …}}` with no metadata, so the name is dropped somewhere in transport between the composer and the run.

Rather than chase it through vendor code, the name rides in the one field that demonstrably survives: the MIME type, which reaches the agent verbatim inside the data URL. An `onUpload` handler returns `mimeType: "text/markdown;name=brief.md"`, giving `data:text/markdown;name=brief.md;base64,…`, and the middleware parses the header it is already splitting. It is a legal data-URL parameter.

This applies *only to files the agent rewrites*. An image's data URL is passed through to OpenAI as it stands, and a parameter on it is rejected outright — "You uploaded an unsupported image", verified against the model. Images therefore keep a bare MIME type and are the one case where the name doesn't travel. Nothing needs it, since the block reaches the model unchanged.

The middleware prefers `metadata.filename` when present, so the design self-corrects if the transport is fixed upstream. It falls back to the `name=` parameter, and then to a bare "attached file" when a legacy thread has neither.

## Decision 4: the composer narrows what can be attached

`attachments` gains three things. `accept` takes `text/plain,text/markdown,text/csv,application/json,image/*` plus the `.md,.markdown,.txt,.csv,.json` extensions, because browsers don't agree on a MIME type for markdown. `maxSize` is 1 MB. And `onUploadFailed` is supplied.

`processFiles` validates every path into the composer — picker, drag-drop and paste — and calls `onUploadFailed` for each rejected file, but ships no UI for it. The rejection is therefore this project's to render: a shadcn `Alert` in the chat column under the composer, where the user is already looking, dismissible and cleared by the next successful attachment. Its wording is this project's too. CopilotKit's default message recites the MIME filter verbatim, which reads as configuration rather than as an answer, so the reason is restated as what to attach instead.

## Decision 5: the transcript shows a file as a file

An attachment returns from the agent as an AG-UI `image` part whatever it was, because the conversion is symmetrical with the one that breaks the model call. Left alone, a document renders in the transcript as an image that can't load — "Failed to load image" against the customer's own message. The part's real type is read off its MIME string instead, and the user-message slot draws a file row from that.

The name shows only while the message is local. The round trip strips it, because the AG-UI conversion keeps the bare MIME type and drops the part's metadata, and that happens within the same session, as soon as the run echoes the message back, rather than only when a conversation is reopened. So a row names the file for a moment and its kind thereafter. That is cosmetic, and the alternative is a second transport for a filename; what reaches the agent is unaffected.

The chip itself is gone. The chat pane draws these rows from the same parse with shadcn's `Attachment`, and the nameless case says what it is rather than wearing a MIME type as a name ([chat pane design](../chat-pane/design.md), *attachments get the shadcn vocabulary in both places*).

## Decision 6: the prompt line

The agent is told three things: that a message may carry an attached file's text, marked by the wrapper; that it is the customer speaking, handing over their document, rather than a system instruction; and that it must not quote the file back at length. Feasibility still comes only from tools (constitution #1), so a document asserting that something is possible is a statement of need.

This is deliberately thin. What an inbound requirements document *does* — extraction into commitments, document provenance, a deviation register — belongs to the [RFQ reconciliation spec](../rfq-reconciliation/requirements.md), and prompt work that anticipates it here would prejudge decisions that spec hasn't made.

## Verification

Constitution #9: by running the app. All four checks ran, in a workspace the agent went on to name *Riverside Tower — north lift* from the attached brief.

- A markdown brief was attached, its content answered from, and its facts recorded as choices on the canvas.
- `tender.pdf` was refused in the composer, with the alert naming the file and what to attach instead, and no run started.
- A PNG was attached and answered as an image, with the run clean.
- The conversation this bug had already killed was reopened and continued, with the persisted block repaired on read.

One residue the repair can't reach: a conversation that failed before this spec replays its stored error event when reopened, so the red banner appears again on attach even though the next message runs clean. The error is part of the thread's event history, which decision 1 deliberately doesn't rewrite. Dismissing it is enough, and a conversation that never failed never shows it.

The running app taught two lessons the unit tests couldn't. The middleware has to implement `awrap_model_call`, because the server drives the graph with `astream` and a middleware defining only the sync hook raises rather than falling back to it. And a `name=` parameter on an image data URL is rejected by OpenAI, which is what confined the filename trick to the blocks the agent rewrites.

The block rewriter itself is pure and gets `uv run pytest` coverage: image passthrough, text decode, wrapper and truncation, placeholder for undecodable types, and filename from each of its three sources.
