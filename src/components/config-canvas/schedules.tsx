"use client";

// docs/specs/agreement-document/design.md

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
      open={open && editable}
      onOpenChange={setOpen}
      // A run in flight does not collapse this: what an editor inside
      // dispatches is guarded once in the shell.
      disabled={!editable}
      data-reveal={variable.name}
      className={cn(
        "px-3 py-2 transition-colors duration-1000",
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
          scope="schedule"
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
  // `undefined` means untouched. A computed initial value would not re-run when
  // the register arrives and would mismatch on hydration
  // (docs/specs/shared-attention/design.md decision 4).
  const [open, setOpen] = useState<boolean | undefined>(undefined);
  const deviating = group.variables.some(
    (v) => unmetFor(doc, v.name) !== undefined,
  );
  const holdsReveal = group.variables.some((v) => doc.revealed.has(v.name));
  const expanded = open ?? (deviating || holdsReveal);
  // The expansion outlives the mark, or the reveal would hide something.
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
