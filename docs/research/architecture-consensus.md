# The consensus architecture — what the literature and the repo agree on

Status: synthesis, 2026-08, and the shape the prototype was built to, across every [implemented spec](../specs/README.md). It is kept as a note because it is the one drawing of how the layers fit. The design principles that accompanied it were decisions, and they live in [direction](../discovery/direction.md), *Principles*, as interaction principles with tests.

The consensus from both the research and the repo's existing pattern:

```
┌───────────────────────────── Next.js ─────────────────────────────┐
│  Chat (elicitation, explanation,        Canvas (configuration      │
│  generated in-chat controls, A2UI)      spec sheet, direct edit)   │
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

Each layer traces to a thread. The split of validity from language is the settled position of the configuration literature ([interaction literature](interaction-literature.md), thread C). Chat plus canvas, rather than chat alone, comes from the hybrid-UI evidence in thread D. And the solver operations the agent's tools expose are the ones Z3 supports natively ([solver choice](solver-choice.md)).

## Related

- [The principles this sketch used to carry, restated and expanded](../discovery/direction.md)
- [The same architecture as built, spec by spec](../specs/README.md)
