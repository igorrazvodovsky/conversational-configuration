# Chat attachments — tasks

- [x] `agent/src/attachments.py`: pure block rewriter — image passthrough, text decode into the wrapper, truncation marker, placeholder for undecodable types, filename from metadata / `name=` / fallback
- [x] `agent/src/attachments.py`: `NormalizeAttachments` middleware, registered in `agent/main.py` after `CopilotKitMiddleware` so it sits closest to the model call. Both hooks implemented — the sync one alone raises under the server's `astream`
- [x] `agent/main.py`: the prompt line on attached files (customer's words, no long quoting, feasibility still from tools)
- [x] `agent/tests/test_attachments.py`: the rewriter's cases, including a legacy block with no filename anywhere
- [x] `src/lib/attachments.ts`: `onUpload` carrying the filename in the MIME parameter — on the types the agent rewrites only, never on an image; `accept`, `maxSize`, `onUploadFailed` wired in the workspace page
- [x] The rejection `Alert` below the composer, with wording of our own rather than CopilotKit's MIME list, cleared on the next successful attachment
- [x] Re-type non-image parts in the user-message slot, so a document shows as a file chip instead of a failed image
- [x] Verify by running the app: markdown read and recorded; `.pdf` refused with a visible reason; image still answered as an image; the thread this bug killed reopened and continued
- [x] Reconcile: `docs/specs/README.md` index row; the ui-component-library note that left the attachment queue open

Left alone deliberately: the attachment queue keeps CopilotKit's styling, the one piece of chat chrome with no slot of its own. The [ui-component-library design](../ui-component-library/design.md) now reaches it anyway, through the `chatView` slot, and owns that work. A reopened conversation labels a document chip with its MIME type rather than its filename — the name does not survive the thread round trip (design decision 5).
