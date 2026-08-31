/**
 * A refusal reaches somebody who is not holding a mouse (constitution #16),
 * and it does not take the gesture away (constitution #17).
 *
 * The named rules behind a ruled-out option used to live only on a `title`,
 * on a control that is `disabled` and therefore outside the tab order — no
 * focus to raise a tooltip, and no hover at all on a touch screen. The rules
 * were reaching the browser and stopping there.
 *
 * The control is now operable as well, which is the half this file exists to
 * hold: a ruled-out option dispatches the same sentence any other option does
 * and comes back with repair paths, so disabling it was throwing away the one
 * move that answers "what would have to change?". Four controls draw one, and
 * all four are asserted here — three in the chat card, one on the sheet.
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

/** The refused option's own control, in whichever element the control uses.
 * A chip and a list row are buttons; a scale segment is a radio in a
 * radiogroup. `queryAll` on both, because each control has one and not the
 * other, and `getAll` throws on the kind it does not have. */
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
    // Neither channel says no. `disabled` would take it out of the tab order
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

/**
 * The fourth control, on the sheet rather than in the chat. It computes its
 * own refusals from the agreement through `rulesAgainst` instead of reading
 * them off a tool payload, so it is the one that could drift from the other
 * three without any of the assertions above noticing.
 */
describe("the option editor on the agreement sheet", () => {
  // The real model's own code for the option the chat fixture calls "light":
  // this control reads the product model, not a payload.
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
