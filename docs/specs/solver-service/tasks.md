# Solver service — tasks

- [x] `model.py`: schema loader with validation errors
- [x] `service.py`: Bool encoding, exactly-one constraints, tracked rules
- [x] `check` + `explain` (MUS shrink, rule attribution)
- [x] `valid_options` via consequences
- [x] `complete` via Optimize with price objective
- [x] pytest suite covering all acceptance criteria (19 tests); pytest added as dev dependency
- [x] Measure operation latency; recorded in design.md (check ~2.6 ms, valid_options ~3.2 ms)
- [x] Port `validate.py` to reuse the service (duplicate encoding dropped)
