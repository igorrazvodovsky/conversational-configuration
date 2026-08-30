"use client";

/**
 * Ending an elevator (docs/specs/agreement-workspace).
 *
 * Deletion is outright and takes on the click: the record is unlinked and its
 * drafts, their logs and any ingested document go with it. Nothing asks twice
 * and nothing can put it back — the log a reversal walks lives inside the
 * record being destroyed — so what the control has instead of a confirmation
 * is that it says what it deletes and nothing else does.
 *
 * It is reached from the elevator list and from the head of the agreement, and
 * by no tool: no conversation can destroy the agreement it is about. The same
 * component serves both, taking props and calling the store directly — there
 * is nothing here for agent state to hold.
 *
 * A button and an icon mint no React ids, so this joins the hydrated tree as
 * it is, the way the canvas head's Link and its View button already do
 * (docs/specs/chat-surface).
 */

import { useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteWorkspace } from "@/lib/workspaces";

export function DeleteElevator({
  workspaceId,
  name,
  onDeleted,
  className,
}: {
  workspaceId: string;
  /** The elevator's name, or null while it is still unnamed. Said in the
   *  control's own label, which is the only warning there is. */
  name: string | null;
  /** Where the caller goes once the record is gone: the list re-reads, the
   *  open agreement navigates out of itself. */
  onDeleted: () => void;
  className?: string;
}) {
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  const remove = async () => {
    if (deleting) return;
    setDeleting(true);
    setFailed(false);
    try {
      await deleteWorkspace(workspaceId);
      onDeleted();
    } catch {
      // The record is still there. The control says so and stays where it is,
      // rather than reporting a deletion that did not happen.
      setFailed(true);
    } finally {
      setDeleting(false);
    }
  };

  const label = name ? `Delete “${name}”` : "Delete this elevator";

  return (
    <Button
      variant="ghost"
      size="xs"
      disabled={deleting}
      onClick={remove}
      title={
        failed
          ? "Could not delete it — is the agent running? Nothing was changed."
          : `${label} — its agreement and every draft of it go with it, and this cannot be undone`
      }
      className={cn(
        "text-muted-foreground hover:text-destructive",
        failed && "text-destructive",
        className,
      )}
    >
      <Trash2 />
      <span className="sr-only">{label}</span>
    </Button>
  );
}
