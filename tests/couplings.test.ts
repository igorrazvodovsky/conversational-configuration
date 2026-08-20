/**
 * The couplings that cross the language boundary (docs/specs/offline-checks).
 *
 * Three things are mirrored by hand between the frontend and the agent, and
 * each is asserted in prose somewhere and by nothing executable: the structured
 * message grammar, which exists in three copies; the product model, which the
 * frontend addresses by name; and the shape of a configuration, declared as a
 * TypeScript interface here and as a TypedDict there.
 *
 * These checks read the Python as text rather than running it. That is weaker
 * than executing both sides, and it is what a check that must stay offline and
 * language-agnostic can do: it catches a sentence reworded on one side of the
 * boundary, which is the failure that actually happens.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import * as configurator from "@/lib/configurator";
import { layerOf, modelGroups, productModel, variablesByName } from "@/lib/configurator";
import { GEOMETRY_VARIABLES } from "@/components/config-canvas/render/geometry";

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

/** One line, so a sentence the prompt wrapped still reads as the sentence. */
const flat = (text: string) => text.replace(/\s+/g, " ");

const PROMPT = flat(read("../agent/main.py"));
const HARNESS = flat(read("../agent/tests/scenario_grammar.py"));
const AGENT_STATE = read("../agent/src/configuration.py");

/**
 * Every element of the grammar, as the literal fragments its sentence is built
 * from. Fragments rather than whole sentences because most of these interpolate
 * a label the Python side interpolates too — what both sides must agree on is
 * the wording around the hole, and a fragment is exactly that.
 *
 * Each fragment is asserted three times: against the sentence the frontend
 * builder actually produces, against the agent's system prompt, and against the
 * conversation checks' own copy. The first is what keeps the table honest — a
 * reworded builder fails here before anything else can drift.
 *
 * `inPrompt` is false for the one element the prompt has no rule of its own
 * for: a bare control activation, which reaches the agent as ordinary prose and
 * is covered by the `Canvas edit: ` rule when it comes off the sheet.
 */
const GRAMMAR: {
  export: string;
  built: string;
  fragments: string[];
  inPrompt: boolean;
}[] = [
  {
    export: "CANVAS_EDIT_PREFIX",
    built: configurator.CANVAS_EDIT_PREFIX,
    fragments: ["Canvas edit: "],
    inPrompt: true,
  },
  {
    export: "choiceMessage",
    built: configurator.choiceMessage([
      { variable: "region", value: "europe" },
    ]),
    fragments: ["Set ", " to "],
    inPrompt: false,
  },
  {
    export: "canvasEditMessage",
    built: configurator.canvasEditMessage([
      { variable: "region", value: "europe" },
    ]),
    fragments: ["Canvas edit: "],
    inPrompt: true,
  },
  {
    export: "repairMessage",
    built: configurator.repairMessage(
      [{ variable: "installation", value: "modernization" }],
      [{ variable: "region", value: "europe" }],
    ),
    fragments: ["Apply repair: drop ", "set "],
    inPrompt: true,
  },
  {
    export: "abandonMessage",
    built: configurator.abandonMessage,
    fragments: ["Abandon the revision — keep the configuration as it is."],
    inPrompt: true,
  },
  {
    export: "acceptOfferedMessage",
    built: configurator.acceptOfferedMessage("region", "europe"),
    fragments: ["accept the offered "],
    inPrompt: true,
  },
  {
    export: "reviseRequirementMessage",
    built: configurator.reviseRequirementMessage("region", "europe"),
    fragments: ["change ", " to "],
    inPrompt: true,
  },
  {
    export: "leaveOpenMessage",
    built: configurator.leaveOpenMessage("region"),
    fragments: ["leave ", " open"],
    inPrompt: true,
  },
  {
    export: "forkDraftMessage",
    built: configurator.forkDraftMessage,
    fragments: ["Keep this draft and start another from it"],
    inPrompt: true,
  },
  {
    export: "switchDraftMessage",
    built: configurator.switchDraftMessage("Premium"),
    fragments: ['Switch to draft "'],
    inPrompt: true,
  },
  {
    export: "discardDraftMessage",
    built: configurator.discardDraftMessage("Premium"),
    fragments: ['Discard draft "'],
    inPrompt: true,
  },
  {
    export: "compareDraftMessage",
    built: configurator.compareDraftMessage("Premium"),
    fragments: ['Compare draft "', '" with the current one'],
    inPrompt: true,
  },
  {
    export: "undoMessage",
    built: configurator.undoMessage,
    fragments: ["Undo the last change"],
    inPrompt: true,
  },
  {
    export: "redoMessage",
    built: configurator.redoMessage,
    fragments: ["Redo the undone change"],
    inPrompt: true,
  },
];

