"use client";

/**
 * One workspace: the agreement canvas plus its conversations
 * (docs/specs/agreement-workspace). The canvas renders from workspace state
 * whether or not a conversation is active; chat is optional for the returning
 * operator.
 */

import { use } from "react";
import Link from "next/link";
import {
  CopilotChatConfigurationProvider,
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
import { ConfiguratorChat } from "@/components/chat";
import { ConversationSidebar } from "@/components/workspace/conversation-sidebar";
import {
  ChatRestoreButton,
  ChatSurfaceHeader,
  useChatSurface,
} from "@/components/workspace/chat-surface";
import { WorkspaceSplit } from "@/components/workspace/workspace-split";
import { StaleThreadContext } from "@/components/generative-ui/card-dispatch";
import {
  useConfiguratorUI,
  useConfiguratorSuggestions,
  useWorkspaceAttachment,
} from "@/hooks";

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
  // The chat's geometry is the user's, and only the user's
  // (docs/specs/chat-surface): nothing below may set it, and it is not
  // remembered across a reload.
  const chatSurface = useChatSurface();

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
        <div className="relative h-dvh min-w-0 flex-1">
          <WorkspaceSplit
            canvas={<ConfigCanvas />}
            chat={<ConfiguratorChat />}
            chatHeader={
              <ChatSurfaceHeader
                mode={chatSurface.mode}
                onSelect={chatSurface.select}
                onHide={chatSurface.hide}
                onUnseenReply={chatSurface.noteReply}
              />
            }
            mode={chatSurface.mode}
          />
          {chatSurface.mode === "hidden" && (
            <ChatRestoreButton
              unseenReplies={chatSurface.unseenReplies}
              onClick={chatSurface.restore}
            />
          )}
        </div>
      </div>
    </StaleThreadContext.Provider>
  );
}
