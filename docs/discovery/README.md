# Discovery

This folder holds the design-discovery layer for the prototype, organized after Dan Brown's *Practical Design Discovery*: frame the problem, set the direction, plan the approach, document the outcome.

## Scope

Discovery here covers *interaction design*: how a person conversationally navigates the configuration of a complex product-service.

Deliberately outside the frame — settled business decisions, treated as fixed context rather than open questions:
- the elevator-as-a-service model
- environmental footprint as a decision dimension
- the solver-as-source-of-truth architecture
These constrain the interaction design. They are not up for rediscovery; only their interaction consequences are.

## The artifacts

| File | Brown's activity | What it settles |
|---|---|---|
| [problem-framing.md](problem-framing.md) | Frame the problem | Problem statement, objectives, context, and the [assertions](assertions/) under test |
| [direction.md](direction.md) | Set the direction | One concept, the [principles](principles/), the models worth making |
| [phase-plan.md](phase-plan.md) | Plan your approach | Activity balance, constraints, what's open, stop signals |
| [brief.md](brief.md) | Document the outcome | The standing summary — start here if you read only one |

All four are *assertions*, in Brown's sense: the current best understanding, written to be argued with and revised.

Beneath the four artifacts sits the processed knowledge they draw on: the JTBD analysis in [jtbd/](jtbd/) — domain, job ladder, job map, three personas, consumption journey, job stories. Notes are models, not decisions; decisions live in the four artifacts above. Design models from [direction.md](direction.md) §3 live in [models/](models/) as they get drawn, and the situated walkthroughs that ground the job stories live in [scenarios/](scenarios/), indexed by §4. The principles and assertions are atomic too — one note each in [principles/](principles/) and [assertions/](assertions/), indexed by §2 of [direction.md](direction.md) and §4 of [problem-framing.md](problem-framing.md). Cite the note, not the section.

## How to use this in a working session

1. Read [brief.md](brief.md) for the standing position.
2. Ask the diagnostic question: which of the four activities is missing right now — gathering, processing, exploring, or focusing? [phase-plan.md](phase-plan.md) §1 tracks the current answer.
3. Do the work; then update whichever artifact the work changed, before writing a spec.
4. New specs cite the principle or assertion they serve, by linking its note. A spec that serves none is a signal to check the framing.

Method notes and worksheet templates live in the source vault: `Dropbox/discovery/Practical Design Discovery/`.
