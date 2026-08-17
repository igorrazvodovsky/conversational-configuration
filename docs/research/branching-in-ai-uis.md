# Branching in AI interfaces

Status: retrieved 2026-08-16. Surveys branching as an AI/agentic interaction pattern and reads it against [parallel drafts](../specs/parallel-drafts/requirements.md), approved the same day.

*This note's evidence is weaker than the rest of the folder, and the weakness is not evenly spread.* Of the AI-side sources, two are pattern libraries that name examples without an evidence base, one is a starter kit rather than a shipped product decision, and only ChatGPT's and Manus's branch features are documented shipped behaviour. No tool was exercised hands-on; behaviour is read from vendor posts and trade coverage, and inferences are marked. The pre-LLM sources in §3 are peer-reviewed, their figures *retrieved* from the papers themselves, and the verdict rests on them rather than on the pattern libraries.

## Verdict

Branching in AI interfaces branches the *transcript*. Where an artifact branches too, it branches coupled to the transcript — VS Code and Cursor checkpoints restore conversation and files together ([living-document-undo](living-document-undo.md)) — and no agentic tool surveyed branches a document while leaving the conversation unpinned from the branch. [Parallel drafts](../specs/parallel-drafts/requirements.md) does exactly that: the document forks, the agent acts on whichever draft is current, and conversations stay views onto the workspace rather than onto a draft. That combination is unshipped, registered as [L6](gaps.md#l6), and it follows from the [canvas being the durable locus of state](../discovery/assertions/canvas-is-the-durable-state.md) rather than from anything about branching. Branching a document is of course routine outside AI, which is the point of §3.

The genre's design advice mostly transfers, and the spec meets it but for the merge prescription, which it refuses and which nothing in the genre ships either (§2, §4).

## 1. What ships

| Tool | What forks | Where the fork is taken | Lineage shown | Merge |
|---|---|---|---|---|
| ChatGPT, *Branch in new chat* (Sept 2025, [coverage](https://tech.yahoo.com/ai/articles/openai-chatgpt-branching-feature-lets-043000163.html)) | The conversation | Hover any message | A label naming the origin | None |
| Manus *Branch* ([blog](https://manus.im/blog/manus-branch)) | The session, inheriting instructions, files and history | Hover any message | A breadcrumb naming the origin point; branches may nest | None |
| Claude and ChatGPT edit-and-retry, Cursor chat forks ([thread-branch pattern](https://www.aiuxplayground.com/pattern/thread-branch/)) | The conversation from an edited turn | The turn being edited | Turn-level navigation | None |
| VS Code and Cursor checkpoints ([living-document-undo](living-document-undo.md)) | Conversation *and* files, together | A request boundary | The chat itself | Not applicable — restore, not fork |
| [tldraw branching chat](https://tldraw.dev/starter-kits/branching-chat) | Messages as nodes on an infinite canvas, wired by ports | Anywhere; the user draws the edge | The graph is the lineage | Convergent edges are possible in the graph; no semantics for them |

Two things are uniform. The fork is taken at a *point in visible history* — a message the user can see and hover — and the fork carries context forward without merging back. Manus states the isolation as a value: each branch keeps a "clean focus" so divergent work does not cross-contaminate. The tldraw kit is a demo of the geometry rather than a product decision, and it is the only one where the branch structure is itself the primary surface.

## 2. What the pattern libraries prescribe

[Shape of AI](https://www.shapeof.ai/patterns/branches) names three modalities — chat branches, variant branches generated automatically for comparison, and workflow branches that split a graph at a node — and four design considerations: source traceability back to the origin, branching as a first-class action at obvious touchpoints, independent progression with the inherited context shown and customizable, and non-destructive merging that adopts an answer into the main thread while keeping a link back. It flags compute cost as the pattern's price. The [AI UX Playground](https://www.aiuxplayground.com/pattern/thread-branch/) adds three failure modes: rewriting a transcript silently with no branch marker, losing attachments or artifacts across the fork, and showing branches as raw ids rather than as something a person can tell apart.

Scored against the spec:

| Prescription | Parallel drafts |
|---|---|
| Branches are named, not raw ids | Met, and more strictly: a draft has a name from the moment it exists, supplied by the agent from the conversation |
| Nothing is lost across the fork | Met, and it is the spec's reason for existing — a frame dropped provenance, candidate and register state, and a draft carries the whole configuration |
| Source traceability to the origin | Met since 2026-08-16: a draft records the id it was forked from (§4) |
| Branching is a first-class action at an obvious touchpoint | Met in kind, not in place: the touchpoint is the current document, not a point in history, because the canvas renders no history for a finger to land on (§4) |
| Non-destructive merge | Deliberately excluded; the genre ships no merge either (§4) |
| Cost | Not a compute cost here. A fork copies a configuration; the price is the reader's, in a switcher that grows |

## 3. The pre-LLM evidence, which is the stronger half

Branching a document is ordinary outside AI — version control does it, Figma ships it for design files, and [CAMBRIA](https://link.springer.com/chapter/10.1007/978-981-10-5197-5_5) does it for CAD alternatives. What is worth retrieving is not that it can be done but whether holding alternatives live measurably helps, and two studies answer that with results the AI pattern libraries do not have.

- *Subjunctive interfaces.* Lunzer and Hornbæk, [TOCHI 2008](https://dl.acm.org/doi/10.1145/1314683.1314685), extend applications with "parallel setup, viewing and control of alternative scenarios" across information access, real-time simulation and document design — the same mechanism parallel drafts describes, one architectural layer lower. The empirical record is two studies over a census browser and is *more cautionary than the headline*. Study #1 found higher satisfaction, significant on four of five questionnaire questions, but *no* reduction in task completion time, "mainly because some subjects encountered problems in setting up and controlling scenarios". Only after the interface was redesigned and subjects had five sessions of practice were they roughly 27% faster than on the single-scenario baseline (session 5, M = 79s against 109s, F(1,6) = 208.87, p < .001), with strategy-formation problems diminishing as they got better at controlling it (*retrieved* from the [paper](https://www.kasperhornbaek.dk/papers/TOCHI2008_SubjunctiveInterfaces.pdf) §§4.5, 6.1–6.3). The transfer is close: an application whose user sets up and compares alternative parameter scenarios is what the configurator is. So is the warning — the cost of managing the alternatives lands on the interface, and a first-cut mechanism can consume the benefit it creates.
- *Parallel prototyping.* Dow et al., [TOCHI 2010](https://hci.stanford.edu/publications/2010/parallel-prototyping/ParallelPrototyping2010-final.pdf): novice designers who produced five web ads in parallel before any feedback outperformed those who produced them serially with a critique after each, on every performance measure — click-through, time on the client's site, and ratings by clients and ad professionals — and their prototype sets were rated more diverse. Parallel participants gained task-specific self-efficacy and serial ones did not; in post-task interviews nearly half of the serial participants reported negative reactions to critique and none of the parallel ones did. *The transfer is an assumption*, of the kind [L4](gaps.md#l4) names for the food-labelling evidence: these were designers producing prototypes they owned, not buyers holding two draft agreements one of which they will sign. What plausibly carries is the critique finding, since the operator's characteristic move is reacting to a proposal, and a proposal that is one of two is easier to reject than a proposal that is the only one on the table.
- *Frame tracking*, already in the base ([interaction-literature](interaction-literature.md) thread E, [L3](gaps.md#l3)): the dialogue-systems answer to the same problem, a decade old and without a UI.

Read together with §1, the AI-side discourse is largely restating subjunctive interfaces about transcripts. That is the [L3](gaps.md#l3) shape repeating one level up, and it is why this note's thin AI-side evidence does not weaken the direction: the direction was never resting on the pattern libraries.

## 4. What this means for the prototype

Three findings bore on [parallel drafts](../specs/parallel-drafts/requirements.md) before it was built. None of them changes what the feature is, and all three were carried into [its design](../specs/parallel-drafts/design.md) on 2026-08-16; they are recorded here as the reasoning behind decisions the spec now states flatly.

*A draft recorded no parent, and source traceability is the genre's first design principle.* Manus prints a breadcrumb, ChatGPT prints an origin label; the store shape was `{id, name, configuration, history}`, with no pointer to the draft a draft was copied from. This matters here more than it does in a chat tool, because provenance at the level of the individual value is already a project commitment ([a choice that quotes its source can be revisited without re-arguing attribution](../discovery/assertions/choices-that-quote-their-source.md)), and a document whose every value says where it came from while the document itself does not is inconsistent. A `forkedFrom` id is the whole of it, and the [design](../specs/parallel-drafts/design.md) now carries one.

*Staleness is keyed on configuration content, and draft identity is not recoverable from content.* `use-workspace-attachment.ts` decides whether a reopened conversation's cards may still act by comparing the thread's checkpoint configuration against the workspace's (`want`, line 206). Under drafts the right-hand side becomes the current draft's configuration, and immediately after a fork the two drafts are byte-identical by construction. A card left live in one conversation, with the fork then taken in another conversation of the same workspace, therefore survives the check on reopening and applies to draft B. Forking in the same conversation is safe for an unrelated reason — the fork's own visible message makes the cards above it inert — which is what makes the defect easy to miss in testing. The isolation Manus states as its guarantee is what unpinned conversations give up, and this is where it shows. The fix is cheap because the design already puts `current_draft_id` in agent state as a chrome mirror, so it is in the checkpoint: compare the pair, not the configuration alone, which the design now specifies. The same hook's `seed()` writes agent state from the record and must write both new mirrors too, or the canvas switcher renders from an empty list until the first tool call. The design's claim that the existing tools and surfaces are untouched holds for the agent; the attachment hook is where it does not.

*Forking from a point in history has no surface to hang on, and that is the reason to reject it, not complexity.* All four references fork at a visible message. The equivalent move here would be forking at history entry *k* rather than at the current state, and it cannot be offered because the canvas renders no history: [undo](../specs/undo/requirements.md) excludes a visible history-timeline UI, and the transcript is not the state ([canvas is the durable locus](../discovery/assertions/canvas-is-the-durable-state.md)). Fork-from-current is what a document-side branch can offer, and undo remains the way back to an earlier state of one document. It is named in the spec's alternatives, because a reader who knows the pattern will ask.

Two further observations, neither of them a defect:

- *No merge, and the genre agrees.* The spec excludes merging drafts, citing the partial-acceptance half of [E6](gaps.md#e6). Shape of AI prescribes non-destructive merge; nothing surveyed in §1 ships it. The exclusion is safe, and the prescription is aspirational rather than observed.
- *The measured cost of parallel scenarios is the cost of controlling them.* Lunzer and Hornbæk's first study got satisfaction and no time saving, because setting up and steering the scenarios ate it. The spec's controls are two structured sentences and a switcher in the canvas head, which is about as cheap as the mechanism gets, and the [design's](../specs/parallel-drafts/design.md) reading of proliferation — that if drafts accumulate unread the affordance is wrong rather than the count — is the right thing to watch during the walkthrough ([phase-plan](../discovery/phase-plan.md) task 6).
- *A conversation will cross drafts, and the switch message is what keeps that legible.* Because conversations are views onto the workspace rather than onto a draft, one transcript can hold turns that acted on two documents. The decision to dispatch switching as a *visible* structured message is what stops that being silent, which is the thread-branch pattern's first named failure mode. The spec now gives that as a reason for the visibility, beside the one it already had.

## 5. What this does not change

- [undo](../specs/undo/requirements.md): its exclusion of branching history stands, and the survey supports it. Every tool in §1 keeps the history within a branch linear and puts the branching one level up, in what the history belongs to.
- [suggested-moves](../specs/suggested-moves/requirements.md): whether a *fork and compare* pill is offered is unaffected; the genre puts the branch control on the object, which is where the canvas switcher already is.
- [demo-scenarios](../specs/demo-scenarios/requirements.md): no scenario changes on this note's account.
- The [surface architecture](../discovery/models/Surface%20architecture.md): the tldraw geometry — conversation as a node graph on an infinite canvas — is the one branching presentation that would reframe the surface, and it is incompatible with a decision already taken, that the canvas holds the agreement rather than the conversation.

## Related

- [gaps.md](gaps.md#l6) — the register entry this note opens, and the [E6](gaps.md#e6) half it touches
- [../specs/parallel-drafts/requirements.md](../specs/parallel-drafts/requirements.md) — the spec this was read against
- [living-document-undo.md](living-document-undo.md) — the same survey method over the reversal question; the checkpoint row in §1 comes from it
- [interaction-literature.md](interaction-literature.md) thread E — frame tracking, and the nonlinearity thread this extends
