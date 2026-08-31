"use client";

// docs/specs/suggested-moves/design.md
//
// Renders nothing on purpose: `useAgent()` re-renders its caller on every
// streamed token, so it is called from a leaf rather than from the workspace
// page. The catalogue is evaluated only while the agent is idle, so a run has
// exactly one transition whatever the stream does in between.

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

/** A pill's message is exactly what a click sends, so this is what tells a
 * family its move has been made. */
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
  // Nothing *said*, not nothing recorded: a described building the agent
  // answered with a question is past the entry prompts.
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
    available: "always",
  });

  // A run clears the strip as it starts and reloads it at the tail of
  // `processAgentResult`, which the abort and error paths never reach. The
  // falling edge of a run is the missing reload.
  const wasRunning = useRef(false);
  useEffect(() => {
    const ended = wasRunning.current && !agent.isRunning;
    wasRunning.current = agent.isRunning;
    if (!ended || !agent.agentId) return;
    copilotkit.reloadSuggestions(agent.agentId);
  }, [agent.isRunning, agent.agentId, copilotkit]);

  return null;
}
