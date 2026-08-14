"use client";

/**
 * The transcript (docs/specs/ui-component-library design 7).
 *
 * CopilotKit renders the rows; the scroller owns where they sit. Every direct
 * child of the content is wrapped in an item, and the user's turns are the
 * anchors — sending a message pins that turn near the top and lets the reply
 * stream below it, rather than dragging the transcript down on every token.
 */

import type { ComponentProps, ReactElement } from "react";
import {
  CopilotChatMessageView,
  type CopilotChatMessageViewProps,
} from "@copilotkit/react-core/v2";

import {
  MessageScrollerContent,
  MessageScrollerItem,
} from "@/components/ui/message-scroller";
import { CANVAS_EDIT_PREFIX } from "@/lib/configurator";

type ChatMessage = NonNullable<
  ComponentProps<typeof CopilotChatMessageView>["messages"]
>[number];

/**
 * A message can render more than one element — wrappers for custom renderers,
 * an intelligence indicator — so the two lists are not positionally aligned
 * and cannot be zipped by index. The element key is what identifies a row;
 * these are the suffixes CopilotKit appends to a message id.
 */
function messageIdOf(element: ReactElement): string | null {
  const key = element.key;
  if (typeof key !== "string" || key.startsWith("intelligence-")) return null;
  return key.replace(/-custom-(before|after)$/, "");
}

type Row = { id: string; elements: ReactElement[]; rendered: boolean };

/**
 * One row per message, not per element. The wrappers render nothing unless a
 * custom message renderer is registered, and a tool result has no row of its
 * own at all — left as separate items they would each take a place in the
 * transcript and open a gap around nothing.
 */
function rows(messageElements: ReactElement[]): Row[] {
  const ordered: Row[] = [];
  const byId = new Map<string, Row>();
  let current: Row | undefined;

  for (const element of messageElements) {
    const id = messageIdOf(element);
    if (id === null) {
      // An intelligence indicator trails the message it belongs to.
      current?.elements.push(element);
      continue;
    }
    let row = byId.get(id);
    if (!row) {
      row = { id, elements: [], rendered: false };
      byId.set(id, row);
      ordered.push(row);
    }
    row.elements.push(element);
    if (element.key === id) row.rendered = true;
    current = row;
  }

  return ordered.filter((row) => row.rendered);
}

/**
 * Canvas edits round-trip through the conversation but are not part of it
 * (docs/specs/configuration-canvas design): the sheet is the record of the
 * edit, so the chat renders neither the structured message that carries it nor
 * the agent's wordless bookkeeping in reply. An assistant message that does
 * carry text (a forced cascade, a conflict) still shows — the chat keeps the
 * explanation and drops the paperwork. Content-based, so a reopened
 * conversation hides the same rows.
 *
 * A turn that produced nothing at all is dropped too: it would otherwise take
 * a row of its own and open a gap around nothing.
 */
function hiddenMessageIds(messages: ChatMessage[]): Set<string> {
  const hidden = new Set<string>();
  messages.forEach((message, index) => {
    if (message.role === "user") {
      const { content } = message;
      if (typeof content === "string" && content.startsWith(CANVAS_EDIT_PREFIX)) {
        hidden.add(message.id);
      }
      return;
    }
    if (message.role !== "assistant") return;
    const { content } = message;
    if (typeof content === "string" && content.trim().length > 0) return;
    // A turn that ended with neither words nor tool calls has nothing to show.
    const toolCalls = "toolCalls" in message ? message.toolCalls : undefined;
    if (!toolCalls || toolCalls.length === 0) {
      hidden.add(message.id);
      return;
    }
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].role !== "user") continue;
      if (hidden.has(messages[i].id)) hidden.add(message.id);
      break;
    }
  });
  return hidden;
}

export const configuratorMessageView: CopilotChatMessageViewProps["children"] = ({
  messageElements,
  messages,
  interruptElement,
}) => {
  const hidden = hiddenMessageIds(messages);
  const userTurns = new Set(
    messages.filter((message) => message.role === "user").map((m) => m.id),
  );

  return (
    <MessageScrollerContent className="py-6">
      {rows(messageElements).map((row) =>
        hidden.has(row.id) ? null : (
          <MessageScrollerItem
            key={row.id}
            messageId={row.id}
            scrollAnchor={userTurns.has(row.id)}
          >
            {row.elements}
          </MessageScrollerItem>
        ),
      )}
      {interruptElement && (
        <MessageScrollerItem messageId="interrupt">
          {interruptElement}
        </MessageScrollerItem>
      )}
    </MessageScrollerContent>
  );
};
