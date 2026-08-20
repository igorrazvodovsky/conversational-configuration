/**
 * The suggestion strip's catalogue (docs/specs/suggested-moves, checked per
 * docs/specs/offline-checks).
 *
 * Two properties hold across the whole catalogue and matter more than any
 * single family: a pill's message is a sentence the customer could have typed,
 * and the trade-off pair is offered as a pair or not at all — dropping one half
 * resolves the trade-off by omission, which is the agent's first never-move
 * (docs/discovery/principles/trade-offs-shown-as-a-pair.md).
 */
import { describe, expect, it } from "vitest";

import {
  ENTRY_PROMPTS,
  movesSignature,
  suggestedMoves,
} from "@/lib/suggested-moves";
import { optionLabel, productModel } from "@/lib/configurator";
import {
  agreement,
  candidate,
  chose,
  forcing,
  requirement,
  rfq,
} from "./agreement";

const NOTHING_ASKED: ReadonlySet<string> = new Set();
const moves = (config: Parameters<typeof suggestedMoves>[0], asked = NOTHING_ASKED) =>
  suggestedMoves(config, true, asked);

describe("the entry prompts", () => {
  it("stand in while state is still on its way, so a reload does not blank the strip", () => {
    expect(suggestedMoves(undefined, false, NOTHING_ASKED)).toEqual(ENTRY_PROMPTS);
    expect(suggestedMoves(undefined, true, NOTHING_ASKED)).toEqual(ENTRY_PROMPTS);
  });

  it("open a workspace where nothing has been said", () => {
    expect(suggestedMoves(agreement(), false, NOTHING_ASKED)).toEqual(ENTRY_PROMPTS);
  });

  it("stop once the customer has said something, even before anything is recorded", () => {
    // Offering a Munich hotel to someone who has just described a Berlin
    // office is the failure this catalogue exists to fix.
    expect(suggestedMoves(agreement(), true, NOTHING_ASKED)).toEqual([]);
  });

  it("offer the document entrance, which nothing else in the interface announces", () => {
    // The delivery lead's project has already written the requirements, and the
    // composer does not say it will take them (docs/specs/suggested-moves).
    const offered = suggestedMoves(agreement(), false, NOTHING_ASKED);
    expect(offered.some((m) => /RFQ|requirements/i.test(m.message))).toBe(true);
  });

  it("keep the wording the demo scenarios open from", () => {
    // The set may gain a prompt; it may not lose or reword one.
    for (const opening of [
      "We're planning a new 6-storey hotel in Munich",
      "New hospital wing in Boston",
      "We're modernizing a 1970s office building in Berlin",
      "What decisions go into configuring an elevator here",
    ]) {
      expect(ENTRY_PROMPTS.some((m) => m.message.startsWith(opening))).toBe(true);
    }
  });

  it("stop on a document-seeded agreement, whose requirements are choices already", () => {
    const seeded = agreement({
      choices: chose({ building_type: "office" }, "document"),
      rfq: rfq([requirement("building_type", "office")]),
    });
    expect(suggestedMoves(seeded, false, NOTHING_ASKED)).not.toEqual(ENTRY_PROMPTS);
  });
});

describe("answering the customer's own document", () => {
  it("names the first unanswered clause in document order", () => {
    const config = agreement({
      choices: chose({ rated_load: "kg1000", rated_speed: "mps1_6" }, "document"),
      rfq: rfq([
        requirement("rated_load", "kg1600", { clause: "3.1" }),
        requirement("rated_speed", "mps3_0", { clause: "3.2" }),
      ]),
    });
    const [first] = moves(config);
    expect(first.message).toContain("Clause 3.1");
    expect(first.message).toContain(optionLabel("rated_load", "kg1600"));
  });

  it("says nothing about a document whose clauses are all answered", () => {
    const config = agreement({
      choices: chose({ rated_load: "kg1600" }, "document"),
      rfq: rfq([requirement("rated_load", "kg1600")]),
    });
    expect(moves(config).some((m) => m.message.startsWith("Clause"))).toBe(false);
  });

  it("opens the subject in prose, never in the reconciliation grammar", () => {
    const config = agreement({
      choices: chose({ rated_load: "kg1000" }, "document"),
      rfq: rfq([requirement("rated_load", "kg1600")]),
    });
    expect(moves(config)[0].message).not.toContain("Reconcile deviation:");
  });
});

