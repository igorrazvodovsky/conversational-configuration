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
}

export interface WorkspaceRecord {
  id: string;
  // null until the agent names the workspace from conversation
  name: string | null;
  configuration: Configuration;
  threads: WorkspaceThread[];
  createdAt: string;
  updatedAt: string;
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
