"use client";

/**
 * The transcript (docs/specs/chat-pane).
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
import { cn } from "@/lib/utils";
import { CHAT_COLUMN } from "./column";
import { CARD_TOOLS } from "@/components/generative-ui/card-shell";
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
 * (docs/specs/agreement-document design): the sheet is the record of the
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

/**
 * A turn that only calls a tool has no words of its own: it is the agent doing
 * bookkeeping, and a run of them is one stretch of work rather than several
 * turns. `gap-6` is the distance between turns (docs/specs/chat-pane decision
 * 8), so inside such a run it is taken back out and the rows stand at their
 * own margins instead.
 *
 * A card is left out of it. The message looks the same from here — no text,
 * one tool call — so the tool's name is what tells them apart, and `CARD_TOOLS`
 * is that list; a card is a box with an edge of its own, and pulling one under
 * a status line reads as a collision rather than as a group.
 */
function toolRowMessageIds(messages: ChatMessage[]): Set<string> {
  const rowIds = new Set<string>();
  for (const message of messages) {
    if (message.role !== "assistant") continue;
    const { content } = message;
    if (typeof content === "string" && content.trim().length > 0) continue;
    const toolCalls = "toolCalls" in message ? message.toolCalls : undefined;
    if (!toolCalls || toolCalls.length === 0) continue;
    if (toolCalls.some((call) => CARD_TOOLS.has(call.function.name))) continue;
    rowIds.add(message.id);
  }
  return rowIds;
}

/**
 * The item's own `content-visibility: auto` also applies paint containment,
 * which clips anything drawn outside its box. A card's edge is a `ring-1`,
 * drawn outside the box on a card as wide as the row, so every card in the
 * transcript was reading as a pair of horizontal rules (docs/specs/chat-pane
 * decision 7). It is turned off here rather than in the primitive, the way a
 * literal `rounded-*` is; `contain-intrinsic-size` goes inert with it, which
 * decision 2 already argues this transcript can afford. Important, because
 * both are arbitrary-value utilities of equal weight.
 */
const ROW = "[content-visibility:visible]!";

/**
 * Pulls a row up by the transcript's own gap, leaving the two rows separated
 * by their margins alone. Safe because a tool row carries no toolbar at all:
 * CopilotKit renders one only on a message with text, so the row above the
 * gap being closed ends at its tool line and nothing follows it.
 */
const GROUPED = "-mt-6";

export const configuratorMessageView: CopilotChatMessageViewProps["children"] = ({
  messageElements,
  messages,
  interruptElement,
}) => {
  const hidden = hiddenMessageIds(messages);
  const toolRows = toolRowMessageIds(messages);
  const userTurns = new Set(
    messages.filter((message) => message.role === "user").map((m) => m.id),
  );
  // Grouping runs over what is drawn, not over what was sent: a hidden canvas
  // edit between two tool rows leaves them adjacent in the transcript.
  const visible = rows(messageElements).filter((row) => !hidden.has(row.id));

  return (
    <MessageScrollerContent className={cn(CHAT_COLUMN, "py-6")}>
      {visible.map((row, index) => {
        const grouped =
          toolRows.has(row.id) &&
          index > 0 &&
          toolRows.has(visible[index - 1].id);
        return (
          <MessageScrollerItem
            key={row.id}
            messageId={row.id}
            className={grouped ? `${ROW} ${GROUPED}` : ROW}
            scrollAnchor={userTurns.has(row.id)}
          >
            {row.elements}
          </MessageScrollerItem>
        );
      })}
      {interruptElement && (
        <MessageScrollerItem messageId="interrupt" className={ROW}>
          {interruptElement}
        </MessageScrollerItem>
      )}
    </MessageScrollerContent>
  );
};
