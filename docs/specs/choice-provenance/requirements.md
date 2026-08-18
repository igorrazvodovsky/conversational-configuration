# Choice provenance: the words behind the sheet

Status: draft — awaiting approval.

Provenance today is a three-way source badge (`user` / `agent` / `document`), and only the document source carries evidence: an RFQ-seeded choice cites its clause and quote, while a choice extracted from the customer's own prose keeps nothing of the words it came from — translation from utterance to `(variable, value)` discards the utterance. This feature extends the RFQ's quote discipline to the conversational channel: when the agent records choices from prose, it freezes the words it acted on into the choice record, and the canvas answers "why is this value here?" with those words. Serves discovery principles [the agent proposes and the user decides](../../discovery/principles/agent-proposes-user-decides.md) — whose test asks whether the user can always tell who chose a value; this sharpens *who* to *on what words* — and [the canvas holds the state and the chat explains it](../../discovery/principles/canvas-holds-state-chat-explains.md) — the words are something the customer needs to *check*, so they belong on the canvas; the argument stays narrated in chat. Tests the assertion [a choice that quotes its source can be revisited without re-arguing attribution](../../discovery/assertions/choices-that-quote-their-source.md).

## Stories

- As a customer, when I look at a value the sheet attributes to me, I can see the words that put it there — "you said: 'the building has eight floors'" — the same way a document-sourced value shows its clause.
- As a returning operator, weeks later in a different conversation — or with every conversation deleted — the words survive: they live on the agreement, not in a transcript.
- As a customer about to revise, the grounds tell me what kind of move I am making: changing a quoted value is going back on something I said; changing a document value reopens our tender; changing an agent value is just steering. These are three different conversations, and I can tell which one I am starting.

## Acceptance criteria

Recording:

- GIVEN the agent records choices because of the customer's prose (source `user`), WHEN the tool call is made, THEN each choice carries the customer's words it acts on — a short verbatim excerpt of the utterance — frozen into the choice record and written through to the workspace store with everything else.
- GIVEN a choice recorded through a structured dispatch (a canvas edit, an applied repair, a reconciliation move), WHEN it lands, THEN no quote is required — the gesture is its own ground — and rendering falls back to today's badge. Whether the structured message's own phrasing is worth carrying is a design decision, not a requirement.
- GIVEN the customer restates a decided variable in new words, WHEN the choice is re-recorded, THEN the new words replace the old: a choice carries its *current* grounds. Superseded words are history, and history belongs to the transcript and git, not the artifact. (The cross-channel register that would track supersession is out of scope below.)

Fidelity:

- GIVEN a recorded quote, THEN it is the customer's words, never the agent's paraphrase — verbatim, modulo trimming, from a user message in the conversation. The scenario harness can check this mechanically (the quote is a substring of a prior user message), which makes fidelity assertable without reading prose (constitution #9).
- GIVEN the customer's words state a need rather than a value ("mostly elderly residents" → an accessibility package), THEN the quote is still their words: the *mapping* may be the agent's translation; the *grounds* may not be. A quote must never contain words the customer did not write.

Rendering:

- GIVEN a user-sourced choice with a quote, WHEN the canvas renders provenance, THEN the badge popover shows the words, symmetric with the document badge's "your document, clause 4.2 — '…'". Rows without quotes render exactly as today.
- GIVEN any provenance popover, THEN it carries reference, not reasoning: words and clauses, yes; rules, trade-offs and justifications, no — those stay narrated in chat from solver cores ([the canvas holds the state and the chat explains it](../../discovery/principles/canvas-holds-state-chat-explains.md), constitution #6).

Durability:

- GIVEN quotes are recorded, WHEN conversations are switched or deleted, THEN every quote survives and re-renders — write-through and hydration via the existing configuration path (the [agreement-workspace spec](../agreement-workspace/requirements.md)), no new plumbing. Deleting every conversation loses the argument, not the words.
- GIVEN transitions that rebuild the configuration (revise, withdraw, fork, reconcile), THEN quotes on untouched choices survive. What a wholesale re-sourcing transition (`adopt_frame` rewriting every choice to `user`) does with them is design's to decide and record.

## Out of scope

- *Grounds for agent-sourced choices.* Constitution #6's discipline for discretionary defaults is D-rules — named heuristics in the product model — and the [product-model design](../product-model/design.md) records their absence as a standing gap, to close with the delegation machinery. Freezing the agent's free-composed reasons into durable state would entrench that violation, not close it. When D-rules land, the agent badge cites them the way conflicts cite R-ids, through the same popover this spec builds.
- *A cross-channel stated-needs register.* Generalising the RFQ's deviation register to conversational statements — every stated need diffed against the live agreement — founders on reference semantics: that register works because the document is an immutable counterparty position, while the customer's own past statement is superseded by their later one, not deviated from. Recorded as an open question in [problem-framing](../../discovery/problem-framing.md) §5; it needs its own discovery pass before a spec.
- *Links into the transcript.* Message ids and conversation positions are ephemeral by design; grounds are frozen words in state, never pointers at chat.
- *Quotes on document choices.* Already carried by the [rfq-reconciliation spec](../rfq-reconciliation/requirements.md)'s frozen block; unchanged here.
