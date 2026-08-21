# Discovery

This folder holds the design-discovery layer for the prototype, organized after Dan Brown's *Practical Design Discovery*: frame the problem, set the direction, plan the approach, document the outcome.

## Scope

Discovery here covers *interaction design*: how a person conversationally navigates the configuration of a complex product-service.

Three settled business decisions are deliberately outside the frame, treated as fixed context rather than open questions:

- the elevator-as-a-service model
- environmental footprint as a decision dimension
- the solver-as-source-of-truth architecture

They constrain the interaction design. They aren't up for rediscovery, and only their interaction consequences are.

## The artifacts

| File | Brown's activity | What it settles |
|---|---|---|
| [problem-framing.md](problem-framing.md) | Frame the problem | Problem statement, objectives, context, and the [assertions](assertions/) under test |
| [direction.md](direction.md) | Set the direction | One concept, the [principles](principles/), the models worth making |
| [phase-plan.md](phase-plan.md) | Plan your approach | Activity balance, constraints, what's open, stop signals |
| [brief.md](brief.md) | Document the outcome | The standing summary — start here if you read only one |

All four are *assertions*, in Brown's sense: the current best understanding, written to be argued with and revised.

Beneath the four artifacts sits the processed knowledge they draw on: the [JTBD analysis](jtbd/README.md), covering domain, job ladder, job map, three personas, consumption journey and job stories. Those notes are models rather than decisions, and decisions live in the four artifacts.

The design models from [direction.md](direction.md), *Models to make*, live in [models/](models/) as they get drawn, and the situated walkthroughs that ground the job stories live in [scenarios/](scenarios/), indexed under *Examples that make the direction concrete*. The principles and assertions are atomic too, one note each in [principles/](principles/) and [assertions/](assertions/), indexed under *Principles* in [direction.md](direction.md) and *Assertions under test* in [problem-framing.md](problem-framing.md). Cite the note rather than the section.

## How to use this in a working session

1. Read [brief.md](brief.md) for the standing position.
2. Ask the diagnostic question: which of the four activities is missing right now — gathering, processing, exploring, or focusing? The activity balance in [phase-plan.md](phase-plan.md) tracks the current answer.
3. Do the work, then update whichever artifact the work changed, before writing a spec.
4. New specs cite the principle or assertion they serve, by linking its note. A spec that serves none is a signal to check the framing.

Method notes and worksheet templates live in the source vault, at `Dropbox/discovery/Practical Design Discovery/`.
