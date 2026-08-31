/**
 * The remembered split (docs/specs/remembered-split/design.md, checked per
 * docs/specs/offline-checks/design.md).
 *
 * Two things decide whether the operator keeps the division they dragged. The
 * parser has to agree with the writer, since a value the server and the browser
 * read differently is a hydration error rather than a wrong width. And the
 * write gate has to keep everything that is not a drag of this handle from
 * overwriting the operator's opinion — the mount alone would do it on every
 * load.
 */
import { describe, expect, it } from "vitest";

import {
  DEFAULT_CANVAS_PERCENT,
  SPLIT_COOKIE,
  canvasPercentFrom,
  recordsTheSplit,
  splitCookie,
} from "@/lib/split-layout";

/** The percentage in a cookie string, back out again. */
const roundTrip = (percent: number) =>
  canvasPercentFrom(splitCookie(percent).split(";")[0].split("=")[1]);

describe("what a stored split means", () => {
  it("reads a dragged division back", () => {
    expect(canvasPercentFrom("75")).toBe(75);
    expect(roundTrip(74.6)).toBe(75);
  });

  it("falls back to the default when there is nothing to read", () => {
    expect(canvasPercentFrom(undefined)).toBe(DEFAULT_CANVAS_PERCENT);
  });

  it("treats a damaged value as no value", () => {
    for (const raw of ["", "wide", "62%", "NaN", "Infinity"]) {
      expect(canvasPercentFrom(raw)).toBe(DEFAULT_CANVAS_PERCENT);
    }
  });

  it("refuses a division no drag could have produced", () => {
    expect(canvasPercentFrom("0")).toBe(DEFAULT_CANVAS_PERCENT);
    expect(canvasPercentFrom("99")).toBe(DEFAULT_CANVAS_PERCENT);
    expect(canvasPercentFrom("-40")).toBe(DEFAULT_CANVAS_PERCENT);
  });

  it("writes only values it can read back", () => {
    // A drag beyond the bounds must still leave a division the reader accepts.
    // Were the writer to store it unclamped, the next load would read it as
    // damaged and reset the operator to the default.
    for (const percent of [0, 1, 15, 50, 85, 99, 100]) {
      const stored = roundTrip(percent);
      expect(canvasPercentFrom(String(stored))).toBe(stored);
    }
  });

  it("names the cookie the server reads, and outlives the session", () => {
    const cookie = splitCookie(70);
    expect(cookie.startsWith(`${SPLIT_COOKIE}=70;`)).toBe(true);
    expect(cookie).toContain("path=/");
    expect(cookie).toContain("max-age=31536000");
    expect(cookie).toContain("samesite=lax");
  });
});

describe("what may overwrite the operator's division", () => {
  const drag = { isUserInteraction: true, sideBySide: true, docked: true };

  it("a drag of this handle, side by side and docked", () => {
    expect(recordsTheSplit(drag)).toBe(true);
  });

  it("nothing the operator did not do", () => {
    expect(recordsTheSplit({ ...drag, isUserInteraction: false })).toBe(false);
  });

  it("no drag in a geometry this split is not about", () => {
    expect(recordsTheSplit({ ...drag, sideBySide: false })).toBe(false);
    expect(recordsTheSplit({ ...drag, docked: false })).toBe(false);
  });
});
