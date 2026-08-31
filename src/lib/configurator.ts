// docs/specs/agreement-document/design.md
import rawModel from "../../agent/src/product_model/elevator.json";

export type OptionStatus = "chosen" | "forced" | "invalid" | "open";

export type Source = "user" | "agent" | "document";

export interface Choice {
  value: string;
  source: Source;
}

/** Absent on threads persisted before the footprint feature. */
export interface Footprint {
  embodied: number;
  use_phase: number;
  total: number;
}

export interface Candidate {
  assignment: Record<string, string>;
  price: number;
  footprint?: Footprint;
  /** Absent on pre-footprint threads, which were always cheapest. */
  objective?: "price" | "co2";
}

/** Which kind a clause is follows from the facts it carries: `variable` with
 * `value` asks for something, `variable` alone leaves the decision to us,
 * neither is a clause no variable carries. */
export interface Clause {
  id: string;
  clause: string; // the citation the document gives it — "5.2"
  quote: string;
  variable?: string;
  value?: string;
  note?: string;
  reconciliation?: "pending" | "waived" | "revised";
}

export interface Requirement extends Clause {
  variable: string;
  value: string;
}

export interface RFQ {
  clauses: Clause[];
  budget_cap?: number;
}

export function requirements(config: Configuration): Requirement[] {
  return (config.rfq?.clauses ?? []).filter(
    (clause): clause is Requirement => !!clause.variable && !!clause.value,
  );
}

export function clausesLeftToUs(config: Configuration): Clause[] {
  return (config.rfq?.clauses ?? []).filter(
    (clause) => !!clause.variable && !clause.value,
  );
}

export interface Configuration {
  choices: Record<string, Choice>;
  statuses: Record<string, Record<string, OptionStatus>>;
  /**
   * Computed with the variable's own recorded choice lifted, so presence here
   * means "you cannot swap to this", not "you already chose something else".
   * Absent on threads persisted before the field existed.
   */
  unavailable?: Record<string, Record<string, Rule[]>>;
  candidate: Candidate | null;
  rfq?: RFQ; // only on document-seeded agreements
}

export interface Rule {
  id: string;
  label: string;
}

/**
 * The rules that rule this value out, or null when it can be taken.
 *
 * Deliberately does not consult `statuses`, where every alternative to a
 * recorded choice is invalid by construction. An empty array means unavailable
 * with no product rule to cite.
 */
export function rulesAgainst(
  config: Configuration,
  variable: string,
  value: string,
): Rule[] | null {
  // The map's absence is the legacy case, not a variable's absence from it: a
  // variable with nothing ruled out has no row at all.
  const map = config.unavailable;
  if (!map) {
    return (config.statuses[variable]?.[value] ?? "open") === "invalid" ? [] : null;
  }
  return map[variable]?.[value] ?? null;
}

export function refusalText(rules: Rule[]): string {
  return rules.length
    ? `ruled out by ${rules.map((r) => r.label).join("; ")}`
    : "ruled out by your other choices — ask why in chat";
}

/** `price` is null on a draft that has never been completed: it lives on the
 * candidate. */
export interface DraftSummary {
  id: string;
  name: string;
  price: number | null;
}

export type RegisterStatus = "met" | "waived" | "revised" | "deviation";

export interface RegisterEntry extends Requirement {
  offered: string | null;
  status: RegisterStatus;
}

export type ValueKind = Source | "forced" | "proposed" | "open";

export interface ResolvedValue {
  value: string | null;
  kind: ValueKind;
}

/** Never a validity judgment — every status here comes from the solver. */
export function resolveValue(
  config: Configuration,
  variable: string,
): ResolvedValue {
  const chosen = config.choices[variable];
  if (chosen) return { value: chosen.value, kind: chosen.source };
  const forced = Object.entries(config.statuses[variable] ?? {}).find(
    ([, s]) => s === "forced",
  );
  if (forced) return { value: forced[0], kind: "forced" };
  const proposed = config.candidate?.assignment[variable];
  if (proposed) return { value: proposed, kind: "proposed" };
  return { value: null, kind: "open" };
}

export function liveValue(
  config: Configuration,
  variable: string,
): string | null {
  return resolveValue(config, variable).value;
}

