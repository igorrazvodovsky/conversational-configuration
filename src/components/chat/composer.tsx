"use client";

// docs/specs/chat-pane/design.md

import { forwardRef, type ComponentProps } from "react";
import { ArrowUpIcon, MicIcon, PaperclipIcon, XIcon } from "lucide-react";
import { CopilotChatInput } from "@copilotkit/react-core/v2";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { sayWhy } from "@/lib/say-why";
import { ComposerAttachments } from "./attachments";
import { CHAT_COLUMN } from "./column";

/** Passed explicitly: CopilotKit's own textarea reads it from the chat labels,
 * and this one is not that textarea. */
const ComposerTextArea = forwardRef<
  HTMLTextAreaElement,
  ComponentProps<typeof CopilotChatInput.TextArea>
>(function ComposerTextArea({ className, ...props }, ref) {
  return (
    <InputGroupTextarea
      ref={ref}
      rows={1}
      placeholder="Describe the building, or ask a question"
      className={cn("max-h-40 min-h-0 leading-relaxed", className)}
      {...props}
    />
  );
});

/**
 * The two library props this composer intercepts
 * (docs/specs/chat-pane/design.md decision 10).
 *
 * `CopilotChatInput` computes `disabled: isProcessing ? !canStop : !canSend`,
 * and the only state that reaches this button is *the field is empty*.
 * `onClick` returns before calling through, so the library's `send()` is never
 * reached. No `aria-disabled` either: announcing it would put the button back
 * out of reach of somebody who wants to press it and find out why.
 *
 * `children` is the run in flight: the library fills the slot with its own stop
 * icon while the agent is answering and leaves it empty otherwise. The icon it
 * sends carries `cpk:size-[18px]`, which this button's
 * `[&_svg:not([class*='size-'])]` rule cannot reach, so it drew at 18px in a
 * 24px button and left a 3px rim. The slot is read as the state it stands for
 * and redrawn — icon and label together, because a control that stops a run
 * may not announce itself as send. The square the convention would use is the
 * button's own silhouette at this size, so the run is called off with an X.
 */
function ComposerSendButton({
  children,
  disabled,
  onClick,
  ...props
}: ComponentProps<typeof CopilotChatInput.SendButton>) {
  const stops = children != null;
  return (
    <Button
      size="icon-xs"
      aria-label={stops ? "Stop" : "Send"}
      onClick={(event) => {
        if (disabled) {
          sayWhy("nothing-to-send", "Nothing to send yet — type a message first.");
          return;
        }
        onClick?.(event);
      }}
      {...props}
    >
      {stops ? <XIcon /> : <ArrowUpIcon />}
    </Button>
  );
}

function ComposerAddButton({
  onAddFile,
  toolsMenu: _toolsMenu,
  ...props
}: ComponentProps<typeof CopilotChatInput.AddMenuButton>) {
  return (
    <Button
      variant="ghost"
      size="icon-xs"
      aria-label="Attach a file"
      onClick={() => onAddFile?.()}
      {...props}
    >
      <PaperclipIcon />
    </Button>
  );
}

function ComposerTranscribeButton(
  props: ComponentProps<typeof CopilotChatInput.StartTranscribeButton>,
) {
  return (
    <Button variant="ghost" size="icon-xs" aria-label="Dictate" {...props}>
      <MicIcon />
    </Button>
  );
}

export const configuratorInput = {
  textArea: ComposerTextArea,
  sendButton: ComposerSendButton,
  addMenuButton: ComposerAddButton,
  startTranscribeButton: ComposerTranscribeButton,
  disclaimer: () => null,
  children: ({
    textArea,
    sendButton,
    addMenuButton,
    audioRecorder,
    startTranscribeButton,
    cancelTranscribeButton,
    finishTranscribeButton,
    mode,
    onStartTranscribe,
    onCancelTranscribe,
    onFinishTranscribe,
  }: Parameters<
    NonNullable<ComponentProps<typeof CopilotChatInput>["children"]>
  >[0]) => (
    /* The bottom padding is CopilotKit's reservation for its licence banner. */
    <div
      className={cn(CHAT_COLUMN, "pt-2")}
      style={{ paddingBottom: "var(--copilotkit-license-banner-offset, 1rem)" }}
    >
      {/*
        Clicking the chrome around the field focuses it, which CopilotKit does
        in the layout this replaces. `InputGroupAddon` has the same idea but
        looks for an `input`, and this composer's control is a textarea.
      */}
      <InputGroup
        className="h-auto flex-col items-stretch bg-background"
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target.closest("button, textarea")) return;
          event.currentTarget.querySelector("textarea")?.focus();
        }}
      >
        <ComposerAttachments />
        {mode === "transcribe" ? (
          audioRecorder
        ) : mode === "processing" ? (
          <div className="flex items-center justify-center py-3">
            <Spinner />
          </div>
        ) : (
          textArea
        )}
        <InputGroupAddon align="block-end" className="gap-1">
          {addMenuButton}
          <div className="ml-auto flex items-center gap-1">
            {mode === "transcribe" ? (
              <>
                {onCancelTranscribe && cancelTranscribeButton}
                {onFinishTranscribe && finishTranscribeButton}
              </>
            ) : (
              <>
                {onStartTranscribe && startTranscribeButton}
                {sendButton}
              </>
            )}
          </div>
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
};
