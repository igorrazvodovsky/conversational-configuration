"use client";

/**
 * Configuration spec-sheet canvas (docs/specs/configuration-canvas;
 * frames strip from docs/specs/nonlinear-interaction).
 *
 * Reads agent.state.configuration; every edit round-trips through the agent
 * as a structured message handled by set_choices, so the solver stays the
 * single source of validity. The message is hidden from the chat — the sheet
 * is the record of the edit, the conversation only carries consequences.
 *
 * On a document-seeded agreement it also carries the deviation register
 * (docs/specs/rfq-reconciliation): document provenance with its clause, and
 * requested-versus-offered on the rows a requirement could not reach. Those
 * moves dispatch *visible* messages — waiving a requirement of the customer's
 * own document is negotiation, not bookkeeping.
 */

import { useAgent } from "@copilotkit/react-core/v2";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  Check,
  FileText,
  Lock,
  Sparkles,
  User,
} from "lucide-react";
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
  RegisterEntry,
  Source,
  acceptOfferedMessage,
  canvasEditMessage,
  footprintBlock,
  formatCO2,
  formatMonthly,
  leaveOpenMessage,
  modelGroups,
  monthlyDelta,
  optionLabel,
  productModel,
  registerEntries,
  reviseRequirementMessage,
  termMonthsInEffect,
} from "@/lib/configurator";
import { PLACEHOLDER_NAME } from "@/lib/workspaces";

const EMPTY: Configuration = {
  choices: {},
  statuses: {},
  candidate: null,
  frames: [],
};

export function ConfigCanvas({
  workspaceName,
  workspaceLoaded,
}: {
  /** Resolved by use-workspace-attachment (agent state wins); null = unnamed. */
  workspaceName: string | null;
  /** False until the record arrives, so the placeholder is not shown too early. */
  workspaceLoaded: boolean;
}) {
  const { agent } = useAgent();
  const config: Configuration = agent.state?.configuration ?? EMPTY;
  const isRunning = agent.isRunning;
  const frames = config.frames ?? [];
  const hasAnything =
    Object.keys(config.choices).length > 0 || config.candidate !== null;

  // Optimistic overlay: the clicked value shows on its row immediately and is
  // discarded wholesale when the run ends — validated agent state then renders
  // the truth, identical on a clean apply, corrected on a rejection. Ephemeral
  // display state, not a store (constitution #3); it can only hold options
  // that were valid at click time because invalid ones are unclickable.
  const [pending, setPending] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!isRunning) setPending({});
  }, [isRunning]);

  const dispatch = (content: string) => {
    agent.addMessage({ id: crypto.randomUUID(), role: "user", content });
    agent.runAgent();
  };

  // The register, derived here from the frozen document block and the values
  // already in state (docs/specs/rfq-reconciliation).
  const register = registerEntries(config);
  const byVariable = new Map<string, RegisterEntry[]>();
  for (const entry of register) {
    byVariable.set(entry.variable, [
      ...(byVariable.get(entry.variable) ?? []),
      entry,
    ]);
  }
  const openDeviations = register.filter((e) => e.status === "deviation");

  // Picking an option on a row the document speaks to is a reconciliation, not
  // bookkeeping: it dispatches a visible message rather than the hidden canvas
  // edit, because moving away from the customer's own requirement is
  // negotiation and belongs in the record.
  const dispatchChoice = (variable: string, value: string) => {
    setPending((p) => ({ ...p, [variable]: value }));
    dispatch(
      byVariable.has(variable)
        ? reviseRequirementMessage(variable, value)
        : canvasEditMessage([{ variable, value }]),
    );
  };

  return (
    <ScrollArea className="h-full bg-background">
      <div className="max-w-3xl mx-auto px-8 py-8">
        <header className="mb-6 flex items-end justify-between gap-4">
          <div className="min-w-0">
            {/* The workspace's identity and the way out of it: the canvas is the
                surface present in every chat mode, so it carries them
                (docs/specs/chat-surface, decision 8). A Link and a span mint no
                ids, which is what makes this safe in the hydrated tree. */}
            <div className="mb-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <Button
                asChild
                variant="link"
                size="xs"
                className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground hover:no-underline"
              >
                <Link href="/">
                  <ArrowLeft />
                  All elevators
                </Link>
              </Button>
              <span aria-hidden>/</span>
              {workspaceName ? (
                <span className="truncate" title={workspaceName}>
                  {workspaceName}
                </span>
              ) : (
                <span className="truncate italic">
                  {workspaceLoaded ? PLACEHOLDER_NAME : "…"}
                </span>
              )}
            </div>
            <h1 className="text-xl font-semibold">Service agreement</h1>
            <p className="text-sm text-muted-foreground">{productModel.name}</p>
            {register.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {openDeviations.length > 0
                  ? `${openDeviations.length} of ${register.length} requirements from your document not met`
                  : `all ${register.length} requirements from your document answered`}
                {/* answered-but-not-met stays counted: waiving and revising
                    settle a requirement, they do not retire it */}
                {(["waived", "revised"] as const).map((status) => {
                  const count = register.filter(
                    (e) => e.status === status,
                  ).length;
                  return count ? ` · ${count} ${status}` : "";
                })}
              </p>
            )}
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
                    pendingValue={pending[variable.name]}
                    requirements={byVariable.get(variable.name)}
                    onSelect={dispatchChoice}
                    onDispatch={dispatch}
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
): { value: string | null; kind: Source | "forced" | "proposed" | "open" } {
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
  document: { label: "document", icon: <FileText /> },
  forced: { label: "auto", icon: <Lock /> },
  proposed: { label: "proposed" },
};

