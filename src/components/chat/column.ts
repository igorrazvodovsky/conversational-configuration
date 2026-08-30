/**
 * The pane's one column (docs/specs/chat-pane, decision 9).
 *
 * The transcript, the suggestion strip and the composer are three separate
 * subtrees that have to line up on the same left and right edge. Each of them
 * carries this string rather than a padding of its own, so there is one place
 * where the column's width and its inset are decided. Shared as a class and
 * not as a component, which is the rule the workspace page's tree imposes
 * (docs/specs/chat-surface).
 */
export const CHAT_COLUMN = "mx-auto w-full max-w-3xl px-4";
