"use client";

/**
 * Side-by-side agreement comparison for the agent's compare_frames tool
 * (docs/specs/nonlinear-interaction; monthly semantics from docs/specs/service-agreement):
 * only the differing variables, both values with monthly deltas at each side's
 * own term, and the monthly-price delta — computed backend-side, valid by
 * construction. Adopting a side dispatches a structured message the agent maps
 * onto adopt_frame.
 */

import { Spinner } from "@/components/ui/spinner";
import { Footprint, adoptMessage, formatCO2, formatMonthly } from "@/lib/configurator";
import { useCardDispatch } from "./card-dispatch";

interface SideValue {
  value: string | null; // null when a frame persisted before the service frame lacks an agreement variable
  label: string;
  price: number;
}

interface Payload {
  kind: "frame_comparison";
  // footprint is null on frames persisted before docs/specs/environmental-footprint
  a: { name: string; price: number; footprint: Footprint | null };
  b: { name: string; price: number; isCurrent: boolean; footprint: Footprint | null };
  differences: { variable: string; label: string; a: SideValue; b: SideValue }[];
  priceDelta: number;
  footprintDelta: number; // 0 when either side lacks a footprint
}

interface FrameComparisonProps {
  toolCallId: string;
  status: string;
  result?: string;
}

export function FrameComparison({
  toolCallId,
  status,
  result,
}: FrameComparisonProps) {
  const { inert, dispatch } = useCardDispatch(toolCallId);

  if (status !== "complete" || !result) {
    return (
      <div className="my-2 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Spinner size="sm" className="h-3 w-3" /> comparing…
      </div>
    );
  }

  let payload: Payload;
  try {
    payload = JSON.parse(result);
    if (payload.kind !== "frame_comparison") throw new Error("bad payload");
  } catch {
    return null; // ERROR results are relayed by the agent in text
  }

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
    <div
      className={`my-2 rounded-lg border border-[var(--border)] p-3 ${
        inert ? "opacity-60" : ""
      }`}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="pb-2 font-normal text-xs text-[var(--muted-foreground)]">
              {payload.differences.length} difference
              {payload.differences.length === 1 ? "" : "s"}
            </th>
            {sides.map((s) => (
              <th key={s.key} className="pb-2 font-medium">
                {s.isCurrent ? "current" : s.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="align-top">
          {payload.differences.map((d) => (
            <tr key={d.variable} className="border-t border-[var(--border)]">
              <td className="py-1.5 pr-2 text-xs text-[var(--muted-foreground)]">
                {d.label}
              </td>
              {(["a", "b"] as const).map((k) => (
                <td key={k} className="py-1.5 pr-2">
                  {d[k].label}
                  {d[k].price > 0 && (
                    <span className="ml-1 text-xs tabular-nums text-[var(--muted-foreground)]">
                      +{formatMonthly(d[k].price)}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
          <tr className="border-t border-[var(--border)] font-medium">
            <td className="py-1.5 pr-2 text-xs text-[var(--muted-foreground)]">
              total
            </td>
            {sides.map((s) => (
              <td key={s.key} className="py-1.5 pr-2 tabular-nums">
                {formatMonthly(s.price)}
              </td>
            ))}
          </tr>
          <tr className="border-t border-[var(--border)]">
            <td className="py-1.5 pr-2 text-xs text-[var(--muted-foreground)]">
              footprint (modelled)
            </td>
            {sides.map((s) => (
              <td key={s.key} className="py-1.5 pr-2 tabular-nums">
                {s.footprint ? formatCO2(s.footprint.total) : "—"}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <div className="mt-2 flex gap-2">
        <span className="flex-1 self-center text-xs text-[var(--muted-foreground)]">
          {payload.priceDelta === 0
            ? "same monthly price"
            : `${payload.b.isCurrent ? "current" : payload.b.name} is ${formatMonthly(Math.abs(payload.priceDelta))} ${payload.priceDelta > 0 ? "more" : "less"}`}
          {footprintDelta !== 0 &&
            ` · ${formatCO2(Math.abs(footprintDelta))} ${footprintDelta > 0 ? "more" : "less"}`}
        </span>
        {sides
          .filter((s) => !s.isCurrent)
          .map((s) => (
            <button
              key={s.key}
              disabled={inert}
              onClick={() => dispatch(adoptMessage(s.name))}
              className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm text-[var(--primary-foreground)] disabled:opacity-40"
            >
              Adopt {s.name}
            </button>
          ))}
      </div>
    </div>
  );
}
