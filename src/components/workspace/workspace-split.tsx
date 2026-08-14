"use client";

/**
 * The workspace's two surfaces (docs/specs/agreement-workspace). The agreement
 * canvas takes the primary area and the chat sits beside it in a panel the
 * operator can size — the canvas is what they are working on, the chat is how
 * they argue about it.
 */

import { useEffect, useState, type ReactNode } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

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

export function WorkspaceSplit({
  canvas,
  chat,
}: {
  canvas: ReactNode;
  chat: ReactNode;
}) {
  const orientation = useSplitOrientation();
  const sideBySide = orientation === "horizontal";

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
    <ResizablePanelGroup id="workspace-split" orientation={orientation}>
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

      <ResizableHandle id="workspace-split-handle" withHandle />

      <ResizablePanel
        id="chat"
        defaultSize="38%"
        // Measured, not guessed: at 320px the frame-comparison table overflows
        // its card by 8px and CopilotKit's composer breaks onto a second row.
        // 360px clears both with room for a wider comparison than this one.
        minSize={sideBySide ? "360px" : undefined}
        className="flex min-h-0 min-w-0 flex-col"
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">{chat}</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
