"use client";

/**
 * Workspace attachment (docs/specs/agreement-workspace) — the evolution of
 * the thread-resumption hook from docs/specs/nonlinear-interaction.
 *
 * The workspace, not the thread, is the durable locus of the agreement.
 *
 * Entering a workspace first *resolves* which conversation to be in — the one
 * that last moved the agreement, or a fresh one when it has none — and
 * everything below waits for that, because until then the active thread is
 * whatever was globally active, quite possibly another workspace's.
 *
 * Then, on every active-thread change (and on the agent-instance change the
 * initial connect causes) this hook:
 *   1. clears the agent state synchronously (so nothing from the previous
 *      thread leaks into the next run),
 *   2. seeds `{workspace_id, configuration}` — the *current draft's*
 *      configuration — plus the draft mirrors, from the workspace store, and
 *      KEEPS it seeded via an agent subscriber: the connect that follows a
 *      page load or thread switch delivers the thread checkpoint's state
 *      after the seed, and the workspace configuration must win over that
 *      checkpoint (it is a historical record). The subscriber disarms the
 *      moment a genuinely new user message exists — from then on state
 *      belongs to the live run,
 *   3. for a thread with server history, hydrates the transcript from the
 *      runtime (CopilotKit v2 switches threads but never fetches messages),
 *   4. flags the thread stale, with the reason, when its checkpoint no longer
 *      matches the workspace's current draft — its cards must not act on a
 *      superseded state, nor on another draft,
 *   5. registers a conversation with the workspace on its first message.
 *
 * Two inherited traps (see docs/specs/nonlinear-interaction/design.md): the
 * runtime returns LangChain-style tool calls that must be converted to the
 * AG-UI shape, and the switch-triggered connect can wipe hydrated messages —
 * hydration waits for the agent to settle and briefly re-applies if wiped.
 */

import {
  useAgent,
  useCopilotChatConfiguration,
} from "@copilotkit/react-core/v2";
import { useEffect, useRef, useState } from "react";
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

/** Key-order-independent comparison: checkpoint and workspace configurations
 * take different serialization paths, so plain JSON.stringify could disagree
 * on identical states. */
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

