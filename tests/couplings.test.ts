/**
 * The couplings that cross the language boundary (docs/specs/offline-checks).
 *
 * Three things are mirrored by hand between the frontend and the agent: the
 * structured message grammar, which exists in three copies; the product model,
 * which the frontend addresses by name; and the shape of a configuration,
 * declared as a TypeScript interface here and as a TypedDict there.
 *
 * Two of the three copies of the grammar are code, so they are compared as
 * code: `agent/tests/grammar_dump.py` builds every sentence from the agent's
 * own helpers and prints them, and the same sentences are built here from the
 * same inputs and compared string for string. The third copy is the system
 * prompt, which is prose, and prose can only be read — those assertions are
 * text, and say so.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import * as configurator from "@/lib/configurator";
import type {
  Configuration,
  Requirement,
  Source,
} from "@/lib/configurator";
import { layerOf, modelGroups, productModel, variablesByName } from "@/lib/configurator";
import { GEOMETRY_VARIABLES } from "@/components/config-canvas/render/geometry";
import { agreement, chose, forcing, openStatuses } from "./agreement";

const at = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/** One line, so a sentence the prompt wrapped still reads as the sentence. */
const flat = (text: string) => text.replace(/\s+/g, " ");

const PROMPT = flat(readFileSync(at("../agent/main.py"), "utf8"));

/**
 * What the agent's own copies of these contracts produce, for the inputs it
 * names. Running the agent is the point — comparing the two sources as text
 * would pass on two files that hold the same words and build different
 * sentences.
 *
 * `npm install` provisions the agent through its postinstall, so a checkout
 * that can run the app can run this. When it cannot, the failure says which
 * command is missing rather than skipping: a coupling check that quietly does
 * not run is worse than none.
 */
interface AgentDump {
  inputs: {
    oneSelection: [string, string][];
    twoSelections: [string, string][];
    repairDrop: [string, string][];
    repairChanges: [string, string][];
    draftName: string;
    variable: string;
    value: string;
    co2: number[];
  };
  grammar: Record<string, string>;
  configurationKeys: string[];
  emptyConfigurationKeys: string[];
  sourceValues: string[];
  reconciliationValues: string[];
  co2: string[];
  configurations: Record<string, {
    choices: Record<string, { value: string; source: string }>;
    statuses: Record<string, Record<string, string>>;
  }>;
}

function agentDump(): AgentDump {
  try {
    return JSON.parse(
      execFileSync("uv", ["run", "python", "tests/grammar_dump.py"], {
        cwd: at("../agent"),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 180_000,
      }),
    );
  } catch (error) {
    throw new Error(
      "could not run the agent's half of the coupling check — " +
        "`cd agent && uv run python tests/grammar_dump.py` has to work " +
        "(`npm run install:agent` provisions it).\n" +
        String((error as { stderr?: string }).stderr ?? error),
    );
  }
}

const AGENT = agentDump();

/** The frontend's half, built from the inputs the agent named. */
function frontendGrammar(inputs: AgentDump["inputs"]): Record<string, string> {
  const selections = (pairs: [string, string][]) =>
    pairs.map(([variable, value]) => ({ variable, value }));
  return {
    CANVAS_EDIT_PREFIX: configurator.CANVAS_EDIT_PREFIX,
    choiceMessage: configurator.choiceMessage(selections(inputs.oneSelection)),
    "choiceMessage/two": configurator.choiceMessage(
      selections(inputs.twoSelections),
    ),
    canvasEditMessage: configurator.canvasEditMessage(
      selections(inputs.oneSelection),
    ),
    repairMessage: configurator.repairMessage(
      selections(inputs.repairDrop),
      selections(inputs.repairChanges),
    ),
    "repairMessage/noDrop": configurator.repairMessage(
      [],
      selections(inputs.repairChanges),
    ),
    abandonMessage: configurator.abandonMessage,
    acceptOfferedMessage: configurator.acceptOfferedMessage(
      inputs.variable,
      inputs.value,
    ),
    reviseRequirementMessage: configurator.reviseRequirementMessage(
      inputs.variable,
      inputs.value,
    ),
    leaveOpenMessage: configurator.leaveOpenMessage(inputs.variable),
    forkDraftMessage: configurator.forkDraftMessage,
    switchDraftMessage: configurator.switchDraftMessage(inputs.draftName),
    discardDraftMessage: configurator.discardDraftMessage(inputs.draftName),
    compareDraftMessage: configurator.compareDraftMessage(inputs.draftName),
    undoMessage: configurator.undoMessage,
    redoMessage: configurator.redoMessage,
  };
}

