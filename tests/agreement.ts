// docs/specs/offline-checks/design.md. Built here rather than fetched, because
// these checks run offline; `couplings.test.ts` asserts the shape is still the
// agent's.
import type {
  Candidate,
  Choice,
  Clause,
  Configuration,
  OptionStatus,
  RFQ,
  Requirement,
  Rule,
  Source,
} from "@/lib/configurator";
import { productModel } from "@/lib/configurator";

export function openStatuses(): Record<string, Record<string, OptionStatus>> {
  const statuses: Record<string, Record<string, OptionStatus>> = {};
  for (const variable of productModel.variables) {
    statuses[variable.name] = Object.fromEntries(
      variable.options.map((o) => [o.value, "open" as OptionStatus]),
    );
  }
  return statuses;
}

/** As the solver produces them once a variable is decided: the value carries
 * `kind` and every sibling is invalid, never left open. */
function decide(
  statuses: Record<string, Record<string, OptionStatus>>,
  values: Record<string, string>,
  kind: OptionStatus,
): Record<string, Record<string, OptionStatus>> {
  const decided = Object.fromEntries(
    Object.entries(statuses).map(([variable, options]) => [
      variable,
      { ...options },
    ]),
  );
  for (const [variable, value] of Object.entries(values)) {
    if (!decided[variable]) continue;
    for (const option of Object.keys(decided[variable])) {
      decided[variable][option] = option === value ? kind : "invalid";
    }
  }
  return decided;
}

/** Derived from `choices` unless given explicitly, so a recorded choice cannot
 * sit beside statuses that call every option open. */
export function agreement(
  overrides: Partial<Configuration> = {},
): Configuration {
  const choices = overrides.choices ?? {};
  const chosen = Object.fromEntries(
    Object.entries(choices).map(([variable, choice]) => [variable, choice.value]),
  );
  return {
    candidate: null,
    ...overrides,
    choices,
  // Applied over any statuses handed in, so a fixture that forces a value and
  // records a choice gets both.
    statuses: decide(overrides.statuses ?? openStatuses(), chosen, "chosen"),
  };
}

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

/** Siblings invalid, because a value the rules force is the only one left. */
export function forcing(
  values: Record<string, string>,
): Record<string, Record<string, OptionStatus>> {
  return decide(openStatuses(), values, "forced");
}

export function candidate(
  assignment: Record<string, string>,
  price: number,
  extra: Partial<Candidate> = {},
): Candidate {
  return { assignment, price, ...extra };
}

let minted = 0;

export function requirement(
  variable: string,
  value: string,
  overrides: Partial<Requirement> = {},
): Requirement {
  return {
    id: `clause-${(minted += 1)}`,
    variable,
    value,
    clause: "3.1",
    quote: `clause about ${variable}`,
    reconciliation: "pending",
    ...overrides,
  };
}

export function leftToUs(
  variable: string,
  overrides: Partial<Clause> = {},
): Clause {
  return {
    id: `clause-${(minted += 1)}`,
    variable,
    clause: "5.2",
    quote: `clause leaving ${variable} to us`,
    ...overrides,
  };
}

export function rfq(clauses: Clause[], budget_cap?: number): RFQ {
  return { clauses, ...(budget_cap ? { budget_cap } : {}) };
}

export const A_RULE: Rule = { id: "R1", label: "a rule with a label" };
