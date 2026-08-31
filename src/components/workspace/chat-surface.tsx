"use client";

// docs/specs/chat-surface/design.md

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
import type { WorkspaceRecord } from "@/lib/workspaces";
import { ConversationMenu } from "./conversation-menu";

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

/** Not persisted: restoring it from localStorage would bring back the
 * hydration mismatch `workspace-split.tsx` refuses, and sidebar on every load
 * is what keeps the app from opening anyone in a transcript. */
export function useChatSurface() {
  const [mode, setMode] = useState<ChatSurfaceMode>("sidebar");
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
 * In the header rather than in `useChatSurface` because `useAgent` re-renders
 * its caller on every streamed token, and there that caller is the whole
 * workspace page (docs/specs/chat-surface/design.md decision 5).
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

/** Calls no hook beyond the hydration flag, so the conversation menu stays out
 * of the mode controls' render scope. Nothing here may subscribe to agent
 * state — one such hook re-renders both leaves (decision 7). */
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

/** A Radix menu present during the hydration pass shifts the `useId` values of
 * the whole page (docs/specs/chat-surface/design.md decision 4). */
function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}

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
