"use client";

// docs/specs/chat-pane/design.md

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
import { CANVAS_EDIT_PREFIX, isGesture } from "@/lib/configurator";

type ChatMessage = NonNullable<
  ComponentProps<typeof CopilotChatMessageView>["messages"]
>[number];

/** A message can render more than one element, so the two lists are not
 * positionally aligned. These are the suffixes CopilotKit appends to an id. */
function messageIdOf(element: ReactElement): string | null {
  const key = element.key;
  if (typeof key !== "string" || key.startsWith("intelligence-")) return null;
  return key.replace(/-custom-(before|after)$/, "");
}

type Row = { id: string; elements: ReactElement[]; rendered: boolean };

/** One row per message, not per element: the wrappers render nothing unless a
 * custom renderer is registered, and a tool result has no row at all. */
function rows(messageElements: ReactElement[]): Row[] {
  const ordered: Row[] = [];
  const byId = new Map<string, Row>();
  let current: Row | undefined;

  for (const element of messageElements) {
    const id = messageIdOf(element);
    if (id === null) {
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
 * A gesture gets no row: the surface that dispatched it is already the record.
 * Content-based, so a reopened conversation hides the same rows.
 *
 * `quiet` is the canvas edits alone. A text-less turn after one is paperwork,
 * while a text-less turn after a card pick is the `revise_choices` that came
 * back with repair options — the card the customer is waiting for.
 */
export function hiddenMessageIds(messages: ChatMessage[]): Set<string> {
  const hidden = new Set<string>();
  const quiet = new Set<string>();
  messages.forEach((message, index) => {
    if (message.role === "user") {
      const { content } = message;
      if (typeof content !== "string" || !isGesture(content)) return;
      hidden.add(message.id);
      if (content.startsWith(CANVAS_EDIT_PREFIX)) quiet.add(message.id);
      return;
    }
    if (message.role !== "assistant") return;
    const { content } = message;
    if (typeof content === "string" && content.trim().length > 0) return;
    const toolCalls = "toolCalls" in message ? message.toolCalls : undefined;
    if (!toolCalls || toolCalls.length === 0) {
      hidden.add(message.id);
      return;
    }
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].role !== "user") continue;
      if (quiet.has(messages[i].id)) hidden.add(message.id);
      break;
    }
  });
  return hidden;
}

/** A card message looks the same from here — no text, one tool call — so
 * `CARD_TOOLS` is what tells them apart. */
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

/** The item's `content-visibility: auto` applies paint containment, which clips
 * a card's `ring-1` edge. `contain-intrinsic-size` goes inert with it.
 * Important, because both are arbitrary-value utilities of equal weight. */
const ROW = "[content-visibility:visible]!";

/** Safe because a tool row carries no toolbar: CopilotKit renders one only on
 * a message with text. */
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
  // Grouping runs over what is drawn, not over what was sent.
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
