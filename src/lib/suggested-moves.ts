// docs/specs/suggested-moves/design.md
import {
  Configuration,
  optionLabel,
  productModel,
  registerEntries,
  resolveValue,
} from "@/lib/configurator";

export interface SuggestedMove {
  title: string;
  message: string;
}

export const ENTRY_PROMPTS: SuggestedMove[] = [
  move("We're planning a new hotel"),
  move("We need a bed lift for a new hospital wing"),
  move("We're modernizing an office building"),
  move("What decisions go into configuring an elevator?"),
  move("Can I start from our RFQ?"),
];

function move(text: string): SuggestedMove {
  return { title: text, message: text };
}

type MoveFamily = (
  config: Configuration,
  asked: ReadonlySet<string>,
) => SuggestedMove[] | null;

function hasAnything(config: Configuration): boolean {
  return Object.keys(config.choices).length > 0 || config.candidate !== null;
}

/** First in document order, so the strip does not reshuffle as other things
 * move. */
function answerTheDocument(config: Configuration): SuggestedMove[] | null {
  const pending = registerEntries(config).find((e) => e.status === "deviation");
  if (!pending) return null;
  return [
    move(
      `Clause ${pending.clause}: can we have ${optionLabel(pending.variable, pending.value)}?`,
    ),
  ];
}

/** One family yielding two pills, never two families yielding one each: a cap
 * counted in pills could drop the second
 * (docs/discovery/principles/trade-offs-shown-as-a-pair.md). */
function tradeOffPair(config: Configuration): SuggestedMove[] | null {
  if (!config.candidate) return null;
  return [move("Make it cheaper"), move("Lower the carbon")];
}

/** The question already asked is skipped rather than ending the family, so the
 * strip moves on to the next unexplained term. */
function askWhy(
  config: Configuration,
  asked: ReadonlySet<string>,
): SuggestedMove[] | null {
  for (const variable of productModel.variables) {
    const { value, kind } = resolveValue(config, variable.name);
    if (!value) continue;
    if (kind !== "forced" && kind !== "agent") continue;
    // The term, not the value: value labels run to a paragraph on a chip.
    const question = move(`Why this ${variable.label.toLowerCase()}?`);
    if (asked.has(question.message)) continue;
    return [question];
  }
  return null;
}

/** A hypothetical, not a claim about the building: the pill sends the
 * customer's words, so it may not put a fact in their mouth. */
function reviseByIntent(
  config: Configuration,
  asked: ReadonlySet<string>,
): SuggestedMove[] | null {
  const { value } = resolveValue(config, "usage_profile");
  if (!value || value === "heavy") return null;
  const question = move("What would change if the traffic were heavier?");
  if (asked.has(question.message)) return null;
  return [question];
}

const FAMILIES: MoveFamily[] = [
  answerTheDocument,
  tradeOffPair,
  askWhy,
  reviseByIntent,
];

/** Families, never pills — a cap counted in pills could split the pair. */
const MAX_FAMILIES = 3;

/**
 * Entry prompts need both tests: an agreement with nothing recorded is not
 * necessarily untouched, since the customer may have described the building and
 * had the agent ask back. State that has not arrived yet is the untouched case,
 * so a reload does not blank the surface on its way up.
 */
export function suggestedMoves(
  config: Configuration | undefined,
  hasTranscript: boolean,
  asked: ReadonlySet<string>,
): SuggestedMove[] {
  if (!config) return ENTRY_PROMPTS;
  if (!hasAnything(config)) return hasTranscript ? [] : ENTRY_PROMPTS;
  const moves: SuggestedMove[] = [];
  let families = 0;
  for (const family of FAMILIES) {
    if (families >= MAX_FAMILIES) break;
    const offered = family(config, asked);
    if (!offered) continue;
    families += 1;
    moves.push(...offered);
  }
  return moves;
}

/** What the strip says, not the state it says it about. */
export function movesSignature(moves: SuggestedMove[]): string {
  return moves.map((m) => `${m.title}\n${m.message}`).join("\n");
}
