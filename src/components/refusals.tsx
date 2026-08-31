"use client";

/**
 * Where a refusal is read (constitution #16, and docs/specs/ui-component-library decision 5).
 *
 * Every control that draws a ruled-out option draws this underneath it: one
 * line per unavailable option, naming the option and the rules that rule it
 * out in `refusalText`'s words. The control points at its own line with
 * `aria-describedby`, so the sentence a screen reader reads is the sentence on
 * the page rather than a second copy of it.
 *
 * This replaces `title` as the only channel. The named rules that
 * constitution #6 puts behind every refusal were reaching the browser and
 * stopping there, on a `title` that only a mouse could raise.
 *
 * The last line says what the ones above it are for. A ruled-out option is
 * still clickable (constitution #17): asking for it dispatches the same
 * sentence any other option does, and the collision comes back as the repair
 * paths that would admit it. The list is what the customer reads *before*
 * spending a turn on that, so it says both the rules and the move.
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

/**
 * What a struck-through option is for, said once per list rather than once per
 * option. It is deliberately not part of `refusalText`: that sentence is the
 * *reason*, it is what `aria-describedby` resolves to, and the agent quotes
 * the same rules in prose where no control exists to click.
 */
export const REFUSAL_AFFORDANCE =
  "Ask for one of these anyway and you get the ways to make it fit.";

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
      <li className="italic">{REFUSAL_AFFORDANCE}</li>
    </ul>
  );
}
