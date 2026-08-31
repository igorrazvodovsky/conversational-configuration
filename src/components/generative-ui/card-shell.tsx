"use client";

// docs/specs/agreement-document/design.md

import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/** Held here because the transcript needs to know which rows are cards without
 * rendering them. `use-configurator-ui.tsx` registers the renderers, and
 * `tests/couplings.test.ts` holds the two against each other. */
export const CARD_TOOLS: ReadonlySet<string> = new Set([
  "ask_choices",
  "revise_choices",
  "reconcile_requirement",
  "compare_drafts",
]);

export interface CardProps {
  toolCallId: string;
  status: string;
  result?: string;
}

export function CardPending({ children }: { children: ReactNode }) {
  return (
    <div className="my-2 flex items-center gap-2 text-sm text-muted-foreground">
      <Spinner className="size-3" /> {children}
    </div>
  );
}

/**
 * Only the third inert condition — a conversation the agreement has moved past
 * — has a cause outside the conversation, so only it passes a `reason`.
 *
 * Inert is stated, not faded, and `border-muted-foreground` is unqualified
 * because for the other two the edge is the only indicator
 * (docs/specs/ui-component-library/design.md decision 8).
 */
export function CardShell({
  inert,
  reason,
  className,
  children,
}: {
  inert: boolean;
  reason?: string | null;
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
 * Null covers both the tool that answered in prose and the payload that is some
 * other card's: every tool result reaches its renderer as a string, so a card
 * has to satisfy itself that what arrived is its own.
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
