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
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { formatMonthly } from "@/lib/configurator";
import {
  PLACEHOLDER_NAME,
  WorkspaceRecord,
  createWorkspace,
  currentDraft,
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
    <main className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-8 py-12">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Elevators</h1>
            <p className="text-sm text-muted-foreground">
              One living service agreement per installation — open one to
              review or revise it, in conversation or directly.
            </p>
          </div>
          <Button variant="outline" onClick={create} disabled={creating}>
            <Plus />
            New elevator
          </Button>
        </header>

        {error && (
          <p className="text-sm text-muted-foreground">
            Could not reach the workspace store — is the agent running? (
            <code>npm run dev</code>)
          </p>
        )}
        {workspaces && workspaces.length === 0 && !error && (
          <Empty className="border p-6 md:p-6">
            <EmptyDescription>
              No elevators yet — start one and just describe your building; it
              names itself as you talk.
            </EmptyDescription>
          </Empty>
        )}

        <ItemGroup className="gap-2">
          {workspaces?.map((workspace) => (
            <Item
              key={workspace.id}
              asChild
              variant="outline"
              size="sm"
              className="items-baseline hover:border-primary"
            >
              <Link href={`/workspaces/${workspace.id}`}>
                <ItemContent className="min-w-0 gap-0.5">
                  {workspace.name ? (
                    <ItemTitle className="max-w-full truncate">
                      {workspace.name}
                    </ItemTitle>
                  ) : (
                    <ItemTitle className="max-w-full truncate font-normal italic text-muted-foreground">
                      {PLACEHOLDER_NAME}
                    </ItemTitle>
                  )}
                  <ItemDescription className="text-xs">
                    {workspace.threads.length === 1
                      ? "1 conversation"
                      : `${workspace.threads.length} conversations`}
                    {" · last activity "}
                    {new Date(workspace.updatedAt).toLocaleDateString("en-IE", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </ItemDescription>
                </ItemContent>
                <ItemActions>
                  {/* The current draft's figure: an elevator with two drafts is
                      still one entry here, quoted at the one being worked on
                      (docs/specs/parallel-drafts). */}
                  {currentDraft(workspace).configuration.candidate ? (
                    <span className="text-sm font-semibold tabular-nums">
                      {formatMonthly(
                        currentDraft(workspace).configuration.candidate!.price,
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      no proposal yet
                    </span>
                  )}
                </ItemActions>
              </Link>
            </Item>
          ))}
        </ItemGroup>
      </div>
    </main>
  );
}
