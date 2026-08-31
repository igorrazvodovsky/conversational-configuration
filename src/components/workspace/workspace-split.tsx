"use client";

// docs/specs/agreement-workspace/design.md, docs/specs/chat-surface/design.md

import { useEffect, useState, type ReactNode } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { recordsTheSplit, rememberCanvasPercent } from "@/lib/split-layout";
import { cn } from "@/lib/utils";
import type { ChatSurfaceMode } from "./chat-surface";

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

/** `ResizablePanel` renders an outer box the group sizes and an inner one that
 * takes `className`, so these classes move the panel's *contents* and
 * `UNDOCKED` empties the box. Both halves are needed (chat-surface decision 2). */
const CHAT_GEOMETRY: Record<ChatSurfaceMode, string> = {
  sidebar: "",
  floating:
    "absolute end-4 bottom-4 z-30 h-[70%] w-[400px] border bg-background shadow-lg",
  fullscreen: "absolute inset-0 z-40 bg-background",
  hidden: "absolute inset-0 opacity-0 pointer-events-none",
};

/** Beats the inline `flex` the group writes, rather than going through its
 * layout API, which validates against `minSize`. Coupled to the panel's `id`. */
const UNDOCKED = "[&>#chat]:!flex-none";

export function WorkspaceSplit({
  canvas,
  canvasPercent,
  chat,
  chatHeader,
  mode,
}: {
  canvas: ReactNode;
  canvasPercent: number;
  chat: ReactNode;
  chatHeader: ReactNode;
  mode: ChatSurfaceMode;
}) {
  const orientation = useSplitOrientation();
  const sideBySide = orientation === "horizontal";
  const docked = mode === "sidebar";

  // Every id here is explicit: `useId` diverges between the SSR pass and
  // hydration, which is why the size arrives as a prop the server can read too.
  return (
    <ResizablePanelGroup
      id="workspace-split"
      orientation={orientation}
      // The positioning context for the three modes that leave the flow.
      className={cn("relative", !docked && UNDOCKED)}
      onLayoutChanged={(layout, { isUserInteraction }) => {
        // Only a drag of this handle, in the geometry the stored split is
        // about, may write (docs/specs/remembered-split/design.md decision 3).
        if (!recordsTheSplit({ isUserInteraction, sideBySide, docked })) return;
        const { canvas: canvasGrow, chat: chatGrow } = layout;
        if (!canvasGrow || !chatGrow) return;
        rememberCanvasPercent((canvasGrow / (canvasGrow + chatGrow)) * 100);
      }}
    >
      <ResizablePanel
        id="canvas"
        defaultSize={`${canvasPercent}%`}
        // Pixel floors, both measured. Side by side only: stacked, they would
        // apply to the cross axis, where a short viewport could not satisfy both.
        minSize={sideBySide ? "360px" : undefined}
        // min-h-0/min-w-0 so the canvas ScrollArea scrolls inside the panel
        // rather than growing it. `relative` is what the render mode positions
        // against.
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
        // A hidden pane is still laid out, so it leaves the tab order and the
        // accessibility tree by hand.
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
