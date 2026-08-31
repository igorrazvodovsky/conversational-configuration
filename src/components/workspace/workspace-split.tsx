"use client";

/**
 * The workspace's two surfaces: the agreement canvas beside a chat panel the
 * operator can size (docs/specs/agreement-workspace/design.md).
 *
 * The four chat geometries are four sets of classes over one unchanging tree,
 * because re-parenting the chat's DOM node resets the transcript's scroll
 * offset (docs/specs/chat-surface/design.md decision 2).
 */

import { useEffect, useState, type ReactNode } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { recordsTheSplit, rememberCanvasPercent } from "@/lib/split-layout";
import { cn } from "@/lib/utils";
import type { ChatSurfaceMode } from "./chat-surface";

/** Below `lg` the panes stack rather than the chat hiding
 * (docs/specs/agreement-workspace/design.md). */
function useSplitOrientation(): "horizontal" | "vertical" {
  const [stacked, setStacked] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const sync = () => setStacked(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return stacked ? "vertical" : "horizontal";
}

/**
 * `ResizablePanel` renders an outer box the group sizes and an inner one that
 * takes `className`, so these classes move the panel's *contents* and
 * `UNDOCKED` empties the box. Both halves are needed
 * (docs/specs/chat-surface/design.md decision 2, which also rules `opacity-0`
 * over `display:none` and why the covering modes paint a background).
 */
const CHAT_GEOMETRY: Record<ChatSurfaceMode, string> = {
  sidebar: "",
  floating:
    "absolute end-4 bottom-4 z-30 h-[70%] w-[400px] border bg-background shadow-lg",
  fullscreen: "absolute inset-0 z-40 bg-background",
  hidden: "absolute inset-0 opacity-0 pointer-events-none",
};

/**
 * Empties the panel box of its column by beating the inline `flex` the group
 * writes, rather than through the group's layout API, which validates against
 * `minSize` (docs/specs/chat-surface/design.md decision 2). Coupled to the
 * panel's `id`.
 */
const UNDOCKED = "[&>#chat]:!flex-none";

export function WorkspaceSplit({
  canvas,
  canvasPercent,
  chat,
  chatHeader,
  mode,
}: {
  canvas: ReactNode;
  /** The canvas's share of the group, read from the request's cookie by
   * `workspaces/[id]/page.tsx` (docs/specs/remembered-split/design.md). The
   * chat takes the rest. */
  canvasPercent: number;
  chat: ReactNode;
  chatHeader: ReactNode;
  mode: ChatSurfaceMode;
}) {
  const orientation = useSplitOrientation();
  const sideBySide = orientation === "horizontal";
  const docked = mode === "sidebar";

  /*
    The split is persisted through a cookie, and every id here is explicit:
    `useDefaultLayout` and `useId` each diverge between the SSR pass and
    hydration, which is why the size arrives as a prop the server can also read
    (docs/specs/remembered-split/design.md).
  */
  return (
    <ResizablePanelGroup
      id="workspace-split"
      orientation={orientation}
      // The positioning context for the three modes that leave the flow.
      className={cn("relative", !docked && UNDOCKED)}
      onLayoutChanged={(layout, { isUserInteraction }) => {
        // Only a drag of this handle, in the geometry the stored split is
        // about, may write (docs/specs/remembered-split/design.md).
        if (!recordsTheSplit({ isUserInteraction, sideBySide, docked })) return;
        const { canvas: canvasGrow, chat: chatGrow } = layout;
        if (!canvasGrow || !chatGrow) return;
        rememberCanvasPercent((canvasGrow / (canvasGrow + chatGrow)) * 100);
      }}
    >
      <ResizablePanel
        id="canvas"
        defaultSize={`${canvasPercent}%`}
        // Pixel floors, both measured (docs/specs/agreement-workspace/design.md).
        // Side by side only: stacked, they would apply to the cross axis, where
        // a short viewport could not satisfy both.
        minSize={sideBySide ? "360px" : undefined}
        // min-h-0/min-w-0 so the canvas ScrollArea scrolls inside the panel
        // rather than growing it. `relative` is what the render mode positions
        // against (docs/specs/visual-configuration/design.md).
        className="relative min-h-0 min-w-0"
      >
        {canvas}
      </ResizablePanel>

      <ResizableHandle
        id="workspace-split-handle"
        withHandle
        className={cn(!docked && "hidden")}
      />

      <ResizablePanel
        id="chat"
        defaultSize={`${100 - canvasPercent}%`}
        // The same measured floor as the canvas.
        minSize={sideBySide ? "360px" : undefined}
        className={cn("flex min-h-0 min-w-0 flex-col", CHAT_GEOMETRY[mode])}
        // A hidden pane is still laid out, so it has to be taken out of the
        // tab order and the accessibility tree by hand.
        inert={mode === "hidden"}
      >
        {chatHeader}
        <div
          className={cn(
            "min-h-0 w-full flex-1 overflow-y-auto px-4 pb-6",
            // Full width is unreadable for a transcript at desktop sizes.
            mode === "fullscreen" && "mx-auto max-w-3xl",
          )}
        >
          {chat}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
