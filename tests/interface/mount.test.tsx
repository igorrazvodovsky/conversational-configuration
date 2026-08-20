/**
 * The mount proof (docs/specs/interface-checks).
 *
 * Everything in this tier depends on one thing working: a CopilotKit tree,
 * rendered in jsdom, driving a mocked AG-UI stream and receiving state back.
 * CopilotKit reads the stream with `fetch` and `Accept: text/event-stream`
 * rather than with `EventSource`, which is why jsdom is enough and no browser
 * is needed. This file checks that claim directly, so a failure here is read
 * as the harness breaking rather than as any hook being wrong.
 */

import { CopilotKit, HttpAgent, useAgent } from "@copilotkit/react-core/v2";
import { AGUIMock } from "@copilotkit/aimock";
import { render, screen, waitFor } from "@testing-library/react";
import { afterAll, beforeAll, expect, it } from "vitest";

let mock: AGUIMock;
let url: string;

beforeAll(async () => {
  mock = new AGUIMock();
  mock.onStateKey("configuration", {
    configuration: { choices: { capacity: "1000" } },
  });
  url = await mock.start();
});

afterAll(async () => {
  await mock.stop();
});

function Probe() {
  const { agent } = useAgent();
  const state = agent?.state as
    | { configuration?: { choices?: Record<string, string> } }
    | undefined;
  return (
    <div data-testid="capacity">
      {state?.configuration?.choices?.capacity ?? "none"}
    </div>
  );
}

it("drives a mocked stream and reads the state back", async () => {
  const agent = new HttpAgent({ url });
  agent.state = { configuration: {} };

  render(
    <CopilotKit agents__unsafe_dev_only={{ default: agent }}>
      <Probe />
    </CopilotKit>,
  );

  expect(screen.getByTestId("capacity").textContent).toBe("none");
  await agent.runAgent();

  await waitFor(() =>
    expect(screen.getByTestId("capacity").textContent).toBe("1000"),
  );
});
