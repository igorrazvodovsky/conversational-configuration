"use client";

/**
 * The transcript's scroll container (docs/specs/ui-component-library design 7).
 *
 * Three things this takes over from CopilotKit's own view, each of which fails
 * quietly: `autoScroll={false}` on the chat, so its stick-to-bottom and this
 * scroller are not both steering; the children are rendered unwrapped, because
 * they already carry the bottom padding that clears the composer; and the
 * provider is keyed by thread, so a conversation opened from the store starts
 * at its end rather than wherever the last one was.
 */

import { useEffect, useRef, type ComponentProps } from "react";
import {
  CopilotChatView,
  useAgent,
  useCopilotChatConfiguration,
} from "@copilotkit/react-core/v2";

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

type ScrollViewProps = ComponentProps<typeof CopilotChatView.ScrollView>;

export function ConfiguratorScrollView({
  children,
  className,
  autoScroll: _autoScroll,
  inputContainerHeight: _inputContainerHeight,
  isResizing: _isResizing,
  scrollToBottomButton: _scrollToBottomButton,
  feather: _feather,
  ...props
}: ScrollViewProps) {
  const threadId = useCopilotChatConfiguration()?.threadId;

  return (
    <MessageScrollerProvider
      key={threadId}
      autoScroll
      defaultScrollPosition="end"
      scrollPreviousItemPeek={48}
    >
      <MessageScroller className={cn("min-h-0 flex-1", className)} {...props}>
        <MessageScrollerViewport className="px-4">
          {children}
        </MessageScrollerViewport>
        <MessageScrollerButton />
        <SettleAtEnd />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}
