"use client";

/**
 * Renaming an elevator (docs/specs/agreement-workspace).
 *
 * The agent names the elevator from conversation and never asks; this is the
 * operator's door onto the same name. It writes through `PATCH /workspaces/{id}`
 * to the one store call the `name_workspace` tool also reaches, so the two
 * cannot leave a name the other reads differently.
 *
 * The control owns the name's *display* as well as its editing, because those
 * are one place on the page: the caller passes what the name looks like when
 * nobody is editing it — a link in a row of the list, a span at the head of the
 * agreement — and this swaps that for a field in the same spot. Edit in place
 * rather than a dialog, and that is not only a preference: both placements sit
 * in the hydrated tree, where a Radix `Dialog` or `Popover` would mint React
 * ids and shift every `useId` on the page (docs/specs/chat-surface). An input,
 * a form and two buttons mint none, so this joins the tree as it is, the way
 * `DeleteElevator` beside it does.
 *
 * Nothing here is disabled to mean no (constitution #17). Confirming an empty
 * name takes the click and says why the elevator kept the one it had; a rename
 * already in flight is guarded in the handler, with a spinner saying so.
 */

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
  /** The elevator's name, or null while it is still unnamed. It is what the
   *  field opens on — an unnamed elevator opens an empty field, because the
   *  placeholder is a thing the list says, not a name anybody chose. */
  name: string | null;
  /** What the caller does with the stored name once it is renamed: the list
   *  re-reads itself, the open agreement keeps its own display in step. */
  onRenamed: (name: string) => void;
  className?: string;
  /** How the name reads when nobody is editing it. */
  children: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  // A ref beside the state, for the reason `DeleteElevator` and the list page
  // both record: the confirm button is not disabled while it works
  // (constitution #17), so the handler is the whole guard against a second
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
    // Cleared first, so a failure the operator has since answered — by
    // clearing the field, or by typing something else — does not leave its
    // sentence standing beside a different answer.
    setFailed(false);
    const wanted = draft.trim();
    if (!wanted) {
      // The click lands and is answered, rather than being refused by a
      // control that cannot be pressed (constitution #17).
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
      // The stored name, not the typed one: the store trims, and what the page
      // shows should be what it holds.
      onRenamed(record.name ?? wanted);
      close();
    } catch {
      // The elevator still has its old name. The field stays open with what
      // was typed, and says so, rather than closing on a rename that did not
      // happen.
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
          // Autofocus is the point of the gesture: the operator asked to type.
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
      {/* A sentence that stays, not a tooltip: hover may not be the only route
          to a reason (constitution #16). The input points at it. */}
      {failed && (
        <p id={noteId} className="mt-1 text-xs text-destructive">
          Could not rename it — is the agent running? It still has the name it
          had.
        </p>
      )}
    </div>
  );
}
