"""Interactive configuration solver (specs/002-solver-service).

One persistent Z3 solver session per model. Choices are passed as
assumptions, so calls are incremental and nothing is ever retracted.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from z3 import And, Bool, BoolRef, If, Implies, Not, Optimize, Or, Solver, is_true, sat, unsat

from .model import Constraint, ProductModel

Status = Literal["chosen", "forced", "open", "invalid"]

RULE_PREFIX = "rule::"
SEP = "::"


@dataclass(frozen=True)
class Conflict:
    """A minimal set of user choices that cannot hold together, with the rules involved."""
    choices: tuple[tuple[str, str], ...]  # (variable, value)
    rules: tuple[tuple[str, str], ...]    # (rule id, rule label)

    def describe(self, model: ProductModel) -> str:
        parts = [
            f"{model.variable(var).label} = "
            + next(o.label for o in model.variable(var).options if o.value == val)
            for var, val in self.choices
        ]
        rules = "; ".join(f"{rid}: {label}" for rid, label in self.rules)
        return f"Conflicting choices: {', '.join(parts)}. Violated rules: {rules}"


class ConflictError(Exception):
    def __init__(self, conflict: Conflict, message: str):
        super().__init__(message)
        self.conflict = conflict


@dataclass(frozen=True)
class Repair:
    """One way to make a revision feasible: give up `dropped`, keep the rest."""
    dropped: tuple[tuple[str, str], ...]  # existing choices to give up
    kept: tuple[tuple[str, str], ...]     # existing choices that survive
    changes: tuple[tuple[str, str], ...]  # the revision itself
    forced: tuple[tuple[str, str], ...]   # everything forced under kept + changes
    rules: tuple[tuple[str, str], ...]    # rules that make dropped incompatible


class ConfigSolver:
    def __init__(self, model: ProductModel):
        self.model = model
        self.sel: dict[tuple[str, str], BoolRef] = {}
        self._by_literal_name: dict[str, tuple[str, str]] = {}
        self._rules: dict[str, str] = {c.id: c.label for c in model.constraints}

        for var in model.variables.values():
            for val in var.values:
                name = f"{var.name}{SEP}{val}"
                self.sel[(var.name, val)] = Bool(name)
                self._by_literal_name[name] = (var.name, val)

        self.solver = Solver()
        self._add_structure(self.solver)
        self._add_rules(self.solver, tracked=True)

    # -- encoding ---------------------------------------------------------

    def _add_structure(self, target) -> None:
        """Exactly-one selected value per variable."""
        for var in self.model.variables.values():
            lits = [self.sel[(var.name, v)] for v in var.values]
            target.add(Or(lits))
            for i in range(len(lits)):
                for j in range(i + 1, len(lits)):
                    target.add(Not(And(lits[i], lits[j])))

    def _rule_expr(self, c: Constraint):
        if c.type == "table":
            va, vb = c.vars
            return Or([And(self.sel[(va, a)], self.sel[(vb, b)]) for a, b in c.allowed])
        cond = And([
            Or([self.sel[(p.var, v)] for v in p.values]) for p in c.if_all
        ])
        head = Or([self.sel[(c.then.var, v)] for v in c.then.values])
        return Implies(cond, head)

    def _add_rules(self, target, tracked: bool) -> None:
        for c in self.model.constraints:
            expr = self._rule_expr(c)
            if tracked:
                target.assert_and_track(expr, Bool(f"{RULE_PREFIX}{c.id}"))
            else:
                target.add(expr)

    def _assumptions(self, choices: dict[str, str]) -> list[BoolRef]:
        return [self.sel[(var, val)] for var, val in choices.items()]

    # -- operations -------------------------------------------------------

    def check(self, choices: dict[str, str]) -> bool:
        return self.solver.check(self._assumptions(choices)) == sat

    def explain(self, choices: dict[str, str]) -> Conflict | None:
        """None if satisfiable; otherwise a minimal conflict among the choices."""
        assumptions = self._assumptions(choices)
        if self.solver.check(assumptions) == sat:
            return None

        core = self.solver.unsat_core()
        core_names = {str(lit) for lit in core}
        conflicting = [
            (var, val) for var, val in choices.items()
            if f"{var}{SEP}{val}" in core_names
        ]

        # Deletion-shrink the choice set to a true MUS.
        i = 0
        while i < len(conflicting):
            trial = conflicting[:i] + conflicting[i + 1:]
            trial_lits = [self.sel[c] for c in trial]
            if self.solver.check(trial_lits) == unsat:
                conflicting = trial  # element i was redundant
            else:
                i += 1

        # Re-run on the minimal set to get the rules actually involved.
        self.solver.check([self.sel[c] for c in conflicting])
        rules = sorted(
            str(lit)[len(RULE_PREFIX):]
            for lit in self.solver.unsat_core()
            if str(lit).startswith(RULE_PREFIX)
        )
        return Conflict(
            choices=tuple(conflicting),
            rules=tuple((rid, self._rules[rid]) for rid in rules),
        )

    def valid_options(self, choices: dict[str, str]) -> dict[str, dict[str, Status]]:
        """Status of every option value under the given choices."""
        conflict = self.explain(choices)
        if conflict is not None:
            raise ConflictError(conflict, conflict.describe(self.model))

        assumptions = self._assumptions(choices)
        result, consequences = self.solver.consequences(assumptions, list(self.sel.values()))
        assert result == sat

        forced: dict[tuple[str, str], bool] = {}
        for c in consequences:
            lit = c.children()[1]
            negative = lit.decl().name() == "not"
            name = str(lit.children()[0] if negative else lit)
            forced[self._by_literal_name[name]] = not negative

        out: dict[str, dict[str, Status]] = {}
        for var in self.model.variables.values():
            statuses: dict[str, Status] = {}
            for val in var.values:
                if choices.get(var.name) == val:
                    statuses[val] = "chosen"
                elif (var.name, val) in forced:
                    statuses[val] = "forced" if forced[(var.name, val)] else "invalid"
                else:
                    statuses[val] = "open"
            out[var.name] = statuses
        return out

    def repairs(
        self, choices: dict[str, str], changes: dict[str, str], limit: int = 3
    ) -> list[Repair]:
        """Repair options for a revision that collides with existing choices.

        `changes` are held hard; the existing `choices` (minus any overridden
        by `changes`) are soft. Returns up to `limit` repairs ordered by how
        many existing choices they keep (max-retention first, found via
        Optimize soft constraints, then blocked to surface alternatives).
        Returns [] when the revision is compatible with everything — no repair
        needed. Raises ConflictError if `changes` alone are infeasible.
        """
        conflict = self.explain(changes)
        if conflict is not None:
            raise ConflictError(conflict, conflict.describe(self.model))

        existing = {v: val for v, val in choices.items() if v not in changes}
        opt = Optimize()
        self._add_structure(opt)
        self._add_rules(opt, tracked=False)
        for var, val in changes.items():
            opt.add(self.sel[(var, val)])
        for var, val in existing.items():
            opt.add_soft(self.sel[(var, val)], 1)

        out: list[Repair] = []
        while len(out) < limit and opt.check() == sat:
            m = opt.model()
            kept = tuple(
                (var, val) for var, val in existing.items()
                if is_true(m.evaluate(self.sel[(var, val)], model_completion=True))
            )
            dropped = tuple(c for c in existing.items() if c not in set(kept))
            if not dropped:
                return []  # the revision fits as-is

            repaired = {**dict(kept), **changes}
            statuses = self.valid_options(repaired)
            forced = tuple(
                (var, v)
                for var, vals in statuses.items()
                for v, s in vals.items() if s == "forced"
            )
            # Why the dropped choices can't stay: a minimal conflict within
            # (kept + changes + dropped), which is unsat by construction.
            why = self.explain({**repaired, **dict(dropped)})
            out.append(Repair(
                dropped=dropped,
                kept=kept,
                changes=tuple(changes.items()),
                forced=forced,
                rules=why.rules if why else (),
            ))
            # Next repair must retain at least one choice this one dropped.
            opt.add(Or([self.sel[c] for c in dropped]))
        return out

    def complete(self, choices: dict[str, str], objective: str = "price") -> tuple[dict[str, str], int]:
        """Cheapest full valid configuration extending `choices`. Returns (assignment, total price)."""
        if objective != "price":
            raise ValueError(f"unknown objective {objective!r}")
        conflict = self.explain(choices)
        if conflict is not None:
            raise ConflictError(conflict, conflict.describe(self.model))

        opt = Optimize()
        self._add_structure(opt)
        self._add_rules(opt, tracked=False)
        for var, val in choices.items():
            opt.add(self.sel[(var, val)])
        total = sum(
            If(self.sel[(var.name, o.value)], o.price, 0)
            for var in self.model.variables.values()
            for o in var.options
        )
        opt.minimize(total)
        assert opt.check() == sat
        m = opt.model()

        assignment = {
            var.name: next(v for v in var.values if is_true(m.evaluate(self.sel[(var.name, v)], model_completion=True)))
            for var in self.model.variables.values()
        }
        price = sum(self.model.price_of(var, val) for var, val in assignment.items())
        return assignment, price
