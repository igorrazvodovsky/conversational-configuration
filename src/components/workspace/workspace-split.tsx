"use client";

/**
 * The workspace's two surfaces (docs/specs/agreement-workspace). The agreement
 * canvas takes the primary area and the chat sits beside it in a panel the
 * operator can size — the canvas is what they are working on, the chat is how
 * they argue about it. That is sidebar mode, the default; the user can also
 * float the chat, give it the whole area or put it away
 * (docs/specs/chat-surface).
 *
 * The four modes are four sets of classes over one unchanging tree. The chat
 * pane is mounted once and never re-parented: moving its DOM node — which a
 * portal or a per-mode rendering would do — resets the transcript's scroll
 * offset and re-fires `SettleAtEnd`. So the handle is hidden rather than
 * unmounted, and the chat panel keeps its place among the group's children in
 * every mode (chat-surface design 2).
 */

import { useEffect, useState, type ReactNode } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import type { ChatSurfaceMode } from "./chat-surface";

/**
 * Below `lg` the panes stack instead of sitting side by side — two ~350px
 * columns serve neither surface. The predecessor layout hid the chat entirely
 * at this width, which left no way back to it once the mode toggle was gone.
 */
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
 * `ResizablePanel` renders two elements: an outer box the group sizes, and an
 * inner one that receives `className` and `style`. So these classes take the
 * *contents* of the chat panel out of the flow — positioned against the group,
 * which is why the group is `relative` — while the panel box itself is emptied
 * of width by `UNDOCKED` below. Both halves are needed: these classes alone
 * leave a dead column where the panel used to be, which is what the first
 * attempt shipped.
 *
 * Hidden is `opacity-0` rather than `display:none`: a node with no layout box
 * has no scroll offset to keep. Neither panel paints a background of its own,
 * so the two modes that cover the canvas bring one.
 */
const CHAT_GEOMETRY: Record<ChatSurfaceMode, string> = {
  sidebar: "",
  floating:
    "absolute end-4 bottom-4 z-30 h-[70%] w-[400px] border bg-background shadow-lg",
  fullscreen: "absolute inset-0 z-40 bg-background",
  hidden: "absolute inset-0 opacity-0 pointer-events-none",
};

/**
 * Undocked, the chat panel keeps its place among the group's children — the
 * tree may not change shape — but gives up its column, so the canvas is the
 * only thing left in the flow.
 *
 * This is done by overriding the panel box's flex rather than through the
 * group's layout API, which validates against `minSize` and so refuses to take
 * the panel below 360px. Leaving the group's layout state alone is the better
 * half of the bargain anyway: a split the user dragged is still exactly where
 * they left it when the chat comes back. The selector reaches for the library's
 * own element the way shadcn's `resizable` already does; `!important` is what
 * beats the inline `flex` the group writes.
 */
const UNDOCKED = "[&>#chat]:!flex-none";

export function WorkspaceSplit({
  canvas,
  chat,
  chatHeader,
  mode,
}: {
  canvas: ReactNode;
  chat: ReactNode;
  chatHeader: ReactNode;
  mode: ChatSurfaceMode;
}) {
  const orientation = useSplitOrientation();
  const sideBySide = orientation === "horizontal";
  const docked = mode === "sidebar";

  /*
    The split is not persisted. `useDefaultLayout` restores the last drag from
    localStorage, which the server cannot see, so the panels render at their
    default size in the SSR pass and at the stored size on hydration — a real
    mismatch React reports on every load. A remembered width is not worth a
    permanent error in the only surface this prototype is verified in
    (constitution #9, #10). Explicit ids here and on the panels keep the rest of
    the tree off `useId`, whose values diverged the same way.
  */
  return (
    <ResizablePanelGroup
      id="workspace-split"
      orientation={orientation}
      // The positioning context for the three modes that leave the flow.
      className={cn("relative", !docked && UNDOCKED)}
    >
      <ResizablePanel
        id="canvas"
        defaultSize="62%"
        // Floors are pixels, not percentages: what makes a pane unusable is its
        // width, and a percentage floor that reads fine at 1600px is cramped at
        // 1100px. The two sum to 720px, less than the group at `lg` — the
        // narrowest width that still shows the panes side by side. They would
        // apply to the cross axis when stacked, where a short viewport could
        // not satisfy both, so they only apply side by side.
        minSize={sideBySide ? "360px" : undefined}
        // min-h-0/min-w-0 so the canvas ScrollArea scrolls inside the panel
        // rather than growing it.
        className="min-h-0 min-w-0"
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
        defaultSize="38%"
        // Measured, not guessed: at 320px the frame-comparison table overflows
        // its card by 8px and CopilotKit's composer breaks onto a second row.
        // 360px clears both with room for a wider comparison than this one.
        // Floating's 400px is the same floor with room to spare.
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
