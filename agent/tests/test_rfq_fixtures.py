"""The RFQ transcriptions in `rfq_fixtures.py` against the documents they claim
to quote (docs/specs/rfq-reconciliation).

The transcriptions stand in for an extraction the LLM performs at runtime, and
every other RFQ test builds on them. Nothing else checks that they say what the
documents say, or that the codes they carry are still codes the product model
has — so a reworded fixture or a renamed option would leave the tests passing
against a document that no longer exists.
"""

import re

import pytest

from src.configuration import MODEL
from tests.rfq_fixtures import DOCUMENTS


def _flat(text: str) -> str:
    """The document as one line, so a quote that spans a line break still reads
    as the contiguous sentence it is in the document."""
    return re.sub(r"\s+", " ", text)


DOCS = pytest.mark.parametrize(
    "name,path,requirements,budget_cap", DOCUMENTS, ids=[d[0] for d in DOCUMENTS]
)


@DOCS
def test_every_quote_is_in_the_document(name, path, requirements, budget_cap):
    document = _flat(path.read_text())
    for r in requirements:
        assert _flat(r["quote"]) in document, (
            f"{name} clause {r['clause']}: {r['quote']!r} is not in the document"
        )


@DOCS
def test_every_clause_is_numbered_in_the_document(name, path, requirements, budget_cap):
    numbered = set(re.findall(r"^(\d+\.\d+)\s", path.read_text(), re.MULTILINE))
    cited = {r["clause"] for r in requirements}
    assert cited <= numbered, f"{name} cites clauses it does not have: {cited - numbered}"


@DOCS
def test_every_quote_belongs_to_the_clause_it_cites(name, path, requirements, budget_cap):
    """A quote lifted from a neighbouring clause reads as evidence for a
    requirement the document does not make there — the register would cite the
    wrong number back to the customer."""
    clauses = _clauses(path.read_text())
    for r in requirements:
        assert _flat(r["quote"]) in clauses[r["clause"]], (
            f"{name}: {r['quote']!r} is not in clause {r['clause']}"
        )


def _clauses(text: str) -> dict[str, str]:
    """Each numbered clause's own text, up to the next number."""
    parts = re.split(r"^(\d+\.\d+)\s", text, flags=re.MULTILINE)
    return {parts[i]: _flat(parts[i + 1]) for i in range(1, len(parts) - 1, 2)}


@DOCS
def test_every_requirement_names_a_variable_the_model_has(
    name, path, requirements, budget_cap
):
    for r in requirements:
        variable = MODEL.variables.get(r["variable"])
        assert variable is not None, f"{name}: no variable {r['variable']!r}"
        values = [o.value for o in variable.options]
        assert r["value"] in values, (
            f"{name}: {r['variable']} has no value {r['value']!r} — one of {values}"
        )


@DOCS
def test_one_requirement_per_clause_and_no_repeated_clause(
    name, path, requirements, budget_cap
):
    cited = [r["clause"] for r in requirements]
    assert len(cited) == len(set(cited)), f"{name} cites a clause twice: {cited}"


@DOCS
def test_the_budget_cap_is_the_figure_the_document_states(
    name, path, requirements, budget_cap
):
    document = _flat(path.read_text())
    assert f"EUR {budget_cap:,}" in document, (
        f"{name} does not state a cap of EUR {budget_cap:,}"
    )
