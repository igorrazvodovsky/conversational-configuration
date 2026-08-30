"use client";

/**
 * The transcript's scroll container (docs/specs/chat-pane).
 *
 * This is no longer a slot. CopilotKit's `scrollView` exists to hold the
 * composer's clearance and the suggestion strip inside one scrolled box; the
 * pane lays those out itself (decision 9), so the scroller is rendered
 * directly and holds nothing but the message view. It takes the space the
 * stack leaves it, which is what `flex-1` and `min-h-0` say here.
 *
 * The provider is keyed by thread, so a conversation opened from the store
 * starts at its end rather than wherever the last one was.
 */

import { useEffect, useRef, type ReactNode } from "react";
import { useAgent, useCopilotChatConfiguration } from "@copilotkit/react-core/v2";

import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerProvider,
  MessageScrollerViewport,
  useMessageScroller,
} from "@/components/ui/message-scroller";
import { cn } from "@/lib/utils";

/**
 * A transcript does not arrive with the mount: `use-workspace-attachment.ts`
 * hydrates it from the workspace, in more than one batch, and each user turn
 * that lands is a scroll anchor — so an attaching conversation would come to
 * rest at whichever turn arrived last rather than at its end. This waits for
 * the batches to stop and then lands once, at the end. The provider is keyed
 * by thread, so "once" means once per conversation.
 */
function SettleAtEnd() {
  const { agent } = useAgent();
  const { scrollToEnd } = useMessageScroller();
  const settled = useRef(false);
  const count = agent.messages.length;

  useEffect(() => {
    if (settled.current || count === 0) return;
    const timer = setTimeout(() => {
      settled.current = true;
      scrollToEnd();
    }, 250);
    return () => clearTimeout(timer);
  }, [count, scrollToEnd]);

  return null;
}

export function ConfiguratorScrollView({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const threadId = useCopilotChatConfiguration()?.threadId;

  return (
    <MessageScrollerProvider
      key={threadId}
      autoScroll
      defaultScrollPosition="end"
      scrollPreviousItemPeek={48}
    >
      <MessageScroller className={cn("min-h-0 flex-1", className)}>
        <MessageScrollerViewport>{children}</MessageScrollerViewport>
        <MessageScrollerButton />
        <SettleAtEnd />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
