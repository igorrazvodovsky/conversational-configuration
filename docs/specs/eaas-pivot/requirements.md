# Elevator-as-a-service pivot

Status: draft — awaiting approval.

Grounding: docs/discovery/jtbd/ (job ladder, job map). The main job — keep people and goods moving through a building over its life — outlasts the purchase; the service frame covers the job stages (monitor, modify, conclude) that the product frame abandons, and it is where the prototype's [nonlinear-revision machinery](../nonlinear-interaction/requirements.md) does its best work. The pivot reframes what is being configured: not a machine, but a *service agreement* — outcome terms with a monthly price — under which the machine spec is derived, inspectable, and editable.

Scope decision recommended for approval: the service frame *replaces* the capex frame as the prototype's single offering (constitution #10, simplest mechanism). A buy-vs-subscribe comparison mode is the rejected alternative — richer, but it doubles the pricing model for a comparison that is not this prototype's research question.

## Stories

- As a building operator, I describe my building and what I need from it — traffic, accessibility, budget per month — and receive a solver-valid service proposal: performance terms, service level, contract term, monthly price, with the derived machine spec inspectable underneath. I commit to outcomes, not part lists.
- As a customer whose building use changed mid-contract, I ask for different outcomes and get solver-computed adjustment options showing the ripple across terms, hardware, and monthly price, so adapting the agreement is a conversation, not a resale.
- As a customer choosing a service level, I hold two candidate agreements side by side and see exactly what differs and the monthly-price delta.
- As the developer of this prototype, I add a service variable or coupling constraint by editing the declarative model only (constitution #2) — no solver or agent code changes.

## Acceptance criteria

- GIVEN the extended product model, WHEN the model validator runs, THEN service-dimension variables (at minimum: service level, contract term, usage profile, connectivity package) and their coupling constraints pass the same validation as hardware variables.
- GIVEN a service-hardware coupling (e.g. a premium uptime level requires the connectivity package; a heavy usage profile excludes the light-duty drive), WHEN the user's outcome choices trigger it, THEN the consequence is propagated, shown as forced/greyed like any other constraint, and explained via named rules (constitution #6).
- GIVEN a fresh conversation, WHEN the user states needs in building and outcome terms, THEN elicitation targets outcome-level variables, every proposed candidate is solver-valid, and its price is a recurring monthly fee derived from the model (hardware amortization over term + service level + usage), never a one-off capex figure.
- GIVEN the canvas, WHEN a configuration is displayed, THEN outcome terms (performance, service level, term, monthly price) are grouped above the derived hardware spec, and hardware values remain directly editable with invalid options greyed out.
- GIVEN an active agreement, WHEN the user requests a different outcome mid-contract, THEN repair options are computed by the solver with ripple spanning both service terms and hardware, each grounded in named rules, and applying one updates the agreement atomically.
- GIVEN two candidate frames, WHEN they are compared, THEN the comparison lists only differing variables — service and hardware alike — with a correct monthly-price delta.

## Consequences for existing specs

- [Product model](../product-model/requirements.md): extended with service variables, coupling constraints, and monthly pricing data; the capex price field is replaced, not kept alongside.
- [Agent tools](../agent-tools/requirements.md) and [canvas](../configuration-canvas/requirements.md): elicitation prompt and canvas grouping updated; tool surface expected to be unchanged.
- [Demo scenarios](../demo-scenarios/requirements.md) (still draft): the four scenarios are recast to the job stories in `docs/discovery/jtbd/job-stories.md` before that spec is approved.

## Out of scope

Buy-vs-subscribe financial comparison; realistic pricing data (illustrative numbers suffice); simulated IoT/monitoring data or live telemetry; multi-unit fleet agreements; contract document generation; renewal-date/time mechanics (renewal is demonstrated as resumption plus revision, not as a calendared event).
