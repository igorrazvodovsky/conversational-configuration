/**
 * Chat UI registrations for the configurator (docs/specs/agreement-document).
 */
import { z } from "zod";
import {
  useDefaultRenderTool,
  useRenderTool,
} from "@copilotkit/react-core/v2";

import { AskChoices } from "@/components/generative-ui/ask-choices";
import type { CardProps } from "@/components/generative-ui/card-shell";
import { FrameComparison } from "@/components/generative-ui/frame-comparison";
import { RepairOptions } from "@/components/generative-ui/repair-options";
import { ToolReasoning } from "@/components/tool-rendering";

export const useConfiguratorUI = () => {
  // The agent's ask_choices tool renders as interactive controls.
  useRenderTool({
    name: "ask_choices",
    parameters: z.object({
      variables: z.array(z.string()),
      prompt: z.string().optional(),
    }),
    render: (props: CardProps) => <AskChoices {...props} />,
  });

  // Conflicting revisions render as repair cards (docs/specs/nonlinear-interaction).
  useRenderTool({
    name: "revise_choices",
    parameters: z.object({
      changes: z.record(z.string(), z.string()),
      source: z.string(),
      drop: z.array(z.string()).optional(),
    }),
    render: (props: CardProps) => <RepairOptions {...props} />,
  });

  // A reconciliation that collides returns the same repair payload as any
  // other revision, so it renders with the same cards — the criterion "a
  // reconciliation goes through the revision-with-repair flow" falling out of
  // reuse (docs/specs/rfq-reconciliation). Every other outcome is plain text,
  // which RepairOptions renders as a compact tool row.
  useRenderTool({
    name: "reconcile_requirement",
    parameters: z.object({
      variable: z.string(),
      move: z.string(),
      value: z.string().optional(),
    }),
    render: (props: CardProps) => <RepairOptions {...props} />,
  });

  // Frame comparisons render as a two-column diff card (docs/specs/nonlinear-interaction).
  useRenderTool({
    name: "compare_frames",
    parameters: z.object({
      a: z.string(),
      b: z.string().optional(),
    }),
    render: (props: CardProps) => <FrameComparison {...props} />,
  });

  // Every other backend tool renders as a compact reasoning row.
  useDefaultRenderTool({
    render: ({ name, status, parameters }) => (
      <ToolReasoning name={name} status={status} args={parameters} />
    ),
  });
};
