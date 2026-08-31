"use client";

// docs/specs/agreement-document/design.md

import { useAgent, useCopilotKit } from "@copilotkit/react-core/v2";
import { createContext, useContext, useMemo, useState } from "react";
import { sayBusy } from "@/lib/say-why";
import { CANVAS_EDIT_PREFIX, gestureSelections } from "@/lib/configurator";

/** Formatted where staleness is decided, in `use-workspace-attachment`. Null
 * for a current conversation, and the default leaves cards outside a workspace
 * unaffected. */
export const StaleThreadContext = createContext<string | null>(null);

export function useCardDispatch(toolCallId: string) {
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();
  const staleThread = useContext(StaleThreadContext);
  const [submitted, setSubmitted] = useState(false);

  // Inert once any user message exists after the message carrying this call —
  // and that same message is the card's answer when it carries a gesture, since
  // the transcript renders no row for one. Only the bare grammar counts.
  const { stale, answer } = useMemo(() => {
    const messages = agent.messages as Array<{
      role?: string;
      content?: unknown;
      toolCalls?: Array<{ id: string }>;
    }>;
    const myIndex = messages.findIndex((m) =>
      m.toolCalls?.some((tc) => tc.id === toolCallId),
    );
    if (myIndex === -1) return { stale: false, answer: null };
    const next = messages.slice(myIndex + 1).find((m) => m.role === "user");
    if (!next) return { stale: false, answer: null };
    const content = typeof next.content === "string" ? next.content : "";
    return {
      stale: true,
      answer: content.startsWith(CANVAS_EDIT_PREFIX)
        ? null
        : gestureSelections(content),
    };
  }, [agent.messages, toolCallId]);

  // Not gated on `agent.isRunning`: this subtree does not re-render when the
  // run ends, so baking it into the render leaves the card stuck disabled.
  //
  // Through the CopilotKit core, never `agent.runAgent()`: the core assembles a
  // run's `tools`, `context` and `forwardedProps`, which the bare AG-UI agent
  // defaults to empty. It also owns frontend-tool execution, follow-up runs,
  // the suggestion reload and the run-failed error path.
  const dispatch = (content: string) => {
    if (agent.isRunning) {
      sayBusy();
      return;
    }
    setSubmitted(true);
    agent.addMessage({ id: crypto.randomUUID(), role: "user", content });
    copilotkit.runAgent({ agent }).catch((error: unknown) => {
      // Swallowed, as the composer does: the core has already surfaced this
      // through its own error channel.
      console.error("card dispatch: runAgent failed", error);
    });
  };

  return {
    inert: stale || submitted || staleThread !== null,
    reason: staleThread,
    answer,
    dispatch,
  };
}
