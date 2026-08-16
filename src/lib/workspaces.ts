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

export interface WorkspaceRecord {
  id: string;
  // null until the agent names the workspace from conversation
  name: string | null;
  configuration: Configuration;
  /** Undo/redo snapshots of the agreement (docs/specs/undo). Only the depths
   * are read here — the snapshots themselves are the agent's business, and
   * workspaces written before that spec carry no history at all. */
  history?: { past: unknown[]; future: unknown[] };
  threads: WorkspaceThread[];
  createdAt: string;
  updatedAt: string;
}

/** What the canvas needs to know about history: whether either end has
 * anything in it. Mirrored into agent state, seeded from the record on
 * attach. */
export function historyDepths(record: WorkspaceRecord | null) {
  return {
    undo: record?.history?.past.length ?? 0,
    redo: record?.history?.future.length ?? 0,
  };
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
