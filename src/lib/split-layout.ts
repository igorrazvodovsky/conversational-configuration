// docs/specs/remembered-split/design.md
//
// A cookie rather than `localStorage` because the server renders this split
// too. Both sides go through `canvasPercentFrom`.

export const SPLIT_COOKIE = "workspace-split";

export const DEFAULT_CANVAS_PERCENT = 62;

/** Bounds on a stored value, not on a drag: the real floors are the panels'
 * 360 pixels, which depend on the window. */
const MIN_CANVAS_PERCENT = 15;
const MAX_CANVAS_PERCENT = 85;

/** Missing, unparseable and out of range all read as the default. */
export function canvasPercentFrom(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_CANVAS_PERCENT;
  const value = Number(raw);
  if (!Number.isFinite(value)) return DEFAULT_CANVAS_PERCENT;
  if (value < MIN_CANVAS_PERCENT || value > MAX_CANVAS_PERCENT) {
    return DEFAULT_CANVAS_PERCENT;
  }
  return value;
}

/** Three conditions rather than one: the group also reports the mount, a
 * constraint recompute and every imperative call, and a drag while stacked or
 * undocked says nothing about the stored division (decision 3).
 *
 * A named function so the truth table is checkable without a browser. */
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

/** Whole percent: the window it is restored in is rarely the window it was
 * dragged in. A year of `max-age`, and `SameSite=Lax` because no cross-site
 * request has any business carrying it. */
export function splitCookie(percent: number): string {
  const stored = Math.round(
    Math.min(MAX_CANVAS_PERCENT, Math.max(MIN_CANVAS_PERCENT, percent)),
  );
  return `${SPLIT_COOKIE}=${stored}; path=/; max-age=31536000; samesite=lax`;
}

export function rememberCanvasPercent(percent: number): void {
  document.cookie = splitCookie(percent);
}
