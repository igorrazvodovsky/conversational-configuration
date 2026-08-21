"use client";

import { useEffect, useState } from "react";

/**
 * False on the server and through the first client render, true a tick later.
 *
 * The gate every menu on the workspace page mounts behind, and not a styling
 * nicety: a Radix menu present during the hydration pass shifts the `useId`
 * values of the *whole* page — every canvas disclosure comes back with a
 * different id than the server sent, and React reports a mismatch on every
 * load. Keeping the hydrated tree off `useId` is the rule
 * (docs/specs/chat-surface/design.md); this is how a component obeys it. The
 * server and the first client render agree on a plain button, and the menu
 * takes over before anyone can click it.
 *
 * A hook rather than a wrapper component deliberately: a component would be a
 * fiber, and a fiber inserted above an id-minting descendant causes the very
 * mismatch this exists to avoid.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
