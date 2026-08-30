"use client";

/**
 * Side-by-side agreement comparison for the agent's compare_drafts tool
 * (docs/specs/parallel-drafts; monthly semantics from docs/specs/service-agreement):
 * only the differing variables, both values with monthly deltas at each side's
 * own term, and the monthly-price delta — computed backend-side, valid by
 * construction. Both sides are whole drafts, so taking one is a *switch*: the
 * other survives the choice, and the button dispatches the structured message
 * the agent maps onto switch_draft.
 */

import { Button } from "@/components/ui/button";
import {
  Footprint,
  formatCO2,
  formatMonthly,
  switchDraftMessage,
} from "@/lib/configurator";
import { useCardDispatch } from "./card-dispatch";
import { CardPending, CardProps, CardShell, parsePayload } from "./card-shell";

interface SideValue {
  value: string | null; // null when a draft adapted from a pre-service-frame workspace lacks an agreement variable
  label: string;
  price: number;
}

interface Payload {
  kind: "draft_comparison";
  // footprint is null on candidates stored before docs/specs/environmental-footprint
  a: { name: string; price: number; footprint: Footprint | null };
  b: { name: string; price: number; isCurrent: boolean; footprint: Footprint | null };
  differences: { variable: string; label: string; a: SideValue; b: SideValue }[];
  priceDelta: number;
  footprintDelta: number; // 0 when either side lacks a footprint
  // The delta already formatted backend-side, so this card and the agent's
  // sentence beside it quote one figure; null when either side lacks a
  // footprint. Older tool results in a reopened conversation have no such
  // field, hence the fallback below.
  footprintDeltaText?: string | null;
}

export function DraftComparison({ toolCallId, status, result }: CardProps) {
  const { inert, reason, dispatch } = useCardDispatch(toolCallId);

  if (status !== "complete" || !result) {
    return <CardPending>comparing…</CardPending>;
  }

  const payload = parsePayload<Payload>(
    result,
    (p) => p.kind === "draft_comparison",
  );
  if (!payload) return null; // ERROR results are relayed by the agent in text

  const sides = [
    {
      key: "a" as const,
      name: payload.a.name,
      price: payload.a.price,
      footprint: payload.a.footprint ?? null,
      isCurrent: false,
    },
    {
      key: "b" as const,
      name: payload.b.name,
      price: payload.b.price,
      footprint: payload.b.footprint ?? null,
      isCurrent: payload.b.isCurrent,
    },
  ];
  const footprintDelta = payload.footprintDelta ?? 0;

  return (
    <CardShell inert={inert} reason={reason}>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            {/* Scoped, so a cell announces the variable and the draft it
                belongs to — which is the whole content of a comparison
                (constitution #16). */}
            <th scope="col" className="pb-2 font-normal text-xs text-muted-foreground">
              {payload.differences.length} difference
              {payload.differences.length === 1 ? "" : "s"}
            </th>
            {/* Each side is named by its draft — one of them may be the one
                being worked on, which is a fact about it and not its name. */}
            {sides.map((s) => (
              <th key={s.key} scope="col" className="pb-2 font-medium">
                {s.name}
                {s.isCurrent && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    working on this
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="align-top">
          {payload.differences.map((d) => (
            <tr key={d.variable} className="border-t">
              <th
                scope="row"
                className="py-1.5 pr-2 text-left text-xs font-normal text-muted-foreground"
              >
                {d.label}
              </th>
              {(["a", "b"] as const).map((k) => (
                <td key={k} className="py-1.5 pr-2">
                  {d[k].label}
                  {d[k].price > 0 && (
                    <span className="ml-1 text-xs tabular-nums text-muted-foreground">
                      +{formatMonthly(d[k].price)}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t font-medium">
            <th scope="row" className="py-1.5 pr-2 text-left text-xs font-normal text-muted-foreground">
              total
            </th>
            {sides.map((s) => (
              <td key={s.key} className="py-1.5 pr-2 tabular-nums">
                {formatMonthly(s.price)}
              </td>
            ))}
          </tr>
          <tr className="border-t">
            <th scope="row" className="py-1.5 pr-2 text-left text-xs font-normal text-muted-foreground">
              footprint (modelled)
            </th>
            {sides.map((s) => (
              <td key={s.key} className="py-1.5 pr-2 tabular-nums">
                {s.footprint ? formatCO2(s.footprint.total) : "—"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <div className="mt-2 flex gap-2">
        <span className="flex-1 self-center text-xs text-muted-foreground">
          {payload.priceDelta === 0
            ? "same monthly price"
            : `${payload.b.name} is ${formatMonthly(Math.abs(payload.priceDelta))} ${payload.priceDelta > 0 ? "more" : "less"}`}
          {footprintDelta !== 0 &&
            ` · ${payload.footprintDeltaText ?? formatCO2(Math.abs(footprintDelta))} ${footprintDelta > 0 ? "more" : "less"}`}
        </span>
        {sides
          .filter((s) => !s.isCurrent)
          .map((s) => (
            <Button
              key={s.key}
              size="sm"
              /* A spent card says so with its dashed edge and with this
                 button being `disabled`; fading the draft's name on top of
                 that would only make the record harder to read
                 (constitution #16). */
              className="disabled:opacity-100"
              disabled={inert}
              onClick={() => dispatch(switchDraftMessage(s.name))}
            >
              Work on {s.name}
            </Button>
          ))}
      </div>
    </CardShell>
  );
}
