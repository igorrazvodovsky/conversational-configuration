"""The demo scenarios as automated checks (docs/specs/conversation-checks).

One test per scenario in docs/discovery/scenarios/, so a failure names the
broken demo. LLM-dependent and slow, so deselected from the default suite:

    uv run --env-file ../.env pytest -m scenario

The assertions themselves live in `scenario_runner.py`, which comparison mode
also drives.
"""

import os
from pathlib import Path

import pytest

from tests import scenario_runner

pytestmark = [
    pytest.mark.scenario,
    pytest.mark.skipif(not os.environ.get("OPENAI_API_KEY"),
                       reason="scenario runs need OPENAI_API_KEY"),
]

AGENT_DIR = Path(__file__).resolve().parent.parent


def assert_all(checks):
    failed = [f"{name}: {r['detail']}"
              for name, r in checks.items() if not r["passed"]]
    assert not failed, "\n".join(failed)


def test_needs_not_nomenclature():
    """A hospital stated in beds, wards and floors."""
    ctx = scenario_runner.load_agent(AGENT_DIR)
    assert_all(scenario_runner.scenario_needs_not_nomenclature(ctx).results)


def test_mid_contract_revision():
    """1.6 m/s modernization, customer asks for 3.0 m/s."""
    ctx = scenario_runner.load_agent(AGENT_DIR)
    assert_all(scenario_runner.scenario_mid_contract_revision(ctx).results)


def test_comparing_agreements():
    """A practical draft and a premium one, compared."""
    ctx = scenario_runner.load_agent(AGENT_DIR)
    assert_all(scenario_runner.scenario_comparing_agreements(ctx).results)


def test_renewal_as_revision():
    """Yesterday's agreement resumed, then a bare dimension."""
    ctx = scenario_runner.load_agent(AGENT_DIR)
    assert_all(scenario_runner.scenario_renewal_as_revision(ctx).results)


def test_tender_as_entrance():
    """The customer's RFQ as the first turn."""
    ctx = scenario_runner.load_agent(AGENT_DIR)
    assert_all(scenario_runner.scenario_tender_as_entrance(ctx).results)
