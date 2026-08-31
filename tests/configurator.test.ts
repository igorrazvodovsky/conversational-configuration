/**
 * The projection helpers and the message grammar (docs/specs/offline-checks).
 *
 * `src/lib/configurator.ts` is the frontend's whole understanding of the
 * agreement: what a variable currently says and on whose authority, which
 * layer of the document it belongs to, what its monthly contribution is, and
 * what sentence a click on it dispatches. None of it renders anything, and
 * none of it decides validity — every status here came from the solver
 * (constitution #1).
 */
import { describe, expect, it } from "vitest";

import {
  CANVAS_EDIT_PREFIX,
  acceptOfferedMessage,
  canvasEditMessage,
  choiceMessage,
  compareDraftMessage,
  completionLabel,
  discardDraftMessage,
  formatCO2,
  formatMonthly,
  formatPrice,
  gestureSelections,
  isGesture,
  layerGroups,
  layerOf,
  layerVariables,
  leaveOpenMessage,
  liveValue,
  modelGroups,
  monthlyDelta,
  optionLabel,
  optionNote,
  pricing,
  productModel,
  refusalText,
  clausesLeftToUs,
  registerEntries,
  requirements,
  repairMessage,
  resolveValue,
  reviseRequirementMessage,
  rulesAgainst,
  spokenText,
  switchDraftMessage,
  termMonthsInEffect,
  undoMessage,
  variablesByName,
} from "@/lib/configurator";
import {
  A_RULE,
  agreement,
  candidate,
  chose,
  forcing,
  leftToUs,
  openStatuses,
  requirement,
  rfq,
} from "./agreement";

describe("what the agreement currently says", () => {
  it("prefers a recorded choice and keeps its provenance", () => {
    const config = agreement({
      choices: chose({ building_type: "hospital" }, "document"),
      statuses: forcing({ building_type: "office" }),
      candidate: candidate({ building_type: "hotel" }, 900),
    });
    expect(resolveValue(config, "building_type")).toEqual({
      value: "hospital",
      kind: "document",
    });
  });

  it("falls back to what the rules force, then to what the candidate proposes", () => {
    const forced = agreement({ statuses: forcing({ rescue_operation: "ard" }) });
    expect(resolveValue(forced, "rescue_operation")).toEqual({
      value: "ard",
      kind: "forced",
    });

    const proposed = agreement({
      candidate: candidate({ rescue_operation: "ard" }, 900),
    });
    expect(resolveValue(proposed, "rescue_operation")).toEqual({
      value: "ard",
      kind: "proposed",
    });
  });

  it("says open when nothing has decided a variable", () => {
    expect(resolveValue(agreement(), "mirror")).toEqual({
      value: null,
      kind: "open",
    });
    expect(liveValue(agreement(), "mirror")).toBeNull();
  });

  it("reads a variable the statuses do not carry as open rather than throwing", () => {
    const config = agreement({ statuses: {} });
    expect(resolveValue(config, "mirror").kind).toBe("open");
  });
});

describe("why an option cannot be taken", () => {
  it("returns the rules behind it, and null for one that can", () => {
    const config = agreement({
      unavailable: { rated_speed: { mps3_0: [A_RULE] } },
    });
    expect(rulesAgainst(config, "rated_speed", "mps3_0")).toEqual([A_RULE]);
    expect(rulesAgainst(config, "rated_speed", "mps1_6")).toBeNull();
  });

  it("does not lock a decided term just because its alternatives are invalid", () => {
    // Every alternative to a recorded choice is invalid by construction. The
    // map is what distinguishes "you cannot swap to this" from "you already
    // chose something else".
    const statuses = openStatuses();
    statuses.rated_speed.mps3_0 = "invalid";
    const config = agreement({
      choices: chose({ rated_speed: "mps1_6" }),
      statuses,
      unavailable: {},
    });
    expect(rulesAgainst(config, "rated_speed", "mps3_0")).toBeNull();
  });

  it("falls back to the statuses on an agreement written before the map existed", () => {
    const statuses = openStatuses();
    statuses.rated_speed.mps3_0 = "invalid";
    const legacy = agreement({ statuses });
    expect(rulesAgainst(legacy, "rated_speed", "mps3_0")).toEqual([]);
  });

  it("says so even when no product rule can be cited", () => {
    expect(refusalText([])).toContain("ask why in chat");
    expect(refusalText([A_RULE])).toContain(A_RULE.label);
  });
});

