# Offline checks: what runs without a provider key

Status: approved and built 2026-08-20. Every criterion here is met. The two findings the first pass recorded are closed: the grammar is compared by building it on both sides rather than by reading source text, and the system prompt has a rule for every element of it. That prompt edit is the one thing here not verified against the live agent, which needs the conversation checks ([design.md](design.md)).

These are the counterpart to the [conversation checks](../conversation-checks/requirements.md). Those drive the live agent and cost money; these run offline, in seconds, over everything the agent's behavior rests on.

Constitution #9 assigned solver and model logic to automated checks and everything else to running the app, and the second half has been carrying more than it can. The frontend holds the message grammar that turns a click into a tool call, the value resolution and formatting the agreement document renders from, and the geometry the car is drawn from. None of it is UI, and all of it is invisible to every other check in the repo.

Serves discovery principle [the canvas holds the state and the chat explains it](../../discovery/principles/canvas-holds-state-chat-explains.md): the canvas can only hold the state if what it renders is what the agreement says and what it dispatches is what the agent hears, and both are computed by code no check reads. The dispatch half also serves [revision is an ordinary move, not a restart](../../discovery/principles/revision-is-an-ordinary-move.md), because a revision is ordinary only while the sentence a card mints is a sentence the agent maps onto one tool call.

## Stories

- As a developer changing the product model, I learn immediately when a renamed option code has silently emptied the render or a display label, instead of finding a blank canvas in the app.
- As a developer changing the message grammar on either side of the language boundary, I learn that the two sides disagree from a failing check, rather than from a card that dispatches a sentence the agent no longer recognizes.
- As a developer changing frontend logic, I can run the checks and a typecheck before opening the app, and CI runs both on every push.

## Acceptance criteria

### The frontend's own logic

- GIVEN the pure logic under `src/lib/` and `src/components/config-canvas/render/`, WHEN the checks run, THEN they cover it without rendering a component: the message builders, value resolution, the layer mapping, price and footprint formatting, term arithmetic, the suggested moves, the workspace record readers, the attachment readers, and the car and shaft geometry.
- GIVEN a check on formatting or arithmetic that the agent also performs in Python, WHEN both sides are exercised on the same input, THEN they are asserted to agree, because the customer reads one figure on the sheet and hears the other in chat.
- GIVEN the checks, WHEN they run, THEN they need no browser, no DOM and no running agent, and complete in seconds.

### The couplings that cross the boundary

- GIVEN the structured message grammar, WHEN the checks run, THEN the frontend and the agent build every sentence from the same inputs and the two are asserted equal string for string, so a rewording on either side fails rather than degrading a card.
- GIVEN the system prompt, which is prose and can only be read, WHEN the checks run, THEN every element of the grammar is asserted to have a rule there, none exempted, and each rule's wording is asserted against the sentence the frontend actually builds.
- GIVEN the product model, WHEN the checks run, THEN every variable, option code and group the frontend addresses by name is asserted to exist in it, and every option code the render parses is asserted to still parse.
- GIVEN the two hand-maintained declarations of the configuration shape, a TypeScript interface and a Python `TypedDict`, WHEN the checks run, THEN the frontend's members are asserted against what the agent declares and against the keys of an agreement the agent actually built.

### Running them

- GIVEN the repo, WHEN a developer runs `npm test`, THEN the frontend checks run; WHEN they run `npm run typecheck`, THEN the configurator's TypeScript is checked.
- GIVEN a push or a pull request, WHEN CI runs, THEN it runs the Python suite, the model validator, the frontend checks and the typecheck — and not the conversation checks, which need a provider key and cost money.

## Out of scope

Component and DOM tests, browser automation, and visual regression: UI behavior stays verified by running the app, and constitution #9 keeps it there. Coverage thresholds. Testing the CopilotKit packages, or the dead starter code the repo still carries.
