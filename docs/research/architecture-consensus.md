# The consensus architecture — what the literature and the repo agree on

Status: synthesis, 2026-08, and the shape the prototype was built to (every [implemented spec](../specs/README.md)). Split from the former `docs/research-and-outline.md` §4. Kept as a note because it is the one drawing of how the layers fit; the design principles that accompanied it were decisions, and they now live in [../discovery/direction.md](../discovery/direction.md) §2 as interaction principles with tests.

The consensus from both the research and the repo's existing pattern:

```
┌───────────────────────────── Next.js ─────────────────────────────┐
│  Chat (elicitation, explanation,        Canvas (configuration      │
│  generated in-chat controls via A2UI)   spec sheet, direct edit)   │
└──────────────────────┬────────────────────────┬───────────────────┘
                       │   shared agent state (CopilotKit v2)
┌──────────────────────┴────────────────────────┴───────────────────┐
│  LangGraph agent (LLM): elicits needs, translates to assignments, │
│  narrates ripple effects, proposes repairs — never decides validity│
│        │ tools: set_choices / valid_options / explain / complete   │
│  ┌─────┴──────────────────────────────────────────────────┐       │
│  │ Z3 solver service over a declarative product model      │       │
│  │ (single source of truth for validity)                   │       │
│  └────────────────────────────────────────────────────────┘       │
└───────────────────────────────────────────────────────────────────┘
```

Each layer traces to a thread: the split of validity from language is the settled position of the configuration literature ([interaction-literature.md](interaction-literature.md), thread C); chat-plus-canvas rather than chat-only comes from the hybrid-UI evidence (thread D); the solver operations the agent's tools expose are the ones Z3 supports natively ([solver-choice.md](solver-choice.md)).

## Related

- [../discovery/direction.md](../discovery/direction.md) §2 — the principles this sketch used to carry, restated and expanded
- [../specs/README.md](../specs/README.md) — the same architecture as built, spec by spec
