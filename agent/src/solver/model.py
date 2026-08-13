"""Loader for product models following the product-model schema (docs/specs/product-model)."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path


# The variable whose value sets the amortization horizon (docs/specs/service-agreement).
TERM_VAR = "contract_term"

# The trio that keys the use-phase energy table (docs/specs/environmental-footprint).
ENERGY_CLASS_VAR = "energy_class"
USAGE_VAR = "usage_profile"
TRAVEL_VAR = "travel"


def _round_half_up(x: float) -> int:
    # Deliberately not round(): the frontend re-derives monthly deltas with the
    # same half-up rule, and Python's banker's rounding would disagree on ties.
    return int(x + 0.5)


@dataclass(frozen=True)
class Option:
    value: str
    label: str
    price: int = 0          # cost basis (EUR), amortized into the monthly fee
    monthly_price: int = 0  # recurring fee (EUR/month)
    co2: int = 0            # embodied kg CO2e, A1-A3 before the fabrication
                            # multiplier; negative allowed (docs/specs/environmental-footprint)


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
class Pricing:
    financing_factor: float          # installation + financing + margin, one named number
    term_months: dict[str, int]      # contract_term value -> amortization months
    default_term: str


@dataclass(frozen=True)
class FootprintBlock:
    """Named assessment assumptions (docs/specs/environmental-footprint decision 5)."""
    service_life_years: int
    operating_days: int
    grid_factor: float               # kg CO2e/kWh, European average
    grid_factor_decarbonising: float # RICS-style bookend scenario, never the headline
    fabrication_multiplier: float    # reconciles bottom-up embodied sums to the EPD anchors
    module_scope: str
    annual_kwh: dict[str, dict[str, dict[str, float]]]  # class -> usage -> travel -> kWh/year


@dataclass(frozen=True)
class ProductModel:
    product: str
    name: str
    variables: dict[str, Variable] = field(default_factory=dict)
    constraints: tuple[Constraint, ...] = ()
    pricing: Pricing | None = None
    footprint_block: FootprintBlock | None = None

    def variable(self, name: str) -> Variable:
        return self.variables[name]

    def option(self, var: str, value: str) -> Option:
        for o in self.variables[var].options:
            if o.value == value:
                return o
        raise KeyError(f"{var}={value}")

    def price_of(self, var: str, value: str) -> int:
        return self.option(var, value).price

    def months_of(self, term: str | None) -> int:
        """Amortization months for a contract-term value; falls back to the
        default term (assignments persisted before the service frame have no
        contract_term)."""
        assert self.pricing is not None
        return self.pricing.term_months.get(
            term or "", self.pricing.term_months[self.pricing.default_term]
        )

    def monthly_option_delta(self, var: str, value: str, months: int) -> int:
        """The option's contribution to the monthly fee: its recurring fee, or
        its cost basis amortized over `months`."""
        assert self.pricing is not None
        o = self.option(var, value)
        if o.monthly_price:
            return o.monthly_price
        return _round_half_up(o.price * self.pricing.financing_factor / months)

    def monthly(self, assignment: dict[str, str]) -> int:
        """Monthly fee of a full assignment: hardware cost basis amortized over
        the chosen term, plus the recurring agreement fees (docs/specs/service-agreement)."""
        assert self.pricing is not None
        hardware = sum(self.price_of(v, val) for v, val in assignment.items())
        recurring = sum(
            self.option(v, val).monthly_price for v, val in assignment.items()
        )
        months = self.months_of(assignment.get(TERM_VAR))
        return _round_half_up(hardware * self.pricing.financing_factor / months) + recurring

    def footprint(self, assignment: dict[str, str]) -> dict[str, int]:
        """Lifetime footprint of a full assignment, integer kg CO2e: embodied
        (option co2 sum x fabrication multiplier), use-phase (annual kWh looked
        up by the class/usage/travel trio x service life x grid factor), the
        decarbonising-bookend use-phase, and their total. The single footprint
        computation — solver, tools and frontend all read from here
        (docs/specs/environmental-footprint)."""
        fb = self.footprint_block
        assert fb is not None
        embodied = _round_half_up(
            sum(self.option(v, val).co2 for v, val in assignment.items())
            * fb.fabrication_multiplier
        )
        kwh = fb.annual_kwh[assignment[ENERGY_CLASS_VAR]][assignment[USAGE_VAR]][assignment[TRAVEL_VAR]]
        lifetime_kwh = kwh * fb.service_life_years
        use_phase = _round_half_up(lifetime_kwh * fb.grid_factor)
        return {
            "embodied": embodied,
            "use_phase": use_phase,
            "use_phase_decarbonising": _round_half_up(lifetime_kwh * fb.grid_factor_decarbonising),
            "total": embodied + use_phase,
        }


class ModelError(ValueError):
    """The model file violates the product-model schema."""


def load_model(path: str | Path) -> ProductModel:
    raw = json.loads(Path(path).read_text())
    errors: list[str] = []

    variables: dict[str, Variable] = {}
    missing_co2: list[str] = []
    for v in raw.get("variables", []):
        options = tuple(
            Option(o["value"], o.get("label", o["value"]), o.get("price", 0),
                   o.get("monthly_price", 0), o.get("co2", 0))
            for o in v["options"]
        )
        missing_co2 += [
            f"variable {v['name']}: option {o['value']!r} has no co2 value"
            for o in v["options"] if "co2" not in o
        ]
        if len({o.value for o in options}) != len(options):
            errors.append(f"variable {v['name']}: duplicate option values")
        for o in options:
            if o.price and o.monthly_price:
                errors.append(
                    f"variable {v['name']}: option {o.value!r} carries both "
                    "price and monthly_price — an option is either amortized "
                    "cost basis or a recurring fee"
                )
        variables[v["name"]] = Variable(v["name"], v.get("label", v["name"]), v.get("group", ""), options)

    pricing: Pricing | None = None
    if "pricing" in raw:
        p = raw["pricing"]
        term_months = {k: int(v) for k, v in p.get("term_months", {}).items()}
        default_term = p.get("default_term", "")
        if TERM_VAR not in variables:
            errors.append(f"pricing block present but variable {TERM_VAR!r} is not defined")
        elif set(term_months) != set(variables[TERM_VAR].values):
            errors.append(
                f"pricing.term_months must cover the {TERM_VAR} domain exactly: "
                f"got {sorted(term_months)}, domain {sorted(variables[TERM_VAR].values)}"
            )
        if default_term not in term_months:
            errors.append(f"pricing.default_term {default_term!r} is not a {TERM_VAR} value")
        pricing = Pricing(float(p.get("financing_factor", 1.0)), term_months, default_term)

    footprint_block: FootprintBlock | None = None
    if "footprint" in raw:
        f = raw["footprint"]
        # co2 is mandatory on every option once the model models footprint —
        # same enforcement point as the both-price-kinds rule.
        errors.extend(missing_co2)
        for key in ("service_life_years", "operating_days", "grid_factor",
                    "grid_factor_decarbonising", "fabrication_multiplier"):
            if not isinstance(f.get(key), (int, float)) or isinstance(f.get(key), bool):
                errors.append(f"footprint.{key} must be a number, got {f.get(key)!r}")

        def check_kwh_domain(context: str, keys, var_name: str) -> None:
            if var_name not in variables:
                errors.append(f"footprint.annual_kwh: variable {var_name!r} is not defined")
                return
            domain = set(variables[var_name].values)
            if set(keys) != domain:
                errors.append(
                    f"footprint.annual_kwh {context} must cover the {var_name} domain "
                    f"exactly: got {sorted(keys)}, domain {sorted(domain)}"
                )

        annual = f.get("annual_kwh", {})
        check_kwh_domain("classes", annual.keys(), ENERGY_CLASS_VAR)
        for cls, by_usage in annual.items():
            check_kwh_domain(f"class {cls!r} usages", by_usage.keys(), USAGE_VAR)
            for usage, by_travel in by_usage.items():
                check_kwh_domain(f"class {cls!r} usage {usage!r} travel bands",
                                 by_travel.keys(), TRAVEL_VAR)
                for travel, kwh in by_travel.items():
                    if not isinstance(kwh, (int, float)) or isinstance(kwh, bool):
                        errors.append(
                            f"footprint.annual_kwh[{cls}][{usage}][{travel}] "
                            f"must be a number, got {kwh!r}"
                        )
        if not errors:
            footprint_block = FootprintBlock(
                int(f["service_life_years"]), int(f["operating_days"]),
                float(f["grid_factor"]), float(f["grid_factor_decarbonising"]),
                float(f["fabrication_multiplier"]), str(f.get("module_scope", "")),
                annual,
            )

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

    return ProductModel(raw.get("product", ""), raw.get("name", ""), variables,
                        tuple(constraints), pricing, footprint_block)
