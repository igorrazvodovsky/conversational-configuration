"use client";

/**
 * The pieces every layer of the agreement document is built from
 * (docs/specs/agreement-document).
 *
 * One option editor, one dispatch path, one value resolver. Recitals prose,
 * operative-term clauses and schedule rows all edit through the parts here, so
 * an inline token in a sentence and a row in the annex reach the solver by
 * exactly the same route — including the choice between a hidden `Canvas edit:`
 * and a visible `Reconcile deviation:` message, which the shell decides per
 * variable and none of the layers may bypass.
 */

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
import { KEEP_TITLE, cn } from "@/lib/utils";

/**
 * Everything a layer needs to render and edit the agreement. Held by the
 * shell and threaded down whole — in particular the optimistic `pending`
 * overlay, which has to reach the deepest inline token or a click in prose
 * would show nothing until the run ends.
 */
export interface DocumentView {
  config: Configuration;
  termMonths: number;
  /** the agent is running — every editor is inert until it finishes */
  disabled: boolean;
  pending: Record<string, string>;
  requirementsFor: (variable: string) => RegisterEntry[] | undefined;
  /** the clauses the document left to us on this term, if any
   * (docs/specs/document-clauses) */
  leftToUsFor: (variable: string) => DocumentClause[] | undefined;
  /** the shell's routed dispatch — canvas edit or reconciliation, per variable */
  onSelect: (variable: string, value: string) => void;
  onDispatch: (content: string) => void;
  /** Values the last run changed, marked transiently on the document and
   * discarded when the mark fades (docs/specs/shared-attention). */
  revealed: ReadonlySet<string>;
  /** Editor lifecycle, reported from OptionEditor's mount/unmount — the read
   * half of docs/specs/shared-attention. The shell keeps the last one open. */
  onEditorOpen: (variable: string) => void;
  onEditorClose: (variable: string) => void;
  /** Switches the canvas to the render (docs/specs/visual-configuration).
   * Only the schedules layer offers it, because that is the layer whose
   * content the render depicts. */
  onEnterRender: () => void;
}

/**
 * How a layer's heading is set: small capitals over the section, the three
 * layers marked identically because they are peers.
 *
 * Shared as a class string and deliberately *not* as a `<LayerHeading>`
 * component. A component would be a fiber, and a fiber inserted above the
 * schedules' Radix collapsibles shifts the `useId` values the whole page
 * derives — server and client then disagree and hydration breaks on every
 * load, measured, not guessed (docs/specs/chat-surface/design.md owns this
 * rule; the [component library](docs/specs/ui-component-library/design.md)
 * records this instance). A constant costs the same duplication in markup and
 * none in tree shape.
 */
export const LAYER_HEADING =
  "mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground";

/** The resolved value with the optimistic overlay laid over it. */
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

/**
 * The option list behind every editable value, wherever it is opened from.
 * Invalid options are unclickable and say why *on the page* rather than only
 * in a `title` a disabled control never raises for a keyboard or touch user
 * (constitution #16); deltas are monthly at the term
 * in effect; a value's situational gloss rides along as its title, so the
 * choice can be made in the building's language rather than the catalogue's.
 */
