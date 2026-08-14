# RFQ reconciliation — design

## Entry: paste into chat, no new surface

The document arrives as a message in a fresh workspace's conversation — no upload UI, no new endpoint. Fresh is enforced: `ingest_rfq` refuses an agreement that already has recorded choices. A dedicated paste target on workspace creation was considered and rejected: it would add a second entry path for one gesture, and the conversation is the surface under test. The composer's paperclip is not a second path either but the same one: a text file attached there reaches the agent as text inside the message ([chat attachments](../chat-attachments/requirements.md)), so paste and attach are indistinguishable by the time ingestion sees them, and nothing below this line changes with the gesture. The agent recognizes a requirements document, calls `describe_product`, and maps each clause to a `(variable, value)` pair with the clause's quote attached — translation is the LLM's job (constitution #1); everything after the mapping is solver work inside one tool call.

Stage-1 vocabulary line: fixture documents speak only the `agreement`, `context`, and `performance` groups — the outcome layer plus building facts. A document that names `platform`, `dimensions`, `doors`, or `cabin` values is prescriptive territory, stage 2.

## Solver: `seed` (evolves the [solver service](../solver-service/design.md), whose spec now carries the operation)

`ConfigSolver.seed(requirements)`: every requirement is a soft constraint (weight 1) on an `Optimize` over the model — the same machinery as `repairs()`, with nothing held hard. The optimum partitions requirements into `kept` and `dropped`.

*The subset objective (was open in [problem-framing](../../discovery/problem-framing.md) §5): fewest deviations first, cheapest monthly completion as tie-break.* Fewest deviations is what a tender response maximizes — the compliance count — and it is the register the assertion is about; minimizing price instead would manufacture deviations the customer never asked to discuss. Ties are real (two equal-count subsets can exist), so equal-count optima are enumerated with the same blocking loop `repairs()` uses (bounded, ~5), and the subset whose price-completion is cheapest wins — deterministic and explainable. Requirement *weights* (must/should) are deferred to stage 2: stage-1 fixtures have no priority vocabulary, and inventing one would be data the document does not state.

*Two counts, deliberately.* The objective counts distinct requested (variable, value) pairs; the register counts *requirements*, one per clause. They differ when several clauses cite one value — three clauses on `service_level` are one thing for the solver to weigh and three lines for the customer to read, which is how a tender is written and answered. Weighting by clause instead would let a document drag the seeding toward whatever it happens to repeat.

Per dropped requirement, the reason is `explain(kept ∪ {dropped_one})` — a minimal core naming the rules — and the *offered* value is what the candidate completion assigns to that variable. Both are existing operations; `seed` composes, it does not re-derive.

## State: a third source, a frozen reference, a derived register

- `Source` gains `"document"`. The seeded choices are recorded through the ordinary `apply_choices` path with that source, so provenance, statuses, candidate invalidation, and write-through all come for free.
- `Configuration` gains `rfq: NotRequired[RFQ]`:

  ```
  RFQ = {requirements: [{variable, value, clause, quote,
                         reconciliation: "pending"|"waived"|"revised"}],
         unmapped: [{clause, quote, note}],
         budget_cap?: int}
  ```

  Living inside `Configuration` means it write-throughs via `_commit` and hydrates on attach with zero new plumbing (the [agreement-workspace design](../agreement-workspace/design.md) path untouched). The raw document text is stored once on the workspace record (`workspace_store.attach_rfq`) and never enters shared state — it is reference material, not working state.
- *The register is derived, never stored.* A pure function computes each requirement's status against the live assignment, in this order: `met` when the live value equals the requested one, else `waived` if marked, else `revised` if marked, else `deviation`. Met wins over the marks because an agreement that lands back on the document's value complies, whatever route it took — the register is a diff, not a history of moves. Requirements' `variable`/`value`/`clause`/`quote` are immutable after ingestion — tools may only move the `reconciliation` mark — which is what makes the frozen-reference criterion hold: the register is always the diff between the document and the live agreement, and it cannot go stale because it is recomputed from them. A second `ingest_rfq` on a workspace that has one is an error, and so is seeding one over an agreement that already has recorded choices: the document is the *starting* position, not a layer over someone else's. Re-tendering is out of scope.
- The frozen block is carried explicitly through the three transitions that rebuild the configuration wholesale (`apply_choices`, `withdraw_choices`, `adopt_frame`); the others spread the old config and keep it for free. Dropping it would erase the document, not the diff. `adopt_frame` still rewrites every choice to `source="user"`, so adopting a frame over a seeded agreement clears the `document` badges — left as is, because the provenance of those values genuinely is the adoption; the register is unaffected, deriving from the frozen block either way.

## Tools

- `ingest_rfq(requirements, unmapped, document_text, budget_cap=None)` — one atomic call: validates the mapped codes (unknown variable/value demotes the entry to `unmapped`, reported, never silently dropped), runs `SOLVER.seed`, records the kept requirements as `source="document"` choices, stores *seed's own* whole as the candidate, stores the `rfq` block and freezes the text on the workspace. Not re-solved for the candidate: `complete()` is not unique on cost-free variables (see the solver-service note), so re-solving could offer a value the seeding result never named. The tool message gives the agent everything to narrate: seeded count, each deviation as requested/offered/rules, the unmapped list, the budget line, and the undecided variables (the gaps). Every step builds a new value, so a failure anywhere leaves the agreement untouched.
- `reconcile_requirement(variable, move, value=None)` — one card, one call. Every clause bearing on that variable moves together: they are one disagreement, answered once, and the tool message names the clauses it moved.
  - `move="accept"`: pins the offered value as a `source="user"` choice (waiving is the customer's decision, and pinning stops later revisions silently moving a value they explicitly accepted) and marks the requirement `waived`.
  - `move="revise"`: `value` required; runs the same `revise()` transition as `revise_choices` and marks the requirement `revised` — so a reconciliation that collides with other choices returns the existing repair payload and cards, unchanged. This is the criterion "reconciliation goes through the revision-with-repair flow" falling out of reuse rather than new code.
  - `move="open"`: marks it back to `pending`. Nothing else changes.

`get_configuration` gains the register summary (deviations pending, waived-but-listed) so "where do we stand" answers from state.

## Frontend

- Canvas: a third provenance badge for `document` sources, with the clause in its popover ("your document, clause 4.2 — 'quote'"). Every row the agreement does not currently *meet* shows requested vs offered — while it is an open deviation and equally once it is waived or revised, because story three asks to see the document's ask *always* and a reconciliation mark settles a requirement without retiring it. The header counts the same three ways. Requested values are grouped by value, never flattened onto the first clause: a document may ask two different values of one term, and joining every clause number under one label would misquote it. Built from the existing shadcn vocabulary; no new component family. This rendering is designed against the sheet, which is what exists. This spec landed first, so the seam is now the [agreement-document spec](../agreement-document/requirements.md)'s to close: when that canvas lands it re-renders these deviations as document-native margin marks on the affected terms, replacing the row decoration.
- The register is derived *frontend-side too*, by the same rule, from the frozen block and values already in state. It is a diff, not a judgment, so nothing about validity is being decided outside the solver. The *rules* behind a deviation are deliberately not in state: they reach the customer the way every other grounded explanation does, narrated in chat from a solver core. Deleting every conversation therefore loses the argument and nothing else, which is what the frozen-reference criterion allows.
- Reconciliation moves dispatch *visible* structured messages ("Reconcile deviation: accept the offered Rated speed, 2.5 m/s (rated_speed=mps2_5)") — not the hidden `Canvas edit:` grammar. Waiving a document requirement is negotiation and belongs in the record; sheet edits are bookkeeping and do not. That extends to the option list: picking any value on a row the document speaks to dispatches the *revise* move rather than a canvas edit, so a third control was never needed. Prompt wording and message grammar stay coupled, as everywhere.
- A colliding reconciliation returns the ordinary repair payload, so `reconcile_requirement` is registered with the same `RepairOptions` renderer as `revise_choices` — the criterion "reconciliation goes through the revision-with-repair flow" holding at the UI layer as well as the state layer. Its other outcomes are plain text, which that renderer already falls back on.
- The document badge is a sibling of the collapsible trigger, never a child. It is itself a popover trigger, and a button inside a button is invalid HTML that fails hydration on every load — a variant of the problem the [chat-surface design](../chat-surface/design.md) records.
- No new chat card. The register's home is the canvas (the durable locus); the agent narrates the top deviations after seeding. A dedicated deviation card was considered and dropped — it would duplicate the canvas state the way the banned aggregate price delta duplicated `compare_frames`, and constitution #10 says smallest mechanism.

## System prompt additions

Recognize a pasted requirements document and ingest instead of eliciting; map only what the document states, every mapping carrying its clause quote — never invent a requirement or a priority, and treat a clause that explicitly leaves a decision to the bidder as a gap rather than a mapping; present deviations as negotiable positions, never verdicts ("your document asks 3.0 m/s; the rules allow 1.6 m/s here because R12 — accept it, change the requirement, or leave it open"); elicit only the gaps ingestion reports; keep waived requirements named when summarizing. A hardware-specified document is stage 2: say plainly that the work starts from outcomes, and ask what the figure is there to achieve. Treat "Reconcile deviation: …" messages as one `reconcile_requirement` call — and unlike a sheet edit, confirm it, because it is negotiation and belongs in the record.

## Fixtures

Two authored documents in `agent/fixtures/rfq/`, plain text a presenter pastes: one satisfiable-with-gaps (clean seed, gap elicitation), one over-constrained (reuses the modernization-vs-3.0 m/s conflict the repair machinery is already demonstrated on, so the deviation's core is a known quantity). Illustrative artifacts, same epistemic status as the pricing data. Both speak only the stage-1 groups; every `platform`, `dimensions`, `doors` and `cabin` value in the seeded candidate is solver-forced, never document-stated.

`residential-new-build.txt` states nine requirements (residential / europe / new_build, 24 m travel, 1000 kg, 1.6 m/s, medium traffic, standard service level, EN 81-70) and leaves `contract_term`, `stops` and `connectivity_package` unstated — the gaps elicitation must target. Verified against the solver: jointly satisfiable, and its cheapest completion sits under the budget cap the document states, so the clean case is clean on price too.

`office-tower-modernization.txt` states twelve, of which `installation=modernization` and `rated_speed=mps3_0` are the intended conflict. Verified: unsatisfiable, with a minimal core of exactly those two choices under R04 (speed sets minimum headroom) and R28 (modernization cannot raise the existing headroom) — R03/R27 are an equivalent pit-depth core the solver may return instead, so a `seed` test should assert on the core *choices* and accept either rule pair. Two single-drop maximal subsets exist, so this fixture exercises the tie-break rather than merely the count: dropping `rated_speed` offers 2.5 m/s and completes cheaper than dropping `installation` — so cheapest-completion picks the one a modernization customer would recognize as an answer. Evidence for the objective argued above, and a caution that the tie-break does real work here.

Both documents also carry clauses no model variable covers by design — handover dates and liquidated damages, a 2 h response time (the premium level offers 4 h), a service-credit regime, unit counts — to exercise the `unmapped` path.

The three questions the fixtures raised, as built:

- *Several clauses, one variable* (A's 4.1/4.2/4.3 on `service_level`). Kept as several requirements sharing a variable, so every citation stays true to its own clause. Two counts follow, argued above; `seed` dedupes for weighting and `reconcile_requirement` moves the whole group at once. A document naming two *different* values of one variable needs no special case: the exactly-one structure drops one of them, and the deviation cites no named rule because none is involved.
- *Bounds versus the register's equality test.* Equality stands; no comparator, no ordered domains. It does not bite: kept requirements are pinned as `document` choices, so the live value equals the requested one by construction, and the one figure that deviates on these fixtures (B's 3.0 m/s) is stated exactly, not as a bound. A bound would misread only after a later revision pushed a variable past it — the wording stays "requested X / offered Y", never "non-compliant", so a misread is a stale line rather than a false accusation. Known gap.
- *The budget cap.* Reported, not constrained: an optional `budget_cap` on the block, compared to the candidate price as arithmetic in the tool message and in `get_configuration` ("caps the charge at €1,800; this candidate is €1,951 — €151 over"). No solver change — a price bound in `Optimize` would change `complete()` and interact with the maximal-subset logic for a pressure the customer negotiates rather than a rule they break. The stage-1 vocabulary line in requirements.md stands as approved.

## Testing

Solver (`test_solver.py`): `seed` against both fixture requirement sets — all-satisfiable passthrough, the modernization partition, the price tie-break, deviation rule attribution (asserting the core *choices*, accepting either the pit-depth or headroom rule pair), determinism across repeated calls, duplicate collapsing, the two-values-of-one-variable case, unknown-code rejection. State (`test_configuration.py`): register derivation and its status order, the three reconcile moves, group movement across clauses, unmapped demotion, ingest-twice and ingest-over-a-configured-agreement rejection, atomicity, and the frozen reference surviving reconcile → apply → complete → save → adopt → withdraw. Store (`test_workspace_store.py`): the document text frozen on the record and untouched by configuration writes.

The design's empirical claims about the fixtures were re-verified against the live solver before the tests were written, and all hold: A satisfiable at €901/month under its €1,200 cap; B unsat with the core (`installation=modernization`, `rated_speed=mps3_0`); two single-drop maximal subsets; dropping the speed offering 2.5 m/s at €1,951 against €2,021 for dropping the modernization.

## Verified in the app

Both fixtures pasted into fresh workspaces (constitution #9):

- *B (over-constrained).* Seeded 11 of 12 requirements at €1,951/month with `document` badges throughout; header "1 of 11 requirements from your document not met"; the rated-speed row showing "Clause 3.1 asked 3.0 m/s · offered 2.5 m/s" with its two moves; the agent narrating the deviation with R03/R27 and the €151 cap breach. Accept produced the visible reconcile message, one tool call, "all 11 answered · 1 waived", and the row pinned to "you" with "waived, still listed". Reloading into a *new* conversation re-rendered the whole register from the store. Insisting on 3.0 m/s afterwards returned repair cards with the pit/headroom ripple and left the agreement untouched.
- *A (satisfiable with gaps).* Seeded 13 requirements, no deviations, no ceremony, €1,141/month within the stated €1,200 cap, then elicited only the gaps.
- *A synthetic third case*, seeded through the store because neither fixture produces it: two unmet clauses asking different values of one variable, alongside a revised requirement. Each clause rendered with its own requested value, and the revised one kept its ask visible with the header counting it.

Known gaps, both extraction quality rather than machinery:

- The agent mapped A's clause 5.2 — which explicitly leaves the term to the bidder — to a 10-year `contract_term`, putting its own assumption on the sheet as something the customer asked for. The prompt now names that shape ("open to proposal", "state your assumption") as a gap, not a requirement; re-verify when the scenario harness covers this.
- It read B's 5.1 as `service_level` alone and left `connectivity_package` to be forced rather than citing the clause. Under-mapping is the safe direction — nothing is invented — but the citation is thinner than the document supports.

Not yet done: demo scenario 5, which lands with the rest of the [demo-scenarios](../demo-scenarios/design.md) backlog.
