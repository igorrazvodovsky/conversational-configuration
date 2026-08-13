/**
 * Shared configurator types + product-model display data (specs/004).
 *
 * The model JSON is imported straight from the agent so labels/groups/prices
 * have a single source of truth. Validity NEVER comes from here — only from
 * the solver-computed statuses in agent state (specs/constitution.md #1).
 */
import rawModel from "../../agent/src/product_model/elevator.json";

export type OptionStatus = "chosen" | "forced" | "invalid" | "open";

export interface Choice {
  value: string;
  source: "user" | "agent";
}

export interface Candidate {
  assignment: Record<string, string>;
  price: number;
}

export interface Frame {
  name: string;
  assignment: Record<string, string>;
  price: number;
}

export interface Configuration {
  choices: Record<string, Choice>;
  statuses: Record<string, Record<string, OptionStatus>>;
  candidate: Candidate | null;
  frames?: Frame[]; // absent on threads persisted before specs/005
}

export interface ModelOption {
  value: string;
  label: string;
  price?: number;
}

export interface ModelVariable {
  name: string;
  label: string;
  group: string;
  options: ModelOption[];
}

export const productModel = rawModel as unknown as {
  product: string;
  name: string;
  variables: ModelVariable[];
};

export const variablesByName: Map<string, ModelVariable> = new Map(
  productModel.variables.map((v) => [v.name, v]),
);

/** Groups in model order, each with its variables in model order. */
export const modelGroups: { name: string; variables: ModelVariable[] }[] = (() => {
  const groups: { name: string; variables: ModelVariable[] }[] = [];
  for (const v of productModel.variables) {
    const g = groups.find((x) => x.name === v.group);
    if (g) g.variables.push(v);
    else groups.push({ name: v.group, variables: [v] });
  }
  return groups;
})();

export function optionLabel(variable: string, value: string): string {
  return (
    variablesByName.get(variable)?.options.find((o) => o.value === value)?.label ??
    value
  );
}

export function formatPrice(eur: number): string {
  return `€${eur.toLocaleString("en-IE")}`;
}

/**
 * The structured canvas-edit / control-activation message (specs/004 design):
 * a visible user message the agent records via set_choices. Includes both the
 * human-readable labels and the exact codes so the LLM never has to guess.
 */
export function choiceMessage(
  selections: { variable: string; value: string }[],
): string {
  const lines = selections.map(({ variable, value }) => {
    const varLabel = variablesByName.get(variable)?.label ?? variable;
    return `Set ${varLabel} to ${optionLabel(variable, value)} (${variable}=${value})`;
  });
  return lines.join("\n");
}

/**
 * Structured messages for the specs/005 cards. Same principle as
 * choiceMessage: a visible user message the agent maps onto one atomic tool
 * call (revise_choices with drop+changes / adopt_frame).
 */
export function repairMessage(
  drop: { variable: string; value: string }[],
  changes: { variable: string; value: string }[],
): string {
  const dropPart = drop
    .map(({ variable, value }) => `${variable}=${value}`)
    .join(", ");
  const changePart = changes
    .map(
      ({ variable, value }) =>
        `set ${variablesByName.get(variable)?.label ?? variable} to ${optionLabel(variable, value)} (${variable}=${value})`,
    )
    .join("; ");
  return dropPart
    ? `Apply repair: drop ${dropPart}; ${changePart}`
    : `Apply repair: ${changePart}`;
}

export const abandonMessage =
  "Abandon the revision — keep the configuration as it is.";

export function adoptMessage(frameName: string): string {
  return `Adopt frame "${frameName}"`;
}
