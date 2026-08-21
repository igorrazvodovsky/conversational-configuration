/**
 * Shared configurator types + product-model display data (docs/specs/agreement-document).
 *
 * The model JSON is imported straight from the agent so labels/groups/prices
 * have a single source of truth. Validity NEVER comes from here — only from
 * the solver-computed statuses in agent state (docs/specs/constitution.md #1).
 */
import rawModel from "../../agent/src/product_model/elevator.json";

export type OptionStatus = "chosen" | "forced" | "invalid" | "open";

/** "document" is the third provenance source (docs/specs/rfq-reconciliation):
 * a value the customer's own requirements document states. */
export type Source = "user" | "agent" | "document";

export interface Choice {
  value: string;
  source: Source;
}

/** Lifetime kg CO₂e (docs/specs/environmental-footprint). Absent on threads
 * persisted before the footprint feature — render "—" then. */
export interface Footprint {
  embodied: number;
  use_phase: number;
  total: number;
}

export interface Candidate {
  assignment: Record<string, string>;
  price: number;
  footprint?: Footprint;
  // which completion this is; absent on pre-footprint threads (always cheapest)
  objective?: "price" | "co2";
}

/** The frozen requirements document an RFQ-seeded agreement diverges from
 * (docs/specs/rfq-reconciliation). Immutable after ingestion apart from the
 * `reconciliation` mark — which is what lets the register be derived here
 * rather than stored. */
export interface Requirement {
  variable: string;
  value: string;
  clause: string;
  quote: string;
  reconciliation: "pending" | "waived" | "revised";
}

export interface RFQ {
  requirements: Requirement[];
  unmapped: { clause: string; quote: string; note: string }[];
  budget_cap?: number;
}

/** One draft of the agreement (docs/specs/parallel-drafts) — what rides in
 * agent state is always the current draft's. */
export interface Configuration {
  choices: Record<string, Choice>;
  statuses: Record<string, Record<string, OptionStatus>>;
  /**
   * Why an option cannot be taken, for every option that cannot: the named
   * rules behind it, straight from a solver core (docs/specs/constitution.md
   * #6). Absent on threads persisted before the field existed, which is why
   * every read goes through `rulesAgainst`.
   *
   * Each row is computed with that variable's own recorded choice lifted, so
   * presence here means "you cannot swap to this", not "you already chose
   * something else" — the distinction the option editor turns on.
   */
  unavailable?: Record<string, Record<string, Rule[]>>;
  candidate: Candidate | null;
  rfq?: RFQ; // only on document-seeded agreements
}

/** A product rule as the interface may quote it: the model's own id and label. */
export interface Rule {
  id: string;
  label: string;
}

/**
 * The rules that rule this value out, or null when it can be taken.
 *
 * The one place validity is read for an editable control. It deliberately does
 * not consult `statuses`: there, every alternative to a recorded choice is
 * invalid by construction, which would lock the document everywhere the
 * agreement has actually been decided. An empty array means unavailable with
 * no product rule to cite — the structural one-value-per-variable — and reads
 * as such.
 */
export function rulesAgainst(
  config: Configuration,
  variable: string,
  value: string,
): Rule[] | null {
  // The map's absence is the legacy case, not a variable's absence from it: a
  // variable with nothing ruled out has no row at all, and reading that as
  // "fall back to statuses" would put every decided term back behind the lock
  // this function exists to lift.
  const map = config.unavailable;
  if (!map) {
    return (config.statuses[variable]?.[value] ?? "open") === "invalid" ? [] : null;
  }
  return map[variable]?.[value] ?? null;
}

/** How an unavailable option explains itself, in one line. */
export function refusalText(rules: Rule[]): string {
  return rules.length
    ? `ruled out by ${rules.map((r) => r.label).join("; ")}`
    : "ruled out by your other choices — ask why in chat";
}

/** A draft as the switcher draws it, mirrored into agent state by the agent's
 * committing tools. `price` is null on a draft that has never been completed:
 * it lives on the candidate, and a change to a priced agreement now completes
 * again rather than dropping it (`_repriced` in the agent). */
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

/** How a value came to be in the agreement: its provenance if someone chose
 * it, else the rules, else the candidate's proposal, else nothing yet. */
export type ValueKind = Source | "forced" | "proposed" | "open";

export interface ResolvedValue {
  value: string | null;
  kind: ValueKind;
}

/** An agreement with nothing in it — what the canvas renders before agent
 * state arrives. The agent's own `empty_configuration()` is the authority on
 * the shape; this is its frontend counterpart. */
export function emptyConfiguration(): Configuration {
  return { choices: {}, statuses: {}, candidate: null };
}

