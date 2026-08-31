// docs/specs/offline-checks/design.md
//
// Running the agent is the point: comparing sources would pass on two files
// that hold the same words and build different sentences.
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import type { LogEntry } from "@/lib/workspaces";

const at = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export interface AgentDump {
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
  /** Which grammar sentences `set_choices` refuses (docs/specs/one-gesture-one-action). */
  guarded: string[];
  /** Whether the guard fires on prose opening on the same word. */
  guardedProse: boolean[];
  /** That prose, for the frontend's copy of the predicate to be run over. */
  prose: string[];
  configurationKeys: string[];
  emptyConfigurationKeys: string[];
  sourceValues: string[];
  reconciliationValues: string[];
  co2: string[];
  configurations: Record<string, {
    choices: Record<string, { value: string; source: string }>;
    statuses: Record<string, Record<string, string>>;
  }>;
  /** The population the ontology has to name (docs/specs/ontology-of-phenomena). */
  toolNames: string[];
  /** Every name an entry of a draft's log may carry (docs/specs/action-log). */
  contentActions: string[];
  /** How far the cursor may walk back through one, in reversible entries. */
  reversalReach: number;
  /** A log holding every case the canvas's two counts turn on, and the counts
   * the agent computes from it. */
  logFixture: LogEntry[];
  logFixtureDepths: { undo: number; redo: number };
  variables: string[];
  groups: string[];
  ruleIds: string[];
  workspaceKeys: string[];
  draftKeys: string[];
  entryKeys: string[];
}

export function agentDump(): AgentDump {
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
