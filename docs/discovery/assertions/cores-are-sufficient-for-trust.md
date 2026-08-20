# Unsat cores are sufficient for trust

Explanations grounded in unsat cores are sufficient for trust, with no hallucinated justification needed.

*Evidence today.* Constitution #6, and consensus in the configuration literature.

*How we would know it is wrong.* Rule-level explanations read as machine noise and users want a narrative the solver cannot supply. In a walkthrough this would appear as the user re-asking in chat what the cards already show ([../models/Ripple storyboard.md](../models/Ripple%20storyboard.md) §5).

*Status.* The 2026-08-20 walkthrough could not put this under test, because cores mostly do not reach the customer. Repair cards and RFQ deviations are the only payloads carrying rule labels; ruled-out options, forced values and rejected batches arrive with no rule, or with prose the model composed from state. The failure mode named above cannot be observed while the cards have nothing for the customer to re-ask about. What the walkthrough does establish is that where labels are shown they are the model's own and survive the check ([every refusal names the rules that caused it](../principles/refusals-name-their-rules.md)). The obstacle was removed the same day: cores now reach every refusal the customer meets, so the claim is under test for the first time and the failure mode above is observable.

## Related

- [../problem-framing.md](../problem-framing.md) §4 — the assertion index
- [every refusal names the rules that caused it](../principles/refusals-name-their-rules.md) — the principle it licenses
- [../../research/solver-choice.md](../../research/solver-choice.md) — what Z3 actually licenses the interface to claim
