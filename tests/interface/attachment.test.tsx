// docs/specs/interface-checks/design.md
//
// Every ordering here is composed, and each check says which one it builds and
// why a healthy agent doesn't produce it. The payloads are not composed: the
// agreements come from the same dump the coupling checks read.

import {
  CopilotChatConfigurationProvider,
  CopilotKit,
  HttpAgent,
  useAgent,
} from "@copilotkit/react-core/v2";
import { AGUIMock } from "@copilotkit/aimock";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { agentDump } from "../agent-dump";
import { useWorkspaceAttachment } from "@/hooks/use-workspace-attachment";
import type { Configuration } from "@/lib/configurator";
import type { DraftRecord, WorkspaceRecord } from "@/lib/workspaces";

const AGENT = agentDump();

/** `chosen` and `priced` carry the same choices — pricing shows up in a
 * candidate — so a check that told drafts apart by that pair would pass
 * whichever draft won. The pair below is `seeded`. */
const built = (name: string): Configuration => {
  const found = AGENT.configurations[name];
  if (!found) throw new Error(`the agent dump has no agreement named ${name}`);
  return found as unknown as Configuration;
};
const CURRENT = built("chosen");
const OTHER = built("seeded");

// A thread per check. The CopilotKit core outlives a single render, so a
// shared id would let one check's messages decide whether the next one's
// attach ever gets past its drain loop.
let threadSeq = 0;
const nextThread = () => `thread-under-check-${++threadSeq}`;

function draft(id: string, configuration: Configuration): DraftRecord {
  return { id, name: `draft ${id}`, forkedFrom: null, configuration };
}

function record(
  drafts: DraftRecord[],
  currentDraftId: string,
  thread: string,
): WorkspaceRecord {
  return {
    id: "ws-1",
    name: "a workspace",
    drafts,
    currentDraftId,
    threads: [{ id: thread, createdAt: "2026-01-01T00:00:00Z" }],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };
}

function installRoutes(options: {
  workspace: WorkspaceRecord;
  checkpoint?: unknown;
  messages?: unknown[];
}) {
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : String(input);
    const json = (body: unknown) =>
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    if (url.includes("/api/workspaces/")) return json(options.workspace);
    if (url.includes("/messages")) return json({ messages: options.messages ?? [] });
    if (url.includes("/state")) return json({ state: options.checkpoint ?? null });
    return real(input as RequestInfo, init);
  }) as typeof fetch;
  return () => {
    globalThis.fetch = real;
  };
}

let mock: AGUIMock;
let url: string;
let restore: (() => void) | undefined;

beforeAll(async () => {
  mock = new AGUIMock();
  url = await mock.start();
});
afterAll(async () => {
  await mock.stop();
});
afterEach(() => {
  cleanup();
  restore?.();
  restore = undefined;
});

function Probe({ workspaceId }: { workspaceId: string }) {
  const { staleThread } = useWorkspaceAttachment(workspaceId);
  const { agent } = useAgent();
  const state = agent?.state as
    | { configuration?: Configuration; current_draft_id?: string }
    | undefined;
  return (
    <>
      <div data-testid="draft">{state?.current_draft_id ?? "none"}</div>
      <div data-testid="choices">
        {JSON.stringify(state?.configuration?.choices ?? {})}
      </div>
      <div data-testid="stale">{staleThread ?? ""}</div>
    </>
  );
}

function mount(agent: HttpAgent, thread: string) {
  return render(
    <CopilotKit agents__unsafe_dev_only={{ default: agent }}>
      <CopilotChatConfigurationProvider threadId={thread}>
        <Probe workspaceId="ws-1" />
      </CopilotChatConfigurationProvider>
    </CopilotKit>,
  );
}

const choicesOf = (c: Configuration) => JSON.stringify(c.choices ?? {});

it("uses two agreements that are actually distinguishable", () => {
  // Without this the checks below would pass whichever draft won.
  expect(choicesOf(CURRENT)).not.toBe(choicesOf(OTHER));
});

