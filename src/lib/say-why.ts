/**
 * Where a click that cannot do what it looks like it does gets its answer
 * (constitution #17).
 *
 * The rule that sends everything here is that a control is not disabled to
 * mean *no*. A disabled control says nothing about why, is outside the tab
 * order, and takes the gesture away from someone who had a reason for making
 * it. So the control stays live, the click happens, and what the interface
 * knows is said back — through `sonner`, whose toast is a polite live region
 * and reaches a screen reader without the control having to be focused.
 *
 * The sentences live here rather than at the call sites because several
 * controls give the same answer: three separate controls on the canvas are
 * unusable for the one reason that a run is in flight, and a sentence said
 * three ways would read as three different conditions.
 *
 * A toast is the most transient channel there is, which constitution #16
 * would rule out if it were carrying a *state*. It is not. It answers a
 * gesture somebody just made, at the moment they made it, and every state it
 * speaks about is also readable somewhere that stays: the run has the chat's
 * own indicator, a draft with no price says "no price" in the menu, and a
 * ruled-out option carries its rules in `RefusalList` whether or not anyone
 * clicks it.
 */

import { toast } from "sonner";

/**
 * Answer a click. `id` keeps a repeated click from stacking copies of one
 * sentence — sonner replaces a toast that is already showing under the same
 * id, which is what an impatient second click should do.
 */
export function sayWhy(id: string, sentence: string) {
  toast(sentence, { id });
}

/**
 * A run is in flight. Every tool writes through to the workspace store as it
 * goes, so a second turn started mid-run would act on an agreement the first
 * one is still changing.
 */
export function sayBusy() {
  sayWhy("busy", "The agent is still working on the last change. Try again when it finishes.");
}

/**
 * A draft with no priced candidate cannot be compared. It is the one condition
 * here that the customer can clear themselves, so the sentence says how.
 */
export function sayNoPrice(name: string) {
  sayWhy(
    "no-price",
    `"${name}" has no price yet, so there is nothing to compare. Ask for a price, or make a change, and it completes again.`,
  );
}
