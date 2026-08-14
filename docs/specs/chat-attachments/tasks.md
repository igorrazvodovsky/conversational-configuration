# Chat attachments — tasks

- [x] `agent/src/attachments.py`: pure block rewriter — image passthrough, text decode into the wrapper, truncation marker, placeholder for undecodable types, filename from metadata / `name=` / fallback
- [x] `agent/src/attachments.py`: `NormalizeAttachments` middleware, registered in `agent/main.py` after `CopilotKitMiddleware` so it sits closest to the model call. Both hooks implemented — the sync one alone raises under the server's `astream`
- [x] `agent/main.py`: the prompt line on attached files (customer's words, no long quoting, feasibility still from tools)
- [x] `agent/tests/test_attachments.py`: the rewriter's cases, including a legacy block with no filename anywhere
- [x] `src/lib/attachments.ts`: `onUpload` carrying the filename in the MIME parameter — on the types the agent rewrites only, never on an image; `accept`, `maxSize`, `onUploadFailed` wired in the workspace page
- [x] The rejection `Alert` below the composer, with wording of our own rather than CopilotKit's MIME list, cleared on the next successful attachment
- [x] Read a part's real type off its MIME string in the user-message slot, so a document shows as a file row instead of a failed image
- [x] Verify by running the app: markdown read and recorded; `.pdf` refused with a visible reason; image still answered as an image; the thread this bug killed reopened and continued
- [x] Reconcile: `docs/specs/README.md` index row; the ui-component-library note that left the attachment queue open

Left to the [ui-component-library spec](../ui-component-library/design.md), which owns the chat pane's appearance: both the composer queue and the file row are drawn there with shadcn's `Attachment`, the queue reached through the `chatView` slot. A row shows the file's kind rather than its name for all but the first moments of its life — the name does not survive the round trip (design decision 5).
