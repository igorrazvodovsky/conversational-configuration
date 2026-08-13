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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Candidate,
  Configuration,
  ModelVariable,
  choiceMessage,
  footprintBlock,
  formatCO2,
  formatMonthly,
  modelGroups,
  monthlyDelta,
  optionLabel,
  productModel,
  termMonthsInEffect,
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
    <ScrollArea className="h-full bg-background">
      <div className="max-w-3xl mx-auto px-8 py-8">
        <header className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Service agreement</h1>
            <p className="text-sm text-muted-foreground">{productModel.name}</p>
          </div>
          <div className="text-right">
            {config.candidate ? (
              <>
                <div className="text-2xl font-semibold tabular-nums">
                  {formatMonthly(config.candidate.price)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {config.candidate.objective === "co2"
                    ? "lowest-footprint completion"
                    : "cheapest completion"}
                </div>
                <FootprintSummary config={config} />
              </>
            ) : (
              <div className="text-xs text-muted-foreground max-w-[10rem]">
                no proposal yet — ask for one in chat
              </div>
            )}
          </div>
        </header>

        {frames.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-1.5">
            <Bookmark className="h-3 w-3 text-muted-foreground" />
            {frames.map((frame) => (
              <Tooltip key={frame.name}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={isRunning}
                    onClick={() =>
                      dispatch(
                        `Compare frame "${frame.name}" with the current configuration`,
                      )
                    }
                    className="font-normal hover:border-primary"
                  >
                    {frame.name}
                    <span className="tabular-nums text-muted-foreground">
                      {formatMonthly(frame.price)}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  click to compare with the current configuration
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {!hasAnything && (
          <Empty className="mb-6 border p-4 md:p-4">
            <EmptyDescription>
              Nothing decided yet. Describe your project in the chat — building,
              location, floors, traffic — and the spec sheet fills in here.
            </EmptyDescription>
          </Empty>
        )}

        {modelGroups.map((group) => (
          <section key={group.name} className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.name}
            </h2>
            <Card className="gap-0 py-0 shadow-none">
              <CardContent className="divide-y px-0">
                {group.variables.map((variable) => (
                  <VariableRow
                    key={variable.name}
                    variable={variable}
                    config={config}
                    termMonths={termMonthsInEffect(config)}
                    disabled={isRunning}
                    onSelect={dispatchChoice}
                  />
                ))}
              </CardContent>
            </Card>
          </section>
        ))}

        {isRunning && (
          <p className="text-xs text-muted-foreground animate-pulse">
            agent is working — editing re-enables when it finishes
          </p>
        )}
      </div>
    </ScrollArea>
  );
}

/**
 * Cumulative lifetime footprint under the monthly figure, with the assessment
 * assumptions behind it on demand (docs/specs/environmental-footprint decision
 * 6): whole-configuration total only — no per-option carbon badges anywhere —
 * and every number labelled as modelled. All values read from agent state and
 * the model JSON; nothing is derived here.
 */
function FootprintSummary({ config }: { config: Configuration }) {
  const footprint = config.candidate?.footprint;
  if (!footprint) return null; // candidate persisted before the footprint feature

  const usageProfile =
    config.choices["usage_profile"]?.value ??
    config.candidate?.assignment["usage_profile"];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="mt-1 text-xs text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
          title="modelled estimate — click for the assumptions behind it"
        >
          ≈ {formatCO2(footprint.total)} over{" "}
          {footprintBlock.service_life_years} years (modelled)
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="p-3 text-left text-xs">
        <dl className="space-y-1">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">embodied</dt>
            <dd className="tabular-nums">{formatCO2(footprint.embodied)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">use-phase</dt>
            <dd className="tabular-nums">{formatCO2(footprint.use_phase)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">service life</dt>
            <dd>
              {footprintBlock.service_life_years} years,{" "}
              {footprintBlock.operating_days} days/year
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">usage profile</dt>
            <dd>
              {usageProfile ? optionLabel("usage_profile", usageProfile) : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">grid factor</dt>
            <dd>
              {footprintBlock.grid_factor} kg CO₂e/kWh (
              {footprintBlock.grid_factor_decarbonising} if the grid
              decarbonises)
            </dd>
          </div>
        </dl>
        <p className="mt-2 text-muted-foreground">
          {footprintBlock.module_scope}
        </p>
      </PopoverContent>
    </Popover>
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
  user: { label: "you", icon: <User /> },
  agent: { label: "agent", icon: <Sparkles /> },
  forced: { label: "auto", icon: <Lock /> },
  proposed: { label: "proposed" },
};

function VariableRow({
  variable,
  config,
  termMonths,
  disabled,
  onSelect,
}: {
  variable: ModelVariable;
  config: Configuration;
  termMonths: number;
  disabled: boolean;
  onSelect: (variable: string, value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const display = currentDisplay(variable, config);
  const statuses = config.statuses[variable.name] ?? {};
  const badge = display.kind in KIND_BADGE ? KIND_BADGE[display.kind] : null;
  const editable = display.kind !== "forced";

  return (
    <Collapsible
      open={open && !disabled && editable}
      onOpenChange={setOpen}
      disabled={disabled || !editable}
      className="px-3 py-2"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-3 text-left disabled:cursor-default">
        <span className="flex-1 text-sm">{variable.label}</span>
        <span
          className={
            display.kind === "proposed"
              ? "text-sm italic text-muted-foreground"
              : display.value
                ? "text-sm font-medium"
                : "text-sm text-muted-foreground"
          }
        >
          {display.value
            ? variable.options.find((o) => o.value === display.value)?.label
            : "—"}
        </span>
        {badge && (
          <Badge
            variant="secondary"
            className="gap-1 px-2 py-0.5 text-[10px] font-normal text-muted-foreground"
          >
            {badge.icon}
            {badge.label}
          </Badge>
        )}
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2 flex flex-wrap gap-1.5">
        {variable.options.map((option) => {
          const status = statuses[option.value] ?? "open";
          const isCurrent = display.value === option.value;
          const invalid = status === "invalid";
          const delta = monthlyDelta(option, termMonths);
          return (
            <Button
              key={option.value}
              size="xs"
              variant={isCurrent ? "default" : "outline"}
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
              // pointer-events-auto: Button disables them, which would suppress
              // the native title — and with it the option's reason for being
              // unavailable (docs/specs/ui-component-library, decision 4).
              className={
                invalid
                  ? "cursor-not-allowed line-through opacity-40 disabled:pointer-events-auto"
                  : isCurrent
                    ? ""
                    : "font-normal hover:border-primary"
              }
            >
              {isCurrent && <Check />}
              {option.label}
              {delta ? (
                <span className="opacity-70">+{formatMonthly(delta)}</span>
              ) : null}
            </Button>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