/** Derived on every render rather than stored, so it cannot go stale. */
export function registerEntries(config: Configuration): RegisterEntry[] {
  return requirements(config).map((requirement) => {
    const offered = liveValue(config, requirement.variable);
    // met first: an agreement back on the document's value complies, whatever
    // mark reconciliation left behind
    const status: RegisterStatus =
      offered === requirement.value
        ? "met"
        : requirement.reconciliation === "waived"
          ? "waived"
          : requirement.reconciliation === "revised"
            ? "revised"
            : "deviation";
    return { ...requirement, offered, status };
  });
}

export interface ModelOption {
  value: string;
  label: string;
  price?: number; // cost basis (EUR), amortized into the monthly fee — never shown raw
  monthly_price?: number; // recurring fee (EUR/month)
  note?: string;
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

/** Rendered by the canvas assumptions panel. No arithmetic happens
 * frontend-side — footprint totals ride in agent state. */
export interface FootprintBlock {
  service_life_years: number;
  operating_days: number;
  grid_factor: number;
  grid_factor_decarbonising: number;
  fabrication_multiplier: number;
  module_scope: string;
  annual_kwh: Record<string, Record<string, Record<string, number>>>;
}

export const productModel = rawModel as unknown as {
  product: string;
  name: string;
  pricing: Pricing;
  footprint: FootprintBlock;
  variables: ModelVariable[];
};

export const pricing = productModel.pricing;
export const footprintBlock = productModel.footprint;

export const variablesByName: Map<string, ModelVariable> = new Map(
  productModel.variables.map((v) => [v.name, v]),
);

export const modelGroups: { name: string; variables: ModelVariable[] }[] = (() => {
  const groups: { name: string; variables: ModelVariable[] }[] = [];
  for (const v of productModel.variables) {
    const g = groups.find((x) => x.name === v.group);
    if (g) g.variables.push(v);
    else groups.push({ name: v.group, variables: [v] });
  }
  return groups;
})();

function modelOption(variable: string, value: string): ModelOption | undefined {
  return variablesByName.get(variable)?.options.find((o) => o.value === value);
}

export function optionLabel(variable: string, value: string): string {
  return modelOption(variable, value)?.label ?? value;
}

export function optionNote(variable: string, value: string): string | undefined {
  return modelOption(variable, value)?.note;
}

/** Here rather than in the product model, so adding a variable needs no layout
 * decision (constitution #2). */
export type Layer = "recitals" | "terms" | "schedules";

const LAYER_OF_GROUP: Record<string, Layer> = {
  context: "recitals",
  agreement: "terms",
  performance: "terms",
  // An obligation the building is held to, not hardware
  // (docs/specs/document-clauses/design.md decision 5).
  safety: "terms",
};

export function layerOf(group: string): Layer {
  return LAYER_OF_GROUP[group] ?? "schedules";
}

export function layerGroups(layer: Layer): { name: string; variables: ModelVariable[] }[] {
  return modelGroups.filter((g) => layerOf(g.name) === layer);
}

export function layerVariables(layer: Layer): ModelVariable[] {
  return layerGroups(layer).flatMap((g) => g.variables);
}

export function completionLabel(candidate: Candidate): string {
  return candidate.objective === "co2"
    ? "lowest-footprint completion"
    : "cheapest completion";
}

export function formatPrice(eur: number): string {
  return `€${eur.toLocaleString("en-IE")}`;
}

export function formatMonthly(eurPerMonth: number): string {
  return `${formatPrice(eurPerMonth)}/mo`;
}

export function formatCO2(kg: number): string {
  return Math.abs(kg) >= 1000
    ? `${(kg / 1000).toLocaleString("en-IE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} t CO₂e`
    : `${kg} kg CO₂e`;
}

/**
 * Mirrors the agent's half-up rounding: `Math.round` rounds half up for
 * positive values, which Python's `round` does not. The single place the
 * frontend re-derives money.
 */
export function monthlyDelta(option: ModelOption, termMonths: number): number {
  if (option.monthly_price) return option.monthly_price;
  if (!option.price) return 0;
  return Math.round((option.price * pricing.financing_factor) / termMonths);
}

export function termMonthsInEffect(config: Configuration): number {
  const term =
    config.choices["contract_term"]?.value ??
    config.candidate?.assignment["contract_term"] ??
    pricing.default_term;
  return pricing.term_months[term] ?? pricing.term_months[pricing.default_term];
}

export function choiceMessage(
  selections: { variable: string; value: string }[],
): string {
  const lines = selections.map(({ variable, value }) => {
    const varLabel = variablesByName.get(variable)?.label ?? variable;
    return `Set ${varLabel} to ${optionLabel(variable, value)} (${variable}=${value})`;
  });
  return lines.join("\n");
}

/** The agent prompt keys on this prefix to stay quiet when the edit applies
 * cleanly, and the chat renders no row for one. */
export const CANVAS_EDIT_PREFIX = "Canvas edit: ";

export function canvasEditMessage(
  selections: { variable: string; value: string }[],
): string {
  return CANVAS_EDIT_PREFIX + choiceMessage(selections);
}

/**
 * Matched on shape, not on the first word: "Set up an elevator for a hospital"
 * is prose. `is_gesture` in `agent/src/configuration.py` is the same predicate,
 * held equal by `tests/couplings.test.ts`.
 */
const SET_LINE = /^Set .+ to .+ \(([a-z][a-z0-9_]*)=([a-z0-9_]+)\)$/;

export function gestureSelections(
  content: string,
): { variable: string; value: string }[] | null {
  const body = content.startsWith(CANVAS_EDIT_PREFIX)
    ? content.slice(CANVAS_EDIT_PREFIX.length)
    : content;
  const lines = body.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length === 0) return null;
  const selections = [];
  for (const line of lines) {
    const match = SET_LINE.exec(line);
    if (!match) return null;
    selections.push({ variable: match[1], value: match[2] });
  }
  return selections;
}

