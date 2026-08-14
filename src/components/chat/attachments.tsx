"use client";

/**
 * Attachments in the chat pane (docs/specs/ui-component-library design 7).
 *
 * A file shows up twice — queued in the composer, then in the message that
 * carried it — and both are drawn from the same components. The queue has no
 * slot of its own: `CopilotChatView` renders it directly, so the state comes
 * down from the `chatView` wrapper through this context instead.
 */

import { createContext, useContext } from "react";
import { FileIcon, XIcon } from "lucide-react";
import type { Attachment as QueuedAttachment } from "@copilotkit/react-core/v2";

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Spinner } from "@/components/ui/spinner";
import { fileLabel, type MessageAttachment } from "@/lib/attachments";

type ComposerAttachments = {
  attachments: QueuedAttachment[];
  onRemove?: (id: string) => void;
};

const ComposerAttachmentsContext = createContext<ComposerAttachments>({
  attachments: [],
});

export const ComposerAttachmentsProvider = ComposerAttachmentsContext.Provider;

/** The queue inside the composer: what will be sent with the next message. */
export function ComposerAttachments() {
  const { attachments, onRemove } = useContext(ComposerAttachmentsContext);
  if (attachments.length === 0) return null;

  return (
    <AttachmentGroup className="w-full px-2.5 pt-2">
      {attachments.map((attachment) => {
        const uploading = attachment.status === "uploading";
        const name = attachment.filename ?? "Attachment";
        return (
          <Attachment
            key={attachment.id}
            size="sm"
            state={uploading ? "uploading" : "done"}
          >
            <AttachmentMedia
              variant={attachment.thumbnail ? "image" : "icon"}
              aria-hidden
            >
              {uploading ? (
                <Spinner />
              ) : attachment.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={attachment.thumbnail} alt="" />
              ) : (
                <FileIcon />
              )}
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>{name}</AttachmentTitle>
            </AttachmentContent>
            {onRemove && (
              <AttachmentActions>
                <AttachmentAction
                  aria-label={`Remove ${name}`}
                  onClick={() => onRemove(attachment.id)}
                >
                  <XIcon />
                </AttachmentAction>
              </AttachmentActions>
            )}
          </Attachment>
        );
      })}
    </AttachmentGroup>
  );
}

/**
 * The same file, once it is part of a message. A conversation reopened from
 * the store has lost the filename in transit, so the row says what it has —
 * the kind of file — rather than wearing a MIME type as a name.
 */
export function MessageAttachments({
  attachments,
}: {
  attachments: MessageAttachment[];
}) {
  if (attachments.length === 0) return null;

  return (
    <AttachmentGroup className="justify-end">
      {attachments.map((attachment) => (
        <Attachment key={attachment.id} size="sm">
          <AttachmentMedia
            variant={attachment.url ? "image" : "icon"}
            aria-hidden
          >
            {attachment.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={attachment.url} alt="" />
            ) : (
              <FileIcon />
            )}
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>
              {attachment.filename ?? `Attached ${fileLabel(attachment.mimeType)} file`}
            </AttachmentTitle>
            {!attachment.filename && (
              <AttachmentDescription>
                {attachment.mimeType || "unknown type"}
              </AttachmentDescription>
            )}
          </AttachmentContent>
        </Attachment>
      ))}
    </AttachmentGroup>
  );
}
