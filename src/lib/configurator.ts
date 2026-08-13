/**
 * Shared configurator types + product-model display data (docs/specs/configuration-canvas).
 *
 * The model JSON is imported straight from the agent so labels/groups/prices
 * have a single source of truth. Validity NEVER comes from here — only from
 * the solver-computed statuses in agent state (docs/specs/constitution.md #1).
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
  frames?: Frame[]; // absent on threads persisted before docs/specs/nonlinear-interaction
}

export interface ModelOption {
  value: string;
  label: string;
  price?: number; // cost basis (EUR), amortized into the monthly fee — never shown raw
  monthly_price?: number; // recurring fee (EUR/month)
}

export interface ModelVariable {
  name: string;
  label: string;
  group: string;
  options: ModelOption[];
}

export interface Pricing {
  financing_factor: number;
  term_months: Record<string, number>;
  default_term: string;
}

export const productModel = rawModel as unknown as {
  product: string;
  name: string;
  pricing: Pricing;
  variables: ModelVariable[];
};

export const pricing = productModel.pricing;

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

export function formatMonthly(eurPerMonth: number): string {
  return `${formatPrice(eurPerMonth)}/mo`;
}

/**
 * An option's contribution to the monthly fee: its recurring fee, or its cost
 * basis amortized over `termMonths` (docs/specs/service-agreement). Mirrors the
 * agent's half-up rounding (Math.round rounds half up for positive values) —
 * the single place the frontend re-derives money, from the same imported JSON
 * the agent reads.
 */
export function monthlyDelta(option: ModelOption, termMonths: number): number {
  if (option.monthly_price) return option.monthly_price;
  if (!option.price) return 0;
  return Math.round((option.price * pricing.financing_factor) / termMonths);
}

/** Amortization months for display: the chosen term, else the candidate's, else the default. */
export function termMonthsInEffect(config: Configuration): number {
  const term =
    config.choices["contract_term"]?.value ??
    config.candidate?.assignment["contract_term"] ??
    pricing.default_term;
  return pricing.term_months[term] ?? pricing.term_months[pricing.default_term];
}

/**
 * The structured canvas-edit / control-activation message (docs/specs/configuration-canvas design):
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
 * Structured messages for the docs/specs/nonlinear-interaction cards. Same principle as
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
