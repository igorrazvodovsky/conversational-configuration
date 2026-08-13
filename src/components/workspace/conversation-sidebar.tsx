"use client";

/**
 * Workspace-scoped conversation list (docs/specs/agreement-workspace) —
 * replaces the global CopilotThreadsDrawer, which lists every thread and so
 * stands in for the wrong entity. Conversations are ephemeral views onto the
 * agreement; rows are labelled by date because the negotiation, not the
 * conversation, is the thing with a name.
 */

import Link from "next/link";
import { ArrowLeft, MessageSquarePlus } from "lucide-react";
import { PLACEHOLDER_NAME, type WorkspaceRecord } from "@/lib/workspaces";

function conversationLabel(createdAt: string): string {
  return new Date(createdAt).toLocaleString("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConversationSidebar({
  workspace,
  workspaceName,
  activeThreadId,
  onSelect,
  onNew,
}: {
  workspace: WorkspaceRecord | null;
  /** Live name (agent state wins over the fetched record); null = unnamed. */
  workspaceName: string | null;
  activeThreadId: string | undefined;
  onSelect: (threadId: string) => void;
  onNew: () => void;
}) {
  // Newest first; the store appends in creation order.
  const threads = [...(workspace?.threads ?? [])].reverse();
  const activeIsRegistered = threads.some((t) => t.id === activeThreadId);

  return (
    <aside className="flex h-dvh w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--background)] max-lg:hidden">
      <div className="border-b border-[var(--border)] p-4">
        <Link
          href="/"
          className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-3 w-3" />
          All elevators
        </Link>
        {workspaceName ? (
          <h1 className="mt-2 truncate text-sm font-semibold" title={workspaceName}>
            {workspaceName}
          </h1>
        ) : (
          <h1 className="mt-2 truncate text-sm font-semibold italic text-[var(--muted-foreground)]">
            {workspace ? PLACEHOLDER_NAME : "…"}
          </h1>
        )}
      </div>

      <div className="p-3">
        <button
          onClick={onNew}
          // Already in a fresh, unregistered conversation — nothing to start.
          disabled={!activeIsRegistered}
          title={
            activeIsRegistered ? undefined : "you're in a new conversation now"
          }
          className="flex w-full items-center gap-1.5 rounded-md border border-[var(--border)] px-3 py-2 text-sm transition-colors hover:border-[var(--primary)] disabled:opacity-50"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New conversation
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        {threads.length === 0 && (
          <p className="px-1 text-xs text-[var(--muted-foreground)]">
            No conversations yet — the chat beside the sheet starts one.
          </p>
        )}
        {threads.map((thread) => (
          <button
            key={thread.id}
            onClick={() => onSelect(thread.id)}
            className={`w-full rounded-md px-2.5 py-2 text-left text-xs transition-colors ${
              thread.id === activeThreadId
                ? "bg-[var(--secondary)] font-medium"
                : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
            }`}
          >
            {conversationLabel(thread.createdAt)}
          </button>
        ))}
        {activeThreadId && !activeIsRegistered && threads.length > 0 && (
          <p className="px-1 pt-1 text-xs italic text-[var(--muted-foreground)]">
            new conversation — joins the list on its first message
          </p>
        )}
      </nav>
    </aside>
  );
}