export function isGesture(content: string): boolean {
  return (
    content.startsWith(CANVAS_EDIT_PREFIX) || gestureSelections(content) !== null
  );
}

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

const RECONCILE_PREFIX = "Reconcile deviation: ";

export function acceptOfferedMessage(
  variable: string,
  offered: string,
): string {
  const label = variablesByName.get(variable)?.label ?? variable;
  return `${RECONCILE_PREFIX}accept the offered ${label}, ${optionLabel(variable, offered)} (${variable}=${offered})`;
}

export function reviseRequirementMessage(
  variable: string,
  value: string,
): string {
  const label = variablesByName.get(variable)?.label ?? variable;
  return `${RECONCILE_PREFIX}change ${label} to ${optionLabel(variable, value)} (${variable}=${value})`;
}

export function leaveOpenMessage(variable: string): string {
  const label = variablesByName.get(variable)?.label ?? variable;
  return `${RECONCILE_PREFIX}leave ${label} (${variable}) open`;
}

export const forkDraftMessage = "Keep this draft and start another from it";

export function switchDraftMessage(draftName: string): string {
  return `Switch to draft "${draftName}"`;
}

export function discardDraftMessage(draftName: string): string {
  return `Discard draft "${draftName}"`;
}

export function compareDraftMessage(draftName: string): string {
  return `Compare draft "${draftName}" with the current one`;
}

export const undoMessage = "Undo the last change";
export const redoMessage = "Redo the undone change";

/**
 * The same sentence for display only — what reaches the agent is untouched.
 * The grammars spell option codes, and the customer's own bubble may not.
 * Gated on the card prefixes, so a customer who types a code sees what they
 * typed.
 */
const CARD_PREFIXES = [
  "Set ",
  "Apply repair:",
  "Reconcile deviation:",
  CANVAS_EDIT_PREFIX,
];

export function spokenText(content: string): string {
  if (!CARD_PREFIXES.some((prefix) => content.startsWith(prefix))) return content;
  return content
    .replace(/ \(([a-z_]+)=([a-z0-9_]+)\)/g, (whole, variable: string) =>
      variablesByName.has(variable) ? "" : whole,
    )
    .replace(/ \(([a-z_]+)\)/g, (whole, variable: string) =>
      variablesByName.has(variable) ? "" : whole,
    )
        // The repair's drop list, which has no label of its own.
    .replace(
      /([a-z_]+)=([a-z0-9_]+)/g,
      (whole, variable: string, value: string) =>
        variablesByName.has(variable)
          ? `${variablesByName.get(variable)!.label} = ${optionLabel(variable, value)}`
          : whole,
    );
}
