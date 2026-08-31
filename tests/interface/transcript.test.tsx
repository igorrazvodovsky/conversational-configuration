// docs/specs/agreement-document/design.md
//
// A clean sheet edit ends in silence by instruction, so the wordless turn after
// one is paperwork; a wordless turn after a card pick is the `revise_choices`
// that came back with repair options. Asserted through the scale control,
// because a segment carries its selection as `aria-checked` rather than a fill.

import { CopilotKit, HttpAgent } from "@copilotkit/react-core/v2";
import { AGUIMock } from "@copilotkit/aimock";
import { cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { AskChoices } from "@/components/generative-ui/ask-choices";
import { hiddenMessageIds } from "@/components/chat/message-view";
import { canvasEditMessage, choiceMessage } from "@/lib/configurator";

let mock: AGUIMock;
let url: string;

beforeAll(async () => {
  mock = new AGUIMock();
  url = await mock.start();
});
afterAll(async () => await mock.stop());
afterEach(cleanup);

const hidden = (messages: object[]) =>
  hiddenMessageIds(messages as Parameters<typeof hiddenMessageIds>[0]);

const user = (id: string, content: string) => ({ id, role: "user", content });
const says = (id: string, content: string) => ({
  id,
  role: "assistant",
  content,
});
const calls = (id: string, name: string) => ({
  id,
  role: "assistant",
  content: "",
  toolCalls: [{ id: `${id}-call`, function: { name, arguments: "{}" } }],
});

const PICK = choiceMessage([{ variable: "region", value: "europe" }]);
const EDIT = canvasEditMessage([{ variable: "region", value: "europe" }]);

describe("the rows a gesture leaves behind", () => {
  it("draws none for a card pick or a sheet edit", () => {
    expect([...hidden([user("u1", PICK), user("u2", EDIT)])].sort()).toEqual([
      "u1",
      "u2",
    ]);
  });

  it("draws one for anything the customer typed", () => {
    const prose = "Set up an elevator for a hospital";
    expect(hidden([user("u1", prose)]).has("u1")).toBe(false);
  });

  it("keeps the wordless tool call that answers a pick", () => {
    // The repair card arrives on a turn with no text of its own. Taking it
    // down with the gesture would answer a conflict with an empty screen.
    const ids = hidden([
      calls("a1", "ask_choices"),
      user("u1", PICK),
      calls("a2", "revise_choices"),
    ]);
    expect(ids.has("u1")).toBe(true);
    expect(ids.has("a2")).toBe(false);
  });

  it("drops the wordless bookkeeping that answers a sheet edit", () => {
    const ids = hidden([user("u1", EDIT), calls("a1", "revise_choices")]);
    expect(ids.has("u1")).toBe(true);
    expect(ids.has("a1")).toBe(true);
  });

  it("keeps an explanation of a sheet edit's consequence", () => {
    const ids = hidden([
      user("u1", EDIT),
      says("a1", "That forces the door width to 900 mm."),
    ]);
    expect(ids.has("a1")).toBe(false);
  });
});

const payload = JSON.stringify({
  prompt: "How much travel does the building have?",
  variables: [
    {
      name: "travel",
      label: "Travel height",
      group: "performance",
      control: "scale",
      options: [
        { value: "low_0_15", label: "Up to 15 m", price: 0, status: "valid", cheapest: true },
        { value: "mid_15_30", label: "15–30 m", price: 40, status: "valid", cheapest: false },
        { value: "high_30_50", label: "30–50 m", price: 90, status: "invalid", cheapest: false, rules: [{ id: "R12", label: "Travel above 30 m needs the higher-speed drive" }] },
      ],
    },
  ],
});

/** As a reopened conversation renders it: the tool call and the pick that
 * answered it, with nothing in component state. */
function drawAnswered(answer: string) {
  const agent = new HttpAgent({ url });
  agent.state = { configuration: {} };
  agent.messages = [
    {
      id: "a1",
      role: "assistant",
      content: "",
      toolCalls: [
        { id: "call-1", type: "function", function: { name: "ask_choices", arguments: "{}" } },
      ],
    },
    { id: "u1", role: "user", content: answer },
  ] as typeof agent.messages;
  render(
    <CopilotKit agents__unsafe_dev_only={{ default: agent }}>
      <AskChoices toolCallId="call-1" status="complete" result={payload} />
    </CopilotKit>,
  );
}

const segment = (label: string) =>
  screen
    .queryAllByRole("radio", { hidden: true })
    .find((el) => el.textContent?.includes(label));

describe("the card as the record of its own answer", () => {
  it("shows the pick the transcript no longer says", () => {
    drawAnswered(choiceMessage([{ variable: "travel", value: "mid_15_30" }]));
    expect(segment("15–30 m")!.getAttribute("aria-checked")).toBe("true");
    expect(segment("Up to 15 m")!.getAttribute("aria-checked")).toBe("false");
  });

  it("records the pick even where the payload had ruled it out", () => {
    // The card records what was asked for; what the agreement says is on the
    // sheet.
    drawAnswered(choiceMessage([{ variable: "travel", value: "high_30_50" }]));
    expect(segment("30–50 m")!.getAttribute("aria-checked")).toBe("true");
  });

  it("claims nothing from an edit the customer made on the sheet", () => {
    // A `Canvas edit:` in that position is the customer working elsewhere.
    drawAnswered(
      canvasEditMessage([{ variable: "travel", value: "mid_15_30" }]),
    );
    expect(segment("15–30 m")!.getAttribute("aria-checked")).toBe("false");
  });
});
