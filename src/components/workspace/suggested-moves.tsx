"use client";

/**
 * The suggestion strip, as a function of the agreement (docs/specs/suggested-moves):
 * entry prompts while there is nothing, moves on this agreement once there is.
 * The catalogue is in `lib/suggested-moves`; what happens here is timing and
 * render scope.
 *
 * *It renders nothing, and that is the point.* `useAgent()` re-renders its
 * caller on every agent event — during a streaming reply, every token — so it
 * is called from a leaf that draws nothing rather than from the workspace page,
 * which is the render-scope rule the [chat surface](../../../docs/specs/chat-surface/design.md)
 * follows for the unread watcher. It does not make the page cheap on its own:
 * the page also calls `useWorkspaceAttachment`, which subscribes the same way,
 * and that violation predates this component. What a leaf guarantees is that
 * this strip adds nothing to it.
 *
 * The catalogue is evaluated only while the agent is idle: during a run the
 * previous result is held, so a run has exactly one transition, at its end,
 * whatever the stream does in between. Re-registration is the library's problem
 * for as long as the strip's contents move — `useConfigureSuggestions`
 * serializes the config and compares, so an unchanged strip registers nothing
 * however often it is handed over. Its `deps` argument only adds recompute
 * triggers to a memo that recomputes every render anyway, which is why none is
 * passed. What the library does not cover is a run that ends with the strip
 * unchanged, which the reload below handles.
 */

import { useEffect, useRef } from "react";
import {
  useAgent,
  useConfigureSuggestions,
  useCopilotKit,
} from "@copilotkit/react-core/v2";

import { Configuration } from "@/lib/configurator";
import {
  SuggestedMove,
  movesSignature,
  suggestedMoves,
} from "@/lib/suggested-moves";

/** The sentences the customer has sent, verbatim. A pill's message is exactly
 * what a click sends, so this is what tells a family its move has been made. */
function sentencesSent(
  messages: readonly { role: string; content?: unknown }[],
): Set<string> {
  const sent = new Set<string>();
  for (const message of messages) {
    if (message.role !== "user") continue;
    if (typeof message.content === "string") sent.add(message.content.trim());
  }
  return sent;
}

export function SuggestedMoves() {
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();
  const config = agent.state?.configuration as Configuration | undefined;
  // The entry prompts belong to a workspace where nothing has been said, not
  // merely one where nothing has been recorded: a described building that the
  // agent answered with a question is past them, whatever state holds.
  const hasTranscript = agent.messages.length > 0;

  // A render-time cache, not a store: it holds the last idle result so a
  // running agent cannot move the strip under the customer's eye.
  const settled = useRef<{ signature: string; moves: SuggestedMove[] } | null>(
    null,
  );
  if (!agent.isRunning || settled.current === null) {
    const moves = suggestedMoves(
      config,
      hasTranscript,
      sentencesSent(agent.messages),
    );
    const signature = movesSignature(moves);
    if (settled.current?.signature !== signature) {
      settled.current = { signature, moves };
    }
  }

  useConfigureSuggestions({
    suggestions: settled.current.moves,
    // Every move below the entry prompts exists only after the first message;
    // the static default is "before-first-message".
    available: "always",
  });

  // A run clears the strip as it starts and reloads it at the tail of
  // `processAgentResult` — a tail the abort and error paths never reach. So a
  // reply the customer stops, or one that fails, leaves the surface empty with
  // nothing to bring it back: the agreement did not move, so neither did the
  // strip's signature, and an unchanged config registers nothing. The falling
  // edge of a run is the missing reload. Firing it after a run that completed
  // normally is a second, redundant reload of the same static list.
  const wasRunning = useRef(false);
  useEffect(() => {
    const ended = wasRunning.current && !agent.isRunning;
    wasRunning.current = agent.isRunning;
    if (!ended || !agent.agentId) return;
    copilotkit.reloadSuggestions(agent.agentId);
  }, [agent.isRunning, agent.agentId, copilotkit]);

  return null;
}
