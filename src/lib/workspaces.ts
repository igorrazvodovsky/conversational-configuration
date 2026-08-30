/**
 * Workspace API client (docs/specs/agreement-workspace).
 *
 * A workspace is the durable home of one installation's agreement; these
 * helpers talk to the agent-side store through the /api/workspaces rewrite.
 * No state is kept here — records are fetched on demand and the agreement
 * itself always rides in agent state (docs/specs/constitution.md #3).
 */

import type { Configuration } from "./configurator";

export interface WorkspaceThread {
  id: string;
  createdAt: string;
  /** Last time this conversation moved the agreement — what "where I left
   *  off" means when a workspace opens. Absent on conversations registered
   *  before the store began stamping it; `createdAt` stands in then. */
  updatedAt?: string;
}

/** The conversation a workspace opens on: the one that last changed the
 * agreement, falling back to the one started last. Ties go to the later
 * entry, since the store appends in creation order. */
export function latestThread(
  threads: WorkspaceThread[],
): WorkspaceThread | undefined {
  const activity = (t: WorkspaceThread) => t.updatedAt ?? t.createdAt;
  return threads.reduce<WorkspaceThread | undefined>(
    (best, t) => (!best || activity(t) >= activity(best) ? t : best),
    undefined,
  );
}

/** One action taken on a draft (docs/specs/action-log). The facts are the
 * agent's business; what the frontend reads is whether an entry has any — an
 * action that asserted nothing is no step back to anywhere — and where the
 * cursor stands relative to it. */
export interface LogEntry {
  id: string;
  action: string;
  source: string;
  conversation: string | null;
  at: string;
  standing: "applied" | "reversed" | "abandoned";
  asserted: unknown[][];
  retracted: unknown[][];
}

/** One draft of the workspace's agreement (docs/specs/parallel-drafts): a whole
 * configuration with its own record of what was done to it. */
export interface DraftRecord {
  id: string;
  name: string;
  /** The draft this one was forked from, null on the one a workspace opens
   * with. Recorded for lineage; an id that no longer resolves reads as no
   * lineage rather than being repaired. */
  forkedFrom: string | null;
  configuration: Configuration;
  /** Every action taken on this draft, oldest first (docs/specs/action-log).
   * Drafts adapted from workspaces written before that spec carry none until
   * something is written to them. */
  log?: LogEntry[];
}

export interface WorkspaceRecord {
  id: string;
  // null until the agent names the workspace from conversation
  name: string | null;
  /** Always at least one, and always with one of them current. Records written
   * before drafts are adapted store-side, so this shape is what every read
   * sees. */
  drafts: DraftRecord[];
  currentDraftId: string;
  threads: WorkspaceThread[];
  createdAt: string;
  updatedAt: string;
}

/** The draft the agent acts on and the canvas renders. Falls back to the first
 * draft if the pointer is ever dangling — no read path may be the one that
 * throws. */
export function currentDraft(record: WorkspaceRecord): DraftRecord {
  return (
    record.drafts.find((d) => d.id === record.currentDraftId) ?? record.drafts[0]
  );
}

/** How far the cursor may walk back from the head of a draft's log, counted in
 * reversible entries. The agent's copy is `HISTORY_DEPTH` in
 * `agent/src/workspace_store.py`, and `tests/couplings.test.ts` asserts the two
 * agree. */
export const REVERSAL_REACH = 10;

/** Whether walking the cursor past this entry would change the agreement. An
 * action whose whole content is that it occurred — a declined change, or a
 * batch that re-recorded what the agreement already held — is walked past
 * rather than spent a step on (docs/specs/action-log). */
const reversible = (entry: LogEntry) =>
  entry.asserted.length > 0 || entry.retracted.length > 0;

/** How many reversals each way the current draft offers. Mirrored into agent
 * state, seeded from the record on attach — which is why this predicate exists
 * twice, here and as `history_depths` in the store, and why the couplings check
 * holds the two against each other. */
export function historyDepths(record: WorkspaceRecord | null) {
  const log = (record ? currentDraft(record).log : undefined) ?? [];
  const walked = log.filter(
    (e) => e.standing === "reversed" && reversible(e),
  ).length;
  const applied = log.filter(
    (e) => e.standing === "applied" && reversible(e),
  ).length;
  return {
    undo: Math.max(0, Math.min(applied, REVERSAL_REACH - walked)),
    redo: walked,
  };
}

/** The draft mirror agent state carries, built from the record for the seed —
 * the same shape the agent's committing tools write. */
export function draftSummaries(record: WorkspaceRecord) {
  return record.drafts.map((d) => ({
    id: d.id,
    name: d.name,
    price: d.configuration?.candidate?.price ?? null,
  }));
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

export function listWorkspaces(): Promise<WorkspaceRecord[]> {
  return request("/api/workspaces");
}

/** Nameless by design — the agent names the workspace from conversation. */
export function createWorkspace(): Promise<WorkspaceRecord> {
  return request("/api/workspaces", { method: "POST" });
}

/** User-facing label for an unnamed workspace (the user-facing term for the
 * entity is "elevator" — docs/specs/agreement-workspace). */
export const PLACEHOLDER_NAME = "New elevator";

export function fetchWorkspace(id: string): Promise<WorkspaceRecord> {
  return request(`/api/workspaces/${encodeURIComponent(id)}`);
}

/** Rename an elevator, and answer with the stored record.
 *
 * The operator's door onto the name the agent's `name_workspace` tool also
 * writes (docs/specs/agreement-workspace). Both reach one store call, so the
 * two cannot disagree about what the elevator is called; what they can disagree
 * about is which of them wrote last, and last write wins.
 *
 * A name with nothing in it is refused by the store and arrives here as a 400,
 * which `request` throws on. The caller says why the elevator kept its name.
 */
export function renameWorkspace(
  id: string,
  name: string,
): Promise<WorkspaceRecord> {
  return request(`/api/workspaces/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

/** Destroy an elevator and everything it holds — its drafts, their record of
 * what was done to them, and any document ingested for it
 * (docs/specs/agreement-workspace). There is no archived state and no
 * undelete, and the reply is the id that is gone. */
export function deleteWorkspace(id: string): Promise<{ deleted: string }> {
  return request(`/api/workspaces/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function registerThread(
  workspaceId: string,
  threadId: string,
): Promise<WorkspaceRecord> {
  return request(`/api/workspaces/${encodeURIComponent(workspaceId)}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threadId }),
  });
}
