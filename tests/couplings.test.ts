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

  it("refuses in the tool layer exactly the sentences that set a value", () => {
    // The third copy of the grammar (docs/specs/one-gesture-one-action):
    // `set_choices` reads the last human message and refuses a gesture. The
    // set is asserted in both directions, so a rule that grew would start
    // swallowing reconciliations and draft moves, and one that shrank would
    // let a gesture through. The dump runs the real predicate over the
    // agent's own sentences, which the check above holds equal to these.
    expect(AGENT.guarded).toEqual([
      "CANVAS_EDIT_PREFIX",
      "canvasEditMessage",
      "choiceMessage",
      "choiceMessage/two",
    ]);
  });

  it("lets prose through that opens on the grammar's own word", () => {
    // "Set up an elevator for a hospital" is a customer talking, and it goes
    // to set_choices with its partial semantics. The parenthesised code is
    // what separates the two, so matching the first word would move the prose
    // path this feature leaves alone.
    expect(AGENT.guardedProse).toEqual([false, false, false, false]);
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

  it("sends a picked value to revise_choices, whatever the term's state", () => {
    // The repair of finding 1: the rule for the dispatched sentence names one
    // action and never the partial one, so a click applies whole or comes
    // back with repairs (docs/specs/one-gesture-one-action).
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
    // Prose is still the agent's judgment, and the method bullet is where the
    // A/B in docs/specs/agent-tools measured that it has to live.
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

// A mark is optional on a clause — two of the three kinds take none
// (docs/specs/document-clauses) — so the union is narrowed before it keys the
// record, and the agent's dump unwraps the same NotRequired on its side.
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

describe("the reversals the canvas offers, counted on both sides", () => {
  // One predicate in two languages (docs/specs/action-log): the agent
  // refreshes this mirror on every commit and the frontend seeds it from the
  // record on attach, so a disagreement shows as a canvas that offers Undo
  // only after a reload — which no other check in the repo sees.
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

/**
 * The ontology's copy (docs/specs/ontology-of-phenomena). Constitution #15
 * binds every artifact to the names enumerated there, and the enumeration is
 * prose, so it is read as text the way the system prompt above is.
 *
 * What this catches is a name that arrived without being named: a new tool, a
 * new element of the grammar, a new key on a configuration or on the durable
 * record, a variable or rule the product model gained. It does not catch a
 * signature that is wrong or a fact filed in the wrong class — reading the
 * enumeration against the code stays the obligation of the session that
 * changes the code.
 */
const ONTOLOGY = flat(
  readFileSync(at("../docs/specs/ontology-of-phenomena/ontology.md"), "utf8"),
);

/**
 * The gesture table unflattened, because the assertion below reads it a row at
 * a time and a flattened table is one line.
 */
const GESTURE_TABLE = readFileSync(
  at("../docs/specs/ontology-of-phenomena/ontology.md"),
  "utf8",
)
  .split("## Gestures")[1]
  .split("## What the enumeration settles")[0]
  .split("\n")
  .filter((line) => line.startsWith("| ") && !line.startsWith("| Gesture"));

/**
 * The gesture table's sentence for every element of the grammar, as templates,
 * because the table spells the shape rather than one built example. A new
 * element fails the coverage assertion until it has a row.
 */
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

/**
 * The action every element of the grammar reaches, one per sentence. A gesture
 * that reached whichever of two actions the model judged right is what
 * [one-gesture-one-action](../docs/specs/one-gesture-one-action/design.md)
 * repaired, so the table below is the shape of the repair: the value is one
 * name, and the assertions refuse a row that offers a choice.
 */
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

/**
 * A bullet of the prompt's *Messages that are not conversation* section: from
 * the sentence it quotes to the start of the next bullet. Read as a segment
 * rather than as the whole section, because a rule may name an action it
 * forbids — the undo bullet names both content actions to rule them out.
 */
function promptRule(quoted: string): string {
  const start = PROMPT.indexOf(quoted);
  expect(start, `the prompt quotes ${quoted}`).toBeGreaterThanOrEqual(0);
  const end = PROMPT.indexOf('- "', start + quoted.length);
  expect(end, `a bullet follows ${quoted}`).toBeGreaterThan(start);
  return PROMPT.slice(start, end);
}

/**
 * The only way a rule may name the action it doesn't reach is to forbid it, so
 * reverting a rule to "One set_choices call" fails here while the prohibition
 * that keeps the model off it passes.
 */
function onlyForbids(rule: string, action: string): void {
  for (const before of rule.split(action).slice(0, -1)) {
    expect(before.endsWith("Never "), `"…${before.slice(-40)}${action}"`).toBe(
      true,
    );
  }
}

/**
 * Every key of the two durable shapes, and the ontology term that carries it.
 * Keys are prefixed because a workspace and a draft both have an `id` and a
 * `name`, and the two mean different things. A key added on either side fails
 * the coverage assertion until someone says here what it means.
 */
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
    // A tool the ontology has never heard of fails here, before it can be
    // cited in a spec or a prompt under a name nothing else uses.
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
      // "set_choices or revise_choices" is the shape the repair removed: a
      // gesture whose action the model picks is a gesture with no action.
      expect(cell).not.toContain(" or ");
    },
  );

  it.each(Object.entries(ONTOLOGY_SENTENCES))(
    "%s opens on the sentence the frontend actually builds",
    (key, template) => {
      // The fixed head of the template — everything before the first
      // placeholder — is a prefix of the real sentence, so rewording a builder
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
    // The acceptance criterion of docs/specs/action-log: a tool added without
    // being named in the ontology fails a run before it can write a name into
    // the durable record.
    for (const action of AGENT.contentActions) {
      expect(AGENT.toolNames, action).toContain(action);
      expect(ONTOLOGY, action).toContain(action);
    }
  });

  it("declares the population the product model actually has", () => {
    // The one place the enumeration states a count. Checked rather than
    // trusted, so it cannot go stale the next time a variable lands.
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
