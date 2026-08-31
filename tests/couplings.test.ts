// docs/specs/offline-checks/design.md
//
// Two of the grammar's copies are code and are compared as code:
// `agent/tests/grammar_dump.py` builds every sentence from the agent's own
// helpers and the same sentences are built here. The third is the system
// prompt, which can only be read as text.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import * as configurator from "@/lib/configurator";
import type {
  Configuration,
  Clause,
  Source,
} from "@/lib/configurator";
import { layerOf, modelGroups, productModel, variablesByName } from "@/lib/configurator";
import { CARD_TOOLS } from "@/components/generative-ui/card-shell";
import { GEOMETRY_VARIABLES } from "@/components/config-canvas/render/geometry";
import {
  REVERSAL_REACH,
  historyDepths,
  type WorkspaceRecord,
} from "@/lib/workspaces";
import { agreement, chose, forcing, openStatuses } from "./agreement";

const at = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/** One line, so a sentence the prompt wrapped still reads as the sentence. */
const flat = (text: string) => text.replace(/\s+/g, " ");

const PROMPT = flat(readFileSync(at("../agent/main.py"), "utf8"));

import { agentDump, type AgentDump } from "./agent-dump";

const AGENT = agentDump();

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

  it("refuses in the tool layer exactly the sentences that set a value", () => {
    // Asserted in both directions: a rule that grew would swallow
    // reconciliations and draft moves, and one that shrank would let a gesture
    // through.
    expect(AGENT.guarded).toEqual([
      "CANVAS_EDIT_PREFIX",
      "canvasEditMessage",
      "choiceMessage",
      "choiceMessage/two",
    ]);
  });

  it("reads a gesture out of exactly the sentences the agent refuses", () => {
    // Held against the agent's own predicate rather than against a list, so the
    // two cannot drift into hiding a message the agent treats as prose.
    const read = Object.keys(AGENT.grammar)
      .filter((key) => configurator.isGesture(AGENT.grammar[key]))
      .sort();
    expect(read).toEqual([...AGENT.guarded].sort());
  });

  it("leaves the same prose alone on both sides", () => {
    expect(AGENT.prose.map((text) => configurator.isGesture(text))).toEqual(
      AGENT.guardedProse,
    );
    expect(AGENT.guardedProse).toEqual([false, false, false, false]);
  });

  it("lets prose through that opens on the grammar's own word", () => {
    expect(AGENT.guardedProse).toEqual([false, false, false, false]);
  });

  it("keeps a draft name with quotes in it intact on both sides", () => {
    // The draft moves quote the name, so a name containing a quote is where the
    // two sides would diverge first if either started escaping.
    expect(AGENT.inputs.draftName).toContain('"');
    expect(FRONTEND.switchDraftMessage).toContain(AGENT.inputs.draftName);
  });
});

