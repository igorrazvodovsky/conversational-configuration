"use client";

// docs/specs/agreement-workspace/design.md, which rules every mechanism here.

import {
  useAgent,
  useCopilotChatConfiguration,
} from "@copilotkit/react-core/v2";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  WorkspaceRecord,
  currentDraft,
  draftSummaries,
  fetchWorkspace,
  historyDepths,
  latestThread,
  registerThread,
} from "@/lib/workspaces";

interface RuntimeToolCall {
  id: string;
  name: string;
  args: string | object;
}

interface RuntimeMessage {
  id: string;
  role: string;
  content?: string;
  toolCalls?: RuntimeToolCall[];
  [key: string]: unknown;
}

/** The runtime returns LangChain-style tool calls ({id, name, args}); the
 * AG-UI agent expects OpenAI shape ({id, type, function: {name, arguments}}). */
function toAgUiMessage(message: RuntimeMessage) {
  if (!message.toolCalls?.length) return message;
  return {
    ...message,
    toolCalls: message.toolCalls.map((tc) => ({
      id: tc.id,
      type: "function" as const,
      function: {
        name: tc.name,
        arguments:
          typeof tc.args === "string" ? tc.args : JSON.stringify(tc.args ?? {}),
      },
    })),
  };
}

/** Not `JSON.stringify`: checkpoint and workspace configurations take
 * different serialization paths and could disagree on identical states. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.keys(value as object)
    .sort()
    .map(
      (k) =>
        `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`,
    );
  return `{${entries.join(",")}}`;
}

function staleReason(
  record: WorkspaceRecord,
  checkpointDraftId: string | undefined,
): string {
  const current = currentDraft(record);
  const its = record.drafts.find((d) => d.id === checkpointDraftId);
  if (its && its.id !== current.id)
    return `This conversation was working on the draft “${its.name}”; the current draft is “${current.name}”.`;
  return "The agreement changed after this conversation's last turn, so these controls no longer apply to it.";
}

export function useWorkspaceAttachment(workspaceId: string) {
  const { agent } = useAgent();
  const configuration = useCopilotChatConfiguration();
  const threadId = configuration?.threadId;

  const [workspace, setWorkspace] = useState<WorkspaceRecord | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [staleThread, setStaleThread] = useState<string | null>(null);
  const clearedFor = useRef<string | undefined>(undefined);
  const enteredFor = useRef<string | undefined>(undefined);
  const [entryResolvedFor, setEntryResolvedFor] = useState<string | undefined>(
    undefined,
  );
  const configurationRef = useRef(configuration);
  configurationRef.current = configuration;
  // Right after a switch the new threadId renders while the previous
  // conversation's messages are still in the agent; without this gate that
  // stale render registers the fresh thread before its first real message.
  const attachedFor = useRef<string | undefined>(undefined);
  const registering = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!configuration || enteredFor.current === workspaceId) return;
    enteredFor.current = workspaceId;
    clearedFor.current = undefined;
    attachedFor.current = undefined;
    setEntryResolvedFor(undefined);

    (async () => {
      let record: WorkspaceRecord;
      try {
        record = await fetchWorkspace(workspaceId);
      } catch {
        // Every exit sets notFound or resolves entry, or the rest of the
        // hook stays gated forever.
        if (enteredFor.current === workspaceId) setNotFound(true);
        return;
      }
      if (enteredFor.current !== workspaceId) return; // navigated on
      // The conversation that last moved the agreement, not the one started
      // most recently.
      const latest = latestThread(record.threads);
      const config = configurationRef.current;
      if (!latest) config?.startNewThread();
      else if (latest.id !== config?.threadId)
        config?.setActiveThreadId(latest.id);
      setEntryResolvedFor(workspaceId);
    })();
  }, [configuration, workspaceId]);

  // Deliberately NOT guarded to run once per thread: the initial connect swaps
  // the `agent` instance, and a seed applied to the stale one is invisible.
  useEffect(() => {
    if (!threadId || entryResolvedFor !== workspaceId) return;

    // Synchronously, before anything can be sent. Messages too: after
    // cross-workspace navigation no connect wipes them.
    if (clearedFor.current !== threadId) {
      clearedFor.current = threadId;
      setStaleThread(null);
      agent.setState({});
      agent.setMessages([]);
    }

    let cancelled = false;
    let subscription: { unsubscribe: () => void } | undefined;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    (async () => {
      // The previous conversation's messages linger until the runtime's
      // switch-triggered connect wipes them.
      for (let i = 0; i < 20 && !cancelled && agent.messages.length > 0; i++)
        await sleep(250);
      if (cancelled || agent.messages.length > 0) return;

      let record: WorkspaceRecord;
      try {
        record = await fetchWorkspace(workspaceId);
      } catch {
        if (!cancelled) setNotFound(true);
        return;
      }
      if (cancelled) return;
      setWorkspace(record);

      const draft = currentDraft(record);
      const want = stableStringify(draft.configuration);
      const restoredIds = new Set<string>();
      const userActed = () =>
        agent.messages.some(
          (m) =>
            (m as { role?: string }).role === "user" &&
            !restoredIds.has((m as { id: string }).id),
        );
      const seed = () =>
        agent.setState({
          workspace_id: record.id,
          configuration: draft.configuration,
          history: historyDepths(record),
          // A thread that has never run replays no snapshot, and one that ran
          // before drafts replays one with neither key, so this seed is the
          // only path for the two.
          current_draft_id: draft.id,
          drafts: draftSummaries(record),
        });

      seed();
      subscription = agent.subscribe({
        onStateChanged: () => {
          if (cancelled) return;
          if (userActed()) {
            subscription?.unsubscribe();
            subscription = undefined;
            return;
          }
          const state = agent.state as
            | { configuration?: unknown; current_draft_id?: string }
            | undefined;
          if (
            !state?.configuration ||
            state.current_draft_id !== draft.id ||
            stableStringify(state.configuration) !== want
          )
            seed();
        },
      });
      attachedFor.current = threadId;

      const base = `/api/copilotkit/threads/${encodeURIComponent(threadId)}`;
      const [messagesRes, stateRes] = await Promise.all([
        fetch(`${base}/messages`),
        fetch(`${base}/state`),
      ]);
      if (cancelled || !messagesRes.ok || !stateRes.ok) return;
      const { messages } = await messagesRes.json();
      const { state } = await stateRes.json();

      // Over the PAIR (draft, configuration): a fork is byte-identical to the
      // draft it came from until one is edited.
      //
      // An ABSENT checkpoint means unverifiable, not unchanged. The runtime
      // answers 200 with `{state: null}`, never a 404, when its thread store
      // holds no snapshot — and that store is a map in the Next.js process.
      const hasMessages = Array.isArray(messages) && messages.length > 0;
      if (hasMessages) {
        const checkpoint = state as
          | { configuration?: unknown; current_draft_id?: string }
          | undefined;
        const same =
          checkpoint?.configuration &&
          checkpoint.current_draft_id === draft.id &&
          stableStringify(checkpoint.configuration) === want;
        if (!same && !cancelled)
          setStaleThread(staleReason(record, checkpoint?.current_draft_id));
      }

      if (!hasMessages) return;
      const restored = (messages as RuntimeMessage[]).map(toAgUiMessage);
      restored.forEach((m) => restoredIds.add(m.id));
      const hydrate = () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        agent.setMessages(restored as any);
        seed(); // workspace configuration wins over whatever connect left
      };

      // The switch-triggered connect can be in flight and reset local messages
      // when it lands.
      for (let i = 0; i < 40 && !cancelled && agent.isRunning; i++)
        await sleep(250);
      if (cancelled || agent.messages.length > 0) return;
      hydrate();
      for (let i = 0; i < 8 && !cancelled; i++) {
        await sleep(500);
        if (!cancelled && !agent.isRunning && agent.messages.length === 0)
          hydrate();
      }
    })();

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [agent, threadId, workspaceId, entryResolvedFor]);

  const messageCount = agent.messages.length;
  useEffect(() => {
    if (!threadId || !workspace || messageCount === 0) return;
    if (entryResolvedFor !== workspaceId) return; // entry still choosing
    if (attachedFor.current !== threadId) return; // not this thread's messages
    if (workspace.threads.some((t) => t.id === threadId)) return;
    if (registering.current.has(threadId)) return;
    registering.current.add(threadId);
    registerThread(workspace.id, threadId)
      .then((record) => setWorkspace(record))
      .catch(() => registering.current.delete(threadId));
  }, [messageCount, threadId, workspace, entryResolvedFor, workspaceId]);

  // null means unnamed — the caller shows the placeholder.
  const workspaceName =
    (agent.state as { workspace_name?: string } | undefined)?.workspace_name ??
    workspace?.name ??
    null;

  // The mirror is touched only when the key is already there: an untouched
  // conversation has none, and adding one would put a name into the next run's
  // initial state that nothing asked for.
  const renamed = useCallback(
    (name: string) => {
      setWorkspace((current) => (current ? { ...current, name } : current));
      const state = agent.state as Record<string, unknown> | undefined;
      if (state && "workspace_name" in state)
        agent.setState({ ...state, workspace_name: name });
    },
    [agent],
  );

  return { workspace, workspaceName, renamed, staleThread, notFound };
}
