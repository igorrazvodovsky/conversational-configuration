"use client";

/**
 * The chat pane, composed from CopilotChat's slots
 * (docs/specs/chat-pane). Nothing here patches the
 * package or reaches into its markup with CSS: every replacement goes in
 * through a prop the library already exposes, and the behaviour it owns —
 * streaming, markdown, transcription, interrupts, tool-call rendering —
 * passes through untouched.
 *
 * What the pane does *not* take from the library is its layout. The vertical
 * stack is assembled here, from the elements `CopilotChatView` hands back
 * (decision 9): transcript, suggestion strip, composer, each in the same
 * column and each taking the space it occupies.
 */

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

/**
 * What a dragged file lands on. CopilotKit draws its own overlay from the same
 * `dragOver` flag, but only inside the layout this pane replaces, so the flag
 * is read here and the drop target is this pane's whole box.
 */
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
 * The pane's own layout, in place of the library's.
 *
 * `CopilotChatView`'s `children` hands back the bound elements and renders
 * nothing itself, so the stack below is this project's: a transcript that
 * takes the space left over, then the strip, then the composer, all three in
 * `CHAT_COLUMN`. What that replaces is a scroll area with the composer
 * *absolutely positioned* over its foot, cleared by a measured padding, and
 * the suggestion strip inside the scrolled content — which put the strip in a
 * different column from the messages and, once it wrapped to three lines, part
 * of it behind the composer.
 *
 * Two things the library does inside that layout have to be picked up here.
 * The drag handlers and the drop overlay live on its root element, which the
 * `children` path does not render, so they are taken over rather than left to
 * fire twice: the view is handed no handlers, and the pane holds them. And the
 * queue of files waiting to be sent is the one piece of chat chrome with no
 * slot — the view renders it directly — so the view is passed an empty list
 * and the same state goes to the composer, which is where the strip belongs.
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
 * The strip the pills sit in, in the pane's column like everything else.
 *
 * The `className` the library injects here is discarded rather than merged.
 * It is `cpk:mb-3 cpk:lg:ml-4 cpk:lg:mr-4 cpk:ml-0 cpk:mr-0`, written for the
 * strip's old place inside the scrolled content, and merging it would put the
 * chips 16px right of the messages and 32px short of them on the other side —
 * the misalignment decision 9 removes. Discarding a slot's injected class is
 * safe only because this container is the whole of what the strip is: the
 * library's own sets `pointer-events-none` for an overlay this layout no
 * longer has, and its pill re-enabled them.
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

/** A suggestion is a chip, the same chip the canvas offers. */
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

/* The suggestion slot is passed through rather than dropped: an empty workspace
   is where the entry prompts are the whole point (docs/specs/suggested-moves),
   and above the composer is the only place pills may appear. The library's own
   welcome screen puts them below the input; here they sit where they sit in
   every other state, so the strip does not move when the first message lands. */
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
          {/* The size is a class, not lucide's `size` prop: the icon variant
              sets `size-4` on any svg without a `size-*` class of its own, and
              a utility beats the width/height attributes the prop renders. The
              muted box is `size-8` for the same reason, so both are set here —
              the glyph at 64px inside a box that leaves it 16px of margin. */}
          <EmptyMedia variant="icon" className="size-24">
            <Building2Icon className="size-16 text-muted-foreground" />
          </EmptyMedia>
          <EmptyTitle>Say what the building needs</EmptyTitle>
          {/* Reading matter, so 14px rather than the primitive's 12
              (constitution #16 — the same correction decision 5 records for
              the transcript's prose). */}
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
  // CopilotKit validates every route into the composer — picker, drop, paste —
  // and reports rejections through onUploadFailed, but renders nothing for
  // them (docs/specs/chat-attachments). The message is ours to show.
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