describe("the deviation register", () => {
  const seeded = (
    requirements: Parameters<typeof rfq>[0],
    values: Record<string, string>,
  ) =>
    agreement({
      choices: chose(values, "document"),
      rfq: rfq(requirements),
    });

  it("reads a met requirement as met whatever mark reconciliation left", () => {
    const config = seeded(
      [requirement("rated_load", "kg1000", { reconciliation: "waived" })],
      { rated_load: "kg1000" },
    );
    expect(registerEntries(config)[0].status).toBe("met");
  });

  it("names an unanswered difference a deviation and carries what is offered", () => {
    const config = seeded([requirement("rated_load", "kg1600")], {
      rated_load: "kg1000",
    });
    expect(registerEntries(config)[0]).toMatchObject({
      status: "deviation",
      offered: "kg1000",
    });
  });

  it("keeps a waived or revised requirement listed, never forgotten", () => {
    const config = seeded(
      [
        requirement("rated_load", "kg1600", { reconciliation: "waived" }),
        requirement("rated_speed", "mps3_0", {
          clause: "3.2",
          reconciliation: "revised",
        }),
      ],
      { rated_load: "kg1000", rated_speed: "mps1_6" },
    );
    expect(registerEntries(config).map((e) => e.status)).toEqual([
      "waived",
      "revised",
    ]);
  });

  it("is empty on an agreement with no document behind it", () => {
    expect(registerEntries(agreement())).toEqual([]);
  });

  it("has no row for a clause that asks for nothing", () => {
    // A clause left to us and a clause no variable carries are clauses of the
    // same list (docs/specs/document-clauses); neither can deviate from
    // anything, so neither is in the register.
    const config = agreement({
      choices: chose({ rated_load: "kg1000" }, "document"),
      rfq: rfq([
        requirement("rated_load", "kg1000"),
        leftToUs("contract_term"),
        { id: "c-x", clause: "6.3", quote: "possession", note: "programme" },
      ]),
    });
    // Which is also what routes the click: the canvas reconciles a term with a
    // register row and edits every other one, so a term the document left to us
    // edits (docs/specs/document-clauses, decision 6).
    expect(registerEntries(config).map((e) => e.variable)).toEqual([
      "rated_load",
    ]);
    expect(requirements(config)).toHaveLength(1);
    expect(clausesLeftToUs(config).map((c) => c.variable)).toEqual([
      "contract_term",
    ]);
  });
});

describe("the document's three layers", () => {
  it("maps every model group onto exactly one layer", () => {
    for (const group of modelGroups) {
      expect(["recitals", "terms", "schedules"]).toContain(layerOf(group.name));
    }
  });

  it("puts the building in the recitals and the commercial terms in the terms", () => {
    expect(layerOf("context")).toBe("recitals");
    expect(layerOf("agreement")).toBe("terms");
    expect(layerOf("performance")).toBe("terms");
    // A safety obligation is an operative term, not a schedule the vendor
    // derives (docs/specs/document-clauses, decision 5).
    expect(layerOf("safety")).toBe("terms");
  });

  it("sends anything the mapping does not name to the schedules", () => {
    expect(layerOf("a group the model does not have")).toBe("schedules");
  });

  it("covers every variable exactly once across the three layers", () => {
    const layered = (["recitals", "terms", "schedules"] as const).flatMap((l) =>
      layerVariables(l).map((v) => v.name),
    );
    expect(layered.slice().sort()).toEqual(
      productModel.variables.map((v) => v.name).sort(),
    );
    expect(new Set(layered).size).toBe(layered.length);
  });

  it("keeps the model's own order within a layer", () => {
    const groups = layerGroups("terms").map((g) => g.name);
    const inModel = modelGroups.map((g) => g.name).filter((n) => groups.includes(n));
    expect(groups).toEqual(inModel);
  });
});

