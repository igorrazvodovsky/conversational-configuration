# Undo in shipped living documents

Status: retrieved 2026-08-15. Closes the undo half of [gaps E6](gaps.md#e6): how shipped implementations of the chosen surface pattern — chat + living document ([Surface architecture](../discovery/models/Surface%20architecture.md) §1) — reverse an *accepted* AI proposal: not typing, but a change the user already took from the model. The rest of E6 (provenance, partial acceptance, re-entry) was touched only where it borders undo and stays open. Evidence is vendor documentation, help pages and changelogs read while writing, supplemented by third-party writeups where official docs are thin; claims not directly documented are marked *inferred*. No tool was exercised hands-on.

## Verdict

Whole-document snapshot rollback is the genre's native pattern, and per-proposal revocation after acceptance ships nowhere. Every consumer living-document tool surveyed reverses an accepted AI change only by restoring a full document version; the fine-grained affordances all sit *before* the accept boundary, or within the live session just after it. Acceptance is uniformly the point where a proposal loses its identity — it dissolves into the document, and only snapshots remain. So the question this research was registered against — is batch undo or suggestion-revocation the native pattern? — resolves to *batch undo*, with the batch boundary drawn at the AI's turn.

## The consumer tools

| Tool | Unit of reversal | How an accepted AI change reverses | Survives sessions | Redo |
|---|---|---|---|---|
| Claude Artifacts | Whole artifact, one version per AI edit ([help](https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them)) | Version selector is view-only; making an old version current means asking Claude to re-save it (*inferred*; [writeup](https://oboe.com/learn/claude-llm-artifacts-feature-lyvc4y/iteration-and-versioning-claude-llm-artifacts-feature-3)) | Yes, with the conversation | Forward navigation |
| ChatGPT Canvas | Whole canvas, one version per AI edit pass | Navigate back, then *Restore this version*; *Show changes* diffs versions ([OpenAI](https://openai.com/index/introducing-canvas/), [help](https://help.openai.com/en/articles/9083999-how-do-i-view-version-history)) | Canvas reopens with the conversation; version-chain survival undocumented | Forward navigation |
| Copilot Pages / Loop | Whole page; versions coalesce — "does not save every change" | *Restore version*, or copy text out of an old version as a manual partial reversal ([Microsoft](https://techcommunity.microsoft.com/blog/microsoft365insiderblog/view-or-restore-previous-versions-of-microsoft-365-copilot-pages/4466684)) | Yes, server-side, ~50 versions | Forward navigation |
| Google Docs + Gemini | None AI-specific: accepted output becomes ordinary text | Ctrl+Z within the session; generic version history beyond it, in which AI edits are not flagged (*inferred* from the generic model; [help](https://support.google.com/docs/answer/13447609)) | Version history only | Ctrl+Y within the session |

Two structural observations across the four:

- *Snapshot boundaries aligned to the AI's turn are what make Canvas and Artifacts read as reversible.* They get the alignment free because the AI's turn is the only write. Pages and Docs, where human and AI edits share one stream, lose it: a restored version can discard human work interleaved after the AI edit, and Loop's own docs warn that a restore "may go back several changes".
- *Granularity exists only before acceptance.* Gemini offers per-suggestion accept and reject, Copilot Edits per-chunk keep/undo, Ivo a per-recommendation iteration history ([Ivo help](https://support.ivo.ai/en/articles/9150209-using-the-review-feature)) — all of it pre-acceptance. After acceptance, nothing addresses the individual proposal.

## Two exceptions worth borrowing from

- *The redlining double gate.* Harvey and Spellbook apply an "accepted" suggestion as a Word tracked change, so the accepted edit remains an addressable, individually rejectable object in the document until a second, later resolution pass ([Harvey](https://eu.help.harvey.ai/articles/harvey-for-word), [Spellbook](https://spellbook.com/features/review)). This is the only shipped pattern in which one accepted AI change reverses per-proposal, days later, without touching anything else — achieved by making acceptance provisional, not by making undo smarter. Word itself sets the genre baseline: undo of an acceptance works only while the document stays open; beyond that, version rollback ([Microsoft](https://support.microsoft.com/en-us/word/accept-or-reject-tracked-changes-in-word)).
- *The checkpoint with redo.* VS Code's Copilot chat checkpoints snapshot the affected files before each request and restore *conversation and files together*, with a Redo control that recovers the undone changes ([docs](https://code.visualstudio.com/docs/copilot/chat/chat-checkpoints)); Cursor's checkpoints are the same shape without redo ([docs](https://cursor.com/docs/agent/chat/checkpoints)). Both projects also carry bug evidence that folding AI batches into the keystroke-level undo stack is fragile ([vscode#274210](https://github.com/microsoft/vscode/issues/274210), [copilot-release#9383](https://github.com/microsoft/vscode-copilot-release/issues/9383)).

## The agent's part in undo

No surveyed tool documents "undo that" as a first-class agent command. At best — Claude Artifacts — asking the model to re-save an old version is the de facto restore path (*inferred*). Asking a model to "put it back" otherwise regenerates, which produces a *new* version rather than a reversal, a semantically different thing: the regenerated text is the model's reconstruction, not the state that was there.

## What this means for the prototype

- The [undo seed](../specs/undo/requirements.md)'s open question resolves to batch undo over per-decision revocation, and the prototype is better placed than any surveyed tool to draw the batch boundary: every write is one committed, solver-validated tool call, so the batch boundary and the acceptance boundary coincide by construction, where Pages and Docs approximate it with time-based coalescing and lose interleaved work.
- Where per-proposal reversal does ship (redlining), it is bought by making acceptance provisional — a different accept semantics than this project's atomic validated batch, and one the [rfq-reconciliation](../specs/rfq-reconciliation/requirements.md) deviation register already provides for the terms a customer's document speaks to.
- Redo and cross-session survival are uniform across the genre; a design that omitted either would fall short of every surveyed tool.
- An agent that takes "undo that" as a move mapped onto the same mechanism as the UI control is unshipped ground — consistent with the wider opening [gaps L1](gaps.md#l1) records.

## Related

- [gaps.md](gaps.md#e6) — the register entry this closes half of
- [../specs/undo/requirements.md](../specs/undo/requirements.md) — the spec drafted on this note
- [../discovery/models/Surface architecture.md](../discovery/models/Surface%20architecture.md) — where the living-document pattern and its borrowed suggestion layer were chosen
