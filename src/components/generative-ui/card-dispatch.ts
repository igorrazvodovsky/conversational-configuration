"use client";

/**
 * Shared behavior for in-chat action cards (ask_choices, repair options,
 * frame comparison — docs/specs/agreement-document, docs/specs/nonlinear-interaction): a card goes inert once used or once the
 * conversation moves past it, and clicking dispatches a visible structured
 * user message that the agent maps onto one atomic tool call.
 */

import { useAgent, useCopilotKit } from "@copilotkit/react-core/v2";
import { createContext, useContext, useMemo, useState } from "react";

/**
 * Why the whole reopened conversation refers to an agreement state the
 * workspace has moved past (docs/specs/agreement-workspace) — every card in it
 * is inert then, and shows this line. The reason itself is formatted where
 * staleness is decided, in `use-workspace-attachment`, so nothing here needs to
 * know what supersedes a conversation. Null for a conversation that is current;
 * the default keeps cards outside a workspace unaffected.
 */
export const StaleThreadContext = createContext<string | null>(null);

export function useCardDispatch(toolCallId: string) {
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();
  const staleThread = useContext(StaleThreadContext);
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
  //
  // The run goes through the CopilotKit core, exactly as the composer does, and
  // never through `agent.runAgent()`. The core assembles a run's `tools`,
  // `context` and `forwardedProps`; called bare, the AG-UI agent defaults all
  // three to empty. `context` is what `useAgentContext` publishes into, so on
  // the raw path a card click would reach the agent stripped of app context
  // while a typed message carried it, with nothing at either end to show which
  // kind of turn it was. The core also owns frontend-tool execution, follow-up
  // runs, the suggestion reload and the run-failed error path.
  const dispatch = (content: string) => {
    if (agent.isRunning) return;
    setSubmitted(true);
    agent.addMessage({ id: crypto.randomUUID(), role: "user", content });
    copilotkit.runAgent({ agent }).catch((error: unknown) => {
      // Logged and swallowed, as the composer does: the core has already
      // surfaced the failure through its own error channel, and rejecting out
      // of a click handler would take the card's subtree down with it.
      console.error("card dispatch: runAgent failed", error);
    });
  };

  // The reason rides beside `inert` and only for the third condition: the two
  // the transcript accounts for — the card just clicked, the card a later
  // message overtook — explain themselves where it does not.
  return {
    inert: stale || submitted || staleThread !== null,
    reason: staleThread,
    dispatch,
  };
}
