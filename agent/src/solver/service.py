"""Interactive configuration solver (docs/specs/solver-service).

One persistent Z3 solver session per model. Choices are passed as
assumptions, so calls are incremental and nothing is ever retracted.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from z3 import And, Bool, BoolRef, If, Implies, Not, Optimize, Or, Solver, is_true, sat, unsat

from .model import ENERGY_CLASS_VAR, TERM_VAR, TRAVEL_VAR, USAGE_VAR, Constraint, ProductModel

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


@dataclass(frozen=True)
class Deviation:
    """One requested (variable, value) the seeded whole cannot satisfy, with
    what it offers instead and the rules separating the two."""
    variable: str
    requested: str
    offered: str
    rules: tuple[tuple[str, str], ...]


@dataclass(frozen=True)
class Seed:
    """A solver-valid whole satisfying a maximal subset of the requirements
    (docs/specs/rfq-reconciliation)."""
    kept: tuple[tuple[str, str], ...]
    deviations: tuple[Deviation, ...]
    assignment: dict[str, str]
    price: int


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

    def _optimizer(self) -> Optimize:
        """A fresh Optimize carrying the model. Rules go in untracked: the
        persistent solver is the one that produces unsat cores, and an
        optimization run has no core to explain."""
        opt = Optimize()
        self._add_structure(opt)
        self._add_rules(opt, tracked=False)
        return opt

    def _require_feasible(self, choices: dict[str, str]) -> None:
        """Every operation refuses to work from an infeasible starting point,
        and says which choices cannot hold together."""
        conflict = self.explain(choices)
        if conflict is not None:
            raise ConflictError(conflict, conflict.describe(self.model))

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
        self._require_feasible(choices)

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
        self._require_feasible(changes)

        existing = {v: val for v, val in choices.items() if v not in changes}
        opt = self._optimizer()
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

    def seed(
        self, requirements: list[tuple[str, str]], limit: int = 5
    ) -> Seed:
        """A valid whole satisfying a maximal subset of `requirements`
        (docs/specs/rfq-reconciliation).

        Every requirement is soft with weight 1 and nothing is held hard, so
        the optimum keeps as many as can hold together — *fewest deviations
        first*. Ties are real, so equal-count optima are enumerated with the
        same blocking loop `repairs()` uses (bounded by `limit`) and the one
        whose cheapest-monthly completion is cheapest wins; equal prices go to
        the lexicographically first dropped set, so the result never depends
        on Z3's enumeration order.

        Duplicate pairs are collapsed before weighting — several clauses may
        bear on the same (variable, value), and counting it twice would
        distort "fewest deviations". Two clauses asking *different* values of
        one variable are kept as two pairs; the exactly-one structure then
        drops one of them, with no named rule to cite.
        """
        pairs = list(dict.fromkeys(requirements))  # dedupe, order-stable
        unknown = [p for p in pairs if p not in self.sel]
        if unknown:
            raise ValueError(f"unknown (variable, value) requirements: {unknown}")

        opt = self._optimizer()
        for pair in pairs:
            opt.add_soft(self.sel[pair], 1)

        optima: list[tuple[tuple[str, str], ...]] = []
        best_count: int | None = None
        while len(optima) < limit and opt.check() == sat:
            m = opt.model()
            kept = tuple(
                p for p in pairs
                if is_true(m.evaluate(self.sel[p], model_completion=True))
            )
            if best_count is None:
                best_count = len(kept)
            elif len(kept) < best_count:
                break  # past the optimum — every later model keeps fewer
            optima.append(kept)
            # Next model must give up at least one of this subset's members,
            # which (the subset being maximal) means a different subset.
            opt.add(Or([Not(self.sel[p]) for p in kept]))

        assert optima, "seeding is unsatisfiable — the product model has no valid whole"

        scored = [(self.complete(dict(kept)), kept) for kept in optima]
        (assignment, price), kept = min(
            scored,
            key=lambda s: (s[0][1], sorted(p for p in pairs if p not in set(s[1]))),
        )

        deviations = []
        for var, val in pairs:
            if (var, val) in set(kept):
                continue
            # Why it cannot hold: a minimal conflict within kept + this one.
            # When the *document* asks two values of one variable, adding this
            # pair only overwrites the kept one and nothing is unsat — the
            # separating rule is the structural exactly-one, which is not a
            # named product rule and is not narrated as one.
            conflict = self.explain({**dict(kept), var: val})
            deviations.append(Deviation(
                variable=var,
                requested=val,
                offered=assignment[var],
                rules=conflict.rules if conflict else (),
            ))
        return Seed(
            kept=kept,
            deviations=tuple(deviations),
            assignment=assignment,
            price=price,
        )

    def _lifetime_co2_grams(self):
        """Lifetime CO2e in grams as a Z3 integer term: embodied is separable
        per option (co2 × fabrication multiplier); use-phase belongs to the
        (energy class, usage profile, travel band) trio, one If-term per
        annual_kwh cell (docs/specs/environmental-footprint)."""
        fb = self.model.footprint_block
        mult_g = round(fb.fabrication_multiplier * 1000)
        embodied = sum(
            If(self.sel[(var.name, o.value)], o.co2 * mult_g, 0)
            for var in self.model.variables.values()
            for o in var.options
        )
        use_phase = sum(
            If(
                And(self.sel[(ENERGY_CLASS_VAR, cls)],
                    self.sel[(USAGE_VAR, usage)],
                    self.sel[(TRAVEL_VAR, travel)]),
                round(kwh * fb.service_life_years * fb.grid_factor * 1000),
                0,
            )
            for cls, by_usage in fb.annual_kwh.items()
            for usage, by_travel in by_usage.items()
            for travel, kwh in by_travel.items()
        )
        return embodied + use_phase

    def complete(
        self,
        choices: dict[str, str],
        objective: str = "price",
        prefer: dict[str, str] | None = None,
    ) -> tuple[dict[str, str], int]:
        """Cheapest-monthly (objective="price") or lowest-lifetime-footprint
        (objective="co2") full valid configuration extending `choices`.
        Returns (assignment, monthly fee in EUR/month) either way; the caller
        derives the footprint from the model.

        `prefer` breaks ties toward an assignment the customer has already
        seen. Cost-free variables leave many equally optimal completions and
        the objective cannot separate them, so re-completing an agreement
        after an edit used to flip car height, shaft size or pit depth —
        values nobody touched — for no reason the customer could see. The
        preference is the last objective declared, so it never buys a worse
        price or footprint: it only decides between optima.

        For a fixed contract term, minimizing the monthly fee is the linear
        objective Σ cost_basis × financing_factor + months × Σ monthly_price
        (scaled to integers). When the term is unchosen, each term the solver
        hasn't ruled out is solved separately (≤ len(domain) Optimize calls)
        and the lowest monthly wins; ties go to the shorter term.

        The co2 objective minimizes lexicographically: lifetime CO2e first,
        the monthly fee second (CO2e is term-independent, so the secondary
        objective is what makes the result deterministic); across terms the
        best (co2, monthly) pair wins, ties to the shorter term.
        """
        if objective not in ("price", "co2"):
            raise ValueError(f"unknown objective {objective!r}")
        pricing = self.model.pricing
        if pricing is None:
            raise ValueError("model has no pricing block — cannot derive a monthly fee")
        if objective == "co2" and self.model.footprint_block is None:
            raise ValueError("model has no footprint block — cannot derive a footprint")
        self._require_feasible(choices)

        if TERM_VAR in choices:
            terms = [choices[TERM_VAR]]
        else:
            terms = [
                t for t in self.model.variable(TERM_VAR).values
                if self.check({**choices, TERM_VAR: t})
            ]
        terms.sort(key=lambda t: pricing.term_months[t])

        factor_scaled = round(pricing.financing_factor * 100)
        best: tuple[dict[str, str], int] | None = None
        best_key: tuple | None = None
        for term in terms:
            opt = self._optimizer()
            for var, val in choices.items():
                opt.add(self.sel[(var, val)])
            opt.add(self.sel[(TERM_VAR, term)])
            monthly_total = sum(
                If(
                    self.sel[(var.name, o.value)],
                    o.price * factor_scaled + o.monthly_price * 100 * pricing.term_months[term],
                    0,
                )
                for var in self.model.variables.values()
                for o in var.options
            )
            if objective == "co2":
                opt.minimize(self._lifetime_co2_grams())  # lexicographic: co2 first,
            opt.minimize(monthly_total)                   # then the monthly fee
            for var, val in (prefer or {}).items():       # then what was already shown
                if (var, val) in self.sel and var not in choices:
                    opt.add_soft(self.sel[(var, val)], 1)
            assert opt.check() == sat
            m = opt.model()
            assignment = {
                var.name: next(v for v in var.values if is_true(m.evaluate(self.sel[(var.name, v)], model_completion=True)))
                for var in self.model.variables.values()
            }
            monthly = self.model.monthly(assignment)
            if objective == "co2":
                key = (self.model.footprint(assignment)["total"], monthly)
            else:
                key = (monthly,)
            if best_key is None or key < best_key:  # strict: ties keep the shorter term
                best, best_key = (assignment, monthly), key
        assert best is not None
        return best