/**
 * Whether the agreement says anything yet: nothing recorded and nothing
 * proposed is untouched. One test, because two surfaces turn on it — the
 * canvas shows its empty-document notice, and the suggestion strip decides
 * between entry prompts and moves on this agreement — and they may not
 * disagree about what an untouched agreement is.
 *
 * A document-seeded agreement is not untouched: its requirements are choices,
 * made upstream of the conversation (docs/specs/rfq-reconciliation).
 */
export function hasAnything(config: Configuration): boolean {
  return Object.keys(config.choices).length > 0 || config.candidate !== null;
}

/**
 * What the agreement currently says for a variable, and on whose authority:
 * the recorded choice, else the value the rules force, else the candidate's.
 * Never a validity judgment — every status here comes from the solver
 * (docs/specs/constitution.md #1).
 *
 * The single resolver behind every surface: the register compares against it,
 * and all three document layers render from it, so what the document shows and
 * what the register measures cannot diverge.
 */
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

/** `resolveValue` without the provenance. */
export function liveValue(
  config: Configuration,
  variable: string,
): string | null {
  return resolveValue(config, variable).value;
}

/**
 * The deviation register: the document's requirements against the live
 * agreement, one entry per requirement. Derived, never stored — the same
 * comparison the agent makes, recomputed on every render from the frozen
 * block and the values already in state, so it cannot go stale. The *rules*
 * behind a deviation are not in state; they are narrated in chat, grounded in
 * a solver core (docs/specs/rfq-reconciliation design).
 */
