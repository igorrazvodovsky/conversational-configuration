/**
 * The move catalogue behind the suggestion strip (docs/specs/suggested-moves).
 *
 * Each family is a predicate over the agreement — and, for the two families
 * whose moves change nothing in it, over what the customer has already asked —
 * plus the pills to offer when it holds, phrased from the product model's own
 * display labels so a pill and the term it refers to call the same thing by the
 * same name. Nothing here is composed by the model, and nothing here dispatches:
 * a pill is a sentence the customer could have typed, sent on the path a typed
 * sentence takes.
 *
 * The catalogue lives here alone rather than beside the projection helpers it
 * calls, so that it can be read as a list of what the strip may say. What the
 * families decide is checked in `tests/suggested-moves.test.ts`; what the strip
 * looks like is still only visible in the app.
 */
import {
  Configuration,
  optionLabel,
  productModel,
  registerEntries,
  resolveValue,
} from "@/lib/configurator";

export interface SuggestedMove {
  /** The chip's text. It is always also the message, with no exception:
   * the customer reads the sentence they could have typed. */
  title: string;
  message: string;
}

/** The entry prompts, which are right exactly once — on a workspace where
 * nothing has been said yet. One per entrance, and each says the whole of what
 * it sends: these used to carry a short label over a longer message that named
 * a city, a floor count, a travel distance and a traffic profile the customer
 * never saw. A chip may assert what its own sentence says and nothing more
 * (docs/specs/suggested-moves design decision 2), so the specifics are left for
 * the agent to elicit.
 *
 * The last is the document entrance (docs/specs/rfq-reconciliation). It is
 * here rather than in a family below because it belongs to the untouched
 * workspace, and it is here at all because it is the one way in that a customer
 * cannot find by trying: the delivery lead's project has already written the
 * requirements, and nothing else in the interface says the composer will take
 * them. A click cannot carry the document, so the pill opens the subject and
 * the agent asks for the text. */
export const ENTRY_PROMPTS: SuggestedMove[] = [
  move("We're planning a new hotel"),
  move("We need a bed lift for a new hospital wing"),
  move("We're modernizing an office building"),
  move("What decisions go into configuring an elevator?"),
  move("Can I start from our RFQ?"),
];

/** A sentence that is its own chip. */
function move(text: string): SuggestedMove {
  return { title: text, message: text };
}

/**
 * A family, given the agreement and the sentences the customer has already
 * sent. Most families need only the first: the move they name changes the
 * agreement, so applying it is what stops them repeating. The two whose moves
 * change nothing — a question about a term, a hypothetical — would otherwise
 * recompute identically forever, so they read the second (design decision 7).
 */
type MoveFamily = (
  config: Configuration,
  asked: ReadonlySet<string>,
) => SuggestedMove[] | null;

/**
 * The same test the canvas applies: an agreement is untouched when nothing has
 * been recorded and nothing has been proposed. A document-seeded agreement is
 * not untouched — its requirements are choices, made upstream of the
 * conversation (docs/specs/rfq-reconciliation).
 */
function hasAnything(config: Configuration): boolean {
  return Object.keys(config.choices).length > 0 || config.candidate !== null;
}

/**
 * The customer's own document, still unanswered on one of its clauses. First in
 * document order, so the strip does not reshuffle as other things move. Plain
 * prose naming the clause — deliberately NOT the `Reconcile deviation: `
 * grammar the canvas margin uses, which stands for one atomic tool call; this
 * only opens the subject.
 */
function answerTheDocument(config: Configuration): SuggestedMove[] | null {
  const pending = registerEntries(config).find((e) => e.status === "deviation");
  if (!pending) return null;
  return [
    move(
      `Clause ${pending.clause}: can we have ${optionLabel(pending.variable, pending.value)}?`,
    ),
  ];
}

/**
 * The trade-off pair, in the conversation move inventory's own words. One
 * family yielding two pills, never two families yielding one each: a cap
 * counted in pills could drop the second and resolve the trade-off by omission,
 * which is the agent's first never-move
 * (docs/discovery/principles/trade-offs-shown-as-a-pair.md).
 */
function tradeOffPair(config: Configuration): SuggestedMove[] | null {
  if (!config.candidate) return null;
  return [move("Make it cheaper"), move("Lower the carbon")];
}

/**
 * A value nobody in the conversation chose: forced by the rules, or picked by
 * the agent as a default. Both owe an explanation the agent can ground
 * (constitution #6), and neither announces that it can be asked about.
 *
 * The question already asked is skipped rather than ending the family, so the
 * strip moves on to the next unexplained term. An agreement usually carries
 * several, and going silent after the first would answer one question and
 * conceal the rest.
 */
function askWhy(
  config: Configuration,
  asked: ReadonlySet<string>,
): SuggestedMove[] | null {
  for (const variable of productModel.variables) {
    const { value, kind } = resolveValue(config, variable.name);
    if (!value) continue;
    if (kind !== "forced" && kind !== "agent") continue;
    // The term, not the value: value labels run to "99.9 % uptime, 4 h
    // response, remote diagnostics", which is a paragraph on a chip, and the
    // canvas is already showing the value the question is about.
    const question = move(`Why this ${variable.label.toLowerCase()}?`);
    if (asked.has(question.message)) continue;
    return [question];
  }
  return null;
}

/**
 * Revision phrased as intent rather than as a value, against a term the
 * agreement already carries. A hypothetical, not a claim about the building:
 * the pill sends the customer's words, so it may not put a fact in their mouth.
 *
 * One sentence, so asking it retires the family until the profile changes.
 */
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

/** The strip's order, and the unit the cap counts in. */
const FAMILIES: MoveFamily[] = [
  answerTheDocument,
  tradeOffPair,
  askWhy,
  reviseByIntent,
];

/** At most this many families — never this many pills, or the pair could be
 * split (docs/specs/suggested-moves design decision 3). */
const MAX_FAMILIES = 3;

/**
 * What the customer can do next, given what the agreement says now. Entry
 * prompts before anything has been said; moves on this agreement once it says
 * something; an empty strip in between and whenever no family holds, because
 * stale pills are worse than none.
 *
 * The entry prompts need both tests. An agreement with nothing recorded is not
 * necessarily an untouched one — the customer may have described the building
 * and had the agent ask a question back — and offering a new hotel to someone
 * who has just described an office is the failure this spec exists to fix, one
 * turn in rather than three revisions in.
 *
 * State that has not arrived yet is the untouched case, not the no-moves case:
 * a reload should not blank the surface on its way up.
 *
 * `asked` is the set of sentences the customer has already sent, verbatim; a
 * pill's message is exactly what a click sends, so a pill that has been used
 * is one whose message is in the set.
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

/**
 * The strip's identity: what it says, not the state it says it about. Two
 * strips with the same signature are the same strip, whatever moved in state
 * between them.
 */
export function movesSignature(moves: SuggestedMove[]): string {
  return moves.map((m) => `${m.title}\n${m.message}`).join("\n");
}
