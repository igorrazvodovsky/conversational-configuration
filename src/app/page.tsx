"use client";

/**
 * Elevator list — the journey's entry point (docs/specs/agreement-workspace).
 * The primary user is a reviser: the front door shows their installations and
 * the agreements' current state, not an empty chat. Creation is one click and
 * nameless — the agent names the entry from conversation.
 */

import { useEffect, useRef, useState } from "react";
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
import { DeleteElevator } from "@/components/workspace/delete-elevator";
import { RenameElevator } from "@/components/workspace/rename-elevator";
import { Spinner } from "@/components/ui/spinner";

export default function HomePage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[] | null>(null);
  const [error, setError] = useState(false);
  const [creating, setCreating] = useState(false);

  // Re-read rather than splice: the store owns the order, and a delete is the
  // second thing that changes what this list holds.
  const load = () =>
    listWorkspaces()
      .then(setWorkspaces)
      .catch(() => setError(true));

  useEffect(() => {
    load();
  }, []);

  // A ref as well as the state, because the state is read from a render's
  // closure and a second click can land before React has re-rendered. The
  // button is no longer disabled (constitution #17), so the handler is the
  // whole guard on a non-idempotent action and has to hold synchronously.
  const creatingNow = useRef(false);
  const create = async () => {
    if (creatingNow.current) return;
    creatingNow.current = true;
    setCreating(true);
    try {
      const workspace = await createWorkspace();
      router.push(`/workspaces/${workspace.id}`);
    } catch {
      setError(true);
      creatingNow.current = false;
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
          {/* Not disabled while it works (constitution #17). `create` already
              returns early on a second call, so the attribute was never the
              guard — it only took the control away and said nothing. What says
              a creation is in flight is the spinner and the word. */}
          <Button variant="outline" onClick={create}>
            {creating ? <Spinner /> : <Plus />}
            {creating ? "Creating…" : "New elevator"}
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
            /* The row is no longer one anchor: it carries a delete control,
               and a button inside a link is neither valid markup nor
               clickable. The link covers the row through an overlay on the
               name instead, so the ordinary click still opens the elevator
               and the controls beside it are ordinary buttons. */
            <Item
              key={workspace.id}
              variant="outline"
              size="sm"
              className="relative items-baseline hover:border-primary"
            >
              <ItemContent className="min-w-0 gap-0.5">
                {/* The name is edited where it is written (docs/specs/
                    agreement-workspace): the control owns this spot and swaps
                    the link below for a field when the operator asks. */}
                <RenameElevator
                  workspaceId={workspace.id}
                  name={workspace.name}
                  onRenamed={load}
                >
                  <ItemTitle
                    className={
                      workspace.name
                        ? "max-w-full truncate"
                        : "max-w-full truncate font-normal italic text-muted-foreground"
                    }
                  >
                    <Link
                      href={`/workspaces/${workspace.id}`}
                      className="outline-none after:absolute after:inset-0"
                    >
                      {workspace.name ?? PLACEHOLDER_NAME}
                    </Link>
                  </ItemTitle>
                </RenameElevator>
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
              {/* `relative`, so the controls sit above the link's overlay. */}
              <ItemActions className="relative items-baseline">
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
                <DeleteElevator
                  workspaceId={workspace.id}
                  name={workspace.name}
                  onDeleted={load}
                />
              </ItemActions>
            </Item>
          ))}
        </ItemGroup>
      </div>
    </main>
  );
}
