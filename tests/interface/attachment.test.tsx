/**
 * What a conversation lands on when it attaches (docs/specs/interface-checks).
 *
 * `useWorkspaceAttachment` guarantees that the durable agreement survives a
 * conversation attaching to it. Its design names three ways that fails, and
 * all three are orderings of the AG-UI stream rather than decisions in pure
 * code, so nothing below the UI can see them.
 *
 * Every ordering here is composed rather than recorded, and each check says
 * which one it builds and why a healthy agent doesn't produce it. The
 * *payloads* are not composed: the agreements come from the same dump the
 * coupling checks read, so no configuration here is invented.
 */

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

/**
 * Two agreements the agent actually built, named rather than indexed so a
 * change to the dump fails by name instead of yielding `undefined`.
 *
 * `chosen` and `priced` carry the same choices — pricing shows up in a
 * candidate, not in the choices — so a check that told drafts apart by that
 * pair would pass whichever draft won. `seeded` is the RFQ-seeded agreement
 * and differs from `chosen` outright, which is why the pair below is that one.
 */
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

/**
 * The workspace store and the thread checkpoint, served from memory. The
 * agreement payloads are the agent's; this envelope is thin, and its shape is
 * held by the typecheck and by the store's own route checks in the Python
 * suite.
 */
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

/** Renders the hook and reports what the canvas would read off agent state. */
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
    // The checkpoint is a historical record of what this conversation last
    // saw. A healthy connect delivers it after the seed, which is exactly the
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

    // Composed, not recorded: a healthy agent never clears state mid-attach.
    // The runtime's switch-triggered connect does, and the subscriber the hook
    // installs is the only thing that puts the agreement back.
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

    // The ordering a live connect produces: the checkpoint's whole state lands
    // on top of the seed. Byte-different here, so content comparison alone
    // would catch it; the draft-pair check is what catches the fork case.
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
    // applied to the old one is invisible to the UI. The attach effect is
    // deliberately not guarded to run once per thread for this reason, so the
    // check is that a fresh instance gets seeded rather than left empty.
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
    // A checkpoint from another draft, with a transcript to go with it: the
    // conversation ran against "draft d2" and the workspace has since moved to
    // "draft d1". Its cards must not act on the superseded agreement.
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
