"use client";

/**
 * Side-by-side frame comparison for the agent's compare_frames tool
 * (docs/specs/nonlinear-interaction): only the differing variables, both values, and the price
 * delta — computed backend-side, valid by construction. Adopting a side
 * dispatches a structured message the agent maps onto adopt_frame.
 */

import { Spinner } from "@/components/ui/spinner";
import { adoptMessage, formatPrice } from "@/lib/configurator";
import { useCardDispatch } from "./card-dispatch";

interface SideValue {
  value: string;
  label: string;
  price: number;
}

interface Payload {
  kind: "frame_comparison";
  a: { name: string; price: number };
  b: { name: string; price: number; isCurrent: boolean };
  differences: { variable: string; label: string; a: SideValue; b: SideValue }[];
  priceDelta: number;
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
    { key: "a" as const, name: payload.a.name, price: payload.a.price, isCurrent: false },
    { key: "b" as const, name: payload.b.name, price: payload.b.price, isCurrent: payload.b.isCurrent },
  ];

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
                      +{formatPrice(d[k].price)}
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
                {formatPrice(s.price)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <div className="mt-2 flex gap-2">
        <span className="flex-1 self-center text-xs text-[var(--muted-foreground)]">
          {payload.priceDelta === 0
            ? "same price"
            : `${payload.b.isCurrent ? "current" : payload.b.name} is ${formatPrice(Math.abs(payload.priceDelta))} ${payload.priceDelta > 0 ? "more" : "less"}`}
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
