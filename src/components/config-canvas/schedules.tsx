"use client";

/**
 * Schedules — the derived hardware (docs/specs/agreement-document; canvas
 * anatomy, *The anatomy*). The remaining groups as the sheet they have always
 * been, one row per variable, demoted to collapsible annexes and collapsed by
 * default.
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

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Box, ChevronRight } from "lucide-react";
import { ModelVariable, layerGroups, optionLabel } from "@/lib/configurator";
import { cn } from "@/lib/utils";
import {
  DeviationMark,
  LeftToUsMark,
  DocumentView,
  Gloss,
  LAYER_HEADING,
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
  const leftToUs = doc.leftToUsFor(variable.name);

  return (
    <Collapsible
      open={open && !doc.disabled && editable}
      onOpenChange={setOpen}
      disabled={doc.disabled || !editable}
      data-reveal={variable.name}
      className={cn(
        "px-3 py-2 transition-colors duration-1000",
        // The transient reveal mark (docs/specs/shared-attention).
        doc.revealed.has(variable.name) && "bg-primary/10",
      )}
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

      {leftToUs && (
        <div className="mt-2">
          <LeftToUsMark clauses={leftToUs} />
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
  // A reveal (docs/specs/shared-attention) is the same argument as the
  // deviation fallback, applied to the agent's own moves: a change the
  // operator cannot see is a change they cannot react to. An untouched
  // schedule holding a revealed value opens in the reveal's own render (the
  // shell's scroll fires in that commit and needs the rows in the DOM); an
  // explicitly collapsed one stays collapsed and the header carries the mark.
  const holdsReveal = group.variables.some((v) => doc.revealed.has(v.name));
  const expanded = open ?? (deviating || holdsReveal);
  // The expansion must outlive the mark — a schedule that re-collapsed when
  // the mark faded would be the reveal hiding things, which it may never do.
  // Latching also keeps the operator in charge: from here on the header obeys
  // them exactly as if they had opened it themselves.
  useEffect(() => {
    if (holdsReveal) setOpen((o) => o ?? true);
  }, [holdsReveal]);
  const headerMarks = !expanded
    ? group.variables.filter((v) => doc.revealed.has(v.name))
    : [];

  return (
    <Collapsible open={expanded} onOpenChange={setOpen} className="mb-2">
      <CollapsibleTrigger
        data-reveal={
          headerMarks.length
            ? headerMarks.map((v) => v.name).join(" ")
            : undefined
        }
        className={cn(
          "flex w-full items-center gap-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors duration-1000 hover:text-foreground",
          headerMarks.length > 0 && "bg-primary/10 text-foreground",
        )}
      >
        <ChevronRight
          className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")}
        />
        Schedule {index} — {group.name}
        {deviating && (
          <span className="font-normal normal-case tracking-normal">
            · your document speaks to this
          </span>
        )}
        {headerMarks.length > 0 && (
          <span className="font-normal normal-case tracking-normal">
            · changed in here
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
      <h2 className={LAYER_HEADING}>Schedules</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        The machine that delivers the terms above — derived from them, and
        editable here.
      </p>
      {/* The second way into the render, on the layer whose content it depicts
          (docs/specs/visual-configuration). The dimensions, the doors and the
          cabin are stated here in catalogue nouns; the render is the same
          annex said in the building's terms. */}
      <Button
        variant="outline"
        size="xs"
        onClick={doc.onEnterRender}
        className="mb-3 font-normal"
      >
        <Box />
        See the car these schedules describe
      </Button>
      {SCHEDULE_GROUPS.map((group, i) => (
        <Schedule key={group.name} group={group} doc={doc} index={i + 1} />
      ))}
    </section>
  );
}