describe("the message grammar, in all three copies", () => {
  it("covers every grammar element the frontend exports", () => {
    const exported = Object.keys(configurator).filter(
      (name) => name.endsWith("Message") || name.endsWith("PREFIX"),
    );
    expect(GRAMMAR.map((g) => g.export).sort()).toEqual(exported.sort());
  });

  it.each(GRAMMAR)("$export still says what this table says", ({ built, fragments }) => {
    for (const fragment of fragments) expect(built).toContain(fragment);
  });

  it.each(GRAMMAR.filter((g) => g.inPrompt))(
    "$export is a sentence the agent's prompt teaches",
    ({ fragments }) => {
      for (const fragment of fragments) expect(PROMPT).toContain(flat(fragment));
    },
  );

  it.each(GRAMMAR)(
    "$export is the sentence the conversation checks dispatch",
    ({ fragments }) => {
      for (const fragment of fragments) expect(HARNESS).toContain(flat(fragment));
    },
  );

  it("keeps the reconciliation prefix identical on all three sides", () => {
    const prefix = "Reconcile deviation: ";
    for (const sentence of [
      configurator.acceptOfferedMessage("region", "europe"),
      configurator.reviseRequirementMessage("region", "europe"),
      configurator.leaveOpenMessage("region"),
    ]) {
      expect(sentence.startsWith(prefix)).toBe(true);
    }
    expect(PROMPT).toContain(prefix);
    expect(HARNESS).toContain(prefix);
  });

  it("maps each reconciliation move onto the move name the tool takes", () => {
    // The card says "accept the offered …"; the tool takes move="accept".
    for (const move of ["accept", "revise", "open"]) {
      expect(PROMPT).toContain(`move="${move}"`);
    }
  });
});

describe("what the customer is shown of a dispatched sentence", () => {
  it("hides a code behind a prefix spokenText recognises", () => {
    // A sentence carrying `variable=value` that spokenText does not strip puts
    // the catalogue vocabulary in the customer's own bubble.
    const withCodes = [
      configurator.choiceMessage([{ variable: "region", value: "europe" }]),
      configurator.canvasEditMessage([{ variable: "region", value: "europe" }]),
      configurator.repairMessage([], [{ variable: "region", value: "europe" }]),
      configurator.acceptOfferedMessage("region", "europe"),
      configurator.reviseRequirementMessage("region", "europe"),
      configurator.leaveOpenMessage("region"),
    ];
    for (const sentence of withCodes) {
      expect(sentence).toMatch(/[a-z_]+[=)]/);
      expect(configurator.spokenText(sentence), sentence).not.toMatch(
        /\([a-z_]+=[a-z0-9_]+\)/,
      );
    }
  });

  it("leaves the sentences that carry no code untouched", () => {
    for (const sentence of [
      configurator.forkDraftMessage,
      configurator.switchDraftMessage("Premium"),
      configurator.discardDraftMessage("Premium"),
      configurator.compareDraftMessage("Premium"),
      configurator.undoMessage,
      configurator.redoMessage,
      configurator.abandonMessage,
    ]) {
      expect(configurator.spokenText(sentence)).toBe(sentence);
    }
  });
});

