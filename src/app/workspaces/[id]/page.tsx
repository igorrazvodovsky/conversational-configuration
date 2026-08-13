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
  CopilotChat,
  CopilotChatConfigurationProvider,
  useCopilotChatConfiguration,
} from "@copilotkit/react-core/v2";

import { ExampleLayout } from "@/components/example-layout";
import { ConfigCanvas } from "@/components/config-canvas";
import { ConversationSidebar } from "@/components/workspace/conversation-sidebar";
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

  if (notFound) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-[var(--background)] text-sm">
        <p>This elevator does not exist (or the agent is not running).</p>
        <Link href="/" className="underline underline-offset-2">
          Back to all elevators
        </Link>
      </main>
    );
  }

  return (
    <StaleThreadContext.Provider value={staleThread}>
      <div className="flex h-dvh w-full overflow-hidden bg-[var(--background)]">
        <ConversationSidebar
          workspace={workspace}
          workspaceName={workspaceName}
          activeThreadId={configuration?.threadId}
          onSelect={(threadId) => configuration?.setActiveThreadId(threadId)}
          onNew={() => configuration?.startNewThread()}
        />
        <div className="h-dvh min-w-0 flex-1">
          <ExampleLayout
            chatContent={
              <CopilotChat
                attachments={{ enabled: true }}
                input={{ disclaimer: () => null, className: "pb-6" }}
              />
            }
            appContent={<ConfigCanvas />}
          />
        </div>
      </div>
    </StaleThreadContext.Provider>
  );
}