describe("the trade-off pair", () => {
  const priced = agreement({
    choices: chose({ building_type: "hotel" }),
    candidate: candidate({ building_type: "hotel" }, 1450),
  });

  it("is offered whole once there is a priced agreement to move", () => {
    const messages = moves(priced).map((m) => m.message);
    expect(messages).toContain("Make it cheaper");
    expect(messages).toContain("Lower the carbon");
  });

  it("is not offered at all before there is a price", () => {
    const unpriced = agreement({ choices: chose({ building_type: "hotel" }) });
    const messages = moves(unpriced).map((m) => m.message);
    expect(messages).not.toContain("Make it cheaper");
    expect(messages).not.toContain("Lower the carbon");
  });

  it("survives the family cap as a pair, never as a half", () => {
    // Every family holding at once: the cap counts families, so the pair is
    // either both pills or neither.
    const crowded = agreement({
      choices: chose({ rated_load: "kg1000" }, "document"),
      statuses: forcing({ rescue_operation: "ard" }),
      candidate: candidate({ building_type: "hotel", usage_profile: "low" }, 1450),
      rfq: rfq([requirement("rated_load", "kg1600")]),
    });
    const messages = moves(crowded).map((m) => m.message);
    const halves = ["Make it cheaper", "Lower the carbon"].filter((m) =>
      messages.includes(m),
    );
    expect(halves.length === 0 || halves.length === 2).toBe(true);
  });
});

describe("asking why a value nobody chose is there", () => {
  it("asks about a forced value, by the term rather than by the value", () => {
    const config = agreement({
      choices: chose({ building_type: "hospital" }),
      statuses: forcing({ rescue_operation: "ard" }),
    });
    const asked = moves(config).find((m) => m.message.startsWith("Why this"));
    expect(asked?.message).toBe(
      `Why this ${
        productModel.variables.find((v) => v.name === "rescue_operation")!.label
          .toLowerCase()
      }?`,
    );
  });

  it("asks about a value the agent picked, which owes an explanation too", () => {
    const config = agreement({ choices: chose({ cop: "touch_premium" }, "agent") });
    expect(moves(config).some((m) => m.message.startsWith("Why this"))).toBe(true);
  });

  it("never asks about a value the customer chose themselves", () => {
    const config = agreement({ choices: chose({ cop: "touch_premium" }, "user") });
    expect(moves(config).some((m) => m.message.startsWith("Why this"))).toBe(false);
  });

  it("moves on to the next unexplained term rather than going silent", () => {
    const config = agreement({
      choices: chose({ building_type: "hospital" }, "agent"),
      statuses: forcing({ rescue_operation: "ard" }),
    });
    const first = moves(config).find((m) => m.message.startsWith("Why this"))!;
    const second = moves(config, new Set([first.message])).find((m) =>
      m.message.startsWith("Why this"),
    );
    expect(second).toBeDefined();
    expect(second!.message).not.toBe(first.message);
  });
});

describe("revising by intent", () => {
  const lighterTraffic = agreement({
    choices: chose({ usage_profile: "low" }),
  });

  it("asks a hypothetical, never putting a fact in the customer's mouth", () => {
    const move = moves(lighterTraffic).find((m) => m.message.startsWith("What would"));
    expect(move?.message).toBe("What would change if the traffic were heavier?");
  });

  it("retires once asked", () => {
    const asked = new Set(["What would change if the traffic were heavier?"]);
    expect(
      moves(lighterTraffic, asked).some((m) => m.message.startsWith("What would")),
    ).toBe(false);
  });

  it("says nothing when the traffic is already the heaviest there is", () => {
    const heavy = agreement({ choices: chose({ usage_profile: "heavy" }) });
    expect(moves(heavy).some((m) => m.message.startsWith("What would"))).toBe(false);
  });
});

describe("the strip as a whole", () => {
  it("offers at most three families", () => {
    const crowded = agreement({
      choices: chose({ rated_load: "kg1000", usage_profile: "low" }, "document"),
      statuses: forcing({ rescue_operation: "ard" }),
      candidate: candidate({ building_type: "hotel" }, 1450),
      rfq: rfq([requirement("rated_load", "kg1600")]),
    });
    // three families, one of which yields two pills
    expect(moves(crowded).length).toBeLessThanOrEqual(4);
  });

  it("says nothing rather than something stale when no family holds", () => {
    const nothingToSay = agreement({ choices: chose({ usage_profile: "heavy" }) });
    expect(moves(nothingToSay)).toEqual([]);
  });

  it("makes every pill a sentence the customer could have typed", () => {
    const config = agreement({
      choices: chose({ rated_load: "kg1000", usage_profile: "low" }, "document"),
      statuses: forcing({ rescue_operation: "ard" }),
      candidate: candidate({ building_type: "hotel" }, 1450),
      rfq: rfq([requirement("rated_load", "kg1600")]),
    });
    for (const move of [...moves(config), ...ENTRY_PROMPTS]) {
      expect(move.message).not.toMatch(/[a-z_]+=[a-z0-9_]+/);
      expect(move.message.trim()).toBe(move.message);
      expect(move.message.length).toBeGreaterThan(0);
    }
  });

  it("identifies a strip by what it says, not by the state it says it about", () => {
    const config = agreement({ candidate: candidate({}, 1450) });
    const other = agreement({ candidate: candidate({}, 1600) });
    expect(movesSignature(moves(config))).toBe(movesSignature(moves(other)));
    expect(movesSignature(moves(config))).not.toBe(movesSignature(ENTRY_PROMPTS));
  });
});
