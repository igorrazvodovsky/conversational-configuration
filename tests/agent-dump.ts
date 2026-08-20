/**
 * The agent's half of the shared contracts, as the agent itself builds it.
 *
 * Running the agent is the point — comparing the two sources as text would
 * pass on two files that hold the same words and build different sentences
 * (docs/specs/offline-checks). Shared with the interface checks
 * (docs/specs/interface-checks), whose agreement payloads come from
 * `configurations` — four agreements the agent actually built — rather than
 * from a hand-authored reading of what a configuration looks like.
 *
 * `npm install` provisions the agent through its postinstall, so a checkout
 * that can run the app can run this. When it cannot, the failure says which
 * command is missing rather than skipping: a check that quietly does not run
 * is worse than none.
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

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
