"use client";

// docs/specs/parallel-drafts/design.md

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
import { sayNoPrice } from "@/lib/say-why";

export function DraftSwitcher({
  drafts,
  currentDraftId,
  onSwitch,
  onFork,
  onCompare,
  onDiscard,
}: {
  drafts: DraftSummary[];
  currentDraftId: string | undefined;
  onSwitch: (name: string) => void;
  onFork: () => void;
  onCompare: (name: string) => void;
  onDiscard: (name: string) => void;
}) {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const current =
    drafts.find((d) => d.id === currentDraftId) ?? drafts[0] ?? null;
  // Nothing until the client has taken over: the server renders no drafts, and
  // a switcher rendered during that pass would be an extra node above the
  // schedules' collapsibles and shift every `useId` on the page.
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
      <DropdownMenuTrigger asChild>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
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
            drafts it compares. Where a comparison is *placed* is decided but
            not yet built — a canvas mode, with the chat keeping one sentence
            (docs/discovery/models/Comparison view.md).

            `compare_drafts` needs a priced candidate on both sides, and a
            draft edited since its last completion has none, so the move would
            return an error. The item says so where the move is, and stays
            visible rather than vanishing — a move that disappeared between two
            openings of the same menu reads as a bug.

            Live rather than disabled (constitution #17); nothing else on the
            menu says why a draft has no price or how it gets one. */}
        {current.price === null ? (
          <DropdownMenuItem onSelect={() => sayNoPrice(current.name)}>
            <Columns2 />
            <span className="truncate">Compare</span>
            <span className="ml-auto shrink-0 pl-2 text-xs whitespace-nowrap text-muted-foreground">
              no price
            </span>
          </DropdownMenuItem>
        ) : (
          others.map((draft) => (
            <DropdownMenuItem
              key={`compare-${draft.id}`}
              onSelect={() =>
                draft.price === null
                  ? sayNoPrice(draft.name)
                  : onCompare(draft.name)
              }
            >
              <Columns2 />
              <span className="truncate">Compare with {draft.name}</span>
              {draft.price === null && (
                <span className="ml-auto shrink-0 pl-2 text-xs whitespace-nowrap text-muted-foreground">
                  no price
                </span>
              )}
            </DropdownMenuItem>
          ))
        )}
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
