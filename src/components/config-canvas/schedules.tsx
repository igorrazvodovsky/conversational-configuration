"use client";

/**
 * Schedules — the derived hardware (docs/specs/agreement-document; canvas
 * anatomy §3). The remaining groups as the sheet they have always been, one
 * row per variable, demoted to collapsible annexes and collapsed by default.
 *
 * This is where the genre wins the scale argument the flat sheet loses: a real
 * platform's parameters cannot fit one screen, but annexes collapse. It is also
 * the delivery lead's reading — complete, tabular, unambiguous — so nothing is
 * abbreviated here.
 *
 * Collapse state is component state with a constant default. It is never read
 * from storage: the server cannot see storage, so a remembered default renders
 * one tree on the server and another on hydration, which is the mismatch
 * `workspace-split.tsx` documents.
 */

import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { ModelVariable, layerGroups, optionLabel } from "@/lib/configurator";
import { cn } from "@/lib/utils";
import {
  DeviationMark,
  DocumentView,
  Gloss,
  OptionEditor,
  ProvenanceBadge,
  displayOf,
  unmetFor,
} from "./document-parts";

const SCHEDULE_GROUPS = layerGroups("schedules");

function ScheduleRow({
  variable,
  doc,
}: {
  variable: ModelVariable;
  doc: DocumentView;
}) {
  const [open, setOpen] = useState(false);
  const display = displayOf(doc, variable.name);
  const editable = display.kind !== "forced";
  const unmet = unmetFor(doc, variable.name);

  return (
    <Collapsible
      open={open && !doc.disabled && editable}
      onOpenChange={setOpen}
      disabled={doc.disabled || !editable}
      className="px-3 py-2"
    >
      {/* The badge is a sibling of the trigger, never a child: a document
          badge is itself a popover trigger, and a button inside a button is
          invalid HTML that fails hydration on every load. */}
      <div className="flex w-full items-center gap-3">
        <CollapsibleTrigger className="flex flex-1 items-center gap-3 text-left disabled:cursor-default">
          <span className="flex-1 text-sm">
            {variable.label}
            <Gloss variable={variable.name} doc={doc} className="ml-2" />
          </span>
          <span
            className={
              display.kind === "proposed"
                ? "text-sm italic text-muted-foreground"
                : display.value
                  ? "text-sm font-medium"
                  : "text-sm text-muted-foreground"
            }
          >
            {display.value ? optionLabel(variable.name, display.value) : "—"}
          </span>
        </CollapsibleTrigger>
        <ProvenanceBadge variable={variable.name} doc={doc} />
      </div>

      {unmet && (
        <div className="mt-2">
          <DeviationMark entries={unmet} doc={doc} />
        </div>
      )}

      <CollapsibleContent className="mt-2">
        <OptionEditor
          variable={variable.name}
          doc={doc}
          onDone={() => setOpen(false)}
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

function Schedule({
  group,
  doc,
  index,
}: {
  group: { name: string; variables: ModelVariable[] };
  doc: DocumentView;
  index: number;
}) {
  // Untouched until the user says otherwise, and while untouched it follows
  // the register: a schedule with an unanswered requirement of the customer's
  // document opens itself, because a deviation the operator cannot see is a
  // deviation they cannot answer, and an annex is the one place the document
  // can hide one. Undefined rather than a computed initial value — the state
  // initializer does not re-run when the register arrives, and a default read
  // from anything the server cannot see is the hydration mismatch
  // `workspace-split.tsx` documents.
  const [open, setOpen] = useState<boolean | undefined>(undefined);
  const deviating = group.variables.some(
    (v) => unmetFor(doc, v.name) !== undefined,
  );
  const expanded = open ?? deviating;

  return (
    <Collapsible open={expanded} onOpenChange={setOpen} className="mb-2">
      <CollapsibleTrigger className="flex w-full items-center gap-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground">
        <ChevronRight
          className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")}
        />
        Schedule {index} — {group.name}
        {deviating && (
          <span className="font-normal normal-case tracking-normal">
            · your document speaks to this
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <Card className="gap-0 py-0 shadow-none">
          <CardContent className="divide-y px-0">
            {group.variables.map((variable) => (
              <ScheduleRow key={variable.name} variable={variable} doc={doc} />
            ))}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function Schedules({ doc }: { doc: DocumentView }) {
  return (
    <section className="mb-8">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Schedules
      </h2>
      <p className="mb-3 text-xs text-muted-foreground">
        The machine that delivers the terms above — derived from them, and
        editable here.
      </p>
      {SCHEDULE_GROUPS.map((group, i) => (
        <Schedule key={group.name} group={group} doc={doc} index={i + 1} />
      ))}
    </section>
  );
}
