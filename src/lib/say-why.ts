// constitution #17, docs/specs/ui-component-library/design.md decision 9

import { toast } from "sonner";

/** `id` keeps a repeated click from stacking copies: sonner replaces a toast
 * already showing under the same id. */
export function sayWhy(id: string, sentence: string) {
  toast(sentence, { id });
}

export function sayBusy() {
  sayWhy("busy", "The agent is still working on the last change. Try again when it finishes.");
}

/** The one condition here the customer can clear themselves, so the sentence
 * says how. */
export function sayNoPrice(name: string) {
  sayWhy(
    "no-price",
    `"${name}" has no price yet, so there is nothing to compare. Ask for a price, or make a change, and it completes again.`,
  );
}
