"use client";

// docs/specs/agreement-document/design.md

import { useEffect, useState, type ReactNode } from "react";
import { Check, FileText, Lock, Sparkles, User } from "lucide-react";

import { Refusal, RefusalList, refusalId } from "@/components/refusals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Configuration,
  type Clause as DocumentClause,
  RegisterEntry,
  ResolvedValue,
  ValueKind,
  acceptOfferedMessage,
  formatMonthly,
  leaveOpenMessage,
  monthlyDelta,
  optionLabel,
  optionNote,
  refusalText,
  resolveValue,
  rulesAgainst,
  variablesByName,
} from "@/lib/configurator";
import { cn } from "@/lib/utils";

/** The optimistic `pending` overlay has to reach the deepest inline token, or
 * a click in prose shows nothing until the run ends. */
export interface DocumentView {
  config: Configuration;
  termMonths: number;
  pending: Record<string, string>;
  requirementsFor: (variable: string) => RegisterEntry[] | undefined;
  leftToUsFor: (variable: string) => DocumentClause[] | undefined;
  /** The shell's routed dispatch: canvas edit or reconciliation, per variable. */
  onSelect: (variable: string, value: string) => void;
  onDispatch: (content: string) => void;
  revealed: ReadonlySet<string>;
  onEditorOpen: (variable: string) => void;
  onEditorClose: (variable: string) => void;
  onEnterRender: () => void;
}

/**
 * A class string rather than a `<LayerHeading>` component: a fiber inserted
 * above the schedules' Radix collapsibles shifts the `useId` values the whole
 * page derives (docs/specs/chat-surface/design.md).
 */
export const LAYER_HEADING =
  "mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground";

export function displayOf(doc: DocumentView, variable: string): ResolvedValue {
  const pending = doc.pending[variable];
  return pending
    ? { value: pending, kind: "user" }
    : resolveValue(doc.config, variable);
}

const KIND_TITLE: Record<ValueKind, string> = {
  user: "you chose this",
  agent: "the agent chose this",
  document: "your requirements document states this",
  forced: "the rules force this value",
  proposed: "proposed — not yet agreed",
  open: "not yet decided",
};

export const KIND_BADGE: Partial<
  Record<ValueKind, { label: string; icon?: ReactNode }>
> = {
  user: { label: "you", icon: <User /> },
  agent: { label: "agent", icon: <Sparkles /> },
  document: { label: "document", icon: <FileText /> },
  forced: { label: "auto", icon: <Lock /> },
  proposed: { label: "proposed" },
};

export function OptionEditor({
  variable,
  doc,
  onDone,
  scope,
}: {
  variable: string;
  doc: DocumentView;
  onDone?: () => void;
  /** What makes this editor's refusal ids unique: two layers can hold an editor
   * for one variable open at the same time. */
  scope: string;
}) {
  // Rendered exactly while an editor is open, so its mount is the single place
  // the operator's open editor can be read from.
  const { onEditorOpen, onEditorClose } = doc;
  useEffect(() => {
    onEditorOpen(variable);
    return () => onEditorClose(variable);
  }, [variable, onEditorOpen, onEditorClose]);

  const model = variablesByName.get(variable);
  if (!model) return null;
  const display = displayOf(doc, variable);

  const refusals: Refusal[] = model.options.flatMap((option) => {
    const rules = rulesAgainst(doc.config, variable, option.value);
    return rules === null
      ? []
      : [{ value: option.value, label: option.label, rules }];
  });

  return (
    <div>
    <div className="flex flex-wrap gap-1.5">
      {model.options.map((option) => {
          // A swap question — could this be taken instead of the one recorded?
          // — which `statuses` cannot answer for a decided term.
        const rules = rulesAgainst(doc.config, variable, option.value);
        const invalid = rules !== null;
        const isCurrent = display.value === option.value;
        const delta = monthlyDelta(option, doc.termMonths);
        return (
          <Button
            key={option.value}
            size="xs"
            variant={isCurrent ? "default" : "outline"}
            title={rules ? refusalText(rules) : option.note}
            aria-describedby={
              invalid ? refusalId(scope, variable, option.value) : undefined
            }
            onClick={() => {
              onDone?.();
              doc.onSelect(variable, option.value);
            }}
            className={
              invalid
                ? // Muted and struck, never faded: the popover or clause above
                  "font-normal text-muted-foreground line-through hover:border-primary"
                : isCurrent
                  ? ""
                  : "font-normal hover:border-primary"
            }
          >
            {isCurrent && <Check />}
            {option.label}
            {delta ? (
              <span className="text-muted-foreground">
                +{formatMonthly(delta)}
              </span>
            ) : null}
          </Button>
        );
      })}
    </div>
    <RefusalList scope={scope} variable={variable} refusals={refusals} />
    </div>
  );
}

