"use client";

import { ExampleLayout } from "@/components/example-layout";
import { ConfigCanvas } from "@/components/config-canvas";
import {
  useConfiguratorUI,
  useConfiguratorSuggestions,
  useThreadResumption,
} from "@/hooks";

import {
  CopilotChat,
  CopilotChatConfigurationProvider,
  CopilotThreadsDrawer,
} from "@copilotkit/react-core/v2";

import styles from "./page.module.css";

/** Must render inside the configuration provider to see the active thread. */
function ThreadResumption() {
  useThreadResumption();
  return null;
}

export default function HomePage() {
  useConfiguratorUI();
  useConfiguratorSuggestions();

  return (
    /*
      One UNCONTROLLED CopilotChatConfigurationProvider (no `threadId` prop) owns
      the active thread for the whole surface (see git history for the full
      rationale). The chat and the canvas read the same active thread, so the
      spec sheet reflects the per-thread agent state.
    */
    <CopilotChatConfigurationProvider agentId="default">
      <ThreadResumption />
      <div className={styles.layout}>
        <CopilotThreadsDrawer agentId="default" />
        <div className={styles.mainPanel}>
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
    </CopilotChatConfigurationProvider>
  );
}
