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

/** The card itself, dimmed once it goes inert — spent, or overtaken by a later
 * message, or belonging to a conversation the agreement has moved past. */
export function CardShell({
  inert,
  className,
  children,
}: {
  inert: boolean;
  /** extra classes for the content box, which owns the card's own spacing */
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={cn("my-2 gap-0 py-0 shadow-none", inert && "opacity-60")}>
      <CardContent className={cn("p-3", className)}>{children}</CardContent>
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
