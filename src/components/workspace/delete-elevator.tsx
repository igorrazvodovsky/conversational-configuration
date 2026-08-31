"use client";

// docs/specs/agreement-workspace/design.md

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
  /** null while unnamed. It is the control's own label, and the only warning
   * there is. */
  name: string | null;
  onDeleted: () => void;
  className?: string;
}) {
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  // A ref beside the state, for the reason `page.tsx` records: the handler is
  // the whole guard, and `deleting` is read from a render's closure.
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
      // The record is still there, so the control says so and stays open.
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
      // Live while it works; `remove` returns early on a second call and the
      // spinner says the deletion is in flight.
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