export function OptionEditor({
  variable,
  doc,
  onDone,
  scope,
}: {
  variable: string;
  doc: DocumentView;
  onDone?: () => void;
  /** what makes this editor's refusal ids unique on the page. The layer that
   * mounted it, because two layers can hold an editor for one variable open at
   * the same time — a prose token's popover and a schedule row's disclosure are
   * independent — and duplicate ids would send both controls' `aria-describedby`
   * to whichever line rendered first. */
  scope: string;
}) {
  // Every layer's editor renders this component exactly while it is open —
  // schedule rows and prose tokens alike — so its mount is the single place
  // the operator's open editor can be read from (docs/specs/shared-attention).
  const { onEditorOpen, onEditorClose } = doc;
  useEffect(() => {
    onEditorOpen(variable);
    return () => onEditorClose(variable);
  }, [variable, onEditorOpen, onEditorClose]);

  const model = variablesByName.get(variable);
  if (!model) return null;
  const display = displayOf(doc, variable);

  // The refusals of this variable, gathered once so the list underneath and
  // each control's `aria-describedby` quote one sentence rather than two.
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
        // Availability is a swap question — could this value be taken instead
        // of the one recorded? — which `statuses` cannot answer for a decided
        // term (docs/specs/agreement-document). The rules come with the answer.
        const rules = rulesAgainst(doc.config, variable, option.value);
        const invalid = rules !== null;
        const isCurrent = display.value === option.value;
        const delta = monthlyDelta(option, doc.termMonths);
        return (
          <Button
            key={option.value}
            size="xs"
            variant={isCurrent ? "default" : "outline"}
            disabled={invalid}
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
                  // may carry a state of its own and two opacities over one
                  // string multiply (constitution #16).
                  `cursor-not-allowed text-muted-foreground line-through ${KEEP_TITLE}`
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

/**
 * Two renderings, because two is what an underline inside a sentence can
 * actually draw: *the agreement states this* against *this is not settled*.
 *
 * There were six, and four of them — `user`, `agent`, `document`, `forced` —
 * were identical apart from an `opacity-90`, while `proposed` and `open` split
 * on dotted against dashed at 40% alpha, which at this size is not a
 * difference anyone perceives. The sheet was claiming six distinctions and
 * drawing at most three (constitution #16).
 *
 * Who chose a value is not dropped; it moves entirely to `ProvenanceBadge`,
 * which carries an icon and a word, and to the `sr-only` sentence every token
 * below now names its kind with. That is where docs/specs/choice-provenance
 * puts provenance anyway.
 */
const TOKEN_STYLE: Record<ValueKind, string> = {
  user: "font-medium text-foreground decoration-solid",
  agent: "font-medium text-foreground decoration-solid",
  document: "font-medium text-foreground decoration-solid",
  forced: "font-medium text-foreground decoration-solid",
  proposed: "italic text-muted-foreground decoration-dashed",
  open: "italic text-muted-foreground decoration-dashed",
};

/**
 * A configurable value rendered inside running text, editable in place: the
 * document's editable island (canvas anatomy, *Editability*). It opens the
 * same option editor a schedule row does, and dispatches through the same
 * routed handler — the document genre costs no revision access.
 *
 * A rule-forced value is not editable, exactly as on the sheet: it is a
 * consequence of other choices, and the chat explains it.
 */
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
  /**
   * Which layer wrote this token, for the refusal ids its editor mints.
   * Three agreement-group values — term, service level, usage profile — are
   * restated in the recitals as well as stated in the terms, so one variable
   * has two tokens on one page and their editors would collide on an id
   * (docs/specs/agreement-document, *Marks in the margin*). Recitals pass
   * `"recital"`; every other token is the default.
   */
  scope?: string;
  /**
   * How this value reads in running text, when the catalogue's label does not
   * fit a sentence — "Office" is a column heading, "an office building" is
   * prose. A total function over the model's values, written beside the
   * sentence it serves; the token still edits the same variable, and a value
   * with no phrasing falls back to its label.
   */
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
    // The transient reveal mark (docs/specs/shared-attention): highlighted
    // while the value is in the last run's changed set, faded by transition
    // when the shell drops the set.
    "transition-colors duration-1000",
    doc.revealed.has(variable) && "bg-primary/10",
  );

  // A value that cannot be edited says nothing extra. The kind belongs on the
  // control below, where it describes an affordance somebody is about to use;
  // here it would interpolate into every sentence of a document whose whole
  // premise is that it reads as a contract, and the margin's provenance badge
  // already answers it in the place this design puts attribution
  // (constitution #16).
  if (display.kind === "forced" || doc.disabled) {
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

/** The situational gloss for whatever value is currently shown, when the model
 * carries one — sense-making attached to the thing being explained, and never
 * composed at render time (canvas anatomy, *The anatomy*). */
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

/** Who put this value here, as a mark rather than a column. */
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

/**
 * What the customer's document asked, against what the agreement now says, the
 * rules that separate them, and the moves that answer it. Shown while the
 * requirement is an open deviation, while it is waived and while it is
 * revised: a mark is not a reason to stop showing the document's ask.
 *
 * The rules are the solver's own, read from `unavailable` in state
 * (constitution #6). They used to be spoken only in chat, which left the
 * durable record of a negotiation carrying the ask and the offer with nothing
 * to check them against once the conversation had scrolled away.
 *
 * In the document this is a margin mark on the affected term
 * (docs/specs/agreement-document); the schedules keep it as a row strip.
 */
export function DeviationMark({
  entries,
  doc,
}: {
  entries: RegisterEntry[];
  doc: DocumentView;
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
    <div className="border-l-2 border-muted-foreground/40 pl-2 text-xs">
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
            disabled={doc.disabled}
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
          disabled={doc.disabled}
          className="font-normal text-muted-foreground"
          onClick={() => doc.onDispatch(leaveOpenMessage(first.variable))}
        >
          {waived ? "Reopen" : "Leave open"}
        </Button>
      </div>
    </div>
  );
}

/**
 * What the customer's document left to us on this term
 * (docs/specs/document-clauses). A mark rather than a register row, because a
 * clause that asks for nothing has nothing to compare: no requested value, no
 * offered value, no rule between them, and no move that answers it here. What
 * answers it is the conversation the agent opens, so the mark says which
 * clause is waiting and stops there.
 */
export function LeftToUsMark({ clauses }: { clauses: DocumentClause[] }) {
  const cited = clauses.map((c) => c.clause).filter(Boolean);
  return (
    <div className="border-l-2 border-muted-foreground/40 pl-2 text-xs text-muted-foreground">
      {cited.length
        ? `Clause ${cited.join(", ")} leaves this to us`
        : "Your document leaves this to us"}
    </div>
  );
}

/** Every requirement of the customer's document the agreement does not
 * currently meet, however it was answered: waived and revised requirements are
 * answered, never forgotten. */
export function unmetFor(
  doc: DocumentView,
  variable: string,
): RegisterEntry[] | undefined {
  const unmet = doc.requirementsFor(variable)?.filter((e) => e.status !== "met");
  return unmet?.length ? unmet : undefined;
}

/**
 * The document's two-column body: the clause and its margin. The margin is
 * where the genre puts attribution and tracked changes, so that is where
 * provenance badges and deviation marks go — beside the term they qualify,
 * out of the reading line. It only becomes a column when the canvas is wide
 * enough to spare one; narrower, the marks flow under the clause they mark.
 * A container query, not a viewport one: the canvas is a resizable panel.
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
      <div className="flex flex-col items-start gap-2">{margin}</div>
    </div>
  );
}
