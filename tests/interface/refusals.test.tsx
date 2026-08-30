/**
 * A refusal reaches somebody who is not holding a mouse
 * (constitution #16).
 *
 * The named rules behind a ruled-out option used to live only on a `title`,
 * on a control that is `disabled` and therefore outside the tab order — no
 * focus to raise a tooltip, and no hover at all on a touch screen. The rules
 * were reaching the browser and stopping there.
 *
 * This tier asserts on text and structure and never on style
 * (docs/specs/interface-checks), which is exactly the shape of what changed:
 * the sentence is in the document, and the control points at the element
 * carrying it. Whether it is *legible* is colour, which no check here sees;
 * that is computed from the tokens in the design and verified by running the
 * app.
 */

import { CopilotKit, HttpAgent } from "@copilotkit/react-core/v2";
import { AGUIMock } from "@copilotkit/aimock";
import { cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { AskChoices } from "@/components/generative-ui/ask-choices";

let mock: AGUIMock;
let url: string;

beforeAll(async () => {
  mock = new AGUIMock();
  url = await mock.start();
});
afterAll(async () => await mock.stop());
afterEach(cleanup);

const RULE = { id: "R28", label: "Modernization cannot raise the existing headroom to 4600 mm" };

/** One variable with one option taken out by one named rule, in each of the
 * three controls the payload can ask for. */
const payload = (control: "chips" | "scale" | "list") =>
  JSON.stringify({
    prompt: "Choose the traffic level you want to test against.",
    variables: [
      {
        name: "usage_profile",
        label: "Usage profile",
        group: "service",
        control,
        options: [
          { value: "light", label: "A few trips an hour", price: 50, status: "invalid", cheapest: false, rules: [RULE] },
          { value: "steady", label: "Steady traffic through the day", price: 120, status: "chosen", cheapest: true },
        ],
      },
    ],
  });

function draw(control: "chips" | "scale" | "list") {
  const agent = new HttpAgent({ url });
  agent.state = { configuration: {} };
  render(
    <CopilotKit agents__unsafe_dev_only={{ default: agent }}>
      <AskChoices toolCallId="call-1" status="complete" result={payload(control)} />
    </CopilotKit>,
  );
}

describe.each(["chips", "scale", "list"] as const)("the %s control", (control) => {
  it("names the rule as text on the page, with no hover and no focus", () => {
    draw(control);
    expect(screen.getByText(new RegExp(RULE.label))).toBeTruthy();
  });

  it("points the refused control at the element carrying that sentence", () => {
    draw(control);
    // A chip and a list row are buttons; a scale segment is a radio in a
    // radiogroup. `queryAll` on both, because each control has one and not
    // the other, and `getAll` throws on the kind it does not have.
    const refused = [
      ...screen.queryAllByRole("button", { hidden: true }),
      ...screen.queryAllByRole("radio", { hidden: true }),
    ].find((el) => el.textContent?.includes("A few trips an hour"));
    expect(refused).toBeTruthy();

    const describedBy = refused!.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();

    // The id resolves, and what it resolves to is the sentence itself — not a
    // second copy of it that could drift from the visible one.
    const description = document.getElementById(describedBy!);
    expect(description).toBeTruthy();
    expect(description!.textContent).toContain(RULE.label);
  });
});

describe("a refusal with no product rule to cite", () => {
  it("says so, rather than saying nothing", () => {
    const agent = new HttpAgent({ url });
    agent.state = { configuration: {} };
    render(
      <CopilotKit agents__unsafe_dev_only={{ default: agent }}>
        <AskChoices
          toolCallId="call-2"
          status="complete"
          result={JSON.stringify({
            variables: [
              {
                name: "usage_profile",
                label: "Usage profile",
                group: "service",
                control: "chips",
                options: [
                  { value: "light", label: "A few trips an hour", price: 50, status: "invalid", cheapest: false, rules: [] },
                ],
              },
            ],
          })}
        />
      </CopilotKit>,
    );
    expect(screen.getByText(/ruled out by your other choices/)).toBeTruthy();
  });
});
