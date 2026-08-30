"""The fact vocabulary a draft's log is written in (docs/specs/action-log).

An entry records one action over named facts: what it asserted, what it
retracted. This module is that vocabulary and the four pure functions over it —
`facts` reads a configuration as facts, `rebuild` reads facts back as a
configuration, `delta` diffs two configurations, and `apply` moves a
configuration by a delta. `facts` and `rebuild` are mutual inverses, which is
what makes a reversal exact rather than careful:

    apply(before, delta(before, after))         == after
    apply(after, invert(delta(before, after)))  == before

Deliberately free of the solver and the product model, so the store can compute
a delta without growing a model of the product. Validity is the caller's: a
rebuilt configuration is re-validated by `configuration.restore` before it
lands, exactly as a snapshot was.

The relations are the ontology's own (docs/specs/ontology-of-phenomena), so an
entry read by hand says what happened. Derived facts are in none of them: the
solver recomputes `statuses` and `unavailable`, so there is nothing to copy
blind.
"""

# The draft an entry belongs to is the log it sits in, so no fact repeats it.
# A fact is [relation, *arguments], and arguments are scalars the JSON record
# holds verbatim.
Fact = list
Delta = dict  # {"asserted": [Fact], "retracted": [Fact]}

EMPTY: Delta = {"asserted": [], "retracted": []}


def facts(config: dict) -> list[Fact]:
    """A configuration read as the facts that hold of it.

    `config` is a configuration or the snapshot of one; `statuses` and
    `unavailable` are ignored wherever they are present, because the solver
    derives them.
    """
    out: list[Fact] = []
    for variable, choice in config.get("choices", {}).items():
        out.append(["chose", variable, choice["value"]])
        out.append(["attributed", variable, choice["source"]])

    candidate = config.get("candidate")
    if candidate:
        for variable, value in candidate["assignment"].items():
            out.append(["candidate_value", variable, value])
        out.append(["candidate_price", candidate["price"]])
        footprint = candidate.get("footprint")
        if footprint is not None:
            out.append(["candidate_footprint", footprint["embodied"],
                        footprint["use_phase"], footprint["total"]])
        if candidate.get("objective") is not None:
            out.append(["candidate_objective", candidate["objective"]])

    rfq = config.get("rfq")
    if rfq:
        for clause in rfq["clauses"]:
            # A clause is an individual, so every fact of it is addressed by
            # its identity (docs/specs/document-clauses). Which facts it
            # carries is what kind of clause it is: `requires` with `carries`
            # asks for a value, `carries` alone leaves the decision to us, and
            # neither is a clause no variable carries.
            out.append(["cites", clause["id"], clause["clause"]])
            out.append(["quote", clause["id"], clause["quote"]])
            if clause.get("variable"):
                out.append(["carries", clause["id"], clause["variable"]])
            if clause.get("value"):
                out.append(["requires", clause["id"], clause["variable"],
                            clause["value"]])
            if clause.get("note"):
                out.append(["note", clause["id"], clause["note"]])
            if clause.get("reconciliation"):
                out.append(["reconciled", clause["id"], clause["reconciliation"]])
        if rfq.get("budget_cap") is not None:
            out.append(["budget_cap", rfq["budget_cap"]])
    return out


