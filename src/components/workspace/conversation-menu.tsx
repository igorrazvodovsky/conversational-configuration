"use client";

/**
 * Workspace-scoped conversation list (docs/specs/agreement-workspace), drawn in
 * the chat's own header (docs/specs/chat-surface, decision 7) — the list is a
 * view onto the pane it changes, so it travels with that pane instead of
 * holding a column of its own. It replaces the global CopilotThreadsDrawer,
 * which lists every thread and so stands in for the wrong entity.
 *
 * Conversations are ephemeral views onto the agreement; rows are labelled by
 * when they started, because the negotiation — not the conversation — is the
 * thing with a name.
 *
 * Props only, and deliberately: this sits beside the header's mode controls,
 * which re-render on every streamed token through `useAgent`. Nothing here may
 * call that hook (chat-surface design 7).
 */

import { ChevronDownIcon, MessageSquarePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkspaceRecord } from "@/lib/workspaces";

const LOCALE = "en-IE";

/** The trigger's label: which conversation this is, in full. */
function conversationLabel(createdAt: string): string {
  return new Date(createdAt).toLocaleString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Inside a day's group the date is the heading, so a row is just its time. */
function timeLabel(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function midnight(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function dayHeading(createdAt: string, now: Date): string {
  const started = new Date(createdAt);
  const days = Math.round(
    (midnight(now) - midnight(started)) / (24 * 60 * 60 * 1000),
  );
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return started.toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ConversationMenu({
  workspace,
  activeThreadId,
  onSelect,
  onNew,
  /** False until hydration: a Radix menu in the hydrated tree shifts `useId`
   *  values page-wide (chat-surface design 4). Until then, a plain button. */
  interactive,
}: {
  workspace: WorkspaceRecord | null;
  activeThreadId: string | undefined;
  onSelect: (threadId: string) => void;
  onNew: () => void;
  interactive: boolean;
}) {
  // Newest first; the store appends in creation order.
  const threads = [...(workspace?.threads ?? [])].reverse();
  const active = threads.find((t) => t.id === activeThreadId);

  // Grouped in list order, so a day's heading appears once, where it starts.
  const now = new Date();
  const groups: { heading: string; threads: typeof threads }[] = [];
  for (const thread of threads) {
    const heading = dayHeading(thread.createdAt, now);
    if (groups.at(-1)?.heading !== heading) groups.push({ heading, threads: [] });
    groups.at(-1)!.threads.push(thread);
  }

  const trigger = (
    <Button
      variant="ghost"
      size="xs"
      title="Conversations"
      className="min-w-0 font-normal text-muted-foreground"
    >
      <span className="truncate">
        {active ? conversationLabel(active.createdAt) : "New conversation"}
      </span>
      <ChevronDownIcon className="shrink-0" />
    </Button>
  );

  return (
    <div className="flex min-w-0 items-center gap-1">
      {interactive ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            {threads.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                No conversations yet — this one joins the list on its first
                message.
              </p>
            ) : (
              <DropdownMenuRadioGroup
                value={activeThreadId ?? ""}
                onValueChange={onSelect}
              >
                {groups.map((group) => (
                  <div key={group.heading}>
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                      {group.heading}
                    </DropdownMenuLabel>
                    {group.threads.map((thread) => (
                      <DropdownMenuRadioItem key={thread.id} value={thread.id}>
                        {timeLabel(thread.createdAt)}
                      </DropdownMenuRadioItem>
                    ))}
                  </div>
                ))}
              </DropdownMenuRadioGroup>
            )}
            {!active && threads.length > 0 && (
              <p className="px-2 py-1.5 text-xs italic text-muted-foreground">
                new conversation — joins the list on its first message
              </p>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        trigger
      )}

      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onNew}
        // Already in a fresh, unregistered conversation — nothing to start.
        disabled={!active}
        title={active ? "New conversation" : "you're in a new conversation now"}
        // pointer-events-auto: Button disables them, which would suppress the
        // native title and with it the reason this is unavailable
        // (docs/specs/ui-component-library/design.md, decision 4).
        className="disabled:pointer-events-auto"
      >
        <MessageSquarePlus />
        <span className="sr-only">New conversation</span>
      </Button>
    </div>
  );
}
