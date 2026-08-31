"use client";

// docs/specs/chat-pane/design.md

import {
  forwardRef,
  useMemo,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { Building2Icon, UploadIcon, XIcon } from "lucide-react";
import {
  CopilotChat,
  CopilotChatSuggestionPill,
  CopilotChatView,
} from "@copilotkit/react-core/v2";

import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_MAX_SIZE,
  describeUploadFailure,
  uploadWithFilename,
} from "@/lib/attachments";
import { ComposerAttachmentsProvider } from "./attachments";
import { CHAT_COLUMN } from "./column";
import { configuratorInput } from "./composer";
import { configuratorMessageView } from "./message-view";
import {
  ConfiguratorAssistantMessage,
  ConfiguratorReasoningMessage,
  ConfiguratorUserMessage,
} from "./messages";
import { ConfiguratorScrollView } from "./scroll-view";

/** CopilotKit draws its own overlay from the same `dragOver` flag, but only
 * inside the layout this pane replaces. */
function DropTarget() {
  return (
    <div className="pointer-events-none absolute inset-2 z-50 flex items-center justify-center border-2 border-dashed border-primary bg-background/90">
      <span className="flex items-center gap-2 text-sm">
        <UploadIcon className="size-4" />
        Drop a file to attach it
      </span>
    </div>
  );
}

/**
 * The pane's own layout, in place of the library's
 * (docs/specs/chat-pane/design.md decision 9).
 *
 * Two things the library does inside its own layout have to be picked up here.
 * Its drag handlers and drop overlay live on the root element the `children`
 * path never renders, so the view is handed none and the pane holds them. And
 * the queue of files waiting to be sent has no slot, so the view is passed an
 * empty list and the same state goes to the composer.
 */
function ChatView({
  attachments,
  onRemoveAttachment,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  ...props
}: ComponentProps<typeof CopilotChatView>) {
  const queued = useMemo(
    () => ({ attachments: attachments ?? [], onRemove: onRemoveAttachment }),
    [attachments, onRemoveAttachment],
  );

  return (
    <ComposerAttachmentsProvider value={queued}>
      <div
        className="relative flex h-full min-h-0 flex-col"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <CopilotChatView
          {...props}
          attachments={[]}
          onRemoveAttachment={onRemoveAttachment}
        >
          {({ messageView, input, suggestionView }) => (
            <>
              <ConfiguratorScrollView>{messageView}</ConfiguratorScrollView>
              {suggestionView}
              {input}
            </>
          )}
        </CopilotChatView>
        {dragOver && <DropTarget />}
      </div>
    </ComposerAttachmentsProvider>
  );
}

/* The slot type is the component with its statics, so the wrapper carries them. */
const ConfiguratorChatView = Object.assign(ChatView, CopilotChatView);

/**
 * The `className` the library injects is discarded rather than merged: it is
 * written for the strip's old place inside the scrolled content. Safe only
 * because this container is the whole of what the strip is.
 */
const SuggestionStrip = forwardRef<
  HTMLDivElement,
  ComponentProps<"div"> & { className?: string }
>(function SuggestionStrip({ className: _libraryLayout, ...props }, ref) {
  return (
    <div
      ref={ref}
      data-slot="suggestion-strip"
      className={cn(CHAT_COLUMN, "flex flex-wrap items-center gap-2 pb-2")}
      {...props}
    />
  );
});

const SuggestionPill = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof CopilotChatSuggestionPill>
>(function SuggestionPill(
  { icon, isLoading, children, className, ...props },
  ref,
) {
  return (
    <Button ref={ref} variant="outline" size="xs" className={className} {...props}>
      {isLoading ? <Spinner /> : icon}
      {children}
    </Button>
  );
});

function WelcomeScreen({
  input,
  suggestionView,
}: {
  input: ReactElement;
  suggestionView?: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-24">
            <Building2Icon className="size-16 text-muted-foreground" />
          </EmptyMedia>
          <EmptyTitle>Say what the building needs</EmptyTitle>
          <EmptyDescription className="text-sm">
            Describe the elevator and what it has to carry.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
      {suggestionView}
      {input}
    </div>
  );
}

export function ConfiguratorChat() {
  // CopilotKit reports rejections through onUploadFailed but renders nothing
  // for them.
  const [rejectedFile, setRejectedFile] = useState<string | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1">
        <CopilotChat
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
          input={configuratorInput}
          suggestionView={{
            container: SuggestionStrip,
            suggestion: SuggestionPill,
          }}
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
