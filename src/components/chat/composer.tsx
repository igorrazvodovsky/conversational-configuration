"use client";

/**
 * The composer (docs/specs/chat-pane).
 *
 * The leaf slots are plain textarea and button props, so this project's field
 * and button take them unchanged — handlers, Enter-to-send and the stop button
 * all still CopilotKit's. What is ours is the arrangement: one `InputGroup`
 * holding the queued files, the field and the controls, and one prop the send
 * button does not take unchanged, below.
 */

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

/**
 * The placeholder is passed explicitly: CopilotKit's own textarea reads it
 * from the chat labels, and this one is not that textarea.
 */
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
 * The one library prop this composer intercepts (constitution #17).
 *
 * `CopilotChatInput` computes `disabled: isProcessing ? !canStop : !canSend`,
 * and `canSend` is `resolvedValue.trim().length > 0 && !!onSubmitMessage`. The
 * second conjunct is always true here and `onStop` is always wired, so the one
 * state that ever reaches this button is *the field is empty* — the case the
 * rule exists for, and the most-seen disabled control in the app.
 *
 * The attribute is dropped and the click is answered instead. The library's
 * own `send()` is never reached in that state: `onClick` returns before
 * calling through, so nothing submits an empty message. `aria-disabled` would
 * be wrong for the opposite reason to a ruled-out option — that control acts,
 * and this one is genuinely inoperable — but announcing it would put the
 * button back outside the reach of somebody who wants to press it and find
 * out why, which is the whole of the rule.
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
    /*
      The composer stands at the foot of the pane rather than floating over the
      transcript (docs/specs/chat-pane, decision 9), so it needs neither the
      opaque background that kept rows from showing through nor the
      `pointer-events-auto` that opted back out of the overlay it sat in. The
      bottom padding is CopilotKit's reservation for its licence banner.
    */
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