/**
 * Why a reopened conversation's cards may not act, in the operator's terms —
 * the line the card itself shows (docs/specs/agreement-workspace design).
 *
 * Under drafts it can usually be specific, naming the draft this conversation
 * was working on and the one that is current, which tells the operator what to
 * do about it where "the agreement moved on" only says that something happened.
 * It falls back to the workspace-level wording when the conversation's own
 * draft cannot be resolved — it ran before drafts existed, or that draft has
 * since been discarded — which is still true.
 *
 * The singular ("was working on") holds because a card that predates a switch
 * made inside its own conversation is already inert under the any-user-message
 * rule `useCardDispatch` applies; only tail cards reach this path, and a tail
 * card's draft is the checkpoint's draft.
 */
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
  // The reason this conversation's cards may not act, or null when they may.
  // A string rather than a flag because the three inert conditions are not
  // equally self-explanatory: this is the one whose cause is outside the
  // conversation entirely (docs/specs/agreement-workspace design).
  const [staleThread, setStaleThread] = useState<string | null>(null);
  const clearedFor = useRef<string | undefined>(undefined);
  const enteredFor = useRef<string | undefined>(undefined);
  // Workspace whose entry has resolved to a thread. Everything below waits for
  // it: until entry lands, the active thread is still whatever was globally
  // active — quite possibly another workspace's conversation.
  const [entryResolvedFor, setEntryResolvedFor] = useState<string | undefined>(
    undefined,
  );
  // The configuration object is captured per render; entry acts on it after an
  // await, so it reads the current one rather than the one it started with.
  const configurationRef = useRef(configuration);
  configurationRef.current = configuration;
  // Thread whose seed has landed — only it may register conversations. Right
  // after a switch the new threadId renders while the previous conversation's
  // messages are still in the agent, and without this gate that stale render
  // registers the fresh thread before its first real message.
  const attachedFor = useRef<string | undefined>(undefined);
  const registering = useRef<Set<string>>(new Set());

  // Opening a workspace resumes its latest conversation, or mounts a fresh
  // unregistered one when it has none. Entry has to resolve the thread rather
  // than assume it: the active thread is global to the CopilotKit core and
  // survives client-side navigation, so a workspace opened after another one
  // would otherwise attach to — and register — the previous workspace's active
  // conversation. The two refs below are workspace-agnostic and must not carry
  // that thread's clearance across the boundary.
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
        // Every exit sets notFound or resolves entry — an exit that does
        // neither would leave the rest of the hook gated forever.
        if (enteredFor.current === workspaceId) setNotFound(true);
        return;
      }
      if (enteredFor.current !== workspaceId) return; // navigated on
      // Where the operator left off: the conversation that last moved the
      // agreement (`latestThread`), not the one started most recently — those
      // differ as soon as someone returns to an older conversation to make a
      // change. The record is deliberately not written to `workspace` state
      // here — the attach effect owns it, so it can never be observed against
      // another workspace's thread in the render before the switch lands.
      const latest = latestThread(record.threads);
      const config = configurationRef.current;
      if (!latest) config?.startNewThread();
      else if (latest.id !== config?.threadId)
        config?.setActiveThreadId(latest.id);
      setEntryResolvedFor(workspaceId);
    })();
  }, [configuration, workspaceId]);

  // Attach on active-thread change. Deliberately NOT guarded to run once per
  // thread: the initial connect swaps the `agent` instance, and a seed or
  // subscriber applied to the stale instance is invisible to the UI — the
  // effect must re-attach on the fresh one.
  useEffect(() => {
    if (!threadId || entryResolvedFor !== workspaceId) return;

    // Clear synchronously on the switch itself, before anything can be sent —
    // otherwise a new conversation would start from the previous thread's
    // choices (the trap the resumption hook documented). The seed below puts
    // the real state in. Messages are cleared too: after cross-workspace
    // navigation no connect wipes them, and they would both show another
    // workspace's transcript and trip message-count-based registration.
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
      // switch-triggered connect wipes them — wait for the drain so the
      // subscriber's "user acted" check sees this thread, not the old one.
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
      // A user message that was not hydrated from the server is the user (or
      // a card) acting live in this conversation.
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
          // The canvas renders its undo controls from this mirror
          // (docs/specs/undo); the current draft's own history is what it
          // mirrors, and tools refresh it as they commit.
          history: historyDepths(record),
          // Which draft this is and what else exists beside it
          // (docs/specs/parallel-drafts). This seed is the only path for the
          // two: a thread that has never run replays no snapshot, and one
          // that ran before drafts replays a snapshot with neither key in it,
          // either of which would leave the document unnamed and the switcher
          // empty until the customer's first message.
          current_draft_id: draft.id,
          drafts: draftSummaries(record),
        });

      seed();
      // Workspace-configuration precedence, event-driven: whatever the
      // connect writes (nothing, or the checkpoint state), put the workspace
      // configuration back — until the user acts, after which state belongs
      // to the live run and the subscriber disarms.
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
          // The pair again, for the same reason as the staleness check below:
          // a checkpoint delivered by the connect can carry the configuration
          // of a draft this workspace has since forked from, byte-identical to
          // the current one, and comparing content alone would leave the canvas
          // naming the wrong document.
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
      // A brand-new thread has no server record yet — nothing to restore.
      if (cancelled || !messagesRes.ok || !stateRes.ok) return;
      const { messages } = await messagesRes.json();
      const { state } = await stateRes.json();

      // The checkpoint is the record of what this conversation saw; when the
      // agreement has moved on — another conversation changed it, or forked or
      // switched the draft under it — the transcript's cards must not act on
      // it.
      //
      // The comparison is over the PAIR (draft, configuration), not the
      // configuration alone: a fork is byte-identical to the draft it came
      // from until one of them is edited, which is exactly the window in which
      // the operator is most likely to reopen the conversation the fork came
      // out of, and content equality would let its cards apply to the fork
      // (docs/specs/parallel-drafts).
      //
      // An ABSENT checkpoint means unverifiable, not unchanged. The runtime
      // answers 200 with `{state: null}` — never a 404 — when its thread store
      // holds no state snapshot for this thread, and that store is a map in the
      // Next.js process, so it is empty after a restart. A conversation that
      // ran before drafts has no `current_draft_id` in its checkpoint either,
      // and is unverifiable on the same terms. Only a transcript we could check
      // against the workspace may keep live cards.
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

      // The switch-triggered connect can be in flight (isRunning) and reset
      // local messages when it lands — wait for it to settle, hydrate, then
      // briefly watch for a late wipe.
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

  // A conversation joins the workspace's list on its first message — this is
  // also how a canvas edit with no active conversation "starts" one.
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

  // Live display name: the name_workspace tool mirrors the store's name into
  // agent state, so a rename shows up mid-conversation without a refetch.
  // null means unnamed — the caller shows the placeholder.
  const workspaceName =
    (agent.state as { workspace_name?: string } | undefined)?.workspace_name ??
    workspace?.name ??
    null;

  return { workspace, workspaceName, staleThread, notFound };
}
