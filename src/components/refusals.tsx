"use client";

// constitution #16, docs/specs/ui-component-library/design.md decision 5

import { Rule, refusalText } from "@/lib/configurator";

export interface Refusal {
  value: string;
  label: string;
  rules: Rule[];
}

/** `scope` distinguishes two controls over the same variable — two cards in one
 * transcript, or a card and the sheet. */
export function refusalId(scope: string, variable: string, value: string) {
  return `refusal-${cleaned(scope)}-${cleaned(variable)}-${cleaned(value)}`;
}

/** Ids may not carry whitespace, and option values are model identifiers. */
const cleaned = (part: string) => part.replace(/[^A-Za-z0-9_-]/g, "-");

/** Deliberately not part of `refusalText`: that sentence is the reason, and
 * the agent quotes the same rules in prose where no control exists to click. */
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
