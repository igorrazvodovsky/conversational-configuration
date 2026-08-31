// docs/specs/agreement-document/design.md
import { z } from "zod";
import {
  useDefaultRenderTool,
  useRenderTool,
} from "@copilotkit/react-core/v2";

import { AskChoices } from "@/components/generative-ui/ask-choices";
import type { CardProps } from "@/components/generative-ui/card-shell";
import { DraftComparison } from "@/components/generative-ui/draft-comparison";
import { RepairOptions } from "@/components/generative-ui/repair-options";
import { ToolReasoning } from "@/components/tool-rendering";

export const useConfiguratorUI = () => {
  useRenderTool({
    name: "ask_choices",
    parameters: z.object({
      variables: z.array(z.string()),
      prompt: z.string().optional(),
    }),
    render: (props: CardProps) => <AskChoices {...props} />,
  });

  useRenderTool({
    name: "revise_choices",
    parameters: z.object({
      changes: z.record(z.string(), z.string()),
      source: z.string(),
      drop: z.array(z.string()).optional(),
    }),
    render: (props: CardProps) => <RepairOptions {...props} />,
  });

  // A reconciliation that collides returns the same repair payload, so it
  // renders with the same cards (docs/specs/rfq-reconciliation/design.md).
  useRenderTool({
    name: "reconcile_requirement",
    parameters: z.object({
      variable: z.string(),
      move: z.string(),
      value: z.string().optional(),
    }),
    render: (props: CardProps) => <RepairOptions {...props} />,
  });

  useRenderTool({
    name: "compare_drafts",
    parameters: z.object({
      a: z.string(),
      b: z.string().optional(),
    }),
    render: (props: CardProps) => <DraftComparison {...props} />,
  });

  // Every other backend tool renders as a compact reasoning row.
  useDefaultRenderTool({
    render: ({ name, status, parameters }) => (
      <ToolReasoning name={name} status={status} args={parameters} />
    ),
  });
};
