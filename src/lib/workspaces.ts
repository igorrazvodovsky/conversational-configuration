// docs/specs/agreement-workspace/design.md

import type { Configuration } from "./configurator";

export interface WorkspaceThread {
  id: string;
  createdAt: string;
  /** Absent on conversations registered before the store began stamping it;
   * `createdAt` stands in then. */
  updatedAt?: string;
}

/** Ties go to the later entry, since the store appends in creation order. */
export function latestThread(
  threads: WorkspaceThread[],
): WorkspaceThread | undefined {
  const activity = (t: WorkspaceThread) => t.updatedAt ?? t.createdAt;
  return threads.reduce<WorkspaceThread | undefined>(
    (best, t) => (!best || activity(t) >= activity(best) ? t : best),
    undefined,
  );
}

/** What the frontend reads is whether an entry has any facts, and where the
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

export interface DraftRecord {
  id: string;
  name: string;
  /** null on the draft a workspace opens with. An id that no longer resolves
   * reads as no lineage rather than being repaired. */
  forkedFrom: string | null;
  configuration: Configuration;
  /** Oldest first. Drafts adapted from records written before the log carry
   * none until something is written to them. */
  log?: LogEntry[];
}

export interface WorkspaceRecord {
  id: string;
  /** null until the agent names the workspace from conversation. */
  name: string | null;
  /** Always at least one, always with one current. */
  drafts: DraftRecord[];
  currentDraftId: string;
  threads: WorkspaceThread[];
  createdAt: string;
  updatedAt: string;
}

/** Falls back to the first draft if the pointer is ever dangling — no read path
 * may be the one that throws. */
export function currentDraft(record: WorkspaceRecord): DraftRecord {
  return (
    record.drafts.find((d) => d.id === record.currentDraftId) ?? record.drafts[0]
  );
}

/** The agent's copy is `HISTORY_DEPTH` in `agent/src/workspace_store.py`, held
 * equal by `tests/couplings.test.ts`. */
export const REVERSAL_REACH = 10;

/** An entry with no facts is walked past rather than spent a step on. */
const reversible = (entry: LogEntry) =>
  entry.asserted.length > 0 || entry.retracted.length > 0;

/** The same predicate as `history_depths` in the store, held equal by the
 * couplings check. */
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

export const PLACEHOLDER_NAME = "New elevator";

export function fetchWorkspace(id: string): Promise<WorkspaceRecord> {
  return request(`/api/workspaces/${encodeURIComponent(id)}`);
}

/** The same store call the agent's `name_workspace` tool reaches; last write
 * wins. An empty name is refused by the store and arrives as a 400. */
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

/** There is no archived state and no undelete. */
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