/** Two, because two is what an underline inside a sentence can draw. */
const TOKEN_STYLE: Record<ValueKind, string> = {
  user: "font-medium text-foreground decoration-solid",
  agent: "font-medium text-foreground decoration-solid",
  document: "font-medium text-foreground decoration-solid",
  forced: "font-medium text-foreground decoration-solid",
  proposed: "italic text-muted-foreground decoration-dashed",
  open: "italic text-muted-foreground decoration-dashed",
};

export function ValueToken({
  variable,
  doc,
  placeholder = "not yet decided",
  phrasing,
  scope = "token",
}: {
  variable: string;
  doc: DocumentView;
  placeholder?: string;
  /** Three agreement-group values appear in both the recitals and the terms, so
   * one variable has two tokens on one page whose editors would collide. */
  scope?: string;
  /** How this value reads in running text, when the catalogue's label does not
   * fit a sentence. Falls back to the label. */
  phrasing?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const model = variablesByName.get(variable);
  const display = displayOf(doc, variable);
  const label = display.value
    ? phrasing?.[display.value] ?? optionLabel(variable, display.value)
    : placeholder;
  const style = cn(
    TOKEN_STYLE[display.kind],
    "underline underline-offset-4 decoration-muted-foreground/40",
    "transition-colors duration-1000",
    doc.revealed.has(variable) && "bg-primary/10",
  );

  if (display.kind === "forced") {
    return (
      <span className={style} title={KIND_TITLE[display.kind]} data-reveal={variable}>
        {label}
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          data-reveal={variable}
          className={cn(style, "hover:decoration-foreground")}
          title={`${KIND_TITLE[display.kind]} — click to change`}
        >
          {label}
          {/* On the control and not in the prose: this one is an affordance a
              keyboard user is about to act on, and its name should say what
              standing the value has before they change it. */}
          <span className="sr-only"> — {KIND_TITLE[display.kind]}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 max-w-[calc(100vw-2rem)] p-3"
      >
        <p className="mb-2 text-xs text-muted-foreground">{model?.label}</p>
        <OptionEditor
          variable={variable}
          doc={doc}
          scope={scope}
          onDone={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

export function Gloss({
  variable,
  doc,
  className,
}: {
  variable: string;
  doc: DocumentView;
  className?: string;
}) {
  const { value } = displayOf(doc, variable);
  const note = value ? optionNote(variable, value) : undefined;
  if (!note) return null;
  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      {note}
    </span>
  );
}

function ClausePopover({
  entries,
  children,
}: {
  entries: RegisterEntry[];
  children: ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="p-3 text-xs">
        <p className="mb-2 text-muted-foreground">Your document asks:</p>
        <dl className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id}>
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

export function ProvenanceBadge({
  variable,
  doc,
}: {
  variable: string;
  doc: DocumentView;
}) {
  const badge = KIND_BADGE[displayOf(doc, variable).kind];
  if (!badge) return null;
  const requirements = doc.requirementsFor(variable);
  const className =
    "gap-1 px-2 py-0.5 text-xs font-normal text-muted-foreground";

  if (!requirements?.length) {
    return (
      <Badge variant="secondary" className={className}>
        {badge.icon}
        {badge.label}
      </Badge>
    );
  }
  return (
    <ClausePopover entries={requirements}>
      <Badge asChild variant="secondary" className={className}>
        <button
          title="why this value is here"
          className="underline decoration-dotted underline-offset-2"
        >
          {badge.icon}
          {badge.label}
        </button>
      </Badge>
    </ClausePopover>
  );
}

export function DeviationMark({
  entries,
  doc,
}: {
  entries: RegisterEntry[];
  doc: DocumentView;
}) {
  const first = entries[0];
  const waived = first.status === "waived";
  // Grouped by requested value, never flattened: a document may ask two
  // different values of one term.
  const asks = [...new Set(entries.map((e) => e.value))].map((value) => ({
    value,
    clauses: entries
      .filter((e) => e.value === value)
      .map((e) => e.clause)
      .filter(Boolean),
  }));

  return (
    <div className="w-full border-l-2 border-muted-foreground/40 pl-2 text-xs">
      <p className="text-muted-foreground">
        {asks.map(({ value, clauses }, i) => (
          <span key={value}>
            {i > 0 && "; "}
            {clauses.length
              ? `Clause ${clauses.join(", ")} asked `
              : "Your document asked "}
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
      {asks.map(({ value }) => {
        const rules = rulesAgainst(doc.config, first.variable, value);
        return rules?.length ? (
          <p key={`why-${value}`} className="text-muted-foreground/80">
            {optionLabel(first.variable, value)} is ruled out here by{" "}
            {rules.map((r) => `${r.id}: ${r.label}`).join("; ")}
          </p>
        ) : null;
      })}
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {!waived && first.offered && (
          <Button
            size="xs"
            variant="outline"
            className="font-normal hover:border-primary"
            onClick={() =>
              doc.onDispatch(
                acceptOfferedMessage(first.variable, first.offered!),
              )
            }
          >
            Accept {optionLabel(first.variable, first.offered)}
          </Button>
        )}
        <Button
          size="xs"
          variant="ghost"
          className="font-normal text-muted-foreground"
          onClick={() => doc.onDispatch(leaveOpenMessage(first.variable))}
        >
          {waived ? "Reopen" : "Leave open"}
        </Button>
      </div>
    </div>
  );
}

export function LeftToUsMark({ clauses }: { clauses: DocumentClause[] }) {
  const cited = clauses.map((c) => c.clause).filter(Boolean);
  return (
    <div className="w-full border-l-2 border-muted-foreground/40 pl-2 text-xs text-muted-foreground">
      {cited.length
        ? `Clause ${cited.join(", ")} leaves this to us`
        : "Your document leaves this to us"}
    </div>
  );
}

/** Waived and revised requirements are answered, never forgotten. */
export function unmetFor(
  doc: DocumentView,
  variable: string,
): RegisterEntry[] | undefined {
  const unmet = doc.requirementsFor(variable)?.filter((e) => e.status !== "met");
  return unmet?.length ? unmet : undefined;
}

/**
 * The margin becomes a column only when the canvas is wide enough. A container
 * query, not a viewport one, because the canvas is a resizable panel.
 *
 * While it is a column a shrink-wrapped mark flushes right; marks that are
 * blocks of prose declare `w-full` and keep their own left edge.
 */
export function Clause({
  children,
  margin,
}: {
  children: ReactNode;
  margin?: ReactNode;
}) {
  return (
    <div className="grid gap-x-6 gap-y-2 py-3 @2xl:grid-cols-[minmax(0,1fr)_11rem]">
      <div className="min-w-0">{children}</div>
      <div className="flex flex-col items-start gap-2 @2xl:items-end">
        {margin}
      </div>
    </div>
  );
}