describe("money and carbon, as the sheet writes them", () => {
  it("formats a monthly fee with its currency and period", () => {
    expect(formatPrice(1250)).toBe("€1,250");
    expect(formatMonthly(1250)).toBe("€1,250/mo");
  });

  it("switches to tonnes at a tonne", () => {
    expect(formatCO2(540)).toBe("540 kg CO₂e");
    expect(formatCO2(12400)).toBe("12.4 t CO₂e");
    expect(formatCO2(-12400)).toBe("-12.4 t CO₂e");
  });

  it("amortizes a capital option over the term in effect", () => {
    const option = { value: "x", label: "X", price: 12000 };
    const months = pricing.term_months[pricing.default_term];
    expect(monthlyDelta(option, months)).toBe(
      Math.round((12000 * pricing.financing_factor) / months),
    );
  });

  it("takes a recurring fee as it stands, whatever the term", () => {
    const option = { value: "x", label: "X", monthly_price: 300 };
    expect(monthlyDelta(option, 60)).toBe(300);
    expect(monthlyDelta(option, 180)).toBe(300);
  });

  it("charges nothing for an option with no price at all", () => {
    expect(monthlyDelta({ value: "x", label: "X" }, 120)).toBe(0);
  });

  it("takes the term from the choice, then the candidate, then the default", () => {
    const chosen = agreement({ choices: chose({ contract_term: "y5" }) });
    expect(termMonthsInEffect(chosen)).toBe(pricing.term_months.y5);

    const proposed = agreement({
      candidate: candidate({ contract_term: "y15" }, 900),
    });
    expect(termMonthsInEffect(proposed)).toBe(pricing.term_months.y15);

    expect(termMonthsInEffect(agreement())).toBe(
      pricing.term_months[pricing.default_term],
    );
  });

  it("names the completion by the objective it was solved for", () => {
    expect(completionLabel(candidate({}, 900, { objective: "co2" }))).toContain(
      "footprint",
    );
    expect(completionLabel(candidate({}, 900))).toContain("cheapest");
  });
});

describe("the labels the surface speaks in", () => {
  it("gives every option of every variable a label", () => {
    for (const variable of productModel.variables) {
      for (const option of variable.options) {
        expect(optionLabel(variable.name, option.value)).toBeTruthy();
      }
    }
  });

  it("falls back to the code when the model has no such option", () => {
    expect(optionLabel("building_type", "not_a_value")).toBe("not_a_value");
    expect(optionNote("building_type", "not_a_value")).toBeUndefined();
  });

  it("indexes every variable by name", () => {
    expect(variablesByName.size).toBe(productModel.variables.length);
  });
});