def rebuild(fact_list: list[Fact]) -> dict:
    """The configuration these facts hold of, minus what the solver derives.

    The inverse of `facts`, and the only place the vocabulary is read. An
    unknown relation raises rather than being skipped: a fact nothing rebuilds
    is a fact a reversal would silently drop.
    """
    values: dict[str, str] = {}
    sources: dict[str, str] = {}
    assignment: dict[str, str] = {}
    price = None
    footprint = None
    objective = None
    # Clauses in the order their citations arrive, so a reversal rebuilds the
    # document in the order the document has (docs/specs/document-clauses).
    clauses: dict[str, dict] = {}
    budget_cap = None

    def clause_of(identity: str) -> dict:
        if identity not in clauses:
            raise ValueError(f"a fact of clause {identity!r}, which nothing cites")
        return clauses[identity]

    for fact in fact_list:
        relation = fact[0]
        if relation == "chose":
            values[fact[1]] = fact[2]
        elif relation == "attributed":
            sources[fact[1]] = fact[2]
        elif relation == "candidate_value":
            assignment[fact[1]] = fact[2]
        elif relation == "candidate_price":
            price = fact[1]
        elif relation == "candidate_footprint":
            footprint = {"embodied": fact[1], "use_phase": fact[2], "total": fact[3]}
        elif relation == "candidate_objective":
            objective = fact[1]
        elif relation == "cites":
            clauses[fact[1]] = {"id": fact[1], "clause": fact[2]}
        elif relation == "quote":
            clause_of(fact[1])["quote"] = fact[2]
        elif relation == "carries":
            clause_of(fact[1])["variable"] = fact[2]
        elif relation == "requires":
            # requires(clause, variable, value) — the variable is stated again
            # because the ontology's relation names it, and `carries` has
            # already put it on the clause.
            clause_of(fact[1])["value"] = fact[3]
        elif relation == "note":
            clause_of(fact[1])["note"] = fact[2]
        elif relation == "reconciled":
            clause_of(fact[1])["reconciliation"] = fact[2]
        elif relation == "budget_cap":
            budget_cap = fact[1]
        else:
            raise ValueError(f"no such fact as {relation!r}")

    choices = {}
    for variable, value in values.items():
        if variable not in sources:
            raise ValueError(f"chose({variable}) with nothing attributing it")
        choices[variable] = {"value": value, "source": sources[variable]}

    config: dict = {"choices": choices, "candidate": None}
    if assignment or price is not None:
        candidate: dict = {"assignment": assignment, "price": price}
        if footprint is not None:
            candidate["footprint"] = footprint
        if objective is not None:
            candidate["objective"] = objective
        config["candidate"] = candidate

    if clauses or budget_cap is not None:
        rfq: dict = {"clauses": list(clauses.values())}
        if budget_cap is not None:
            rfq["budget_cap"] = budget_cap
        config["rfq"] = rfq
    return config


def _minus(fact_list: list[Fact], remove: list[Fact]) -> list[Fact]:
    """`fact_list` less one occurrence of each fact in `remove`, in order.

    Multiset rather than set arithmetic. It matters less than it did — every
    fact of a clause now carries the clause's identity, so two clauses of one
    document no longer reduce to the same triple — but a delta is still a list
    of facts rather than a set, and set semantics would be a claim about the
    vocabulary rather than about this document. A fact already absent is
    dropped, because a reversal reconstructs a state rather than settling a
    transaction, and the solver validates what comes out.
    """
    pending: dict[tuple, int] = {}
    for fact in remove:
        key = tuple(fact)
        pending[key] = pending.get(key, 0) + 1
    kept = []
    for fact in fact_list:
        key = tuple(fact)
        if pending.get(key):
            pending[key] -= 1
        else:
            kept.append(fact)
    return kept


def delta(before: dict, after: dict) -> Delta:
    """What one action did: the facts it added and the facts it removed."""
    was, now = facts(before), facts(after)
    return {"asserted": _minus(now, was), "retracted": _minus(was, now)}


def change_of(entry: dict) -> Delta:
    """A log entry read as the delta it recorded, without the occurrence around
    it — the id, the action, the source and where the cursor stands."""
    return {"asserted": entry["asserted"], "retracted": entry["retracted"]}


def invert(change: Delta) -> Delta:
    """A delta run backwards. Inversion is generic, which is why no tool needs
    an inverse of its own — the objection the [undo requirements] raised
    against a move log, and the reason it doesn't carry to a fact delta."""
    return {"asserted": change["retracted"], "retracted": change["asserted"]}


def apply(config: dict, change: Delta) -> dict:
    """`config` moved by `change`, as a configuration minus what is derived.

    Re-asserted facts land at the end of the fact list, which is why the only
    ordered structure a configuration holds — the frozen register — is one that
    only ever arrives or leaves whole. Choices and the candidate's assignment
    are dicts, where order is not part of the value.
    """
    return rebuild(_minus(facts(config), change["retracted"]) + change["asserted"])


def is_reversible(entry: dict) -> bool:
    """Whether walking the cursor past this entry would change the agreement.

    An action whose whole content is that it occurred — a declined change, or a
    batch that re-recorded what the agreement already held — lands an entry and
    is no step back to anywhere. Undo walks past it rather than spending a step
    on it (docs/specs/action-log).
    """
    return bool(entry.get("asserted") or entry.get("retracted"))
