"use client";

/**
 * The chat pane, composed from CopilotChat's slots
 * (docs/specs/ui-component-library design 7). Nothing here patches the
 * package or reaches into its markup with CSS: every replacement goes in
 * through a prop the library already exposes, and the behaviour it owns —
 * streaming, markdown, transcription, interrupts, tool-call rendering —
 * passes through untouched.
 */

import { forwardRef, useMemo, useState, type ComponentProps } from "react";
import { XIcon } from "lucide-react";
import {
  CopilotChat,
  CopilotChatSuggestionPill,
  CopilotChatView,
} from "@copilotkit/react-core/v2";

import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_SIZE,
  describeUploadFailure,
  uploadWithFilename,
} from "@/lib/attachments";
import { ComposerAttachmentsProvider } from "./attachments";
import { configuratorInput } from "./composer";
import { configuratorMessageView } from "./message-view";
import {
  ConfiguratorAssistantMessage,
  ConfiguratorReasoningMessage,
  ConfiguratorUserMessage,
} from "./messages";
import { ConfiguratorScrollView } from "./scroll-view";

/**
 * The queue of files waiting to be sent is the one piece of chat chrome with
 * no slot — the view renders it directly. It is still reachable without owning
 * the layout: this wrapper is handed the queue's state, passes the view an
 * empty list so it draws no queue of its own, and hands the same state to the
 * composer, which is where the strip belongs.
 */
function ChatView({
  attachments,
  onRemoveAttachment,
  ...props
}: ComponentProps<typeof CopilotChatView>) {
  const queued = useMemo(
    () => ({ attachments: attachments ?? [], onRemove: onRemoveAttachment }),
    [attachments, onRemoveAttachment],
  );

  return (
    <ComposerAttachmentsProvider value={queued}>
      <CopilotChatView
        {...props}
        attachments={[]}
        onRemoveAttachment={onRemoveAttachment}
      />
    </ComposerAttachmentsProvider>
  );
}

/* The slot type is the component with its statics, so the wrapper carries them. */
const ConfiguratorChatView = Object.assign(ChatView, CopilotChatView);

/** A suggestion is a chip, the same chip the canvas offers. */
const SuggestionPill = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof CopilotChatSuggestionPill>
>(function SuggestionPill({ icon, isLoading, children, ...props }, ref) {
  return (
    <Button ref={ref} variant="outline" size="xs" {...props}>
      {isLoading ? <Spinner /> : icon}
      {children}
    </Button>
  );
});

function WelcomeScreen({ input }: { input: React.ReactElement }) {
  return (
    <div className="flex h-full flex-col">
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyDescription>
            Describe the building and what it has to carry.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
      {input}
    </div>
  );
}

export function ConfiguratorChat() {
  // CopilotKit validates every route into the composer — picker, drop, paste —
  // and reports rejections through onUploadFailed, but renders nothing for
  // them (docs/specs/chat-attachments). The message is ours to show.
  const [rejectedFile, setRejectedFile] = useState<string | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <CopilotChat
          autoScroll={false}
          attachments={{
            enabled: true,
            accept: ATTACHMENT_ACCEPT,
            maxSize: ATTACHMENT_MAX_SIZE,
            onUpload: async (file) => {
              setRejectedFile(null);
              return uploadWithFilename(file);
            },
            onUploadFailed: (failure) =>
              setRejectedFile(describeUploadFailure(failure)),
          }}
          chatView={ConfiguratorChatView}
          scrollView={ConfiguratorScrollView}
          input={configuratorInput}
          suggestionView={{ suggestion: SuggestionPill }}
          welcomeScreen={WelcomeScreen}
          messageView={{
            children: configuratorMessageView,
            userMessage: ConfiguratorUserMessage,
            assistantMessage: ConfiguratorAssistantMessage,
            reasoningMessage: ConfiguratorReasoningMessage,
            cursor: () => <Spinner className="size-3 text-muted-foreground" />,
          }}
        />
      </div>
      {rejectedFile && (
        <Alert variant="destructive">
          <AlertDescription>{rejectedFile}</AlertDescription>
          <AlertAction>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Dismiss"
              onClick={() => setRejectedFile(null)}
            >
              <XIcon />
            </Button>
          </AlertAction>
        </Alert>
      )}
    </div>
  );
}
