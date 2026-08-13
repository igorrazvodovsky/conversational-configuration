"use client";

/**
 * Elevator list — the journey's entry point (docs/specs/agreement-workspace).
 * The primary user is a reviser: the front door shows their installations and
 * the agreements' current state, not an empty chat. Creation is one click and
 * nameless — the agent names the entry from conversation.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { formatMonthly } from "@/lib/configurator";
import {
  PLACEHOLDER_NAME,
  WorkspaceRecord,
  createWorkspace,
  listWorkspaces,
} from "@/lib/workspaces";

export default function HomePage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[] | null>(null);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    listWorkspaces()
      .then(setWorkspaces)
      .catch(() => setError(true));
  }, []);

  const create = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const workspace = await createWorkspace();
      router.push(`/workspaces/${workspace.id}`);
    } catch {
      setError(true);
      setCreating(false);
    }
  };

  return (
    <main className="min-h-dvh bg-[var(--background)]">
      <div className="mx-auto max-w-3xl px-8 py-12">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Elevators</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              One living service agreement per installation — open one to
              review or revise it, in conversation or directly.
            </p>
          </div>
          <button
            onClick={create}
            disabled={creating}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-2 text-sm transition-colors hover:border-[var(--primary)] disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            New elevator
          </button>
        </header>

        {error && (
          <p className="text-sm text-[var(--muted-foreground)]">
            Could not reach the workspace store — is the agent running? (
            <code>npm run dev</code>)
          </p>
        )}
        {workspaces && workspaces.length === 0 && !error && (
          <p className="rounded-lg border border-dashed border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
            No elevators yet — start one and just describe your building; it
            names itself as you talk.
          </p>
        )}

        <ul className="space-y-2">
          {workspaces?.map((workspace) => (
            <li key={workspace.id}>
              <Link
                href={`/workspaces/${workspace.id}`}
                className="flex items-baseline justify-between gap-4 rounded-lg border border-[var(--border)] px-4 py-3 transition-colors hover:border-[var(--primary)]"
              >
                <div className="min-w-0">
                  {workspace.name ? (
                    <div className="truncate text-sm font-medium">
                      {workspace.name}
                    </div>
                  ) : (
                    <div className="truncate text-sm italic text-[var(--muted-foreground)]">
                      {PLACEHOLDER_NAME}
                    </div>
                  )}
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {workspace.threads.length === 1
                      ? "1 conversation"
                      : `${workspace.threads.length} conversations`}
                    {" · last activity "}
                    {new Date(workspace.updatedAt).toLocaleDateString("en-IE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {workspace.configuration.candidate ? (
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMonthly(workspace.configuration.candidate.price)}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--muted-foreground)]">
                      no proposal yet
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