const FRONTEND = frontendGrammar(AGENT.inputs);

describe("the message grammar, built on both sides", () => {
  it("names every grammar element the frontend exports", () => {
    // A new element added on one side and not the other fails here before it
    // can fail as a card that dispatches a sentence nothing recognises.
    const exported = Object.keys(configurator).filter(
      (name) => name.endsWith("Message") || name.endsWith("PREFIX"),
    );
    const covered = new Set(
      Object.keys(FRONTEND).map((key) => key.split("/")[0]),
    );
    expect([...covered].sort()).toEqual(exported.sort());
  });

  it("builds the same sentence on both sides, for every element", () => {
    expect(FRONTEND).toEqual(AGENT.grammar);
  });

  it.each(Object.keys(AGENT.grammar))("%s is identical, character for character", (key) => {
    expect(FRONTEND[key]).toBe(AGENT.grammar[key]);
  });

  it("keeps a draft name with quotes in it intact on both sides", () => {
    // The draft moves quote the name, so a name containing a quote is where
    // the two sides would diverge first if either started escaping.
    expect(AGENT.inputs.draftName).toContain('"');
    expect(FRONTEND.switchDraftMessage).toContain(AGENT.inputs.draftName);
  });
});

/**
 * The prompt's copy, which is prose and can only be read as text. Each entry
 * is the part of the sentence that does not vary, taken from the sentence the
 * frontend actually builds — so rewording a builder fails here too.
 */
const PROMPT_FRAGMENTS: Record<string, string[]> = {
  CANVAS_EDIT_PREFIX: ["Canvas edit: "],
  choiceMessage: ["Set ", " to "],
  canvasEditMessage: ["Canvas edit: "],
  repairMessage: ["Apply repair: drop ", "set "],
  abandonMessage: ["Abandon the revision — keep the configuration as it is."],
  acceptOfferedMessage: ["accept the offered "],
  reviseRequirementMessage: ["change ", " to "],
  leaveOpenMessage: ["leave ", " open"],
  forkDraftMessage: ["Keep this draft and start another from it"],
  switchDraftMessage: ['Switch to draft "'],
  discardDraftMessage: ['Discard draft "'],
  compareDraftMessage: ['Compare draft "', '" with the current one'],
  undoMessage: ["Undo the last change"],
  redoMessage: ["Redo the undone change"],
};

describe("the grammar as the system prompt teaches it", () => {
  it("has a rule for every element, none excepted", () => {
    const built = new Set(Object.keys(FRONTEND).map((key) => key.split("/")[0]));
    expect(Object.keys(PROMPT_FRAGMENTS).sort()).toEqual([...built].sort());
  });

  it.each(Object.entries(PROMPT_FRAGMENTS))(
    "%s still says what this table says",
    (key, fragments) => {
      for (const fragment of fragments) {
        expect(FRONTEND[key]).toContain(fragment);
      }
    },
  );

  it.each(Object.entries(PROMPT_FRAGMENTS))(
    "%s is a sentence the prompt names",
    (_key, fragments) => {
      for (const fragment of fragments) {
        expect(PROMPT).toContain(flat(fragment));
      }
    },
  );

  it("keeps the reconciliation prefix identical on all three sides", () => {
    const prefix = "Reconcile deviation: ";
    for (const key of [
      "acceptOfferedMessage",
      "reviseRequirementMessage",
      "leaveOpenMessage",
    ]) {
      expect(FRONTEND[key].startsWith(prefix)).toBe(true);
      expect(AGENT.grammar[key].startsWith(prefix)).toBe(true);
    }
    expect(PROMPT).toContain(prefix);
  });

  it("maps each reconciliation move onto the move name the tool takes", () => {
    // The card says "accept the offered …"; the tool takes move="accept".
    for (const move of ["accept", "revise", "open"]) {
      expect(PROMPT).toContain(`move="${move}"`);
    }
  });

  it("names the source a control activation is recorded under", () => {
    expect(PROMPT).toContain('source="user"');
  });
});