/**
 * "Why is this value here?" answered with "your document, clause N" — the
 * third provenance source's popover (docs/specs/rfq-reconciliation). The
 * clause and its quote are the frozen block's own words; nothing is derived.
 */
function ClausePopover({
  entries,
  children,
}: {
  entries: RegisterEntry[];
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="p-3 text-xs">
        <p className="mb-2 text-muted-foreground">Your document asks:</p>
        <dl className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.clause + entry.quote}>
              <dt className="font-medium">
                clause {entry.clause} — {optionLabel(entry.variable, entry.value)}
              </dt>
              <dd className="text-muted-foreground italic">“{entry.quote}”</dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}

/**
 * What the document asked, next to what the agreement now says, on the row it
 * affects — plus the moves that answer it. Shown while the requirement is an
 * open deviation, while it is waived, and while it is revised: story three of
 * the requirements asks to see the document's ask *always*, and a mark is not
 * a reason to stop showing it. The *reason* a value cannot be reached is not
 * here — it traces to a solver core the agent narrates in chat, which is where
 * every other grounded explanation in this app lives.
 */
function DeviationStrip({
  entries,
  disabled,
  onDispatch,
}: {
  entries: RegisterEntry[];
  disabled: boolean;
  onDispatch: (content: string) => void;
}) {
  const first = entries[0];
  const waived = first.status === "waived";
  // Grouped by requested value, never flattened onto the first one: a document
  // may ask two different values of one term, and joining every clause number
  // under one label would misquote the customer's own document.
  const asks = [...new Set(entries.map((e) => e.value))].map((value) => ({
    value,
    clauses: entries
      .filter((e) => e.value === value)
      .map((e) => e.clause)
      .filter(Boolean),
  }));

  return (
    <div className="mt-2 rounded-none border-l-2 border-muted-foreground/40 pl-3 text-xs">
      <p className="text-muted-foreground">
        {asks.map(({ value, clauses }, i) => (
          <span key={value}>
            {i > 0 && "; "}
            {clauses.length ? `Clause ${clauses.join(", ")} asked ` : "Your document asked "}
            <span className="font-medium text-foreground">
              {optionLabel(first.variable, value)}
            </span>
          </span>
        ))}
        {first.offered && (
          <>
            {" · offered "}
            <span className="font-medium text-foreground">
              {optionLabel(first.variable, first.offered)}
            </span>
          </>
        )}
        {waived && " · waived, still listed"}
        {first.status === "revised" && " · you revised this"}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {!waived && first.offered && (
          <Button
            size="xs"
            variant="outline"
            disabled={disabled}
            className="font-normal hover:border-primary"
            onClick={() =>
              onDispatch(acceptOfferedMessage(first.variable, first.offered!))
            }
          >
            Accept {optionLabel(first.variable, first.offered)}
          </Button>
        )}
        <Button
          size="xs"
          variant="ghost"
          disabled={disabled}
          className="font-normal text-muted-foreground"
          onClick={() => onDispatch(leaveOpenMessage(first.variable))}
        >
          {waived ? "Reopen" : "Leave open"}
        </Button>
      </div>
    </div>
  );
}

function VariableRow({
  variable,
  config,
  termMonths,
  disabled,
  pendingValue,
  requirements,
  onSelect,
  onDispatch,
}: {
  variable: ModelVariable;
  config: Configuration;
  termMonths: number;
  disabled: boolean;
  pendingValue?: string;
  requirements?: RegisterEntry[];
  onSelect: (variable: string, value: string) => void;
  onDispatch: (content: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const display = pendingValue
    ? { value: pendingValue, kind: "user" as const }
    : currentDisplay(variable, config);
  const statuses = config.statuses[variable.name] ?? {};
  const badge = display.kind in KIND_BADGE ? KIND_BADGE[display.kind] : null;
  const editable = display.kind !== "forced";
  // Everything the agreement does not currently meet, however it was answered:
  // waived and revised requirements are answered, never forgotten, and the
  // document's ask stays visible next to the value that replaced it
  // (docs/specs/rfq-reconciliation).
  const unmet = requirements?.filter((e) => e.status !== "met");

  return (
    <Collapsible
      open={open && !disabled && editable}
      onOpenChange={setOpen}
      disabled={disabled || !editable}
      className="px-3 py-2"
    >
      {/* The badge is a sibling of the trigger, never a child: a document
          badge is itself a popover trigger, and a button inside a button is
          invalid HTML that fails hydration on every load. */}
      <div className="flex w-full items-center gap-3">
        <CollapsibleTrigger className="flex flex-1 items-center gap-3 text-left disabled:cursor-default">
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
        </CollapsibleTrigger>
        {badge &&
          (requirements?.length ? (
            <ClausePopover entries={requirements}>
              <Badge
                asChild
                variant="secondary"
                className="gap-1 px-2 py-0.5 text-[10px] font-normal text-muted-foreground"
              >
                <button
                  title="why this value is here"
                  className="underline decoration-dotted underline-offset-2"
                >
                  {badge.icon}
                  {badge.label}
                </button>
              </Badge>
            </ClausePopover>
          ) : (
            <Badge
              variant="secondary"
              className="gap-1 px-2 py-0.5 text-[10px] font-normal text-muted-foreground"
            >
              {badge.icon}
              {badge.label}
            </Badge>
          ))}
      </div>

      {unmet && unmet.length > 0 && (
        <DeviationStrip
          entries={unmet}
          disabled={disabled}
          onDispatch={onDispatch}
        />
      )}

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