/** The prompt's copy is prose. Each entry is the part of the sentence that does
 * not vary, taken from the sentence the frontend builds, so rewording a builder
 * fails here too. */
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

  it("sends a picked value to revise_choices, whatever the term's state", () => {
    const rule = promptRule('"Set <term> to <value> (term=value)"');
    expect(rule).toContain("revise_choices");
    onlyForbids(rule, "set_choices");
  });

  it("sends a sheet edit to the same action as a picked value", () => {
    const rule = promptRule('- "Canvas edit:');
    expect(rule).toContain("revise_choices");
    onlyForbids(rule, "set_choices");
  });

  it("keeps the revise-over-record rule for what the customer says", () => {
    expect(PROMPT).toContain(
      "When the customer *tells* you to change something already decided, "
        + "revise it rather than recording it afresh.",
    );
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

/** The interface is erased at runtime, so these three witnesses stand in for
 * it. `satisfies Record<keyof …, true>` is what makes `Object.keys` below a
 * list of the type's own members rather than a fourth hand-maintained copy. */
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

  // A mark is optional on a clause, so the union is narrowed before it keys the
  // record; the agent's dump unwraps the same NotRequired.
const RECONCILIATION_VALUES = {
  pending: true,
  waived: true,
  revised: true,
} satisfies Record<NonNullable<Clause["reconciliation"]>, true>;

describe("the two declarations of a configuration", () => {
  it("declares the same keys on both sides of the boundary", () => {
    expect(Object.keys(CONFIGURATION_KEYS).sort()).toEqual(AGENT.configurationKeys);
  });

  it("carries every key an agreement the agent built actually has", () => {
    // The subset a fresh agreement arrives with. The frontend reads both.
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
  /** `_format_co2` reimplements `formatCO2` in integer arithmetic because
   * Python rounds half to even and JavaScript rounds half away from zero, so
   * 1250 kg once read 1.2 t beside 1.3 t. */
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
  /** Read off agreements the agent actually built rather than asserted from
   * memory, then required of the fixtures. */
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
    const variable = AGENT.inputs.oneSelection[0][0];
    expect(FIXTURES.withAChoice.statuses[variable]).toEqual(
      REAL.chosen.statuses[variable],
    );
  });
});

describe("the reversals the canvas offers, counted on both sides", () => {
  // A disagreement shows as a canvas that offers Undo only after a reload,
  // which no other check in the repo sees.
  const logged = (log: AgentDump["logFixture"]): WorkspaceRecord => ({
    id: "ws-1",
    name: null,
    drafts: [
      {
        id: "draft-1",
        name: "Original",
        forkedFrom: null,
        configuration: agreement(),
        log,
      },
    ],
    currentDraftId: "draft-1",
    threads: [],
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
  });

  it("reads the same log the same way", () => {
    expect(historyDepths(logged(AGENT.logFixture))).toEqual(
      AGENT.logFixtureDepths,
    );
  });

  it("walks the cursor back exactly as far on both sides", () => {
    expect(REVERSAL_REACH).toBe(AGENT.reversalReach);
  });
});

/** The ontology is prose, so it is read as text the way the prompt above is.
 * This catches a name that arrived without being named; it does not catch a
 * wrong signature or a fact filed in the wrong class. */
const ONTOLOGY = flat(
  readFileSync(at("../docs/specs/ontology-of-phenomena/ontology.md"), "utf8"),
);

const GESTURE_TABLE = readFileSync(
  at("../docs/specs/ontology-of-phenomena/ontology.md"),
  "utf8",
)
  .split("## Gestures")[1]
  .split("## What the enumeration settles")[0]
  .split("\n")
  .filter((line) => line.startsWith("| ") && !line.startsWith("| Gesture"));

/** Templates, because the table spells the shape rather than one built
 * example. A new element fails the coverage assertion until it has a row. */
const ONTOLOGY_SENTENCES: Record<string, string> = {
  CANVAS_EDIT_PREFIX: "Canvas edit: ",
  choiceMessage: "Set <term> to <value> (term=value)",
  canvasEditMessage: "Canvas edit: Set …",
  repairMessage: "Apply repair: drop …; set …",
  abandonMessage: "Abandon the revision — keep the configuration as it is.",
  acceptOfferedMessage: "Reconcile deviation: accept the offered …",
  reviseRequirementMessage: "Reconcile deviation: change … to …",
  leaveOpenMessage: "Reconcile deviation: leave … open",
  forkDraftMessage: "Keep this draft and start another from it",
  switchDraftMessage: 'Switch to draft "…"',
  discardDraftMessage: 'Discard draft "…"',
  compareDraftMessage: 'Compare draft "…" with the current one',
  undoMessage: "Undo the last change",
  redoMessage: "Redo the undone change",
};

/** One name per sentence; the assertions refuse a row that offers a choice. */
const ONTOLOGY_ACTIONS: Record<string, string> = {
  CANVAS_EDIT_PREFIX: "revise_choices",
  choiceMessage: "revise_choices",
  canvasEditMessage: "revise_choices",
  repairMessage: "revise_choices",
  abandonMessage: "keep_as_is",
  acceptOfferedMessage: "reconcile_requirement",
  reviseRequirementMessage: "reconcile_requirement",
  leaveOpenMessage: "reconcile_requirement",
  forkDraftMessage: "fork_draft",
  switchDraftMessage: "switch_draft",
  discardDraftMessage: "discard_draft",
  compareDraftMessage: "compare_drafts",
  undoMessage: "undo_change",
  redoMessage: "redo_change",
};

/** Read as a segment rather than as the whole section, because a rule may name
 * an action it forbids — the undo bullet names both content actions to rule
 * them out. */
function promptRule(quoted: string): string {
  const start = PROMPT.indexOf(quoted);
  expect(start, `the prompt quotes ${quoted}`).toBeGreaterThanOrEqual(0);
  const end = PROMPT.indexOf('- "', start + quoted.length);
  expect(end, `a bullet follows ${quoted}`).toBeGreaterThan(start);
  return PROMPT.slice(start, end);
}

function onlyForbids(rule: string, action: string): void {
  for (const before of rule.split(action).slice(0, -1)) {
    expect(before.endsWith("Never "), `"…${before.slice(-40)}${action}"`).toBe(
      true,
    );
  }
}

/** Keys are prefixed because a workspace and a draft both have an `id` and a
 * `name` meaning different things. */
const CARRIED_BY: Record<string, string[]> = {
  "workspace.id": ["`record.id`, a uuid"],
  "workspace.name": ["named(Workspace, Name)"],
  "workspace.drafts": ["draft_of(Draft, Workspace)"],
  "workspace.currentDraftId": ["current(Workspace, Draft)"],
  "workspace.threads": ["belongs_to(Conversation, Workspace)"],
  "workspace.rfq_document": ["document_text(Workspace, Text)"],
  "workspace.createdAt": ["Timestamp"],
  "workspace.updatedAt": ["moved_at(Conversation, Timestamp)"],
  "draft.id": ["`draft.id`, a uuid"],
  "draft.name": ["named(Draft, Name)"],
  "draft.forkedFrom": ["forked_from(Draft, Draft)"],
  "draft.configuration": ["chose(Draft, Variable, Option)"],
  "draft.log": ["logged(Draft, Position, Entry)"],
  "entry.id": ["`entry.id`, a uuid"],
  "entry.action": ["acted(Entry, Action)"],
  "entry.source": ["moved_by(Entry, Source)"],
  "entry.conversation": ["during(Entry, Conversation)"],
  "entry.at": ["occurred_at(Entry, Timestamp)"],
  "entry.asserted": ["asserted(Entry, Fact)"],
  "entry.retracted": ["retracted(Entry, Fact)"],
  "entry.standing": ["standing(Entry, Standing)"],
  "configuration.choices": [
    "chose(Draft, Variable, Option)",
    "attributed(Draft, Variable, Source)",
  ],
  "configuration.statuses": ["status(Draft, Variable, Option, Status)"],
  "configuration.unavailable": ["separates(Draft, Variable, Option, Rule)"],
  "configuration.candidate": ["candidate_value(Draft, Variable, Option)"],
  "configuration.rfq": [
    "requires(Clause, Variable, Option)",
    "carries(Clause, Variable)",
    "reconciled(Clause, Mark)",
  ],
};

describe("the ontology, as the vocabulary every artifact names by", () => {
  it("names every action the agent offers", () => {
    const unnamed = AGENT.toolNames.filter((name) => !ONTOLOGY.includes(name));
    expect(unnamed).toEqual([]);
  });

  it("has a row for every element of the grammar, none excepted", () => {
    const built = new Set(Object.keys(FRONTEND).map((key) => key.split("/")[0]));
    expect(Object.keys(ONTOLOGY_SENTENCES).sort()).toEqual([...built].sort());
  });

  it.each(Object.entries(ONTOLOGY_SENTENCES))(
    "%s is in the gesture table, spelled as this table spells it",
    (_key, template) => {
      expect(ONTOLOGY).toContain(template);
    },
  );

  it("names one action for every element of the grammar, none excepted", () => {
    const built = new Set(Object.keys(FRONTEND).map((key) => key.split("/")[0]));
    expect(Object.keys(ONTOLOGY_ACTIONS).sort()).toEqual([...built].sort());
  });

  it.each(Object.entries(ONTOLOGY_ACTIONS))(
    "%s reaches an action the agent actually builds",
    (_key, action) => {
      expect(AGENT.toolNames).toContain(action);
    },
  );

  it.each(Object.entries(ONTOLOGY_ACTIONS))(
    "%s has one gesture row, and that row names its action and no alternative",
    (key, action) => {
      const rows = GESTURE_TABLE.filter((row) =>
        row.includes(ONTOLOGY_SENTENCES[key]),
      );
      expect(rows).toHaveLength(1);
      const cell = rows[0].split("|")[3];
      expect(cell).toContain(`\`${action}\``);
      // "set_choices or revise_choices" is the shape the repair removed.
      expect(cell).not.toContain(" or ");
    },
  );

  it.each(Object.entries(ONTOLOGY_SENTENCES))(
    "%s opens on the sentence the frontend actually builds",
    (key, template) => {
      // The fixed head is a prefix of the real sentence, so rewording a builder
      // fails here as well as against the prompt.
      const head = template.split(/[…<]/)[0];
      expect(head.length).toBeGreaterThan(0);
      expect(FRONTEND[key].startsWith(head)).toBe(true);
    },
  );

  it("accounts for every key of a configuration, a draft, an entry and the record", () => {
    const keys = [
      ...AGENT.workspaceKeys.map((key) => `workspace.${key}`),
      ...AGENT.draftKeys.map((key) => `draft.${key}`),
      ...AGENT.entryKeys.map((key) => `entry.${key}`),
      ...AGENT.configurationKeys.map((key) => `configuration.${key}`),
    ];
    expect(Object.keys(CARRIED_BY).sort()).toEqual(keys.sort());
  });

  it.each(Object.entries(CARRIED_BY))(
    "%s is carried by a fact the ontology states",
    (_key, terms) => {
      for (const term of terms) expect(ONTOLOGY).toContain(term);
    },
  );

  it("names every action an entry of a log may carry", () => {
    for (const action of AGENT.contentActions) {
      expect(AGENT.toolNames, action).toContain(action);
      expect(ONTOLOGY, action).toContain(action);
    }
  });

  it("declares the population the product model actually has", () => {
    // The one place the enumeration states a count.
    const declared = ONTOLOGY.match(/(\d+) variables in (\d+) groups/);
    expect(declared).not.toBeNull();
    expect(Number(declared![1])).toBe(AGENT.variables.length);
    expect(Number(declared![2])).toBe(AGENT.groups.length);

    const rules = ONTOLOGY.match(/(\d+) rules, all `R`-prefixed/);
    expect(rules).not.toBeNull();
    expect(Number(rules![1])).toBe(AGENT.ruleIds.length);
    expect(AGENT.ruleIds.every((id) => id.startsWith("R"))).toBe(true);
  });
});

describe("the tools that render as a card, listed twice", () => {
  // The transcript decides which rows are cards from the tool's name.
  // `use-configurator-ui.tsx` is where a renderer is registered.
  const REGISTRATIONS = readFileSync(
    at("../src/hooks/use-configurator-ui.tsx"),
    "utf8",
  );

  it("lists exactly the tools a card renderer is registered for", () => {
    const registered = [...REGISTRATIONS.matchAll(/name:\s*"([a-z_]+)"/g)].map(
      (match) => match[1],
    );
    expect(registered.length).toBeGreaterThan(0);
    expect([...CARD_TOOLS].sort()).toEqual([...registered].sort());
  });
});