export function registerEntries(config: Configuration): RegisterEntry[] {
  return (config.rfq?.requirements ?? []).map((requirement) => {
    const offered = liveValue(config, requirement.variable);
    // met first: an agreement back on the document's value complies,
    // whatever mark reconciliation left behind
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
  /** Situational gloss — what this value means at the building, in the
   * building's language (docs/specs/agreement-document). Declarative product
   * knowledge, never composed at render time; only the options that carry one
   * are glossed, so the model's own data is the list. */
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

/** Named assessment assumptions, rendered by the canvas assumptions panel
 * (docs/specs/environmental-footprint decision 5). No arithmetic happens
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

function modelOption(variable: string, value: string): ModelOption | undefined {
  return variablesByName.get(variable)?.options.find((o) => o.value === value);
}

export function optionLabel(variable: string, value: string): string {
  return modelOption(variable, value)?.label ?? value;
}

/** A variable's display label, falling back to its name — so a model that
 * grows a variable the interface has not been told about still reads as
 * something rather than as nothing. */
export function variableLabel(variable: string): string {
  return variablesByName.get(variable)?.label ?? variable;
}

/** The situational gloss for a value, if the model carries one. */
export function optionNote(variable: string, value: string): string | undefined {
  return modelOption(variable, value)?.note;
}

/**
 * The three document layers (docs/specs/agreement-document), mapped onto the
 * model's own groups. A presentation heuristic that lives here beside the
 * control-selection one, not in the product model: adding a variable to a group
 * needs no layout decision, and UI concerns stay out of product data
 * (docs/specs/constitution.md #2).
 */
export type Layer = "recitals" | "terms" | "schedules";

const LAYER_OF_GROUP: Record<string, Layer> = {
  context: "recitals",
  agreement: "terms",
  performance: "terms",
};

export function layerOf(group: string): Layer {
  return LAYER_OF_GROUP[group] ?? "schedules";
}

/** Groups of one layer, in model order. */
export function layerGroups(layer: Layer): { name: string; variables: ModelVariable[] }[] {
  return modelGroups.filter((g) => layerOf(g.name) === layer);
}

/** Variables of one layer, in model order. */
export function layerVariables(layer: Layer): ModelVariable[] {
  return layerGroups(layer).flatMap((g) => g.variables);
}

/**
 * Which completion the solver returned, named as the objective it was
 * optimised for — so a lowest-footprint agreement is never labelled cheapest.
 * The canvas header and the consideration clause show the same figure and say
 * the same thing about it.
 */
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

/** kg CO₂e → "12.4 t CO₂e" (or "540 kg CO₂e" below a tonne). */
export function formatCO2(kg: number): string {
  return Math.abs(kg) >= 1000
    ? `${(kg / 1000).toLocaleString("en-IE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} t CO₂e`
    : `${kg} kg CO₂e`;
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
 * The structured control-activation message (docs/specs/agreement-document design):
 * a visible user message the agent records via set_choices. Includes both the
 * human-readable labels and the exact codes so the LLM never has to guess.
 */
export function choiceMessage(
  selections: { variable: string; value: string }[],
): string {
  const lines = selections.map(({ variable, value }) => {
    const varLabel = variableLabel(variable);
    return `Set ${varLabel} to ${optionLabel(variable, value)} (${variable}=${value})`;
  });
  return lines.join("\n");
}

/**
 * Marks a canvas-originated edit. The chat renders nothing for messages
 * carrying this prefix, and the agent prompt keys on it to stay quiet when
 * the edit applies cleanly (docs/specs/agreement-document design) — the
 * sheet already shows the change, so the conversation doesn't repeat it.
 */
export const CANVAS_EDIT_PREFIX = "Canvas edit: ";

/** A canvas edit: the choiceMessage grammar, hidden from the chat. */
export function canvasEditMessage(
  selections: { variable: string; value: string }[],
): string {
  return CANVAS_EDIT_PREFIX + choiceMessage(selections);
}

/**
 * Structured messages for the docs/specs/nonlinear-interaction cards. Same principle as
 * choiceMessage: a visible user message the agent maps onto one atomic tool
 * call (revise_choices with drop+changes).
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
        `set ${variableLabel(variable)} to ${optionLabel(variable, value)} (${variable}=${value})`,
    )
    .join("; ");
  return dropPart
    ? `Apply repair: drop ${dropPart}; ${changePart}`
    : `Apply repair: ${changePart}`;
}

export const abandonMessage =
  "Abandon the revision — keep the configuration as it is.";

/**
 * Reconciliation moves (docs/specs/rfq-reconciliation). Deliberately *visible*
 * messages, unlike the hidden `Canvas edit:` grammar: waiving or adjusting a
 * requirement of the customer's own document is negotiation and belongs in the
 * record, where sheet bookkeeping does not. The agent maps each onto one
 * reconcile_requirement call — prompt wording and this grammar are coupled.
 */
const RECONCILE_PREFIX = "Reconcile deviation: ";

export function acceptOfferedMessage(
  variable: string,
  offered: string,
): string {
  const label = variableLabel(variable);
  return `${RECONCILE_PREFIX}accept the offered ${label}, ${optionLabel(variable, offered)} (${variable}=${offered})`;
}

export function reviseRequirementMessage(
  variable: string,
  value: string,
): string {
  const label = variableLabel(variable);
  return `${RECONCILE_PREFIX}change ${label} to ${optionLabel(variable, value)} (${variable}=${value})`;
}

export function leaveOpenMessage(variable: string): string {
  const label = variableLabel(variable);
  return `${RECONCILE_PREFIX}leave ${label} (${variable}) open`;
}

/**
 * The draft moves (docs/specs/parallel-drafts), dispatched by the canvas head
 * and the comparison card. Visible, like undo and the reconciliation moves:
 * switching changes what the whole document says, and one transcript can hold
 * turns that acted on two drafts, so the sentence is what keeps it readable.
 * Each maps onto one atomic tool call — fork_draft, switch_draft,
 * discard_draft, compare_drafts.
 *
 * A fork carries no name: the agent names the draft from the conversation, and
 * asking the operator for one is exactly what the prompt forbids.
 */
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

/**
 * Undo and redo (docs/specs/undo). Visible, like the reconciliation moves and
 * unlike a canvas edit: after a restore the document shows only the restored
 * state, so the chat is the only place what was reversed can be said. Each
 * maps onto one atomic tool call — undo_change and redo_change.
 */
export const undoMessage = "Undo the last change";
export const redoMessage = "Redo the undone change";

/**
 * The same sentence, as the customer should read it.
 *
 * Every card grammar above spells option codes, because the agent maps the
 * sentence onto one atomic tool call and a label is not a key. But the
 * sentence is dispatched as the customer's own message and rendered in their
 * bubble, so the transcript was putting `contract_term=y10` in their mouth —
 * the catalogue vocabulary the whole surface exists to spare them
 * ([elicitation uses the building's vocabulary]). This drops the codes for
 * display only: what reaches the agent is untouched.
 *
 * Gated on the card prefixes rather than applied to all text, so a customer
 * who types a code sees what they typed.
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
    // "… 10 years (contract_term=y10)" — the label is already in the sentence
    .replace(/ \(([a-z_]+)=([a-z0-9_]+)\)/g, (whole, variable: string) =>
      variablesByName.has(variable) ? "" : whole,
    )
    // "leave Rated speed (rated_speed) open" — the variable named twice
    .replace(/ \(([a-z_]+)\)/g, (whole, variable: string) =>
      variablesByName.has(variable) ? "" : whole,
    )
    // "drop installation=modernization" — the repair's drop list, which has no
    // label of its own to fall back on. Said the way the card that dispatched
    // it says it: "Give up Installation type = Modernization (existing shaft)".
    .replace(
      /([a-z_]+)=([a-z0-9_]+)/g,
      (whole, variable: string, value: string) =>
        variablesByName.has(variable)
          ? `${variableLabel(variable)} = ${optionLabel(variable, value)}`
          : whole,
    );
}
