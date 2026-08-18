"use client";

/**
 * Which draft of the agreement this is, and the way between them
 * (docs/specs/parallel-drafts) — at the document's identity, where the frames
 * strip's information used to sit under the price as a compare trigger.
 *
 * Every move here dispatches a *visible* structured message, unlike a canvas
 * edit: switching changes what the whole document says, and one transcript can
 * hold turns that acted on two drafts, so the chat has to carry the change.
 * Forking carries no name — the agent names the draft from the conversation.
 *
 * Two rules from docs/specs/chat-surface govern this component. It is a menu,
 * so it mints React ids and may not join the hydrated tree: the server and the
 * first client render agree on a plain button and the menu takes over a tick
 * later, exactly as the chat header's two menus do. And it takes props only —
 * the canvas above it already subscribes to agent state, and nothing here adds
 * a second subscription.
 */

import { useEffect, useState } from "react";
import { ChevronDownIcon, Columns2, CopyPlus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DraftSummary, formatMonthly } from "@/lib/configurator";

export function DraftSwitcher({
  drafts,
  currentDraftId,
  disabled,
  onSwitch,
  onFork,
  onCompare,
  onDiscard,
}: {
  drafts: DraftSummary[];
  currentDraftId: string | undefined;
  disabled: boolean;
  onSwitch: (name: string) => void;
  onFork: () => void;
  onCompare: (name: string) => void;
  onDiscard: (name: string) => void;
}) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const current =
    drafts.find((d) => d.id === currentDraftId) ?? drafts[0] ?? null;
  // Nothing at all until the client has taken over: the server renders no
  // drafts (it has no agent state) and the seed can land before the canvas
  // hydrates, so a switcher rendered during that pass would be an extra node
  // above the schedules' collapsibles and shift every `useId` on the page
  // (docs/specs/chat-surface).
  if (!hydrated || !current) return null;

  const trigger = (
    <Button
      variant="ghost"
      size="xs"
      title="Drafts of this agreement"
      className="min-w-0 font-normal text-muted-foreground"
    >
      <span className="truncate">{current.name}</span>
      <ChevronDownIcon className="shrink-0" />
    </Button>
  );

  const others = drafts.filter((d) => d.id !== current.id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Drafts of this agreement
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={current.id}
          onValueChange={(id) => {
            const draft = drafts.find((d) => d.id === id);
            if (draft && draft.id !== current.id) onSwitch(draft.name);
          }}
        >
          {drafts.map((draft) => (
            <DropdownMenuRadioItem key={draft.id} value={draft.id}>
              <span className="truncate">{draft.name}</span>
              {/* A draft edited since its last completion has no price to
                  report, and shows by name alone. */}
              {draft.price !== null && (
                <span className="ml-auto pl-2 text-xs tabular-nums text-muted-foreground">
                  {formatMonthly(draft.price)}
                </span>
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onFork}>
          <CopyPlus />
          Keep this and start another
        </DropdownMenuItem>
        {/* The compare trigger the frames strip carried, kept here beside the
            drafts it compares. Where a comparison is *placed* once it exists is
            still open (docs/discovery/phase-plan.md task 3). */}
        {others.map((draft) => (
          <DropdownMenuItem
            key={`compare-${draft.id}`}
            onSelect={() => onCompare(draft.name)}
          >
            <Columns2 />
            <span className="truncate">Compare with {draft.name}</span>
          </DropdownMenuItem>
        ))}
        {others.map((draft) => (
          <DropdownMenuItem
            key={draft.id}
            variant="destructive"
            onSelect={() => onDiscard(draft.name)}
          >
            <Trash2 />
            <span className="truncate">Discard {draft.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
