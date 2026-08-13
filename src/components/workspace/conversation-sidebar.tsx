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
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    <aside className="flex h-dvh w-64 shrink-0 flex-col border-r bg-background max-lg:hidden">
      <div className="border-b p-4">
        <Button
          asChild
          variant="link"
          size="xs"
          className="h-auto p-0 text-muted-foreground hover:text-foreground hover:no-underline"
        >
          <Link href="/">
            <ArrowLeft />
            All elevators
          </Link>
        </Button>
        {workspaceName ? (
          <h1 className="mt-2 truncate text-sm font-semibold" title={workspaceName}>
            {workspaceName}
          </h1>
        ) : (
          <h1 className="mt-2 truncate text-sm font-semibold italic text-muted-foreground">
            {workspace ? PLACEHOLDER_NAME : "…"}
          </h1>
        )}
      </div>

      <div className="p-3">
        <Button
          variant="outline"
          onClick={onNew}
          // Already in a fresh, unregistered conversation — nothing to start.
          disabled={!activeIsRegistered}
          title={
            activeIsRegistered ? undefined : "you're in a new conversation now"
          }
          // pointer-events-auto: Button disables them, which would suppress the
          // native title and with it the reason this is unavailable
          // (docs/specs/ui-component-library/design.md, decision 4).
          className="w-full justify-start disabled:pointer-events-auto"
        >
          <MessageSquarePlus />
          New conversation
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <nav className="space-y-1 px-3 pb-3">
          {threads.length === 0 && (
            <p className="px-1 text-xs text-muted-foreground">
              No conversations yet — the chat beside the sheet starts one.
            </p>
          )}
          {threads.map((thread) => (
            <Button
              key={thread.id}
              variant={thread.id === activeThreadId ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onSelect(thread.id)}
              className={`w-full justify-start text-xs font-normal ${
                thread.id === activeThreadId
                  ? "font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {conversationLabel(thread.createdAt)}
            </Button>
          ))}
          {activeThreadId && !activeIsRegistered && threads.length > 0 && (
            <p className="px-1 pt-1 text-xs italic text-muted-foreground">
              new conversation — joins the list on its first message
            </p>
          )}
        </nav>
      </ScrollArea>
    </aside>
  );
}
