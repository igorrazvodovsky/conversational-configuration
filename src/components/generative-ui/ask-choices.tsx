"use client";

/**
 * In-chat controls for the agent's ask_choices tool (docs/specs/configuration-canvas).
 *
 * The payload is computed server-side from solver state — valid options only
 * are selectable; invalid values render greyed in place. Option prices are
 * monthly deltas at the term in effect (docs/specs/service-agreement). Controls go
 * inert once the conversation moves past them or after submission.
 */

import { useState } from "react";
import { BadgePercent } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { choiceMessage, formatMonthly } from "@/lib/configurator";
import { useCardDispatch } from "./card-dispatch";

interface PayloadOption {
  value: string;
  label: string;
  price: number;
  status: "valid" | "invalid" | "chosen" | "forced";
  cheapest: boolean;
}

interface PayloadVariable {
  name: string;
  label: string;
  group: string;
  control: "chips" | "scale" | "list";
  options: PayloadOption[];
}

interface Payload {
  variables: PayloadVariable[];
  prompt?: string;
}

interface AskChoicesProps {
  toolCallId: string;
  status: string;
  result?: string;
}

export function AskChoices({ toolCallId, status, result }: AskChoicesProps) {
  const { inert: cardInert, dispatch: send } = useCardDispatch(toolCallId);
  const [selections, setSelections] = useState<Record<string, string>>({});

  if (status !== "complete" || !result) {
    return (
      <div className="my-2 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Spinner size="sm" className="h-3 w-3" /> preparing options…
      </div>
    );
  }

  let payload: Payload;
  try {
    payload = JSON.parse(result);
    if (!Array.isArray(payload.variables)) throw new Error("bad payload");
  } catch {
    return null; // ERROR results are relayed by the agent in text
  }

  const inert = cardInert;
  const multi = payload.variables.length > 1;

  const dispatch = (picks: { variable: string; value: string }[]) =>
    send(choiceMessage(picks));

  const select = (variable: string, value: string) => {
    if (inert) return;
    if (multi) setSelections((s) => ({ ...s, [variable]: value }));
    else dispatch([{ variable, value }]);
  };

  return (
    <div
      className={`my-2 rounded-lg border border-[var(--border)] p-3 space-y-3 ${
        inert ? "opacity-60" : ""
      }`}
    >
      {payload.prompt && <p className="text-sm">{payload.prompt}</p>}
      {payload.variables.map((variable) => (
        <div key={variable.name}>
          <div className="mb-1 text-xs font-medium text-[var(--muted-foreground)]">
            {variable.label}
          </div>
          <Control
            variable={variable}
            selected={selections[variable.name]}
            inert={inert}
            onSelect={select}
          />
        </div>
      ))}
      {multi && (
        <button
          disabled={inert || Object.keys(selections).length === 0}
          onClick={() =>
            dispatch(
              Object.entries(selections).map(([variable, value]) => ({
                variable,
                value,
              })),
            )
          }
          className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm text-[var(--primary-foreground)] disabled:opacity-40"
        >
          Apply {Object.keys(selections).length || ""} choice
          {Object.keys(selections).length === 1 ? "" : "s"}
        </button>
      )}
    </div>
  );
}

function Control({
  variable,
  selected,
  inert,
  onSelect,
}: {
  variable: PayloadVariable;
  selected?: string;
  inert: boolean;
  onSelect: (variable: string, value: string) => void;
}) {
  switch (variable.control) {
    case "scale":
      return (
        <ScaleControl {...{ variable, selected, inert, onSelect }} />
      );
    case "list":
      return <OptionList {...{ variable, selected, inert, onSelect }} />;
    default:
      return <ChipRow {...{ variable, selected, inert, onSelect }} />;
  }
}

function optionState(o: PayloadOption, selected?: string) {
  const active = selected ? selected === o.value : o.status === "chosen" || o.status === "forced";
  return { active, disabled: o.status === "invalid" };
}

function CheapestMark() {
  return (
    <BadgePercent
      className="inline h-3 w-3 text-emerald-600"
      aria-label="cheapest valid option"
    />
  );
}

function ChipRow({
  variable,
  selected,
  inert,
  onSelect,
}: {
  variable: PayloadVariable;
  selected?: string;
  inert: boolean;
  onSelect: (variable: string, value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {variable.options.map((o) => {
        const { active, disabled } = optionState(o, selected);
        return (
          <button
            key={o.value}
            disabled={disabled || inert}
            onClick={() => onSelect(variable.name, o.value)}
            title={disabled ? "ruled out by your other choices" : undefined}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              active
                ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                : disabled
                  ? "border-[var(--border)] opacity-40 line-through cursor-not-allowed"
                  : "border-[var(--border)] hover:border-[var(--primary)]"
            }`}
          >
            {o.label} {o.cheapest && <CheapestMark />}
            {o.price > 0 && (
              <span className="ml-1 text-xs opacity-70">+{formatMonthly(o.price)}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ScaleControl({
  variable,
  selected,
  inert,
  onSelect,
}: {
  variable: PayloadVariable;
  selected?: string;
  inert: boolean;
  onSelect: (variable: string, value: string) => void;
}) {
  return (
    <div>
      <div className="flex overflow-hidden rounded-md border border-[var(--border)]">
        {variable.options.map((o) => {
          const { active, disabled } = optionState(o, selected);
          return (
            <button
              key={o.value}
              disabled={disabled || inert}
              onClick={() => onSelect(variable.name, o.value)}
              title={
                disabled
                  ? "outside the valid range for your other choices"
                  : o.price > 0
                    ? `+${formatMonthly(o.price)}`
                    : undefined
              }
              className={`flex-1 border-r border-[var(--border)] px-1 py-1.5 text-xs last:border-r-0 transition-colors ${
                active
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : disabled
                    ? "bg-[var(--secondary)] text-[var(--muted-foreground)] opacity-40 cursor-not-allowed"
                    : "hover:bg-[var(--secondary)]"
              }`}
            >
              {o.label} {o.cheapest && <CheapestMark />}
            </button>
          );
        })}
      </div>
      <div className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
        greyed segments are outside the currently valid range
      </div>
    </div>
  );
}

function OptionList({
  variable,
  selected,
  inert,
  onSelect,
}: {
  variable: PayloadVariable;
  selected?: string;
  inert: boolean;
  onSelect: (variable: string, value: string) => void;
}) {
  return (
    <div className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)]">
      {variable.options.map((o) => {
        const { active, disabled } = optionState(o, selected);
        return (
          <button
            key={o.value}
            disabled={disabled || inert}
            onClick={() => onSelect(variable.name, o.value)}
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
              active
                ? "bg-[var(--secondary)] font-medium"
                : disabled
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-[var(--secondary)]"
            }`}
          >
            <span className={`flex-1 ${disabled ? "line-through" : ""}`}>
              {o.label} {o.cheapest && <CheapestMark />}
            </span>
            {disabled ? (
              <span className="text-xs text-[var(--muted-foreground)]">
                unavailable
              </span>
            ) : (
              <span className="text-xs tabular-nums text-[var(--muted-foreground)]">
                {o.price > 0 ? `+${formatMonthly(o.price)}` : "included"}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
