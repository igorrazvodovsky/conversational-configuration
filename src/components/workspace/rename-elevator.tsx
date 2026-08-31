"use client";

// docs/specs/agreement-workspace/design.md
//
// In place rather than in a dialog: both placements sit in the hydrated tree,
// where a Radix `Dialog` or `Popover` would mint React ids
// (docs/specs/chat-surface/design.md).

import { useRef, useState } from "react";
import { Check, Pencil, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { sayWhy } from "@/lib/say-why";
import { renameWorkspace } from "@/lib/workspaces";

export function RenameElevator({
  workspaceId,
  name,
  onRenamed,
  className,
  children,
}: {
  workspaceId: string;
  /** null while unnamed: an unnamed elevator opens an empty field, since the
   * placeholder is a thing the list says. */
  name: string | null;
  onRenamed: (name: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  // A ref beside the state: the handler is the whole guard against a second
  // submit, and `saving` is read from a render's closure.
  const savingNow = useRef(false);

  const open = () => {
    setDraft(name ?? "");
    setFailed(false);
    setEditing(true);
  };

  const close = () => {
    setEditing(false);
    setFailed(false);
  };

  const submit = async () => {
    // Cleared first, so a failure the operator has since answered does not
    // leave its sentence standing beside a different answer.
    setFailed(false);
    const wanted = draft.trim();
    if (!wanted) {
      sayWhy(
        "rename-empty",
        "An elevator needs a name to be renamed to — it keeps the one it has. Type a name, or press Escape to cancel.",
      );
      return;
    }
    if (wanted === name) {
      close();
      return;
    }
    if (savingNow.current) return;
    savingNow.current = true;
    setSaving(true);
    try {
      const record = await renameWorkspace(workspaceId, wanted);
      // The stored name, not the typed one: the store trims.
      onRenamed(record.name ?? wanted);
      close();
    } catch {
      // The field stays open with what was typed rather than closing on a
      // rename that did not happen.
      setFailed(true);
    } finally {
      savingNow.current = false;
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className={cn("flex min-w-0 items-center gap-1", className)}>
        {children}
        {/* `relative`, so the control sits above the row-covering link overlay
            in the elevator list. It costs the canvas head nothing. */}
        <Button
          variant="ghost"
          size="icon-xs"
          className="relative shrink-0 text-muted-foreground hover:text-foreground"
          onClick={open}
        >
          <Pencil />
          <span className="sr-only">
            {name ? `Rename “${name}”` : "Name this elevator"}
          </span>
        </Button>
      </div>
    );
  }

  const noteId = `rename-note-${workspaceId}`;

  return (
    <div className={cn("min-w-0", className)}>
      <form
        className="flex min-w-0 items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              close();
            }
          }}
          aria-label="Elevator name"
          aria-describedby={failed ? noteId : undefined}
          placeholder="Riverside Tower — north lift"
          className="h-6 max-w-72 min-w-0"
        />
        {/* Live while it works: `submit` returns early on a second call, so the
            attribute would only take the control away and explain nothing. */}
        <Button
          type="submit"
          variant="ghost"
          size="icon-xs"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          {saving ? <Spinner /> : <Check />}
          <span className="sr-only">{saving ? "Renaming…" : "Rename"}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={close}
        >
          <X />
          <span className="sr-only">Cancel renaming</span>
        </Button>
      </form>
      {/* A sentence that stays, not a tooltip (constitution #16). The input
          points at it. */}
      {failed && (
        <p id={noteId} className="mt-1 text-xs text-destructive">
          Could not rename it — is the agent running? It still has the name it
          had.
        </p>
      )}
    </div>
  );
}
