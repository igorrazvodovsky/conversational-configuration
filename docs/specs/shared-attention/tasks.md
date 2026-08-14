# Shared attention — tasks

Requirements approved 2026-08-14. Decision 6 (card dispatch through the core) already landed and is verified in design.md.

1. Read channel, frontend: lift the open editor into the canvas shell via mount/unmount reporting from `OptionEditor` (the one component every layer's editor renders), publish it with `useAgentContext` alongside nothing else; publish the staleness flag from the workspace view, which already has `staleThread`.
2. Read channel, agent: a short prompt section telling the agent what the App Context block carries and how to use it — demonstratives resolve to the open editor, no editor plus an ambiguous reference means ask, staleness means the transcript above is historical.
3. Reveal: diff the resolved values across a run boundary in the shell, mark the changed variables transiently (`revealed` set beside `pending`), extend the schedule fallback to `open ?? (deviating || holdsRevealedValue)`, scroll once to the topmost affected element not already in view — skipped when an editor is open — and let an explicitly collapsed schedule carry the mark on its header.
4. Discovery amendment: the approved row in the conversation move inventory §3 and the note on §7's returning-operator edge.
5. Reconcile: update the spec README status, fold verification and deviations into design.md, delete this file.
