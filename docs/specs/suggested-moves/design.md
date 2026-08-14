# Suggested moves — design

Status: draft, written alongside the requirements and not yet implemented.

## Decision 1: templated pills over model-generated ones

`useConfigureSuggestions` accepts two shapes. The static one takes a list and an optional dependency array; the dynamic one takes `instructions`, `minSuggestions`, `maxSuggestions` and `available`, and has the runtime generate pills from a model call. Both are exported at 1.65.0 — the choice is real, and the dynamic form is the one the docs lead with.

The static form wins here, recomputed from state through its `deps` argument. Three reasons, in order of weight:

*Generated pills are unassertable.* Constitution #9 confines the scenario harness to tool calls, payloads and state, never prose, precisely so that conversation checks do not become prose review. A model-composed pill is prose, so a dynamic strip could not be checked at all — not for the trade-off pairing, not for whether it offers moves that exist, not for whether it slipped into asking questions. With templates, the harness can assert on which move kinds the strip offers from a given state, which is the acceptance criteria's actual content.

*The pairing rule needs to be a guarantee.* The requirement that cost and footprint pills appear together or not at all is a never-move dressed as a rendering rule. Under templates it is a property of the code. Under generation it is an instruction the model usually follows, and the failure is silent and looks like a reasonable strip.

*Cost.* A generated strip is one extra model call every time the agreement changes, including after every canvas edit, for a surface the customer may never look at.

The counter-argument is real and should be recorded: templated pills will read stiffer than generated ones, and the whole point is to speak in the building's vocabulary about *this* building. If the walkthrough finds the strip reads as boilerplate, the fallback is the dynamic form with the pairing enforced by post-filtering the generated list rather than by instruction, and the harness losing its grip on this surface accepted explicitly.

## Decision 2: the templates follow the recitals' discipline

The [agreement document spec](../agreement-document/requirements.md) already requires that recitals prose is produced by deterministic templates over state and model display data, never composed by the model — constitution #6 extended to the record. Pills are chat-side, not the record, so that rule does not bind them. They should follow it anyway, for decision 1's reasons, and reuse the same source of phrasing: the model's display labels and glosses, so a pill and the term it refers to call the same thing by the same name.

Where the templates live is the one open implementation question. `lib/configurator.ts` already holds the projection helpers the canvas renders through and is the natural home; whether the move catalogue sits beside them or in its own module is a first-implementation call, not a design commitment.

## Decision 3: the move catalogue is the inventory, filtered by state

Each pill family is a predicate over the configuration plus the text to offer when it holds. The initial set, drawn from the [conversation move inventory](../../discovery/models/Conversation%20moves.md) §2 and matched to state this project already computes:

| Family | Offered when | Move |
|---|---|---|
| Entry prompts | No choices recorded | The four existing prompts, unchanged |
| The trade-off pair | A candidate exists | *Make it cheaper* and *lower the carbon*, always both |
| Answer the document | An outstanding deviation exists | The specific unanswered requirement, named by its clause |
| Ask why | A value is solver-forced or agent-chosen | Why that value is what it is |
| Revise by intent | Choices exist | A revision phrased against a recorded outcome term |
| Accept | A candidate exists and no deviation is outstanding | Take the agreement as it stands |

The table is the starting point, not a fixed set; what it must preserve is that every family maps to a move the inventory already lists, so a pill can never offer something the system has no move for. *Fork and compare* is deliberately absent until the comparison view has a canvas placement — the [nonlinear interaction spec](../nonlinear-interaction/requirements.md) leaves that open, and offering the move before it has a surface would produce a result with nowhere to go.

How many pills show at once, and in what order, is a rendering question for the first implementation. The order must be stable across recomputations so the strip does not reshuffle under the customer.

## Decision 4: dispatch is the plain path, and this is a constraint not a convenience

A pill sends its own displayed text as an ordinary user message. It does not use the `Canvas edit: `, `Apply repair: ` or `Reconcile deviation: ` grammar that `card-dispatch.ts` owns.

Those prefixes exist because a card stands for one atomic tool call and the agent's prompt is written to map them onto it — the coupling `CLAUDE.md` records between card copy and prompt wording. A pill stands for nothing of the sort: it is a sentence the customer could have typed, and the value of it being exactly that is that the customer learns they could have typed it. Routing pills through the structured grammar would make them commands with a UI disguise, and would silently extend the prompt-coupling surface to a second component.

This also keeps the strip out of the agreement's mechanics entirely. Nothing here can dispatch a state change; the agent decides what a pill's sentence means, the same way it decides what a typed sentence means, and the solver decides whether it is allowed.

## Decision 5: recomputation is bound to settled state

The `deps` array is keyed on the configuration and on `isRunning`, so pills recompute once when a run ends rather than on every streamed state delta. That satisfies the requirement that pills do not churn mid-run, and it means a canvas edit updates the strip on the same boundary as everything else the canvas discards and re-derives.

Registration stays where it is, in `use-configurator-ui.tsx` beside the tool renderers, called from the workspace page. That hook already re-renders on agent activity, so reading configuration there adds no new render pressure — unlike the header, where the [chat surface design](../chat-surface/design.md) decision 5 documents why `useAgent` may not be called.

## Verification plan

The conversation harness can check the move-kind composition from a seeded state, which is what makes decision 1 worth its stiffness. Assertions read which families the strip offers, never the pill text:

- From an empty configuration, the four entry prompts and nothing else.
- From a state with a candidate, both trade-off pills present, neither alone.
- From an RFQ-seeded state with an outstanding deviation, the answer-the-document family present and naming the right clause.
- From a state whose deviations are all answered, that family gone.

By hand, against the running app: pills settle once at the end of a run rather than flickering through it; a canvas edit updates them; clicking one sends visible text identical to the pill's own and produces the same result as typing it.
