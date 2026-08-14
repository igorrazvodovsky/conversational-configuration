"use client";

/**
 * The suggestion strip, as a function of the agreement (docs/specs/suggested-moves):
 * entry prompts while there is nothing, moves on this agreement once there is.
 * The catalogue is in `lib/suggested-moves`; what happens here is timing and
 * render scope.
 *
 * *It renders nothing, and that is the point.* `useAgent()` re-renders its
 * caller on every agent event — during a streaming reply, every token. Called
 * from the workspace page, that caller would be the whole page, chat and canvas
 * included, which is exactly what the [chat surface](../../../docs/specs/chat-surface/design.md)
 * pushed the unread watcher down into the header to avoid. So this subscribes
 * from a leaf that draws nothing.
 *
 * The catalogue is evaluated only while the agent is idle: during a run the
 * previous result is held, so a run has exactly one transition, at its end,
 * whatever the stream does in between. Re-registration is the library's problem
 * and it already solves it — `useConfigureSuggestions` serializes the config
 * and compares, so an unchanged strip registers nothing however often it is
 * handed over. Its `deps` argument only adds recompute triggers to a memo that
 * recomputes every render anyway, which is why none is passed.
 */

import { useRef } from "react";
import { useAgent, useConfigureSuggestions } from "@copilotkit/react-core/v2";

import { Configuration } from "@/lib/configurator";
import {
  SuggestedMove,
  movesSignature,
  suggestedMoves,
} from "@/lib/suggested-moves";

export function SuggestedMoves() {
  const { agent } = useAgent();
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
    const moves = suggestedMoves(config, hasTranscript);
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

  return null;
}
