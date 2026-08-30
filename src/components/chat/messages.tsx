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

/**
 * The toolbar stands under its message, in the row's own flow, which is what
 * `MessageFooter` is for (docs/specs/chat-pane, decision 7).
 *
 * It was an overlay until 2026-08-30, hung at `top-full` and revealed on hover,
 * so that it cost no height. What that bought in space it lost in placement: a
 * button floating in the gap belongs to neither of the rows it sits between,
 * and on a message whose last element is a tool-call line it read as splitting
 * that line off from the next one. In flow it is always visible, and the space
 * it takes is space something occupies.
 *
 * Copy is the only button bound on either row. It comes down to 24px through
 * the slot it has, which is this app's size for a control in the chrome; the
 * class is important because the library's own size is a `cpk:`-prefixed
 * utility of equal weight and stylesheet order would otherwise decide.
 */
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
  // zero height and still take a `gap-2` above the card, so it is left out.
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

              14px, not the 12px this originally set. It was aiming to match
              "a 12px canvas" and the canvas's reading matter — its clauses,
              recitals and schedule rows — is and was `text-sm`. 12px is this
              app's size for chrome (constitution #16).
            */}
            {spoke && (
              <div className="cpk:prose cpk:max-w-full cpk:break-words cpk:dark:prose-invert text-sm! leading-relaxed!">
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
