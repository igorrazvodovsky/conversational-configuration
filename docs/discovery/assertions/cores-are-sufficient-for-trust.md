# Unsat cores are sufficient for trust

Explanations grounded in unsat cores are sufficient for trust, with no invented justification needed.

*Evidence today.* Constitution #6, and consensus in the configuration literature.

*How we would know it is wrong.* Rule-level explanations read as machine noise and users want a narrative the solver can't supply. In a walkthrough that would appear as the user re-asking in chat what the cards already show ([Ripple storyboard](../models/Ripple%20storyboard.md), *Failure signals for the walkthrough*).

*Status.* The 2026-08-20 walkthrough couldn't put this under test, because cores mostly didn't reach the customer. Repair cards and RFQ deviations were the only payloads carrying rule labels, and ruled-out options, forced values and rejected batches arrived with no rule, or with prose the model composed from state. The failure mode can't be observed while the cards have nothing for the customer to re-ask about. What the walkthrough does establish is that where labels are shown they are the model's own, and they survive the check ([every refusal names the rules that caused it](../principles/refusals-name-their-rules.md)). The obstacle was removed the same day: cores reach every refusal the customer meets, so the claim is under test for the first time and the failure mode is observable.

## Related

- [The assertion index](../problem-framing.md)
- [every refusal names the rules that caused it](../principles/refusals-name-their-rules.md) — the principle it licenses
- [What Z3 actually licenses the interface to claim](../../research/solver-choice.md)
