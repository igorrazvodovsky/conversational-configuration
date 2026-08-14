# RFQ reconciliation — tasks

Requirements approved 2026-08-14; design drafted the same day. Nothing implemented yet.

- [ ] Solver: `ConfigSolver.seed(requirements)` — soft-constraint MaxSAT partition, equal-count enumeration with cheapest-completion tie-break, per-dropped cores and offered values; unit tests (optimum, determinism, modernization partition, all-satisfiable passthrough)
- [ ] State: `Source` gains `"document"`; `Configuration.rfq` block; pure register derivation; reconcile transitions; ingest-twice rejection; unit tests
- [ ] Store: `attach_rfq(workspace_id, payload)` freezing the document text on the workspace record
- [ ] Tools: `ingest_rfq` (atomic seed + record + candidate + freeze), `reconcile_requirement` (accept / revise / open, revise path reusing `revise()` and the repair payload); `get_configuration` register summary
- [ ] System prompt additions (coupled to the "Reconcile deviation: …" message grammar)
- [ ] Canvas: document provenance badge with clause popover, deviation state on rows, register count in header; reconciliation dispatch via `card-dispatch` (visible messages)
- [ ] Fixtures: two authored RFQ documents in `agent/fixtures/rfq/` (satisfiable-with-gaps; over-constrained on the modernization conflict)
- [ ] Verify by running the app against both fixtures (constitution #9); browser pass notes into design.md
- [ ] Demo scenario 5 harness coverage (lands with the demo-scenarios harness, not before)
- [ ] Reconcile requirements.md/design.md with what was actually built; update the solver-service spec for `seed`
