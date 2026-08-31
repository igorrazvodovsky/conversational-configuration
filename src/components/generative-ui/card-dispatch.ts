"use client";

/**
 * Shared behavior for in-chat action cards (ask_choices, repair options,
 * frame comparison — docs/specs/agreement-document, docs/specs/nonlinear-interaction): a card goes inert once used or once the
 * conversation moves past it, and clicking dispatches a structured user
 * message that the agent maps onto one atomic tool call. The message is
 * visible where it carries a negotiation — a repair, a draft move — and
 * hidden where it only sets a value, which is why the card also reads its own
 * answer back out of the transcript.
 */

import { useAgent, useCopilotKit } from "@copilotkit/react-core/v2";
import { createContext, useContext, useMemo, useState } from "react";
import { sayBusy } from "@/lib/say-why";
import { CANVAS_EDIT_PREFIX, gestureSelections } from "@/lib/configurator";

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

  // Inert once any user message exists after the message carrying this call —
  // and that same message is the card's answer, when what it carries is a
  // gesture. The transcript renders no row for one (docs/specs/agreement-
  // document), so the card is what remembers the pick, and the pick has to
  // survive the component state a reopened conversation does not restore.
  // Only the bare grammar counts: a `Canvas edit:` in that position is the
  // customer working on the sheet instead of answering the card.
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
    // Answered rather than swallowed (constitution #17). The controls stay
    // live through a run — baking `isRunning` into the render leaves a card
    // stuck, per the note above — so the click arrives here, and returning
    // silently was a click that did nothing and said nothing.
    if (agent.isRunning) {
      sayBusy();
      return;
    }
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
  // the card accounts for itself — the card just clicked, which shows the
  // pick, and the card a later message overtook — explain themselves where it
  // does not.
  return {
    inert: stale || submitted || staleThread !== null,
    reason: staleThread,
    answer,
    dispatch,
  };
}
