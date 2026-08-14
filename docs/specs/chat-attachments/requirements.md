# Chat attachments

Status: draft — awaiting approval (2026-08-14).

The chat composer offers a paperclip, and the file it takes goes nowhere: every non-image attachment is delivered to the model as an image and the run fails with `invalid_image_format`. Worse, the rejected content persists in the thread, so the conversation stays broken for every message after it. This spec makes an attached file arrive as something the agent can read, and makes every file it cannot read fail in the composer rather than in the run.

This is transport, deliberately: it decides how a file becomes text in the conversation, not what a document *means*. What the agent does with an inbound requirements document — extraction, document provenance, a deviation register — belongs to the [RFQ reconciliation spec](../rfq-reconciliation/requirements.md), which scopes its own ingestion to pasted text. This spec adds the file door to the same room; that spec decides what walks through it.

Serves discovery principle [any door is an entrance](../../discovery/principles/any-door-is-an-entrance.md), whose largest door is a document. A door that throws an error when opened is not an entrance, and the paperclip currently advertises one that is not there.

Scope decision: text-extractable files only — plain text, markdown, csv, json. PDF and Office formats need an extraction dependency and a chunking story that constitution #10 rules out for a prototype, and images already reach the model unchanged. An attachment is conversation, never agreement: nothing about the file is durable and no attachment is stored or re-served ([the canvas remembers; the chat explains](../../discovery/principles/canvas-remembers-chat-explains.md)).

## Stories

- As an operator holding a document that describes my building, I attach it instead of retyping it, and the agent reads it and works from what it says.
- As a user attaching something the agent cannot read, I am told which file and why before I send, and I send my message without it.
- As a user of a conversation that already broke on an attachment, I find it working again: I can send a message and get a reply.
- As a developer, I can tell from the model input which file a piece of text came from, so a document's content is never confused with the customer's own words.

## Acceptance criteria

- GIVEN a text-extractable file within the size cap, WHEN the message is sent, THEN the run completes, and the file's text reaches the model as text, identified by its filename and distinguishable from what the user typed.
- GIVEN a file whose type is not accepted, or one over the size cap, WHEN the user picks, drops or pastes it, THEN it is refused in the composer with a visible message naming the file and the reason, and no run is started with it.
- GIVEN an image attachment, WHEN the message is sent, THEN it reaches the model as an image exactly as it does today — the guard must not cost the one modality that already works.
- GIVEN a message that nonetheless carries media the model would reject — a thread saved before this spec, a type that slipped the composer — WHEN the agent runs, THEN that content is degraded to a text placeholder naming the file and the run completes. No attachment may fail a run.
- GIVEN the conversation that already errored on a markdown attachment, WHEN it is reopened and a message is sent, THEN the run completes.
- GIVEN a file larger than the model should be handed at once, WHEN it is read, THEN its text is truncated at a documented limit and the truncation is visible in what the model receives.
- GIVEN an attached document that states configuration-relevant facts, WHEN the agent acts on them, THEN it records them through the existing tools with the provenance those tools already carry, and feasibility still comes only from a solver result (constitution #1) — a document is a statement of need, never evidence of validity.

## Relationship to other specs

- [RFQ reconciliation](../rfq-reconciliation/requirements.md): owns what an inbound requirements document does. Its ingestion is specified for pasted text; this spec is the file equivalent of that paste, and whether an attached file becomes a supported RFQ entrance — with document provenance and a deviation register — is that spec's decision, not this one's. Until it lands, an attached document reads as ordinary conversation.
- [UI component library](../ui-component-library/requirements.md): resolves its open decision on the attachment queue in the direction of keeping attachments. This spec adds the accept filter, the size cap and the rejection message around it; the queue's own appearance is that spec's, and its chat-pane work replaces CopilotKit's chrome there with shadcn's `Attachment`.
- [Agent tools](../agent-tools/requirements.md): no new tool, no state change. A file arrives as message content and is acted on through the existing tools, so provenance, ripple and staleness behave as they already do.

## Out of scope

PDF, Office and OCR extraction; storing, re-serving or re-attaching a file; showing attachments on the canvas; the agent asking for a file; reading an image as data (dimensions, model numbers) rather than as an image; anything the [RFQ reconciliation spec](../rfq-reconciliation/requirements.md) claims — extraction into commitments, document provenance, the deviation register.