describe("the sentences a click dispatches", () => {
  it("spells both the label and the code, so the agent never guesses", () => {
    const message = choiceMessage([
      { variable: "building_type", value: "hospital" },
    ]);
    expect(message).toBe(
      `Set ${variablesByName.get("building_type")!.label} to ${optionLabel(
        "building_type",
        "hospital",
      )} (building_type=hospital)`,
    );
  });

  it("puts one selection per line", () => {
    const message = choiceMessage([
      { variable: "building_type", value: "hospital" },
      { variable: "region", value: "europe" },
    ]);
    expect(message.split("\n")).toHaveLength(2);
  });

  it("marks a canvas edit with the prefix the chat filters on", () => {
    const selections = [{ variable: "region", value: "europe" }];
    expect(canvasEditMessage(selections)).toBe(
      CANVAS_EDIT_PREFIX + choiceMessage(selections),
    );
  });

  it("reads back the pairs it minted, from either form of the sentence", () => {
    const selections = [
      { variable: "building_type", value: "hospital" },
      { variable: "region", value: "europe" },
    ];
    expect(gestureSelections(choiceMessage(selections))).toEqual(selections);
    expect(gestureSelections(canvasEditMessage(selections))).toEqual(selections);
  });

  it("reads a gesture in the sentences that set a value, and nowhere else", () => {
    const selections = [{ variable: "region", value: "europe" }];
    expect(isGesture(choiceMessage(selections))).toBe(true);
    expect(isGesture(canvasEditMessage(selections))).toBe(true);
    // A repair and a reconciliation are negotiations and keep their row.
    expect(isGesture(repairMessage([], selections))).toBe(false);
    expect(isGesture(acceptOfferedMessage("region", "europe"))).toBe(false);
    expect(isGesture(undoMessage)).toBe(false);
  });

  it("leaves prose alone, however it opens", () => {
    // What separates the two is the parenthesised code, which no customer
    // types. Held on both sides of the language boundary in couplings.test.ts.
    expect(isGesture("Set up an elevator for a hospital")).toBe(false);
    expect(isGesture("Set the speed to 3.0 m/s.")).toBe(false);
    expect(isGesture("")).toBe(false);
    // One dispatched line beside a sentence of the customer's own is prose.
    expect(
      isGesture(
        `${choiceMessage([{ variable: "region", value: "europe" }])}\nand what does that cost?`,
      ),
    ).toBe(false);
  });

  it("carries a repair's drop list and its changes in one sentence", () => {
    const message = repairMessage(
      [{ variable: "installation", value: "modernization" }],
      [{ variable: "rated_speed", value: "mps3_0" }],
    );
    expect(message).toContain("Apply repair: drop installation=modernization;");
    expect(message).toContain("(rated_speed=mps3_0)");
  });

  it("drops the empty drop clause when a repair only sets", () => {
    const message = repairMessage([], [{ variable: "region", value: "europe" }]);
    expect(message.startsWith("Apply repair: set ")).toBe(true);
    expect(message).not.toContain("drop");
  });

  it("names each reconciliation move as the move it is", () => {
    expect(acceptOfferedMessage("rated_speed", "mps1_6")).toContain(
      "accept the offered",
    );
    expect(reviseRequirementMessage("rated_speed", "mps3_0")).toContain("change");
    expect(leaveOpenMessage("rated_speed")).toContain("open");
    for (const message of [
      acceptOfferedMessage("rated_speed", "mps1_6"),
      reviseRequirementMessage("rated_speed", "mps3_0"),
      leaveOpenMessage("rated_speed"),
    ]) {
      expect(message.startsWith("Reconcile deviation: ")).toBe(true);
    }
  });

  it("quotes a draft's name, so a name with a space is still one draft", () => {
    expect(switchDraftMessage("Without the modernization")).toBe(
      'Switch to draft "Without the modernization"',
    );
    expect(discardDraftMessage("Premium")).toBe('Discard draft "Premium"');
    expect(compareDraftMessage("Premium")).toBe(
      'Compare draft "Premium" with the current one',
    );
  });
});

describe("the same sentence, as the customer reads it", () => {
  it("drops the code from a choice, keeping the label already in the sentence", () => {
    const spoken = spokenText(
      choiceMessage([{ variable: "contract_term", value: "y10" }]),
    );
    expect(spoken).not.toContain("contract_term");
    expect(spoken).toContain(optionLabel("contract_term", "y10"));
  });

  it("says a repair's bare drop list in the terms the card used", () => {
    const spoken = spokenText(
      repairMessage(
        [{ variable: "installation", value: "modernization" }],
        [{ variable: "rated_speed", value: "mps3_0" }],
      ),
    );
    expect(spoken).not.toContain("installation=modernization");
    expect(spoken).toContain(
      `${variablesByName.get("installation")!.label} = ${optionLabel(
        "installation",
        "modernization",
      )}`,
    );
  });

  it("drops a variable named twice in a leave-open sentence", () => {
    const spoken = spokenText(leaveOpenMessage("rated_speed"));
    expect(spoken).not.toContain("(rated_speed)");
    expect(spoken).toContain(variablesByName.get("rated_speed")!.label);
  });

  it("leaves a customer's own typing alone, codes and all", () => {
    const typed = "can we do rated_speed=mps3_0?";
    expect(spokenText(typed)).toBe(typed);
  });

  it("leaves a code the model does not have where it stands", () => {
    const spoken = spokenText("Set X to Y (not_a_variable=nope)");
    expect(spoken).toContain("(not_a_variable=nope)");
  });
});
