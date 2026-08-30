/**
 * An agreement to check the projection helpers against (docs/specs/offline-checks).
 *
 * Built here rather than fetched, because these checks run offline. The shape
 * is the one the agent writes; `couplings.test.ts` asserts that it still is.
 */
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

/**
 * Statuses as the solver produces them once a variable is decided: the value
 * carries `kind`, and every sibling is invalid — never left open, which is a
 * state no real agreement is ever in. `couplings.test.ts` reads that invariant
 * off agreements the agent actually built and asserts it of everything here.
 */
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

/**
 * `statuses` is derived from `choices` unless given explicitly, so the two
 * cannot be handed in disagreeing with each other — a recorded choice sitting
 * beside statuses that call every option open is the impossible fixture this
 * helper exists to prevent.
 */
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
    // Applied over any statuses handed in, so a fixture that sets a forced
    // value and records a choice gets both, each solver-shaped.
    statuses: decide(overrides.statuses ?? openStatuses(), chosen, "chosen"),
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

/**
 * Statuses with one variable's value marked as the rules forced it — and its
 * siblings invalid, because a value the rules force is the only one left.
 */
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

/** A clause the document leaves to us: it carries a variable and asks for no
 * value (docs/specs/document-clauses). */
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