describe("what the customer is shown of a dispatched sentence", () => {
  it("hides a code behind a prefix spokenText recognises", () => {
    // A sentence carrying `variable=value` that spokenText does not strip puts
    // the catalogue vocabulary in the customer's own bubble.
    const withCodes = [
      "choiceMessage",
      "canvasEditMessage",
      "repairMessage/noDrop",
      "acceptOfferedMessage",
      "reviseRequirementMessage",
      "leaveOpenMessage",
    ];
    for (const key of withCodes) {
      const sentence = FRONTEND[key];
      expect(sentence).toMatch(/[a-z_]+[=)]/);
      expect(configurator.spokenText(sentence), sentence).not.toMatch(
        /\([a-z_]+=[a-z0-9_]+\)/,
      );
    }
  });

  it("leaves the sentences that carry no code untouched", () => {
    for (const key of [
      "forkDraftMessage",
      "switchDraftMessage",
      "discardDraftMessage",
      "compareDraftMessage",
      "undoMessage",
      "redoMessage",
      "abandonMessage",
    ]) {
      expect(configurator.spokenText(FRONTEND[key])).toBe(FRONTEND[key]);
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
    expect(readFileSync(at("../agent/src/configuration.py"), "utf8")).toContain(
      '"product_model" / "elevator.json"',
    );
    expect(readFileSync(at("../src/lib/configurator.ts"), "utf8")).toContain(
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

  it("gives every variable a group the layer mapping can place", () => {
    for (const variable of productModel.variables) {
      expect(variable.group, `${variable.name} has no group`).toBeTruthy();
      expect(layerOf(variable.group)).toBeTruthy();
    }
  });
});

/**
 * The interface is erased at runtime, so these three witnesses stand in for it.
 * `satisfies Record<keyof …, true>` makes the typecheck reject a witness that
 * is missing a member or carries one the type does not have — which is what
 * makes `Object.keys` below a list of the type's own members rather than a
 * fourth hand-maintained copy.
 */
const CONFIGURATION_KEYS = {
  choices: true,
  statuses: true,
  unavailable: true,
  candidate: true,
  rfq: true,
} satisfies Record<keyof Required<Configuration>, true>;

const SOURCE_VALUES = {
  user: true,
  agent: true,
  document: true,
} satisfies Record<Source, true>;

const RECONCILIATION_VALUES = {
  pending: true,
  waived: true,
  revised: true,
} satisfies Record<Requirement["reconciliation"], true>;

describe("the two declarations of a configuration", () => {
  it("declares the same keys on both sides of the boundary", () => {
    expect(Object.keys(CONFIGURATION_KEYS).sort()).toEqual(AGENT.configurationKeys);
  });

  it("carries every key an agreement the agent built actually has", () => {
    // The declared set includes the optional fields; this is the subset a
    // fresh agreement arrives with, and the frontend has to read both.
    for (const key of AGENT.emptyConfigurationKeys) {
      expect(Object.keys(CONFIGURATION_KEYS)).toContain(key);
    }
  });

  it("declares the same provenance sources", () => {
    expect(Object.keys(SOURCE_VALUES).sort()).toEqual(AGENT.sourceValues);
  });

  it("declares the same reconciliation marks", () => {
    expect(Object.keys(RECONCILIATION_VALUES).sort()).toEqual(
      AGENT.reconciliationValues,
    );
  });
});

describe("the one figure both languages format", () => {
  /**
   * The lifetime CO₂e total: the customer reads it on the sheet and hears it
   * in chat. `_format_co2` reimplements `formatCO2` in integer arithmetic
   * because Python rounds half to even and JavaScript rounds half away from
   * zero, so 1250 kg once read 1.2 t beside 1.3 t. Compared against what the
   * agent actually printed, not against a table copied from it.
   */
  it.each(AGENT.inputs.co2.map((kg, index) => [kg, AGENT.co2[index]]))(
    "reads %i kg the same in chat as on the sheet",
    (kg, agentSays) => {
      expect(configurator.formatCO2(kg as number)).toBe(agentSays);
    },
  );

  it("covers both sides of the rounding boundary", () => {
    expect(AGENT.inputs.co2).toContain(1250);
    expect(AGENT.inputs.co2.some((kg) => kg < 0)).toBe(true);
  });
});

describe("the agreements the frontend checks build", () => {
  /**
   * A fixture assembled by hand can be valid in shape and impossible in fact.
   * These invariants are not asserted from memory — they are read off
   * agreements the agent actually built, which is what the first two checks
   * establish, and only then required of the fixtures.
   */
  function violations(config: {
    choices: Record<string, { value: string }>;
    statuses: Record<string, Record<string, string>>;
  }): string[] {
    const problems: string[] = [];
    for (const [variable, options] of Object.entries(config.statuses)) {
      const entries = Object.entries(options);
      if (!entries.length) continue;
      const decided = entries.filter(([, s]) => s === "chosen" || s === "forced");
      if (decided.length > 1) {
        problems.push(`${variable}: two values decided at once`);
      } else if (decided.length === 1) {
        const siblings = entries.filter(([value]) => value !== decided[0][0]);
        if (siblings.some(([, s]) => s !== "invalid")) {
          problems.push(`${variable}: a sibling of the decided value is not invalid`);
        }
      } else if (!entries.some(([, s]) => s === "open")) {
        problems.push(`${variable}: nothing decided and nothing open`);
      }
    }
    for (const [variable, choice] of Object.entries(config.choices)) {
      const status = config.statuses[variable]?.[choice.value];
      if (status && status !== "chosen") {
        problems.push(`${variable}: recorded as a choice but reads ${status}`);
      }
    }
    return problems;
  }

  const REAL = AGENT.configurations as Record<string, Parameters<typeof violations>[0]>;

  it.each(Object.keys(REAL))("%s, as the agent built it, holds them", (name) => {
    expect(violations(REAL[name])).toEqual([]);
  });

  it("covers an agreement with choices, a candidate and a document", () => {
    // An invariant read only off the empty agreement would be vacuous.
    expect(Object.keys(REAL).sort()).toEqual(["chosen", "empty", "priced", "seeded"]);
    expect(Object.keys(REAL.chosen.choices).length).toBeGreaterThan(0);
  });

  const FIXTURES: Record<string, ReturnType<typeof agreement>> = {
    empty: agreement(),
    withAChoice: agreement({ choices: chose({ building_type: "hospital" }) }),
    withAForcedValue: agreement({ statuses: forcing({ rescue_operation: "ups" }) }),
    withBoth: agreement({
      choices: chose({ building_type: "hospital" }),
      statuses: forcing({ rescue_operation: "ups" }),
    }),
    withACandidate: agreement({
      choices: chose({ building_type: "hospital" }),
      candidate: { assignment: { building_type: "hospital" }, price: 1450 },
    }),
  };

  it.each(Object.keys(FIXTURES))("%s, as the checks build it, holds them too", (name) => {
    expect(violations(FIXTURES[name])).toEqual([]);
  });

  it("starts every option of every variable open, exactly as a fresh agreement does", () => {
    expect(openStatuses()).toEqual(REAL.empty.statuses);
  });

  it("marks a recorded choice the way the agent marks the same one", () => {
    // The fixture runs no solver, so the ripple around the choice is the
    // agent's alone; the variable the choice is on has to agree.
    const variable = AGENT.inputs.oneSelection[0][0];
    expect(FIXTURES.withAChoice.statuses[variable]).toEqual(
      REAL.chosen.statuses[variable],
    );
  });
});
