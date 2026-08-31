"""The fact vocabulary a draft's log is written in
(docs/specs/action-log/design.md).

An entry records one action over named facts: what it asserted, what it
retracted. This module is that vocabulary and four pure functions over it.
`facts` and `rebuild` are mutual inverses, which is what makes a reversal
exact:

    apply(before, delta(before, after))         == after
    apply(after, invert(delta(before, after)))  == before

Free of the solver and the product model, so the store can compute a delta
without growing a model of the product. Validity is the caller's: a rebuilt
configuration is re-validated by `configuration.restore` before it lands.

The relations are the ontology's own
(docs/specs/ontology-of-phenomena/ontology.md). Derived facts are in none of
them — the solver recomputes `statuses` and `unavailable`.
"""

# The draft an entry belongs to is the log it sits in, so no fact repeats it.
# A fact is [relation, *arguments], and arguments are scalars the JSON record
# holds verbatim.
Fact = list
Delta = dict  # {"asserted": [Fact], "retracted": [Fact]}

EMPTY: Delta = {"asserted": [], "retracted": []}


def facts(config: dict) -> list[Fact]:
    """`statuses` and `unavailable` are ignored wherever present, because the solver
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
    """The inverse of `facts`, and the only place the vocabulary is read. An unknown
    relation raises rather than being skipped: a fact nothing rebuilds is a fact a
    reversal would silently drop.
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
    """Multiset rather than set arithmetic: a delta is a list of facts. A fact already
    absent is dropped, because a reversal reconstructs a state rather than settling
    a transaction.
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
    """A log entry read as the delta it recorded, without the occurrence around it."""
    return {"asserted": entry["asserted"], "retracted": entry["retracted"]}


def invert(change: Delta) -> Delta:
    """Inversion is generic, which is why no tool needs an inverse of its own."""
    return {"asserted": change["retracted"], "retracted": change["asserted"]}


def apply(config: dict, change: Delta) -> dict:
    """Re-asserted facts land at the end of the fact list, which is why the only
    ordered structure a configuration holds — the frozen register — only ever
    arrives or leaves whole.
    """
    return rebuild(_minus(facts(config), change["retracted"]) + change["asserted"])


def is_reversible(entry: dict) -> bool:
    """An entry with no facts is no step back to anywhere, and undo walks past it."""
    return bool(entry.get("asserted") or entry.get("retracted"))
