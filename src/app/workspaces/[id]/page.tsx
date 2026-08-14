"use client";

/**
 * One workspace: the agreement canvas plus its conversations
 * (docs/specs/agreement-workspace). The canvas renders from workspace state
 * whether or not a conversation is active; chat is optional for the returning
 * operator.
 */

import { use, type ComponentProps } from "react";
import Link from "next/link";
import {
  CopilotChat,
  CopilotChatAssistantMessage,
  CopilotChatConfigurationProvider,
  CopilotChatUserMessage,
  useCopilotChatConfiguration,
} from "@copilotkit/react-core/v2";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
} from "@/components/ui/empty";
import { ConfigCanvas } from "@/components/config-canvas";
import { ConversationSidebar } from "@/components/workspace/conversation-sidebar";
import { WorkspaceSplit } from "@/components/workspace/workspace-split";
import { StaleThreadContext } from "@/components/generative-ui/card-dispatch";
import {
  useConfiguratorUI,
  useConfiguratorSuggestions,
  useWorkspaceAttachment,
} from "@/hooks";
import { CANVAS_EDIT_PREFIX } from "@/lib/configurator";

/**
 * Canvas edits round-trip through the conversation but are not part of it
 * (docs/specs/configuration-canvas design): the sheet is the record of the
 * edit, so the chat renders nothing for the structured message that carries
 * it. Content-based so reopened conversations hide the same messages.
 */
const QuietCanvasEditMessage = Object.assign(
  function QuietCanvasEditMessage(
    props: ComponentProps<typeof CopilotChatUserMessage>,
  ) {
    const { content } = props.message;
    if (typeof content === "string" && content.startsWith(CANVAS_EDIT_PREFIX)) {
      return null;
    }
    return <CopilotChatUserMessage {...props} />;
  },
  // The slot type is the full component including its subcomponent statics
  // (Container, MessageRenderer, …), so the wrapper carries them along.
  CopilotChatUserMessage,
);

/**
 * The agent's side of a hidden canvas edit: tool-call chips with no text.
 * Hidden for the same reason as the message that provoked them; an assistant
 * message that carries text (a forced cascade, a conflict) still renders —
 * the chat keeps the explanation and drops the bookkeeping.
 */
const QuietCanvasEditAssistantMessage = Object.assign(
  function QuietCanvasEditAssistantMessage(
    props: ComponentProps<typeof CopilotChatAssistantMessage>,
  ) {
    const { message, messages } = props;
    const hasText =
      typeof message.content === "string" && message.content.trim().length > 0;
    if (!hasText && messages) {
      const index = messages.findIndex((m) => m.id === message.id);
      for (let i = index - 1; i >= 0; i--) {
        if (messages[i].role !== "user") continue;
        const { content } = messages[i];
        if (
          typeof content === "string" &&
          content.startsWith(CANVAS_EDIT_PREFIX)
        ) {
          return null;
        }
        break;
      }
    }
    return <CopilotChatAssistantMessage {...props} />;
  },
  CopilotChatAssistantMessage,
);

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    /*
      One UNCONTROLLED CopilotChatConfigurationProvider (no `threadId` prop)
      owns the active thread for the whole surface (see git history for the
      full rationale) — the sidebar drives it imperatively via
      setActiveThreadId/startNewThread, which the uncontrolled provider
      permits. The chat and the canvas read the same active thread.
    */
    <CopilotChatConfigurationProvider agentId="default">
      <WorkspaceView workspaceId={id} />
    </CopilotChatConfigurationProvider>
  );
}

function WorkspaceView({ workspaceId }: { workspaceId: string }) {
  useConfiguratorUI();
  useConfiguratorSuggestions();
  const { workspace, workspaceName, staleThread, notFound } =
    useWorkspaceAttachment(workspaceId);
  const configuration = useCopilotChatConfiguration();

  if (notFound) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-background">
        <Empty>
          <EmptyHeader>
            <EmptyDescription>
              This elevator does not exist (or the agent is not running).
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="link">
              <Link href="/">Back to all elevators</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    );
  }

  return (
    <StaleThreadContext.Provider value={staleThread}>
      <div className="flex h-dvh w-full overflow-hidden bg-background">
        <ConversationSidebar
          workspace={workspace}
          workspaceName={workspaceName}
          activeThreadId={configuration?.threadId}
          onSelect={(threadId) => configuration?.setActiveThreadId(threadId)}
          onNew={() => configuration?.startNewThread()}
        />
        <div className="h-dvh min-w-0 flex-1">
          <WorkspaceSplit
            canvas={<ConfigCanvas />}
            chat={
              <CopilotChat
                attachments={{ enabled: true }}
                input={{ disclaimer: () => null, className: "pb-6" }}
                messageView={{
                  userMessage: QuietCanvasEditMessage,
                  assistantMessage: QuietCanvasEditAssistantMessage,
                }}
              />
            }
          />
        </div>
      </div>
    </StaleThreadContext.Provider>
  );
}
