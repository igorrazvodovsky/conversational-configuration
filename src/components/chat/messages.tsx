"use client";

/**
 * Message rows (docs/specs/chat-pane).
 *
 * Each row is composed through the slot's `children`, which hands back the
 * pieces CopilotKit already rendered — markdown, tool calls, the toolbar — for
 * this project's components to arrange. Nothing about how they render is
 * rebuilt: `markdownRenderer` and `toolCallsView` are placed as they arrive,
 * and `toolCallsView` is what draws the configurator's cards.
 */

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

/**
 * The user's own words, unformatted — they typed text, not markdown.
 *
 * A message dispatched by a card is the customer's turn too, and it carries
 * option codes for the agent to map. `spokenText` takes those out of what is
 * displayed, so the transcript reads in the building's vocabulary rather than
 * the catalogue's; the message the agent receives is unchanged.
 */
function UserText({ content }: { content: string }) {
  return <span className="whitespace-pre-wrap">{spokenText(content)}</span>;
}

function UserMessage(props: ComponentProps<typeof CopilotChatUserMessage>) {
  const attachments = messageAttachments(props.message.content);

  return (
    <CopilotChatUserMessage {...props} messageRenderer={UserText}>
      {({ messageRenderer, toolbar }) => (
        <Message align="end">
          <MessageContent>
            <MessageAttachments attachments={attachments} />
            <Bubble align="end" variant="secondary">
              <BubbleContent>{messageRenderer}</BubbleContent>
            </Bubble>
            <MessageFooter className="opacity-0 transition-opacity group-hover/message:opacity-100">
              {toolbar}
            </MessageFooter>
          </MessageContent>
        </Message>
      )}
    </CopilotChatUserMessage>
  );
}

function AssistantMessage(
  props: ComponentProps<typeof CopilotChatAssistantMessage>,
) {
  return (
    <CopilotChatAssistantMessage {...props}>
      {({ markdownRenderer, toolCallsView, toolbar, toolbarVisible }) => (
        <Message>
          <MessageContent>
            {/*
              The markdown body stays CopilotKit's — prose structure and all —
              at this app's text size rather than prose's own 16px, which next
              to a 12px canvas reads as a different product. Everything prose
              sizes in em follows from the root, so one override is enough; it
              has to be important because both classes are utilities and the
              two stylesheets' order decides the winner otherwise.
            */}
            <div className="cpk:prose cpk:max-w-full cpk:break-words cpk:dark:prose-invert text-xs! leading-relaxed!">
              {markdownRenderer}
            </div>
            {toolCallsView}
            {toolbarVisible && (
              <MessageFooter className="opacity-0 transition-opacity group-hover/message:opacity-100">
                {toolbar}
              </MessageFooter>
            )}
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