describe("the product model, as the frontend addresses it", () => {
  it("finds every group the layer mapping names", () => {
    const groups = new Set(modelGroups.map((g) => g.name));
    for (const group of ["context", "agreement", "performance"]) {
      expect(groups, `the model has no group ${group}`).toContain(group);
      expect(layerOf(group)).not.toBe("schedules");
    }
  });

  it("finds every variable the frontend names as a literal", () => {
    for (const variable of [
      ...GEOMETRY_VARIABLES,
      "shaft",
      "pit_depth",
      "contract_term",
      "usage_profile",
    ]) {
      expect(variablesByName.has(variable), `the model has no ${variable}`).toBe(true);
    }
  });

  it("reads the same model file the agent loads", () => {
    expect(read("../agent/src/configuration.py")).toContain(
      '"product_model" / "elevator.json"',
    );
    expect(read("../src/lib/configurator.ts")).toContain(
      "agent/src/product_model/elevator.json",
    );
  });

  it("finds the pricing terms the frontend amortizes over", () => {
    expect(Object.keys(configurator.pricing.term_months).length).toBeGreaterThan(0);
    expect(
      configurator.pricing.term_months[configurator.pricing.default_term],
    ).toBeGreaterThan(0);
    for (const term of Object.keys(configurator.pricing.term_months)) {
      expect(
        variablesByName.get("contract_term")!.options.map((o) => o.value),
      ).toContain(term);
    }
  });
});

describe("the two declarations of a configuration", () => {
  /** The field names of a TypedDict or an interface, in source order. The two
   * languages indent by different amounts, and a Python block ends at its
   * dedent where a TypeScript one ends at its closing brace. */
  const fieldsOf = (source: string, header: RegExp, indent: number) => {
    const body = source.slice(source.search(header));
    const closes = indent === 2 ? body.indexOf("\n}") : body.indexOf("\n\n\n");
    const fields = new RegExp(`^ {${indent}}(\\w+)\\??:`, "gm");
    return [...body.slice(0, closes).matchAll(fields)].map((m) => m[1]);
  };

  it("declares the same keys on both sides of the boundary", () => {
    const python = fieldsOf(AGENT_STATE, /^class Configuration\(TypedDict\):/m, 4);
    const typescript = fieldsOf(
      read("../src/lib/configurator.ts"),
      /^export interface Configuration \{/m,
      2,
    );
    expect(python.length).toBeGreaterThan(0);
    expect(typescript.slice().sort()).toEqual(python.slice().sort());
  });

  it("declares the same provenance sources", () => {
    const python = AGENT_STATE.match(/^Source = Literal\[(.+)\]$/m)![1];
    const typescript = read("../src/lib/configurator.ts").match(
      /^export type Source = (.+);$/m,
    )![1];
    const values = (declaration: string) =>
      [...declaration.matchAll(/"(\w+)"/g)].map((m) => m[1]).sort();
    expect(values(typescript)).toEqual(values(python));
  });

  it("declares the same reconciliation marks", () => {
    const python = AGENT_STATE.match(/^ {4}reconciliation: Literal\[(.+)\]$/m)![1];
    const typescript = read("../src/lib/configurator.ts").match(
      /^ {2}reconciliation: (.+);$/m,
    )![1];
    const values = (declaration: string) =>
      [...declaration.matchAll(/"(\w+)"/g)].map((m) => m[1]).sort();
    expect(values(typescript)).toEqual(values(python));
  });
});

describe("the one figure both languages format", () => {
  /**
   * `_format_co2` in the agent reimplements `formatCO2` in integer arithmetic
   * because Python's own rounding goes half-to-even and this one goes half
   * away from zero — the customer reads the lifetime total on the sheet and
   * hears it in chat, and 1250 kg read 1.2 t beside 1.3 t. The table is the
   * shared specification; `agent/tests/test_tools.py` asserts the same rows
   * against the Python.
   */
  const ROWS: [number, string][] = [
    [0, "0 kg CO₂e"],
    [540, "540 kg CO₂e"],
    [999, "999 kg CO₂e"],
    [1000, "1.0 t CO₂e"],
    [1250, "1.3 t CO₂e"],
    [1350, "1.4 t CO₂e"],
    [12400, "12.4 t CO₂e"],
    [-1250, "-1.3 t CO₂e"],
    [-540, "-540 kg CO₂e"],
  ];

  it.each(ROWS)("formats %i kg as %s", (kg, expected) => {
    expect(configurator.formatCO2(kg)).toBe(expected);
  });
});

describe("the model the frontend imports", () => {
  it("gives every variable a group the layer mapping can place", () => {
    for (const variable of productModel.variables) {
      expect(variable.group, `${variable.name} has no group`).toBeTruthy();
      expect(layerOf(variable.group)).toBeTruthy();
    }
  });
});
