"use client";

/**
 * Configuration spec-sheet canvas (docs/specs/configuration-canvas;
 * frames strip from docs/specs/nonlinear-interaction).
 *
 * Reads agent.state.configuration; every edit round-trips through the agent
 * as a visible structured message handled by set_choices, so the solver stays
 * the single source of validity.
 */

import { useAgent } from "@copilotkit/react-core/v2";
import { useState } from "react";
import { Bookmark, Check, Lock, Sparkles, User } from "lucide-react";
import {
  Candidate,
  Configuration,
  ModelVariable,
  choiceMessage,
  formatPrice,
  modelGroups,
  productModel,
} from "@/lib/configurator";

const EMPTY: Configuration = {
  choices: {},
  statuses: {},
  candidate: null,
  frames: [],
};

export function ConfigCanvas() {
  const { agent } = useAgent();
  const config: Configuration = agent.state?.configuration ?? EMPTY;
  const isRunning = agent.isRunning;
  const frames = config.frames ?? [];
  const hasAnything =
    Object.keys(config.choices).length > 0 || config.candidate !== null;

  const dispatch = (content: string) => {
    agent.addMessage({ id: crypto.randomUUID(), role: "user", content });
    agent.runAgent();
  };

  const dispatchChoice = (variable: string, value: string) =>
    dispatch(choiceMessage([{ variable, value }]));

  return (
    <div className="h-full overflow-y-auto bg-[var(--background)]">
      <div className="max-w-3xl mx-auto px-8 py-8">
        <header className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Elevator specification</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              {productModel.name}
            </p>
          </div>
          <div className="text-right">
            {config.candidate ? (
              <>
                <div className="text-2xl font-semibold tabular-nums">
                  {formatPrice(config.candidate.price)}
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  current proposal
                </div>
              </>
            ) : (
              <div className="text-xs text-[var(--muted-foreground)] max-w-[10rem]">
                no proposal yet — ask for one in chat
              </div>
            )}
          </div>
        </header>

        {frames.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-1.5">
            <Bookmark className="h-3 w-3 text-[var(--muted-foreground)]" />
            {frames.map((frame) => (
              <button
                key={frame.name}
                disabled={isRunning}
                title="click to compare with the current configuration"
                onClick={() =>
                  dispatch(
                    `Compare frame "${frame.name}" with the current configuration`,
                  )
                }
                className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-xs transition-colors hover:border-[var(--primary)] disabled:opacity-50"
              >
                {frame.name}
                <span className="ml-1 tabular-nums text-[var(--muted-foreground)]">
                  {formatPrice(frame.price)}
                </span>
              </button>
            ))}
          </div>
        )}

        {!hasAnything && (
          <p className="mb-6 rounded-lg border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
            Nothing decided yet. Describe your project in the chat — building,
            location, floors, traffic — and the spec sheet fills in here.
          </p>
        )}

        {modelGroups.map((group) => (
          <section key={group.name} className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              {group.name}
            </h2>
            <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)]">
              {group.variables.map((variable) => (
                <VariableRow
                  key={variable.name}
                  variable={variable}
                  config={config}
                  disabled={isRunning}
                  onSelect={dispatchChoice}
                />
              ))}
            </div>
          </section>
        ))}

        {isRunning && (
          <p className="text-xs text-[var(--muted-foreground)] animate-pulse">
            agent is working — editing re-enables when it finishes
          </p>
        )}
      </div>
    </div>
  );
}

function currentDisplay(
  variable: ModelVariable,
  config: Configuration,
): { value: string | null; kind: "user" | "agent" | "forced" | "proposed" | "open" } {
  const chosen = config.choices[variable.name];
  if (chosen) return { value: chosen.value, kind: chosen.source };
  const statuses = config.statuses[variable.name];
  if (statuses) {
    const forced = Object.entries(statuses).find(([, s]) => s === "forced");
    if (forced) return { value: forced[0], kind: "forced" };
  }
  const proposed = (config.candidate as Candidate | null)?.assignment[variable.name];
  if (proposed) return { value: proposed, kind: "proposed" };
  return { value: null, kind: "open" };
}

const KIND_BADGE: Record<string, { label: string; icon?: React.ReactNode }> = {
  user: { label: "you", icon: <User className="h-3 w-3" /> },
  agent: { label: "agent", icon: <Sparkles className="h-3 w-3" /> },
  forced: { label: "auto", icon: <Lock className="h-3 w-3" /> },
  proposed: { label: "proposed" },
};

function VariableRow({
  variable,
  config,
  disabled,
  onSelect,
}: {
  variable: ModelVariable;
  config: Configuration;
  disabled: boolean;
  onSelect: (variable: string, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const display = currentDisplay(variable, config);
  const statuses = config.statuses[variable.name] ?? {};
  const badge = display.kind in KIND_BADGE ? KIND_BADGE[display.kind] : null;
  const editable = display.kind !== "forced";

  return (
    <div className="px-3 py-2">
      <button
        className="w-full flex items-center gap-3 text-left disabled:cursor-default"
        onClick={() => editable && setOpen((o) => !o)}
        disabled={disabled || !editable}
      >
        <span className="flex-1 text-sm">{variable.label}</span>
        <span
          className={`text-sm ${
            display.kind === "proposed"
              ? "italic text-[var(--muted-foreground)]"
              : display.value
                ? "font-medium"
                : "text-[var(--muted-foreground)]"
          }`}
        >
          {display.value
            ? variable.options.find((o) => o.value === display.value)?.label
            : "—"}
        </span>
        {badge && (
          <span className="flex items-center gap-1 rounded-full bg-[var(--secondary)] px-2 py-0.5 text-[10px] text-[var(--muted-foreground)]">
            {badge.icon}
            {badge.label}
          </span>
        )}
      </button>

      {open && !disabled && editable && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {variable.options.map((option) => {
            const status = statuses[option.value] ?? "open";
            const isCurrent = display.value === option.value;
            const invalid = status === "invalid";
            return (
              <button
                key={option.value}
                disabled={invalid}
                title={
                  invalid
                    ? "ruled out by your other choices — ask why in chat"
                    : undefined
                }
                onClick={() => {
                  setOpen(false);
                  onSelect(variable.name, option.value);
                }}
                className={`rounded-md border px-2 py-1 text-xs transition-colors ${
                  isCurrent
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : invalid
                      ? "border-[var(--border)] text-[var(--muted-foreground)] opacity-40 line-through cursor-not-allowed"
                      : "border-[var(--border)] hover:border-[var(--primary)]"
                }`}
              >
                {isCurrent && <Check className="mr-1 inline h-3 w-3" />}
                {option.label}
                {option.price ? (
                  <span className="ml-1 opacity-70">+{formatPrice(option.price)}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
