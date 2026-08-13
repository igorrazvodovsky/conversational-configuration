
Answers *what surfaces exist, and in what form does agent-generated UI arrive?* — the decision underneath [the canvas remembers, the chat explains](../principles/canvas-remembers-chat-explains.md) and the frame inside which [conversation-moves.md](Conversation%20moves.md) §1 assigns each move's artifact to a pane.

## 1. The option field

The choice is two-dimensional — *where* agent output lives (the geometry of surfaces) and *how* its form is decided (the mechanism of agent-generated UI). The field is the industry's, not any one framework's: CopilotKit's [generative-UI catalogue](https://www.copilotkit.ai/generative-ui) names implementation paths within it, but the geometry half is older and wider than that catalogue, and the direction's own concept — *the living document* — is a named pattern in it with shipped exemplars.

### Geometry — where agent output lives

| Pattern                                       | What it would mean here                                                                      | Verdict                                                                                                                                                                                                                        |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Threaded chat, transcript as the only surface | Everything the agent produces (controls, repairs, comparisons) renders as transcript cards   | Set aside. The transcript becomes the record — the framing's first failure mode — and [the canvas is the durable state](../assertions/canvas-is-the-durable-state.md) cannot be exercised                                                                                                                   |
| Chat + living document                        | Split workspace: chat one side, a durable object the other, both parties acting on it        | *Chosen.* It is the concept itself. What ships under this pattern grows prose and code artifacts; a structured, solver-checked agreement as the artifact is the part nobody has shipped ([gaps L1](../../research/gaps.md#l1)) |
| Document-first, assistant embedded            | The document is the whole surface; the assistant is invoked in place, conversation transient | Set aside as the primary shape — it is *the spreadsheet that talks* ([direction.md](../direction.md) §1), giving up elicitation. Its kept half binds here: the canvas must work with chat idle, for the returning operator     |
| Suggestion layer on the document              | Agent proposals arrive as pending marks on the agreement, accepted or rejected in place      | Not a rival geometry but the pattern the chosen one borrows for [changing your mind is not a restart](../principles/revision-is-not-a-restart.md) and [the agent proposes, the user disposes](../principles/agent-proposes-user-disposes.md): repairs-as-proposals, provenance tags and one-move reversal are redlining moves. Named so it can be studied deliberately rather than reinvented         |
| Chatless — agent acts through the app UI      | No chat surface; the agent manipulates the configurator directly                             | Set aside. It removes the channel that answers the articulation barrier, and [generated controls beat free text](../assertions/generated-controls-beat-free-text.md) becomes untestable                                                                                                                             |

### Form — how agent-generated UI gets its shape

| Mechanism | What it would mean here | Verdict |
|---|---|---|
| Open-ended — the model composes markup per turn | The boilerplate's `generate_a2ui` | Set aside on constitution #1 and #5: an LLM composing option lists can offer values the solver never vetted |
| Declarative — the agent returns a schema the frontend renders | The boilerplate's A2UI path; server-driven UI generally | Available, unused. Held in reserve for a card whose shape is not known in advance |
| Static — hand-written components the agent selects by tool | Payload computed server-side from solver state | *Chosen* for every configurator card |

The chosen patterns compose: the living document is the geometry, static components are the form, and the suggestion layer is the grammar of the agent's proposals on the document. Each chosen pattern is also now a research target — how its mature implementations handle the mechanisms this concept needs is retrievable evidence, registered as [gaps E6](../../research/gaps.md#e6).

## 2. What follows from the choice

*Valid by construction.* Each card's payload is computed from solver state at call time — `ask_choices` returns per-variable options with invalid values flagged for greying in place and the cheapest completion marked; repair cards carry their own ripple. What the user can click is what the solver admits, which is how constitution #5 survives contact with a clickable surface.

*One grammar.* Every activation — a chip, a repair card, a canvas row edit — dispatches the same visible structured user message through the same validated path. The alternative, a silent programmatic run, was set aside: faster, but it hides user actions from the dialogue and creates a second interaction grammar (the [canvas design](../../specs/configuration-canvas/design.md)).

*Presentation stays out of product data.* Which control renders a variable is a server-side heuristic over the model's structure (ordered groups → scale, small domains → chips, consequence-heavy → detail list, several at once → form card), not metadata in the product model. Constitution #2 holds: adding a component needs no UI decision.

*Controls accelerate, never gate.* Free text remains available for every question a control answers. This is what keeps the pattern a conversation with controls in it rather than a form with a chat window attached — the failure mode [generated controls beat free text](../assertions/generated-controls-beat-free-text.md) names.

*Where each artifact lives* is settled per-move in [conversation-moves.md](Conversation%20moves.md) §1: the artifacts moves produce — a pending question, an active repair set, a comparison — are document-side objects that appear, evolve and retire on the canvas, with chat carrying their narration. The built frontend still returns all three as chat cards; realigning it is a pending amendment to the [canvas](../../specs/configuration-canvas/requirements.md) and [nonlinear interaction](../../specs/nonlinear-interaction/requirements.md).

## 3. Edges this model does not settle

- The per-artifact form on the canvas, and the status vocabulary it uses. Canvas anatomy's question.
- Whether the declarative path earns a place after all — a footprint or price-breakdown card whose shape varies with the configuration is its natural candidate (the [footprint spec](../../specs/environmental-footprint/requirements.md)).
- What the split does on a small screen. In app mode the panes are 50/50 and below `lg` the canvas takes the full width with chat hidden, so the pattern degrades to one surface at a time — untested against any principle.
