"use client";

// docs/specs/chat-pane/design.md

import type { ComponentProps } from "react";
import {
  CopilotChatAssistantMessage,
  CopilotChatReasoningMessage,
  CopilotChatUserMessage,
} from "@copilotkit/react-core/v2";

import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  Message,
  MessageContent,
  MessageFooter,
} from "@/components/ui/message";
import { messageAttachments } from "@/lib/attachments";
import { spokenText } from "@/lib/configurator";
import { MessageAttachments } from "./attachments";

/** A message dispatched by a card carries option codes for the agent to map;
 * `spokenText` takes them out of what is displayed, so the transcript reads in
 * the customer's own words. */
function UserText({ content }: { content: string }) {
  return <span className="whitespace-pre-wrap">{spokenText(content)}</span>;
}

/** Important because the library's own size is a `cpk:`-prefixed utility of
 * equal weight, and stylesheet order would otherwise decide. */
const TOOLBAR_BUTTON = "size-6!";

function UserMessage(props: ComponentProps<typeof CopilotChatUserMessage>) {
  const attachments = messageAttachments(props.message.content);

  return (
    <CopilotChatUserMessage
      {...props}
      messageRenderer={UserText}
      copyButton={TOOLBAR_BUTTON}
      /*
        The user row's toolbar arrives `cpk:invisible cpk:group-hover:visible`,
        and the group it waits on is a plain `group`, which this composition
        has nowhere: shadcn's `Message` names its group `group/message`, so the
        hover never matched and the toolbar was permanently invisible while
        keeping its box. In flow that is 28px of nothing under every bubble,
        which decision 7 forbids. The string slot value merges as a class, and
        `!` beats the library's own utility.
      */
      toolbar="visible!"
    >
      {({ messageRenderer, toolbar }) => (
        <Message align="end">
          <MessageContent>
            <MessageAttachments attachments={attachments} />
            <Bubble align="end" variant="secondary">
              <BubbleContent>{messageRenderer}</BubbleContent>
            </Bubble>
            <MessageFooter>{toolbar}</MessageFooter>
          </MessageContent>
        </Message>
      )}
    </CopilotChatUserMessage>
  );
}

function AssistantMessage(
  props: ComponentProps<typeof CopilotChatAssistantMessage>,
) {
  const { content } = props.message;
  // A turn that only calls a tool has no prose. The wrapper would render at
  // zero height and still take a `gap-2` above the card.
  const spoke = typeof content === "string" && content.trim().length > 0;

  return (
    <CopilotChatAssistantMessage {...props} copyButton={TOOLBAR_BUTTON}>
      {({ markdownRenderer, toolCallsView, toolbar, toolbarVisible }) => (
        <Message>
          <MessageContent>
            {/*
              The markdown body stays CopilotKit's — prose structure and all —
              at this app's reading size rather than prose's own 16px, which
              next to the agreement reads as a different product. Everything
              prose sizes in em follows from the root, so one override is
              enough; it has to be important because both classes are utilities
              and the two stylesheets' order decides the winner otherwise.

              14px, not 12px: this is reading matter, and 12px is the size
              for chrome (constitution #16).

              The two `:first-child`/`:last-child` rules restore prose's own
              outer-margin reset one level down. Prose zeroes the leading and
              trailing margin of its direct children, and its direct child is
              Streamdown's container, not the paragraph inside it; Streamdown
              declares the same reset itself, in utilities this app's Tailwind
              never generates because it does not scan `node_modules`. So a
              message with no background carried 17.5px of margin above its
              first block and below its last, on top of the row's own `gap-2`.
              Between blocks the margins stay and still collapse.
            */}
            {spoke && (
              <div className="cpk:prose cpk:max-w-full cpk:break-words cpk:dark:prose-invert text-sm! leading-relaxed! [&>*>:first-child]:mt-0 [&>*>:last-child]:mb-0">
                {markdownRenderer}
              </div>
            )}
            {toolCallsView}
            {toolbarVisible && <MessageFooter>{toolbar}</MessageFooter>}
          </MessageContent>
        </Message>
      )}
    </CopilotChatAssistantMessage>
  );
}

function ReasoningMessage(
  props: ComponentProps<typeof CopilotChatReasoningMessage>,
) {
  return (
    <CopilotChatReasoningMessage {...props}>
      {({ header, toggle }) => (
        <Message>
          <MessageContent className="gap-1 text-muted-foreground">
            {header}
            {toggle}
          </MessageContent>
        </Message>
      )}
    </CopilotChatReasoningMessage>
  );
}

/*
  A slot's type is the whole component, subcomponent statics included
  (Container, MessageRenderer, …), so each wrapper carries them along.
*/
export const ConfiguratorUserMessage = Object.assign(
  UserMessage,
  CopilotChatUserMessage,
);
export const ConfiguratorAssistantMessage = Object.assign(
  AssistantMessage,
  CopilotChatAssistantMessage,
);
export const ConfiguratorReasoningMessage = Object.assign(
  ReasoningMessage,
  CopilotChatReasoningMessage,
);
