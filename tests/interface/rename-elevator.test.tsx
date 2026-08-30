/**
 * Renaming an elevator (docs/specs/agreement-workspace, *Renaming*).
 *
 * Three things are asserted, and all three are behaviour rather than style
 * (docs/specs/interface-checks): that confirming an empty name is *answered*
 * rather than refused by an unclickable control (constitution #17), that a
 * real rename reaches the store and reports back the name the store kept
 * rather than the one that was typed, and that a rename that fails leaves the
 * name where it was and says so in text the field points at, rather than on a
 * `title` only a mouse can raise (constitution #16).
 *
 * The store is a `fetch` stub. What is under test is the control, and the
 * route beneath it is held by `agent/tests/test_http_app.py`.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { RenameElevator } from "@/components/workspace/rename-elevator";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const WORKSPACE = "ws-1";

/** The store, answering however this test needs it to. */
function stubStore(reply: () => Promise<Response> | Response) {
  const fetchMock = vi.fn((_path: string, _init?: RequestInit) => reply());
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const record = (name: string) =>
  new Response(JSON.stringify({ id: WORKSPACE, name }), { status: 200 });

/** Draw the control and open its field, the way the operator does. */
function open(name: string | null, onRenamed = () => {}) {
  render(
    <RenameElevator workspaceId={WORKSPACE} name={name} onRenamed={onRenamed}>
      <span>{name ?? "New elevator"}</span>
    </RenameElevator>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Rename|Name this/ }));
  return screen.getByRole("textbox", { name: "Elevator name" });
}

describe("the rename control", () => {
  it("opens on the name it has, so renaming is editing rather than retyping", () => {
    const field = open("Riverside Tower");
    expect((field as HTMLInputElement).value).toBe("Riverside Tower");
  });

  it("opens empty on an unnamed elevator, rather than on the placeholder", () => {
    const field = open(null);
    expect((field as HTMLInputElement).value).toBe("");
  });

  it("renames through the store and reports the name the store kept", async () => {
    const fetchMock = stubStore(() => record("Riverside Tower — north lift"));
    const onRenamed = vi.fn();
    const field = open("Riverside Tower", onRenamed);

    fireEvent.change(field, { target: { value: "  Riverside Tower — north lift  " } });
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    await waitFor(() => expect(onRenamed).toHaveBeenCalledWith("Riverside Tower — north lift"));
    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe(`/api/workspaces/${WORKSPACE}`);
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(init?.body as string)).toEqual({
      name: "Riverside Tower — north lift",
    });
  });

  it("takes the click on an empty name and asks the store for nothing", () => {
    const fetchMock = stubStore(() => record("Riverside Tower"));
    const field = open("Riverside Tower");
    fireEvent.change(field, { target: { value: "   " } });

    const confirm = screen.getByRole("button", { name: "Rename" });
    // Neither channel says no (constitution #17): `disabled` would take the
    // control out of the tab order, and `aria-disabled` would announce a
    // control that in fact acts — it answers, through `sayWhy`.
    expect((confirm as HTMLButtonElement).disabled).toBe(false);
    expect(confirm.getAttribute("aria-disabled")).toBeNull();

    fireEvent.click(confirm);
    expect(fetchMock).not.toHaveBeenCalled();
    // The field is still open, still holding what was typed.
    expect(screen.getByRole("textbox", { name: "Elevator name" })).toBeTruthy();
  });

  it("keeps the name and says so in text when the store cannot be reached", async () => {
    stubStore(() => Promise.reject(new Error("offline")));
    const onRenamed = vi.fn();
    const field = open("Riverside Tower", onRenamed);

    fireEvent.change(field, { target: { value: "North lift" } });
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));

    const note = await screen.findByText(/still has the name it had/);
    expect(onRenamed).not.toHaveBeenCalled();
    // The sentence is on the page, and the field points at it rather than at
    // a second copy that could drift from the visible one.
    const describedBy = screen
      .getByRole("textbox", { name: "Elevator name" })
      .getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toBe(note);
  });
});