describe("the agreement a conversation lands on", () => {
  it("is the workspace's current draft, not the thread's checkpoint", async () => {
    const current = CURRENT;
    const stale = OTHER;
    const thread = nextThread();
    const ws = record([draft("d1", current), draft("d2", stale)], "d1", thread);
    // A healthy connect delivers the checkpoint after the seed, which is the
    // ordering that would leave the canvas showing a superseded agreement.
    restore = installRoutes({
      workspace: ws,
      checkpoint: { configuration: stale, current_draft_id: "d2" },
    });

    const agent = new HttpAgent({ url });
    mount(agent, thread);

    await waitFor(
      () => expect(screen.getByTestId("draft").textContent).toBe("d1"),
      { timeout: 5000 },
    );
    expect(screen.getByTestId("choices").textContent).toBe(choicesOf(current));
  });

  it("survives a connect that wipes state after the seed", async () => {
    const current = CURRENT;
    const thread = nextThread();
    const ws = record([draft("d1", current)], "d1", thread);
    restore = installRoutes({ workspace: ws });

    const agent = new HttpAgent({ url });
    mount(agent, thread);
    await waitFor(
      () => expect(screen.getByTestId("draft").textContent).toBe("d1"),
      { timeout: 5000 },
    );

    // Composed: a healthy agent never clears state mid-attach. The runtime's
    // switch-triggered connect does.
    agent.setState({});
    await waitFor(() =>
      expect(screen.getByTestId("choices").textContent).toBe(choicesOf(current)),
    );
    expect(screen.getByTestId("draft").textContent).toBe("d1");
  });

  it("survives a connect that overwrites the seed with the checkpoint", async () => {
    const current = CURRENT;
    const stale = OTHER;
    const thread = nextThread();
    const ws = record([draft("d1", current), draft("d2", stale)], "d1", thread);
    restore = installRoutes({ workspace: ws });

    const agent = new HttpAgent({ url });
    mount(agent, thread);
    await waitFor(
      () => expect(screen.getByTestId("draft").textContent).toBe("d1"),
      { timeout: 5000 },
    );

    // The ordering a live connect produces. Byte-different here, so content
    // comparison alone would catch it; the draft-pair check catches the fork.
    agent.setState({ configuration: stale, current_draft_id: "d2" });
    await waitFor(() =>
      expect(screen.getByTestId("choices").textContent).toBe(choicesOf(current)),
    );
    expect(screen.getByTestId("draft").textContent).toBe("d1");
  });
  it("re-seeds onto the agent instance the connect swaps in", async () => {
    const current = CURRENT;
    const thread = nextThread();
    const ws = record([draft("d1", current)], "d1", thread);
    restore = installRoutes({ workspace: ws });

    const first = new HttpAgent({ url });
    const { rerender } = mount(first, thread);
    await waitFor(
      () => expect(screen.getByTestId("draft").textContent).toBe("d1"),
      { timeout: 5000 },
    );

    // Composed: the initial connect replaces the agent instance, and a seed
    // applied to the old one is invisible to the UI.
    const second = new HttpAgent({ url });
    rerender(
      <CopilotKit agents__unsafe_dev_only={{ default: second }}>
        <CopilotChatConfigurationProvider threadId={thread}>
          <Probe workspaceId="ws-1" />
        </CopilotChatConfigurationProvider>
      </CopilotKit>,
    );

    await waitFor(
      () =>
        expect(screen.getByTestId("choices").textContent).toBe(
          choicesOf(current),
        ),
      { timeout: 5000 },
    );
    expect(screen.getByTestId("draft").textContent).toBe("d1");
  });
});

describe("a conversation whose draft moved beneath it", () => {
  it("goes stale, naming the draft it was working on and the current one", async () => {
    const current = CURRENT;
    const other = OTHER;
    const thread = nextThread();
    const ws = record(
      [draft("d1", current), draft("d2", other)],
      "d1",
      thread,
    );
    // A checkpoint from another draft: the conversation ran against "draft d2"
    // and the workspace has since moved to "draft d1".
    restore = installRoutes({
      workspace: ws,
      checkpoint: { configuration: other, current_draft_id: "d2" },
      messages: [{ id: "m1", role: "user", content: "a turn that happened" }],
    });

    const agent = new HttpAgent({ url });
    mount(agent, thread);

    await waitFor(
      () => expect(screen.getByTestId("stale").textContent).not.toBe(""),
      { timeout: 5000 },
    );
    expect(screen.getByTestId("stale").textContent).toBe(
      "This conversation was working on the draft \u201Cdraft d2\u201D; " +
        "the current draft is \u201Cdraft d1\u201D.",
    );
  });
});
