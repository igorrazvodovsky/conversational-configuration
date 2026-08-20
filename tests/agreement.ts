/**
 * An agreement to check the projection helpers against (docs/specs/offline-checks).
 *
 * Built here rather than fetched, because these checks run offline. The shape
 * is the one the agent writes; `couplings.test.ts` asserts that it still is.
 */
import type {
  Candidate,
  Choice,
  Configuration,
  OptionStatus,
  RFQ,
  Requirement,
  Rule,
  Source,
} from "@/lib/configurator";
import { productModel } from "@/lib/configurator";

/** Every option of every variable open, as a fresh agreement carries them. */
export function openStatuses(): Record<string, Record<string, OptionStatus>> {
  const statuses: Record<string, Record<string, OptionStatus>> = {};
  for (const variable of productModel.variables) {
    statuses[variable.name] = Object.fromEntries(
      variable.options.map((o) => [o.value, "open" as OptionStatus]),
    );
  }
  return statuses;
}

export function agreement(
  overrides: Partial<Configuration> = {},
): Configuration {
  return {
    choices: {},
    statuses: openStatuses(),
    candidate: null,
    ...overrides,
  };
}

/** Recorded choices, all from one source. */
export function chose(
  values: Record<string, string>,
  source: Source = "user",
): Record<string, Choice> {
  return Object.fromEntries(
    Object.entries(values).map(([variable, value]) => [
      variable,
      { value, source },
    ]),
  );
}

/** Statuses with one variable's value marked as the rules forced it. */
export function forcing(
  values: Record<string, string>,
): Record<string, Record<string, OptionStatus>> {
  const statuses = openStatuses();
  for (const [variable, value] of Object.entries(values)) {
    statuses[variable][value] = "forced";
  }
  return statuses;
}

export function candidate(
  assignment: Record<string, string>,
  price: number,
  extra: Partial<Candidate> = {},
): Candidate {
  return { assignment, price, ...extra };
}

export function requirement(
  variable: string,
  value: string,
  overrides: Partial<Requirement> = {},
): Requirement {
  return {
    variable,
    value,
    clause: "3.1",
    quote: `clause about ${variable}`,
    reconciliation: "pending",
    ...overrides,
  };
}

export function rfq(requirements: Requirement[], budget_cap?: number): RFQ {
  return { requirements, unmapped: [], ...(budget_cap ? { budget_cap } : {}) };
}

export const A_RULE: Rule = { id: "R1", label: "a rule with a label" };
