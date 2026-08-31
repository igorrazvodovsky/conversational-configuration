"use client";

// docs/specs/chat-pane/design.md

import { forwardRef, type ComponentProps } from "react";
import { ArrowUpIcon, MicIcon, PaperclipIcon } from "lucide-react";
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
 * The one library prop this composer intercepts
 * (docs/specs/chat-pane/design.md decision 10).
 *
 * `CopilotChatInput` computes `disabled: isProcessing ? !canStop : !canSend`,
 * and the only state that reaches this button is *the field is empty*.
 * `onClick` returns before calling through, so the library's `send()` is never
 * reached. No `aria-disabled` either: announcing it would put the button back
 * out of reach of somebody who wants to press it and find out why.
 */
function ComposerSendButton({
  children,
  disabled,
  onClick,
  ...props
}: ComponentProps<typeof CopilotChatInput.SendButton>) {
  return (
    <Button
      size="icon-xs"
      aria-label="Send"
      onClick={(event) => {
        if (disabled) {
          sayWhy("nothing-to-send", "Nothing to send yet — type a message first.");
          return;
        }
        onClick?.(event);
      }}
      {...props}
    >
      {children ?? <ArrowUpIcon />}
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
