"use client";

// docs/specs/agreement-workspace/design.md. `WorkspaceRoot` stands exactly
// where the page component stood (docs/specs/remembered-split/design.md
// decision 2).

import Link from "next/link";
import {
  CopilotChatConfigurationProvider,
  useAgentContext,
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
import {
  ChatRestoreButton,
  ChatSurfaceHeader,
  useChatSurface,
} from "@/components/workspace/chat-surface";
import { SuggestedMoves } from "@/components/workspace/suggested-moves";
import { WorkspaceSplit } from "@/components/workspace/workspace-split";
import { StaleThreadContext } from "@/components/generative-ui/card-dispatch";
import { useConfiguratorUI, useWorkspaceAttachment } from "@/hooks";

export function WorkspaceRoot({
  workspaceId,
  canvasPercent,
}: {
  workspaceId: string;
  canvasPercent: number;
}) {
  return (
    /*
      One uncontrolled provider — no `threadId` prop — owns the active thread
      for the whole surface, so the chat and the canvas read the same one. The
      conversation menu drives it through `setActiveThreadId` and
      `startNewThread`, which only an uncontrolled provider permits
      (docs/specs/agreement-workspace/design.md).
    */
    <CopilotChatConfigurationProvider agentId="default">
      <WorkspaceView workspaceId={workspaceId} canvasPercent={canvasPercent} />
    </CopilotChatConfigurationProvider>
  );
}

function WorkspaceView({
  workspaceId,
  canvasPercent,
}: {
  workspaceId: string;
  canvasPercent: number;
}) {
  useConfiguratorUI();
  const { workspace, workspaceName, renamed, staleThread, notFound } =
    useWorkspaceAttachment(workspaceId);
  // The second and last entry of the shared-attention read channel: the
  // staleness the attachment hook computes, so the agent does not reason from a
  // transcript the agreement has moved past.
  useAgentContext({
    description:
      "Conversation staleness: whether the transcript above predates the current agreement.",
    value: staleThread
      ? `stale — ${staleThread} Treat the transcript above as historical and rely on the configuration state.`
      : "current",
  });
  const configuration = useCopilotChatConfiguration();
  // The chat's geometry is the user's and only the user's: nothing below may
  // set it, and it is not remembered across a reload.
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
      {/* Two surfaces, no navigation column: the conversation list rides in the
          chat's header and the workspace's identity at the head of the canvas
          (docs/specs/chat-surface, decisions 7 and 8). */}
      <div className="relative h-dvh w-full overflow-hidden bg-background">
        <WorkspaceSplit
          canvasPercent={canvasPercent}
          canvas={
            <ConfigCanvas
              workspaceId={workspaceId}
              workspaceName={workspaceName}
              onRenamed={renamed}
              workspaceLoaded={workspace !== null}
            />
          }
          chat={<ConfiguratorChat />}
          chatHeader={
            <ChatSurfaceHeader
              mode={chatSurface.mode}
              onSelect={chatSurface.select}
              onHide={chatSurface.hide}
              onUnseenReply={chatSurface.noteReply}
              workspace={workspace}
              activeThreadId={configuration?.threadId}
              onSelectConversation={(threadId) =>
                configuration?.setActiveThreadId(threadId)
              }
              onNewConversation={() => configuration?.startNewThread()}
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
        {/* Draws nothing: it subscribes to agent state to keep the suggestion
            strip current (docs/specs/suggested-moves), and does so from a leaf
            rather than from this component, which is the page's render-scope
            rule. The page is not spared a streaming reply today —
            `useWorkspaceAttachment` above subscribes too — but this adds
            nothing to that. */}
        <SuggestedMoves />
      </div>
    </StaleThreadContext.Provider>
  );
}
