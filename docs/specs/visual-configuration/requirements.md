# Visual configuration

Status: implemented 2026-08-19 ([design](design.md)).

The schedules layer states the hardware in catalogue nouns: `1600 × 1400 mm`, `centre-opening, 4 panels`, `brushed stainless steel`. Someone who has never bought an elevator can't picture any of it, which is the articulation barrier appearing on the output side — the side [elicitation uses the building's vocabulary, not the catalogue's](../../discovery/principles/elicit-in-the-buildings-vocabulary.md) doesn't reach, because it governs what we ask rather than what we show back. A rendering of the configured car is the schedules said in the building's terms.

It is also a second genre for the same agreement, so it bears on [the representation of the agreement selects the user's moves](../../discovery/assertions/representation-selects-moves.md), which names the shared visible object as the deictic ground of the dialogue, and a picture is the most literal form that ground takes. That assertion's test is recorded as outstanding, and a second representation gives it the comparison it lacks: whether the cabin variables are touched at all once they are visible.

CPQ tools sell this as *visual configuration*: a WebGL rendering that updates on every selection, orbitable, with the still image embedded into the quote. Beneath it they sell a per-product 3D content pipeline fed from CAD. This spec takes the interaction and rejects the pipeline, for the reason the first scope decision gives.

## Scope decisions

- *Geometry is procedural, not an asset.* An elevator car is a rectangular box and every dimension the render needs is already a literal millimetre value in the product model, so the scene is computed from the configuration. A downloaded mesh is the rejected alternative, and it fails on the requirement that matters: a static model shows the same cabin for `1100 × 1400` and `2100 × 1600`, which misrepresents the agreement rather than illustrating it. Procedural geometry is also what makes the feature affordable, because what costs money in commercial visual configuration is authoring one model per product, and a box needs none.
- *The viewer is a projection, and read-only in this change.* It is a pure function of `agent.state.configuration`, exactly as the document is: no tool, no agent change, no store, and no second record of anything (constitution #3). It reads the same `liveValue` the document renders from, so the picture always agrees with the document, and it takes the configuration as a parameter rather than a subscription — which the page's rules require, and which is what would later let a chat card render the state its own payload carried. It carries no provenance and no status: who chose a value and what it costs are the document's answers, and the render may not compete to give them ([the canvas holds the state and the chat explains it](../../discovery/principles/canvas-holds-state-chat-explains.md)).
- *The render is a second mode of the canvas, and the document is what a workspace opens on.* Every variable it depicts — car size and height, the doors, the cabin — falls in the schedules layer, which the [agreement-document spec](../agreement-document/requirements.md) collapses by default and keeps one expansion away, on the argument that the operator's agreement isn't a parts list. The render illustrates that annex, so it can't stand above the recitals without asserting an ordering the document has already rejected; from the agreement's point of view it is genuinely not the most important thing on the page. It is reached by a deliberate move instead, from a control at the canvas head and from the schedules layer whose content it depicts. That spec's rule that the parameter sheet *is* the schedule layer rather than a second view survives this: a sheet and a document are two text-shaped renderings of one content, where a render states what no layer states in words, which is also what makes it a peer representation worth testing rather than a decoration.
- *Every rendered part names the variable it stands for.* The scene is built from parts, each declaring the variable it depicts: rear wall to `wall_finish`, floor to `floor`, door leaves to `door_type` and `door_finish`, and so on. Read-only, this only selects a material, but it is the seam that makes the next two moves cheap rather than a rebuild — picking a surface to edit it, and letting the shared-attention reveal light up the part that just changed. Designing for them now costs one field per part, and retrofitting them costs the scene.
- *Viewpoints are a named, extensible set over one scene, defaulting to the outside.* Three were sketched. *Outside as an object* — three-quarter, near side open, doors standing open — shows the most variables at once and is the default. *Inside at eye height* puts wall finish, mirror, handrail and the panel at reading distance. *The car within its shaft* shows the clearance two independent choices produce, and sells nothing until someone is arguing about a shaft. The requirement is the set and the switch between its members rather than the count: one scene graph, several framings.
- *Fidelity comes from lighting and materials, not from geometry.* A box reads as a lift cabin because of a reflective mirror wall, brushed metal under an environment map and ceiling downlights, so that is where the effort goes. The material choices are design's, in [design.md](design.md) decisions 5 and 6.
- *The product model gains cabin height, because the gap is real.* Nothing in the model carries car clear height or door height, and a cabin can't be drawn without both. Rather than invent them in the viewer, `car_height` joins the `dimensions` group as an ordinary variable, and door height derives from it rather than becoming a second term the customer has to decide. It earns its place independently of the render: a taller car demands more headroom, so cabin height becomes a claim on the shaft rather than a cosmetic choice — a ripple with a named rule behind it, in the dimension the speed rule and the modernization ceiling already contend over.
- *The render never asserts what the agreement doesn't say.* `travel` and `stops` are ranges in the model, so no viewpoint draws a stack of floors or a section through the building. Those would put a number on screen that no clause supports ([always show a valid whole](../../discovery/principles/always-show-a-valid-whole.md), constitution #6).

## Stories

- As a design specifier, when the schedules say `1600 × 1400 mm` and `centre-opening, 4 panels`, I see what that is instead of decoding it, and I notice a car that is wrong for my lobby while it is still cheap to change.
- As a customer choosing finishes, I see the difference between laminate and brushed stainless before I agree to pay for it. The cabin group is where prose conveys least and a picture conveys most.
- As either party in the conversation, when a choice lands the picture moves with it, so the thing we are discussing is on screen to point at rather than held in two heads.

## Acceptance criteria

Projection:

- GIVEN any configuration, WHEN the viewer renders, THEN it draws from the same live values the document draws from, chosen values and the current candidate's proposals alike, and it changes within the same commit as the document when a tool lands.
- GIVEN an agreement with nothing set, THEN the viewer shows an empty state rather than a guess.
- GIVEN a draft switch, an undo, or a redo, THEN the render follows, because it holds nothing of its own.

What is shown:

- GIVEN `car_size`, `car_height`, `door_width` and `door_type`, THEN the car's proportions, its door opening and its panel count and split are drawn to scale from those values, and the three door types are visually distinguishable from the default viewpoint.
- GIVEN `wall_finish`, `floor`, `door_finish`, `cop`, `mirror` and `handrail`, THEN each is legible in at least one viewpoint: the mirror at its stated height on the rear wall, the handrail on one or three walls as chosen, and a panoramic glass back wall as glass.
- GIVEN a value that changed, THEN nothing about the render claims authority the document holds: no prices, no badges, no rule names.

Placement:

- GIVEN a workspace is opened, THEN the canvas shows the agreement document rather than the render. The render is reached by a deliberate move, because from the agreement's point of view it is the annex illustrated rather than the headline.
- GIVEN the render is shown, THEN it occupies the canvas as a mode of it rather than a region inside the document, and returning to the document finds its scroll where it was left.
- GIVEN the schedules layer, THEN it carries the way to the render, since that is the layer whose content the render depicts. The shared-attention reveal may expand a schedule holding that entry point, as it already expands a schedule holding a revealed value, and it may never enter the render itself.

Viewpoints:

- GIVEN the render mode is entered, THEN it shows the outside view, and the user can orbit and zoom it.
- GIVEN more than one viewpoint exists, THEN switching between them is one control, and adding a further viewpoint is a data addition rather than a change to the scene.

The model:

- GIVEN `car_height` is added, THEN the model validator passes, the solver needs no code change (constitution #2), and the new variable appears in the schedules layer through the existing group mapping with no canvas change.
- GIVEN a cabin height the chosen headroom can't accommodate, THEN the solver refuses it with the new rule named, like any other conflict; GIVEN a modernization, THEN the heights the existing shaft rules out are unavailable for the stated reason.

The page:

- GIVEN the workspace page, THEN the render mounts client-side only, mints no React ids in the hydrated tree, and subscribes to no agent state of its own. It takes the configuration from the canvas, which already holds it, per the [chat-surface](../chat-surface/design.md) rules.
- GIVEN the canvas is showing the document, THEN the render costs nothing: no WebGL context and no render loop behind it.

## Relationship to other specs

- [agreement-document](../agreement-document/requirements.md) owns the layer mapping and the edit grammar, and its layering settles this spec's placement, as the scope decisions argue. The schedules layer gains the way to the render. The grammar and the `OptionEditor` are untouched, and are what an in-render editor would reuse if it is ever built.
- [chat-surface](../chat-surface/requirements.md) is the constraint this spec inherits. It makes a surface's geometry a user-chosen mode under one rule — *a mode is a view, never a stage*, user-invoked, one click back, never the app's choice — from [configuration can start from any variable, in any order](../../discovery/principles/start-from-any-variable.md). A second mode on the canvas obeys it: nothing enters or leaves the render on the user's behalf, and the shared-attention reveal in particular may not switch the canvas to show what it just changed. The two mode systems are orthogonal, and a chat in full screen hides the canvas and takes the render with it, unchanged. The rule is also the strongest argument for the in-render editor named in *Out of scope*: a read-only mode is one the operator can't work in, so it stays somewhere they visit rather than somewhere they are left.
- [service-agreement](../service-agreement/requirements.md) applies the same layering from the other direction: outcome terms above derived hardware, with elicitation aimed at outcome-level variables. Cabin height is derived hardware rather than an outcome term. It inherits the don't-volunteer treatment without a prompt change, because the prompt names hardware by group — "dimensions, doors, cabin finishes" — rather than by variable. That only settles what the agent raises unprompted. Nothing in the completion path distinguishes outcome-level variables from derived ones, so whether an unanswered cabin height should reach the customer as a question is [open-points](../open-points/requirements.md)' call rather than this spec's.
- [product-model](../product-model/requirements.md) gains `car_height` in the `dimensions` group and one rule relating it to headroom. Both are data, but three enumerated full assignments in Python go stale with them and have to be extended in the same change: the validator's calibration reference, which fails loudly when a variable is missing from it, and the two test fixtures that assert a complete configuration, one of them by set equality against the model's variables.
- [environmental-footprint](../environmental-footprint/requirements.md): a taller cabin is more material, so `car_height` carries `co2` as well as `price`. The baseline height carries neither, because the validator holds the reference configuration's embodied carbon to a band around the EPD anchor, and a non-zero baseline would move it.
- [solver-service](../solver-service/requirements.md) is unchanged. The new rule is a table constraint over two variables, which the service already supports, and the new variable enters both completion objectives like any other.
- [shared-attention](../shared-attention/requirements.md) is unchanged, and constrained, as the chat-surface entry describes for the reveal. The part-to-variable mapping is what a reveal would later need to light up a surface, and an editor opened from the render would report itself through `OptionEditor` unchanged. Whether entering the render should publish as attention is that spec's question, not answered here.
- [suggested-moves](../suggested-moves/requirements.md) gains no new conversational move. Switching representation is UI chrome, like the chat's mode control, and deliberately gets no pill.
- [rfq-reconciliation](../rfq-reconciliation/requirements.md) is unaffected. The render carries no provenance and no deviation marks by decision, so a requirement the agreement doesn't meet stays visible where that spec put it, on the term or the schedule row. A prescriptive RFQ that speaks to cabin height needs nothing new.
- [open-points](../open-points/requirements.md), a draft spec: a new variable is a new question the agreement can be missing an answer to. No mechanism changes, but it inherits the question the service-agreement entry raises, whether a derived hardware value left unanswered is an open point the customer should see, or one the agent fills without asking.
- [conversation checks](../conversation-checks/requirements.md): the render asserts nothing the harness can read, because it makes no tool call and changes no state. It is verified by running the app (constitution #9). The cabin-height rule is assertable and may be worth a turn in an existing scenario.

## Out of scope

- Editing from the render, such as picking a wall to change its finish. It is designed for in the scope decisions and deliberately unbuilt: the presentation is what was asked for, and the seam costs one field per part to keep open.
- Still-image export into the agreement, the feature commercial tools use to put the configured product into the quote. It fits this project's genre well and belongs in a later change, with one caveat that has to be honoured from the start or the capability is silently lost: the WebGL context has to be created so that its buffer can still be read when the capture happens.
- Photorealism and any CAD-derived model pipeline, for the reason the first scope decision gives.
- Placing the car into a floor plan of the building.
- A section through the building, a floor stack, and anything else that would need `travel` or `stops` as a number.
- Two drafts rendered side by side. Comparison lives in chat and its layout is an open discovery question, and a second render isn't the way to settle it.
- The render appearing in chat cards. This is excluded rather than dismissed: a card payload is assertable by the conversation checks where a canvas surface isn't, so this is how the conversational form's support for the flow would actually be tested. Two things keep its cost low and are settled here — the viewer takes a configuration as a parameter, so a card renders the state its own payload carried rather than the live one, and that payload needs only the ten values the render depicts. The obstacle is that live WebGL contexts are capped per page and the oldest are dropped, so a transcript of live canvases would silently blank its older cards; a card carries a still image instead, which makes it the same work as the export. What is undecided is principle rather than cost: a render of the *current agreement* in the transcript is state in the chat, which [the canvas holds the state and the chat explains it](../../discovery/principles/canvas-holds-state-chat-explains.md) rules out, while a render of a proposal or a comparison is the chat explaining an offer, which it allows. Cards depict what is offered, never what is agreed.
- Animating the doors between states. They render open, and motion is a later refinement with no requirement resting on it.
