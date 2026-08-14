# RFQ reconciliation — design

## Entry: paste into chat, no new surface

The document arrives as a message in a fresh workspace's conversation — no upload UI, no new endpoint. A dedicated paste target on workspace creation was considered and rejected: it would add a second entry path for one gesture, and the conversation is the surface under test. The composer's paperclip is not a second path either but the same one: a text file attached there reaches the agent as text inside the message ([chat attachments](../chat-attachments/requirements.md)), so paste and attach are indistinguishable by the time ingestion sees them, and nothing below this line changes with the gesture. The agent recognizes a requirements document, calls `describe_product`, and maps each clause to a `(variable, value)` pair with the clause's quote attached — translation is the LLM's job (constitution #1); everything after the mapping is solver work inside one tool call.

Stage-1 vocabulary line: fixture documents speak only the `agreement`, `context`, and `performance` groups — the outcome layer plus building facts. A document that names `platform`, `dimensions`, `doors`, or `cabin` values is prescriptive territory, stage 2.

## Solver: `seed` (evolves the [solver service](../solver-service/design.md) — reconcile its spec when this lands)

New `ConfigSolver.seed(requirements)`: every requirement is a soft constraint (weight 1) on an `Optimize` over the model — the same machinery as `repairs()`, with nothing held hard. The optimum partitions requirements into `kept` and `dropped`.

*The subset objective (was open in [problem-framing](../../discovery/problem-framing.md) §5): fewest deviations first, cheapest monthly completion as tie-break.* Fewest deviations is what a tender response maximizes — the compliance count — and it is the register the assertion is about; minimizing price instead would manufacture deviations the customer never asked to discuss. Ties are real (two equal-count subsets can exist), so equal-count optima are enumerated with the same blocking loop `repairs()` uses (bounded, ~5), and the subset whose price-completion is cheapest wins — deterministic and explainable. Requirement *weights* (must/should) are deferred to stage 2: stage-1 fixtures have no priority vocabulary, and inventing one would be data the document does not state.

Per dropped requirement, the reason is `explain(kept ∪ {dropped_one})` — a minimal core naming the rules — and the *offered* value is what the candidate completion assigns to that variable. Both are existing operations; `seed` composes, it does not re-derive.

## State: a third source, a frozen reference, a derived register

- `Source` gains `"document"`. The seeded choices are recorded through the ordinary `apply_choices` path with that source, so provenance, statuses, candidate invalidation, and write-through all come for free.
- `Configuration` gains `rfq: NotRequired[RFQ]`:

  ```
  RFQ = {requirements: [{variable, value, clause, quote,
                         reconciliation: "pending"|"waived"|"revised"}],
         unmapped: [{clause, quote}]}
  ```

  Living inside `Configuration` means it write-throughs via `_commit` and hydrates on attach with zero new plumbing (the [agreement-workspace design](../agreement-workspace/design.md) path untouched). The raw document text is stored once on the workspace record (`workspace_store.attach_rfq`) and never enters shared state — it is reference material, not working state.
- *The register is derived, never stored.* A pure function computes each requirement's status against the live assignment: `waived` if marked; else `met` when the live value equals the requested one; else `deviation`. Requirements' `variable`/`value`/`clause`/`quote` are immutable after ingestion — tools may only move the `reconciliation` mark — which is what makes the frozen-reference criterion hold: the register is always the diff between the document and the live agreement, and it cannot go stale because it is recomputed from them. A second `ingest_rfq` on a workspace that has one is an error; re-tendering is out of scope.

## Tools

- `ingest_rfq(requirements, unmapped, document_text)` — one atomic call: validates the mapped codes (unknown variable/value demotes the entry to `unmapped`, reported, never silently dropped), runs `SOLVER.seed`, records the kept requirements as `source="document"` choices, computes the price candidate over them, stores the `rfq` block and freezes the text on the workspace. The tool message gives the agent everything to narrate: seeded count, each deviation as requested/offered/rules, the unmapped list, and the undecided variables (the gaps).
- `reconcile_requirement(variable, move, value=None)` — one card, one call:
  - `move="accept"`: pins the offered value as a `source="user"` choice (waiving is the customer's decision, and pinning stops later revisions silently moving a value they explicitly accepted) and marks the requirement `waived`.
  - `move="revise"`: `value` required; runs the same `revise()` transition as `revise_choices` and marks the requirement `revised` — so a reconciliation that collides with other choices returns the existing repair payload and cards, unchanged. This is the criterion "reconciliation goes through the revision-with-repair flow" falling out of reuse rather than new code.
  - `move="open"`: marks it back to `pending`. Nothing else changes.

`get_configuration` gains the register summary (deviations pending, waived-but-listed) so "where do we stand" answers from state.

## Frontend

- Canvas: a third provenance badge for `document` sources, with the clause in its popover ("your document, clause 4.2 — 'quote'"). Rows whose requirement is in deviation show requested vs offered; a register count sits in the header. Built from the existing shadcn vocabulary; no new component family.
- Reconciliation moves dispatch *visible* structured messages ("Reconcile deviation: accept 1.6 m/s (rated_speed=mps1_6)") through the shared `card-dispatch` path — not the hidden `Canvas edit:` grammar. Waiving a document requirement is negotiation and belongs in the record; sheet edits are bookkeeping and do not. Prompt wording and message grammar stay coupled, as everywhere.
- No new chat card. The register's home is the canvas (the durable locus); the agent narrates the top deviations after seeding. A dedicated deviation card was considered and dropped — it would duplicate the canvas state the way the banned aggregate price delta duplicated `compare_frames`, and constitution #10 says smallest mechanism.

## System prompt additions

Recognize a pasted requirements document and ingest instead of eliciting; map only what the document states, every mapping carrying its clause quote — never invent a requirement or a priority; present deviations as negotiable positions, never verdicts ("your document asks 3.0 m/s; the rules allow 1.6 m/s here because R12 — accept it, change the requirement, or leave it open"); elicit only the gaps ingestion reports; keep waived requirements named when summarizing. Treat "Reconcile deviation: …" messages as one `reconcile_requirement` call.

## Fixtures

Two authored documents in `agent/fixtures/rfq/`, plain text a presenter pastes: one satisfiable-with-gaps (clean seed, gap elicitation), one over-constrained (reuses the modernization-vs-3.0 m/s conflict the repair machinery is already demonstrated on, so the deviation's core is a known quantity). Illustrative artifacts, same epistemic status as the pricing data.

## Testing

Solver: unit tests for `seed` — fewest-deviations optimum, price tie-break determinism, the modernization fixture's expected partition, all-satisfiable passthrough. State: pure-function tests for register derivation, the three reconcile transitions, unmapped demotion, ingest-twice rejection, and atomicity (a failing seed leaves no partial state). Extraction quality is LLM behavior — verified by running the app against the fixtures (constitution #9) and by demo scenario 5 once the harness exists.
