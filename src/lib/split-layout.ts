/**
 * The division between the canvas and the chat, remembered across workspaces
 * and sessions (docs/specs/remembered-split/design.md).
 *
 * A cookie rather than `localStorage` because the server renders this split
 * too: a value only the browser can see gives the SSR pass one division and
 * hydration another. Both sides go through `canvasPercentFrom`, so they never
 * disagree about what a stored value means.
 */

export const SPLIT_COOKIE = "workspace-split";

/** The split before anyone drags anything
 * (docs/specs/agreement-workspace/design.md). */
export const DEFAULT_CANVAS_PERCENT = 62;

/**
 * Bounds on a stored value, not on a drag: the real floors are the panels' 360
 * pixels, which depend on the window and are the group's to apply. These only
 * keep a damaged cookie from asking for a division no drag could produce.
 */
const MIN_CANVAS_PERCENT = 15;
const MAX_CANVAS_PERCENT = 85;

/**
 * The canvas's share of the group, from the raw cookie value. Missing,
 * unparseable and out of range all read as the default, so a cleared cookie and
 * a damaged one behave alike.
 */
export function canvasPercentFrom(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_CANVAS_PERCENT;
  const value = Number(raw);
  if (!Number.isFinite(value)) return DEFAULT_CANVAS_PERCENT;
  if (value < MIN_CANVAS_PERCENT || value > MAX_CANVAS_PERCENT) {
    return DEFAULT_CANVAS_PERCENT;
  }
  return value;
}

/**
 * Whether a completed layout change is the operator's opinion about *this*
 * split. Three conditions rather than one, because the group also reports the
 * mount, a constraint recompute and every imperative call, and because a drag
 * while stacked or undocked says nothing about the stored division
 * (docs/specs/remembered-split/design.md decision 3).
 *
 * A named function so the truth table is checkable without a browser.
 */
export function recordsTheSplit({
  isUserInteraction,
  sideBySide,
  docked,
}: {
  isUserInteraction: boolean;
  sideBySide: boolean;
  docked: boolean;
}): boolean {
  return isUserInteraction && sideBySide && docked;
}

/**
 * The cookie a drag leaves. Whole percent: what is stored is a proportion, and
 * the window it is restored in is rarely the window it was dragged in. A year
 * of `max-age` because a way of working outlasts a session, and `SameSite=Lax`
 * because no cross-site request has any business carrying it.
 */
export function splitCookie(percent: number): string {
  const stored = Math.round(
    Math.min(MAX_CANVAS_PERCENT, Math.max(MIN_CANVAS_PERCENT, percent)),
  );
  return `${SPLIT_COOKIE}=${stored}; path=/; max-age=31536000; samesite=lax`;
}

/** A drag, recorded. */
export function rememberCanvasPercent(percent: number): void {
  document.cookie = splitCookie(percent);
}
