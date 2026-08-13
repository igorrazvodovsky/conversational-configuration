# Nonlinear interaction — tasks

Approved 2026-08-13.

- [x] `ConfigSolver.repairs()` via soft-constraint optimization + blocking; unit tests
- [x] Reconcile the [solver-service spec](../solver-service/design.md) with the new operation
- [x] State: frames list; pure functions save/compare/adopt + revise passthrough/reject; unit tests
- [x] Tools: revise_choices, save_frame, compare_frames, adopt_frame; system prompt update
- [x] `RepairOptions` renderer (cards, inert-after-use)
- [x] `FrameComparison` renderer (two-column diff, adopt buttons)
- [x] Canvas frames strip
- [x] Thread resumption hook (`useThreadResumption`) — added during the browser pass when verification showed CopilotKit doesn't restore thread history on switch
- [x] Browser pass: revision-with-repair, save/compare/adopt, thread resumption ("where were we?" answered from get_configuration)
