import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Disabled shadcn controls set `pointer-events: none`, which suppresses the
 * native `title` — and every explanation of why a control is unavailable lives
 * on one (docs/specs/ui-component-library/design.md, decision 4). Restoring
 * pointer events keeps the reason reachable; a disabled control still cannot
 * be clicked.
 */
export const KEEP_TITLE = "disabled:pointer-events-auto";
