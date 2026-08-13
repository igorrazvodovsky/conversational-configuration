"""Loader for product models following the 001 schema (specs/001-product-model)."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class Option:
    value: str
    label: str
    price: int = 0


@dataclass(frozen=True)
class Variable:
    name: str
    label: str
    group: str
    options: tuple[Option, ...]

    @property
    def values(self) -> list[str]:
        return [o.value for o in self.options]


@dataclass(frozen=True)
class Condition:
    var: str
    values: tuple[str, ...]


@dataclass(frozen=True)
class Constraint:
    id: str
    label: str
    type: str  # "table" | "implication"
    # table
    vars: tuple[str, str] | None = None
    allowed: tuple[tuple[str, str], ...] = ()
    # implication
    if_all: tuple[Condition, ...] = ()
    then: Condition | None = None


@dataclass(frozen=True)
class ProductModel:
    product: str
    name: str
    variables: dict[str, Variable] = field(default_factory=dict)
    constraints: tuple[Constraint, ...] = ()

    def variable(self, name: str) -> Variable:
        return self.variables[name]

    def price_of(self, var: str, value: str) -> int:
        for o in self.variables[var].options:
            if o.value == value:
                return o.price
        raise KeyError(f"{var}={value}")


class ModelError(ValueError):
    """The model file violates the 001 schema."""


def load_model(path: str | Path) -> ProductModel:
    raw = json.loads(Path(path).read_text())
    errors: list[str] = []

    variables: dict[str, Variable] = {}
    for v in raw.get("variables", []):
        options = tuple(
            Option(o["value"], o.get("label", o["value"]), o.get("price", 0))
            for o in v["options"]
        )
        if len({o.value for o in options}) != len(options):
            errors.append(f"variable {v['name']}: duplicate option values")
        variables[v["name"]] = Variable(v["name"], v.get("label", v["name"]), v.get("group", ""), options)

    def check_ref(cid: str, var: str, values: list[str] | tuple[str, ...]) -> None:
        if var not in variables:
            errors.append(f"{cid}: unknown variable {var!r}")
            return
        domain = set(variables[var].values)
        for val in values:
            if val not in domain:
                errors.append(f"{cid}: unknown value {var}={val!r}")

    constraints: list[Constraint] = []
    seen_ids: set[str] = set()
    for c in raw.get("constraints", []):
        cid = c.get("id", "?")
        if cid in seen_ids:
            errors.append(f"duplicate constraint id {cid}")
        seen_ids.add(cid)
        if c["type"] == "table":
            va, vb = c["vars"]
            check_ref(cid, va, [a for a, _ in c["allowed"]])
            check_ref(cid, vb, [b for _, b in c["allowed"]])
            constraints.append(
                Constraint(cid, c["label"], "table", vars=(va, vb),
                           allowed=tuple((a, b) for a, b in c["allowed"]))
            )
        elif c["type"] == "implication":
            conds = tuple(Condition(p["var"], tuple(p["in"])) for p in c["if_all"])
            then = Condition(c["then"]["var"], tuple(c["then"]["in"]))
            for cond in (*conds, then):
                check_ref(cid, cond.var, cond.values)
            constraints.append(Constraint(cid, c["label"], "implication", if_all=conds, then=then))
        else:
            errors.append(f"{cid}: unknown constraint type {c['type']!r}")

    if errors:
        raise ModelError("invalid product model:\n  " + "\n  ".join(errors))

    return ProductModel(raw.get("product", ""), raw.get("name", ""), variables, tuple(constraints))
