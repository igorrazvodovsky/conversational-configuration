"use client";

import { useEffect, useState } from "react";
import { Wrench, Check, ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Spinner } from "@/components/ui/spinner";

interface ToolReasoningProps {
  name: string;
  args?: object | unknown;
  status: string;
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === "object" && value !== null)
    return `{${Object.keys(value).length} keys}`;
  if (typeof value === "string") return `"${value}"`;
  return String(value);
}

export function ToolReasoning({ name, args, status }: ToolReasoningProps) {
  const entries = args ? Object.entries(args) : [];
  const isRunning = status === "executing" || status === "inProgress";
  const [open, setOpen] = useState(true);

  useEffect(() => setOpen(isRunning), [isRunning]);

  const statusIcon = isRunning ? (
    <Spinner className="size-3" />
  ) : (
    <Check className="size-3 text-emerald-500" />
  );

  const label = (
    <>
      {statusIcon}
      <Wrench className="size-3" />
      <span className="font-medium font-mono">{name}</span>
    </>
  );

  return (
    <div className="my-1.5">
      {entries.length > 0 ? (
        <Collapsible open={open} onOpenChange={setOpen} className="group">
          <CollapsibleTrigger className="flex w-full items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            {label}
            <ChevronDown className="ml-auto size-3 transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="ml-5 mt-1.5 space-y-1 bg-secondary px-3 py-2">
            {entries.map(([key, value]) => (
              <div key={key} className="flex min-w-0 gap-2 font-mono text-xs">
                <span className="shrink-0 text-muted-foreground">{key}:</span>
                <span className="truncate text-foreground">
                  {formatValue(value)}
                </span>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {label}
        </div>
      )}
    </div>
  );
}
