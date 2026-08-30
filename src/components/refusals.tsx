"use client";

/**
 * Where a refusal is read (constitution #16, and docs/specs/ui-component-library decision 5).
 *
 * Every control that draws a ruled-out option draws this underneath it: one
 * line per unavailable option, naming the option and the rules that rule it
 * out in `refusalText`'s words. The disabled control points at its own line
 * with `aria-describedby`, so the sentence a screen reader reads is the
 * sentence on the page rather than a second copy of it.
 *
 * This replaces `title` as the only channel. A disabled element is outside the
 * tab order, so it raises no tooltip on focus and none at all on a touch
 * screen, and the named rules that constitution #6 puts behind every refusal
 * were reaching the browser and stopping there.
 *
 * The ids are derived rather than minted. `useId` may not enter the hydrated
 * tree (docs/specs/chat-surface/design.md), and a scope the caller already
 * holds — a tool call id, a variable name — is stable across server and client
 * without going near it.
 */

import { Rule, refusalText } from "@/lib/configurator";

/** One ruled-out option, as the list needs it. */
export interface Refusal {
  value: string;
  label: string;
  rules: Rule[];
}

/**
 * The id of the line explaining one option, for the control's
 * `aria-describedby`. `scope` distinguishes two controls over the same
 * variable — two cards in one transcript, or a card and the sheet.
 */
export function refusalId(scope: string, variable: string, value: string) {
  return `refusal-${cleaned(scope)}-${cleaned(variable)}-${cleaned(value)}`;
}

/** Ids may not carry whitespace, and option values are model identifiers. */
const cleaned = (part: string) => part.replace(/[^A-Za-z0-9_-]/g, "-");

export function RefusalList({
  scope,
  variable,
  refusals,
  className,
}: {
  scope: string;
  variable: string;
  refusals: Refusal[];
  className?: string;
}) {
  if (refusals.length === 0) return null;

  return (
    <ul className={className ?? "mt-1.5 space-y-0.5 text-xs text-muted-foreground"}>
      {refusals.map((refusal) => (
        <li key={refusal.value} id={refusalId(scope, variable, refusal.value)}>
          <span className="font-medium">{refusal.label}</span>:{" "}
          {refusalText(refusal.rules)}
        </li>
      ))}
    </ul>
  );
}
