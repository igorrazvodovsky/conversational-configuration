"use client";

/**
 * Repair cards for the agent's revise_choices tool (docs/specs/nonlinear-interaction).
 *
 * When a revision collides with earlier commitments, the solver computes
 * repair options — minimal sets of existing choices to give up, ordered by
 * retention. Each card dispatches one structured message the agent applies as
 * a single atomic revise_choices call; the last card always abandons the
 * revision. On a non-conflicting revision the tool returns plain text and
 * this renders as a compact tool row instead.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ToolReasoning } from "@/components/tool-rendering";
import { cn } from "@/lib/utils";
import { abandonMessage, repairMessage } from "@/lib/configurator";
import { useCardDispatch } from "./card-dispatch";

interface DescribedValue {
  variable: string;
  label: string;
  value: string;
  valueLabel: string;
}

interface RepairOption {
  drop: DescribedValue[];
  keepCount: number;
  ripple: DescribedValue[];
  rules: { id: string; label: string }[];
}

interface Payload {
  kind: "repairs";
  changes: DescribedValue[];
  repairs: RepairOption[];
}

interface RepairOptionsProps {
  toolCallId: string;
  status: string;
  result?: string;
}

export function RepairOptions({ toolCallId, status, result }: RepairOptionsProps) {
  const { inert, dispatch } = useCardDispatch(toolCallId);

  if (status !== "complete" || !result) {
    return (
      <div className="my-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner className="size-3" /> checking the revision…
      </div>
    );
  }

  let payload: Payload;
  try {
    payload = JSON.parse(result);
    if (payload.kind !== "repairs") throw new Error("not a repair payload");
  } catch {
    // Passthrough ("Revised: …") and errors render as a plain tool row.
    return <ToolReasoning name="revise_choices" status={status} />;
  }

  const wanted = payload.changes
    .map((c) => `${c.label}: ${c.valueLabel}`)
    .join(", ");

  return (
    <Card
      className={`my-2 gap-0 py-0 shadow-none ${inert ? "opacity-60" : ""}`}
    >
      <CardContent className="space-y-2 p-3">
        <p className="text-sm">
          <span className="font-medium">{wanted}</span> collides with earlier
          decisions. Ways forward:
        </p>

        {payload.repairs.map((option, i) => (
          <RepairButton
            key={i}
            disabled={inert}
            onClick={() => dispatch(repairMessage(option.drop, payload.changes))}
          >
            <div>
              Give up{" "}
              {option.drop.map((d, j) => (
                <span key={d.variable}>
                  {j > 0 && ", "}
                  <span className="font-medium">
                    {d.label} = {d.valueLabel}
                  </span>
                </span>
              ))}
            </div>
            {option.ripple.length > 0 && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                then follows:{" "}
                {option.ripple
                  .map((r) => `${r.label} ${r.valueLabel}`)
                  .join(", ")}
              </div>
            )}
            {option.rules.length > 0 && (
              <div className="mt-0.5 text-[10px] text-muted-foreground">
                {option.rules.map((r) => r.label).join("; ")}
              </div>
            )}
          </RepairButton>
        ))}

        <RepairButton
          disabled={inert}
          onClick={() => dispatch(abandonMessage)}
          className="border-dashed text-muted-foreground"
        >
          Keep everything as it is — abandon this change
        </RepairButton>
      </CardContent>
    </Card>
  );
}

/**
 * A repair is a paragraph, not a label: multi-line, left-aligned and free to
 * grow, so the shared shape is a Button with its nowrap/centering relaxed.
 */
function RepairButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      className={cn(
        "block h-auto w-full whitespace-normal px-3 py-2 text-left text-sm font-normal hover:border-primary disabled:cursor-not-allowed",
        className,
      )}
      {...props}
    />
  );
}
