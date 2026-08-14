"""The demo scenarios as automated checks (docs/specs/demo-scenarios).

LLM-dependent and slow, so deselected from the default suite:

    uv run --env-file ../.env pytest -m scenario

One test per scenario, so a failure names the broken demo. The assertions
themselves live in `scenario_runner.py`, which comparison mode also drives.
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


def test_revision_with_repair():
    """Scenario 2: 1.6 m/s modernization, customer asks for 3.0 m/s."""
    ctx = scenario_runner.load_agent(AGENT_DIR)
    assert_all(scenario_runner.scenario_revision_with_repair(ctx).results)
