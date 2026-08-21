"use client";

/**
 * The chat's geometry, as a mode the user picks (docs/specs/chat-surface).
 *
 * Everything here is chrome *around* the chat, never inside it: the pane is one
 * mount in all four modes, and only its container's classes change
 * (workspace-split.tsx). Re-parenting it would reset the transcript's scroll
 * offset and re-fire `SettleAtEnd`, which is the whole reason the modes are
 * expressed as classes rather than as four renderings.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MaximizeIcon,
  MessageSquareIcon,
  PanelRightCloseIcon,
  PanelRightIcon,
  PictureInPicture2Icon,
} from "lucide-react";
import { useAgent } from "@copilotkit/react-core/v2";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHydrated } from "@/hooks/use-hydrated";
import type { WorkspaceRecord } from "@/lib/workspaces";
import { ConversationMenu } from "./conversation-menu";

/** Hidden is a mode like the others; only the visible three are switchable. */
export type ChatSurfaceMode = "sidebar" | "floating" | "fullscreen" | "hidden";
type VisibleMode = Exclude<ChatSurfaceMode, "hidden">;

const GEOMETRIES = [
  { mode: "sidebar", label: "Sidebar", icon: PanelRightIcon },
  { mode: "floating", label: "Floating", icon: PictureInPicture2Icon },
  { mode: "fullscreen", label: "Full screen", icon: MaximizeIcon },
] as const satisfies ReadonlyArray<{
  mode: VisibleMode;
  label: string;
  icon: typeof PanelRightIcon;
}>;

/**
 * Mode state, deliberately in React and deliberately not persisted: it is not
 * configuration (constitution #3 keeps the agent's state for the agreement),
 * and restoring it from localStorage would reintroduce the hydration mismatch
 * `workspace-split.tsx` refuses for the panel split. Sidebar on every load is
 * also the guard the discovery amendment rests on — the app never opens anyone
 * in a transcript.
 */
export function useChatSurface() {
  const [mode, setMode] = useState<ChatSurfaceMode>("sidebar");
  // Restoring goes back to where the user was, not to a mode we chose for them.
  const lastVisible = useRef<VisibleMode>("sidebar");
  const [unseenReplies, setUnseenReplies] = useState(false);

  const select = (next: VisibleMode) => {
    lastVisible.current = next;
    setUnseenReplies(false);
    setMode(next);
  };

  const hide = () => {
    if (mode !== "hidden") lastVisible.current = mode;
    setMode("hidden");
  };

  return {
    mode,
    select,
    hide,
    restore: () => {
      setUnseenReplies(false);
      setMode(lastVisible.current);
    },
    unseenReplies,
    // Stable, so the watcher's effect does not re-run on every parent render.
    noteReply: useCallback(() => setUnseenReplies(true), []),
  };
}

/**
 * A hidden pane may not open itself and may not swallow a reason
 * (docs/discovery/principles/refusals-name-their-rules.md), so what is left
 * is a mark. Counting assistant turns is all it does — no parsing, no
 * notion of which reply mattered.
 *
 * This lives in the header rather than in `useChatSurface`, and the reason is
 * render scope: `useAgent` re-renders its caller on every agent event, which
 * during a streaming reply is every token. In `useChatSurface` that caller is
 * the whole workspace page. Here it is two buttons.
 */
function useUnseenReplies(hidden: boolean, onUnseenReply: () => void) {
  const { agent } = useAgent();
  const replies = agent.messages.filter((m) => m.role === "assistant").length;
  const seen = useRef(replies);

  useEffect(() => {
    if (!hidden) {
      seen.current = replies;
      return;
    }
    if (replies > seen.current) onUnseenReply();
  }, [hidden, replies, onUnseenReply]);
}

/**
 * The bar itself: a flex container that calls no hook of its own beyond the
 * hydration flag, so the conversation menu is not dragged into the mode
 * controls' render scope — those re-render on every streamed token, this one
 * only when the workspace's conversations change (design 7). Nothing here may
 * subscribe to agent state: one such hook re-renders both leaves and the split
 * buys nothing.
 */
export function ChatSurfaceHeader({
  mode,
  onSelect,
  onHide,
  onUnseenReply,
  workspace,
  activeThreadId,
  onSelectConversation,
  onNewConversation,
}: {
  mode: ChatSurfaceMode;
  onSelect: (mode: VisibleMode) => void;
  onHide: () => void;
  onUnseenReply: () => void;
  workspace: WorkspaceRecord | null;
  activeThreadId: string | undefined;
  onSelectConversation: (threadId: string) => void;
  onNewConversation: () => void;
}) {
  // Both menus in this header mount a tick after hydration, for the reason
  // `useHydrated` records.
  const hydrated = useHydrated();

  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b px-2 py-1">
      <ConversationMenu
        workspace={workspace}
        activeThreadId={activeThreadId}
        onSelect={onSelectConversation}
        onNew={onNewConversation}
        interactive={hydrated}
      />
      <ChatModeControls
        mode={mode}
        onSelect={onSelect}
        onHide={onHide}
        onUnseenReply={onUnseenReply}
        hydrated={hydrated}
      />
    </div>
  );
}

/** The leaf that watches the agent, and so the only thing a stream re-renders. */
function ChatModeControls({
  mode,
  onSelect,
  onHide,
  onUnseenReply,
  hydrated,
}: {
  mode: ChatSurfaceMode;
  onSelect: (mode: VisibleMode) => void;
  onHide: () => void;
  onUnseenReply: () => void;
  hydrated: boolean;
}) {
  const current = GEOMETRIES.find((g) => g.mode === mode) ?? GEOMETRIES[0];
  useUnseenReplies(mode === "hidden", onUnseenReply);
  const trigger = (
    <Button variant="ghost" size="icon-xs" title="Chat layout">
      <current.icon />
      <span className="sr-only">Chat layout</span>
    </Button>
  );

  return (
    <div className="flex shrink-0 items-center gap-1">
      {hydrated ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
          {/* The content is trigger-width by default — 24px for an icon. */}
          <DropdownMenuContent align="end" className="w-auto min-w-40">
            <DropdownMenuRadioGroup
              value={mode}
              onValueChange={(value) => onSelect(value as VisibleMode)}
            >
              {GEOMETRIES.map(({ mode: value, label, icon: Icon }) => (
                <DropdownMenuRadioItem key={value} value={value}>
                  <Icon />
                  {label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        trigger
      )}

      <Button variant="ghost" size="icon-xs" title="Hide chat" onClick={onHide}>
        <PanelRightCloseIcon />
        <span className="sr-only">Hide chat</span>
      </Button>
    </div>
  );
}

/** The only affordance left when the chat is away. */
export function ChatRestoreButton({
  unseenReplies,
  onClick,
}: {
  unseenReplies: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className="absolute end-4 bottom-4 z-40 shadow-md"
    >
      <MessageSquareIcon />
      Chat
      {unseenReplies && (
        <>
          <span className="size-1.5 bg-primary" aria-hidden />
          <span className="sr-only">— new replies</span>
        </>
      )}
    </Button>
  );
}
