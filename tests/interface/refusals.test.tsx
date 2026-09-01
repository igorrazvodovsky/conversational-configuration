// constitution #16, constitution #17
//
// Four controls draw a ruled-out option and all four are asserted here. This
// tier asserts on text and structure and never on style
// (docs/specs/interface-checks/design.md).

import { CopilotKit, HttpAgent } from "@copilotkit/react-core/v2";
import { AGUIMock } from "@copilotkit/aimock";
import { cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { AskChoices } from "@/components/generative-ui/ask-choices";
import { OptionEditor, type DocumentView } from "@/components/config-canvas/document-parts";
import { REFUSAL_AFFORDANCE } from "@/components/refusals";
import { agreement } from "../agreement";

let mock: AGUIMock;
let url: string;

beforeAll(async () => {
  mock = new AGUIMock();
  url = await mock.start();
});
afterAll(async () => await mock.stop());
afterEach(cleanup);

const RULE = { id: "R28", label: "Modernization cannot raise the existing headroom to 4600 mm" };

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
          { value: "light", label: "A few trips an hour", price: 50, status: "invalid", rules: [RULE] },
          { value: "steady", label: "Steady traffic through the day", price: 120, status: "chosen" },
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

/** A chip and a list row are buttons; a scale segment is a radio in a
 * radiogroup. `queryAll` on both, because `getAll` throws on the kind a given
 * control does not have. */
function refusedControl(label: string) {
  return [
    ...screen.queryAllByRole("button", { hidden: true }),
    ...screen.queryAllByRole("radio", { hidden: true }),
  ].find((el) => el.textContent?.includes(label));
}

describe.each(["chips", "scale", "list"] as const)("the %s control", (control) => {
  it("names the rule as text on the page, with no hover and no focus", () => {
    draw(control);
    expect(screen.getByText(new RegExp(RULE.label))).toBeTruthy();
  });

  it("leaves the refused option operable, so it can be asked for anyway", () => {
    draw(control);
    const refused = refusedControl("A few trips an hour");
    expect(refused).toBeTruthy();
    // Neither channel says no: `disabled` would take it out of the tab order,
    // and `aria-disabled` would announce a control that in fact acts.
    expect((refused as HTMLButtonElement).disabled).toBe(false);
    expect(refused!.getAttribute("aria-disabled")).toBeNull();
  });

  it("says what asking for one of them does", () => {
    draw(control);
    expect(screen.getByText(REFUSAL_AFFORDANCE)).toBeTruthy();
  });

  it("points the refused control at the element carrying that sentence", () => {
    draw(control);
    const refused = [
      ...screen.queryAllByRole("button", { hidden: true }),
      ...screen.queryAllByRole("radio", { hidden: true }),
    ].find((el) => el.textContent?.includes("A few trips an hour"));
    expect(refused).toBeTruthy();

    const describedBy = refused!.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();

    // What the id resolves to is the sentence itself, not a second copy that
    // could drift from the visible one.
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
                  { value: "light", label: "A few trips an hour", price: 50, status: "invalid", rules: [] },
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

/** The fourth control computes its own refusals through `rulesAgainst` instead
 * of reading a tool payload, so it is the one that could drift from the other
 * three unnoticed. */
describe("the option editor on the agreement sheet", () => {
  // This control reads the product model, not a payload.
  const config = agreement({
    unavailable: { usage_profile: { low: [RULE] } },
  });

  const doc = {
    config,
    termMonths: 60,
    pending: {},
    requirementsFor: () => undefined,
    leftToUsFor: () => undefined,
    onSelect: () => {},
    onDispatch: () => {},
    revealed: new Set<string>(),
    onEditorOpen: () => {},
    onEditorClose: () => {},
    onEnterRender: () => {},
  } satisfies DocumentView;

  function open() {
    render(<OptionEditor variable="usage_profile" doc={doc} scope="token" />);
    return screen
      .queryAllByRole("button", { hidden: true })
      .find((el) => el.getAttribute("aria-describedby"));
  }

  it("names the rule as text on the page", () => {
    open();
    expect(screen.getByText(new RegExp(RULE.label))).toBeTruthy();
  });

  it("leaves the refused option operable and pointed at its own sentence", () => {
    const refused = open();
    expect(refused).toBeTruthy();
    expect((refused as HTMLButtonElement).disabled).toBe(false);
    expect(refused!.getAttribute("aria-disabled")).toBeNull();

    const describedBy = refused!.getAttribute("aria-describedby");
    const description = document.getElementById(describedBy!);
    expect(description).toBeTruthy();
    expect(description!.textContent).toContain(RULE.label);
  });
});
