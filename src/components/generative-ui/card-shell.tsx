"use client";

/**
 * The shape every in-chat action card has, beside the behavior they share in
 * `card-dispatch.ts` (docs/specs/agreement-document, docs/specs/nonlinear-interaction).
 *
 * A card is a rendering of one tool call, and it passes through the same three
 * states whichever tool it renders: waiting on the result, holding a payload
 * it can act on, or holding something that is not a payload at all — a plain
 * "Revised: …" or an "ERROR: …" the agent will relay in its own words. What
 * differs per card is what it says while waiting, what it does with the
 * passthrough, and what it draws once it has the payload; that stays at the
 * call sites.
 */

import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/**
 * The tools that render as a card rather than as a compact tool row. This is
 * the list `use-configurator-ui.tsx` registers a card renderer for, held here
 * because the transcript needs to know which rows are cards without rendering
 * them (docs/specs/chat-pane decision 8). `tests/couplings.test.ts` holds the
 * two against each other.
 */
export const CARD_TOOLS: ReadonlySet<string> = new Set([
  "ask_choices",
  "revise_choices",
  "reconcile_requirement",
  "compare_drafts",
]);

/** What CopilotKit hands a tool renderer: the call to key staleness off
 * (`card-dispatch.ts`), its progress, and the result once there is one. */
export interface CardProps {
  toolCallId: string;
  status: string;
  result?: string;
}

/** The tool has not answered yet. Each card names what it is waiting for —
 * the wait is short, so the words are the only thing that distinguishes it. */
export function CardPending({ children }: { children: ReactNode }) {
  return (
    <div className="my-2 flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner className="size-3" /> {children}
    </div>
  );
}

/**
 * The card itself, marked once it goes inert — spent, or overtaken by a later
 * message, or belonging to a conversation the agreement has moved past. Only
 * that last condition has a cause outside the conversation, so only it passes
 * a `reason`, rendered as a line inside the card: the confusion happens at the
 * control the operator tried to use, which is where the sentence belongs.
 *
 * Marked, and no longer faded. The card used to carry `opacity-60`, which
 * multiplied against every opacity below it — an unavailable option at 0.4,
 * its price at 0.7 — and put the staleness sentence at 2.3:1 in light theme.
 * Raising the fade does not fix it: `--muted-foreground` on white is 4.83:1
 * to begin with, so any card opacity at all takes the text below 4.5
 * (constitution #16, worked through in
 * docs/specs/ui-component-library decision 8). A spent card is still the
 * record of the turn it belongs to, and a record has to be readable.
 *
 * What says "inert" instead was already here and was being drowned by the
 * fade: every control inside is genuinely `disabled`, which the browser
 * exposes without being asked, and the `reason` sentence says in words what
 * the grey said in grey. The edge goes dashed, which changes a boundary and
 * no text.
 *
 * The edge carries that alone for two of the three conditions — a card just
 * clicked and a card a later message overtook explain themselves from the
 * transcript and pass no `reason` (`card-dispatch.ts`) — so it is the state
 * indicator there and is held to 3:1 like one. `border-muted-foreground` is
 * 6.74 against a card in dark and 4.83 in light; at `/50` it was 2.65 and
 * 1.98, which is where the first draft of this left it.
 */
export function CardShell({
  inert,
  reason,
  className,
  children,
}: {
  inert: boolean;
  reason?: string | null;
  /** extra classes for the content box, which owns the card's own spacing */
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card
      data-inert={inert || undefined}
      className={cn(
        "my-2 gap-0 py-0 shadow-none",
        inert && "border border-dashed border-muted-foreground ring-0",
      )}
    >
      <CardContent className={cn("p-3", className)}>
        {children}
        {reason && (
          <p className="mt-2 border-t pt-2 text-xs text-muted-foreground">
            {reason}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * The tool's result as this card's payload, or null when it is not one.
 *
 * Null covers both the tool that answered in prose and the payload that is
 * some other card's — every tool result reaches its renderer as a string, so a
 * card has to satisfy itself that what arrived is its own before drawing it.
 * `valid` is the card's own test: a `kind` discriminator where the payload
 * carries one, a structural check where it does not.
 */
export function parsePayload<T>(
  result: string,
  valid: (payload: T) => boolean,
): T | null {
  try {
    const payload = JSON.parse(result) as T;
    return valid(payload) ? payload : null;
  } catch {
    return null;
  }
}
