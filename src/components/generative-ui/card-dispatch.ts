"use client";

/**
 * Shared behavior for in-chat action cards (ask_choices, repair options,
 * frame comparison — specs/004, 005): a card goes inert once used or once the
 * conversation moves past it, and clicking dispatches a visible structured
 * user message that the agent maps onto one atomic tool call.
 */

import { useAgent } from "@copilotkit/react-core/v2";
import { useMemo, useState } from "react";

export function useCardDispatch(toolCallId: string) {
  const { agent } = useAgent();
  const [submitted, setSubmitted] = useState(false);

  // Inert once any user message exists after the message carrying this call.
  const stale = useMemo(() => {
    const messages = agent.messages as Array<{
      role?: string;
      toolCalls?: Array<{ id: string }>;
    }>;
    const myIndex = messages.findIndex((m) =>
      m.toolCalls?.some((tc) => tc.id === toolCallId),
    );
    if (myIndex === -1) return false;
    return messages.slice(myIndex + 1).some((m) => m.role === "user");
  }, [agent.messages, toolCallId]);

  // NOT gated on agent.isRunning: this subtree doesn't re-render when the run
  // ends, so baking isRunning into the render leaves the card stuck disabled.
  // Instead isRunning is read fresh at click time in dispatch().
  const dispatch = (content: string) => {
    if (agent.isRunning) return;
    setSubmitted(true);
    agent.addMessage({ id: crypto.randomUUID(), role: "user", content });
    agent.runAgent();
  };

  return { inert: stale || submitted, dispatch };
}
