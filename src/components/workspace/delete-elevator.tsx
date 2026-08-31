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

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
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

  // A ref beside the state, for the reason `page.tsx` records: the button is
  // no longer disabled (constitution #17), so the handler is the whole guard
  // on a deletion that cannot be undone, and `deleting` is read from a
  // render's closure.
  const deletingNow = useRef(false);
  const remove = async () => {
    if (deletingNow.current) return;
    deletingNow.current = true;
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
      deletingNow.current = false;
      setDeleting(false);
    }
  };

  const label = name ? `Delete “${name}”` : "Delete this elevator";

  return (
    <Button
      variant="ghost"
      size="xs"
      // Live while it works (constitution #17): `remove` already returns early
      // on a second call, so the attribute guarded nothing and explained
      // nothing. The spinner is what says the deletion is in flight.
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
      {deleting ? <Spinner /> : <Trash2 />}
      <span className="sr-only">{deleting ? "Deleting…" : label}</span>
    </Button>
  );
}
