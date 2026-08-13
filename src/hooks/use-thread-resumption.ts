"use client";

/**
 * Thread resumption (specs/005-nonlinear-interaction).
 *
 * CopilotKit v2 (1.65.0) switches the active thread but never fetches its
 * history: the runtime exposes GET /threads/{id}/messages and /threads/{id}/state,
 * yet no client code calls them, so a reopened thread renders empty. This hook
 * closes that gap: whenever the active thread changes and the agent holds no
 * messages, it hydrates the agent's messages and configuration state from the
 * runtime. Display-only — LangGraph resumes runs from its own checkpoint
 * regardless of what the frontend holds.
 */

import {
  useAgent,
  useCopilotChatConfiguration,
} from "@copilotkit/react-core/v2";
import { useEffect } from "react";

interface RuntimeToolCall {
  id: string;
  name: string;
  args: string | object;
}

interface RuntimeMessage {
  id: string;
  role: string;
  content?: string;
  toolCalls?: RuntimeToolCall[];
  [key: string]: unknown;
}

/** The runtime returns LangChain-style tool calls ({id, name, args}); the
 * AG-UI agent expects OpenAI shape ({id, type, function: {name, arguments}}). */
function toAgUiMessage(message: RuntimeMessage) {
  if (!message.toolCalls?.length) return message;
  return {
    ...message,
    toolCalls: message.toolCalls.map((tc) => ({
      id: tc.id,
      type: "function" as const,
      function: {
        name: tc.name,
        arguments:
          typeof tc.args === "string" ? tc.args : JSON.stringify(tc.args ?? {}),
      },
    })),
  };
}

export function useThreadResumption() {
  const { agent } = useAgent();
  const configuration = useCopilotChatConfiguration();
  const threadId = configuration?.threadId;

  useEffect(() => {
    if (!threadId || agent.messages.length > 0) return;
    let cancelled = false;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      const base = `/api/copilotkit/threads/${encodeURIComponent(threadId)}`;
      const [messagesRes, stateRes] = await Promise.all([
        fetch(`${base}/messages`),
        fetch(`${base}/state`),
      ]);
      // A brand-new thread has no server record yet — nothing to restore.
      if (cancelled || !messagesRes.ok || !stateRes.ok) return;
      const { messages } = await messagesRes.json();
      const { state } = await stateRes.json();
      if (!Array.isArray(messages) || messages.length === 0) return;

      const restored = (messages as RuntimeMessage[]).map(toAgUiMessage);
      const hydrate = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        agent.setMessages(restored as any);
        if (state?.configuration) {
          agent.setState({ configuration: state.configuration });
        }
      };

      // Switching threads also triggers an agent connect that can be in
      // flight (isRunning) and resets local messages when it lands — wait for
      // it to settle, hydrate, then briefly watch for a late wipe.
      for (let i = 0; i < 40 && !cancelled && agent.isRunning; i++) await sleep(250);
      if (cancelled || agent.messages.length > 0) return;
      hydrate();
      for (let i = 0; i < 8 && !cancelled; i++) {
        await sleep(500);
        if (!cancelled && !agent.isRunning && agent.messages.length === 0) hydrate();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agent, threadId]);
}
