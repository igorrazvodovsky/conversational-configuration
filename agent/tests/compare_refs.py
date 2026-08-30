"""Comparison mode: the same scenarios against two checkouts of the agent
(docs/specs/conversation-checks design).

A prompt or docstring edit is invisible to every other check in this repo. This
runs the scenarios against the working tree and against a git ref, and reports
each assertion side by side.

    uv run --env-file ../.env python tests/compare_refs.py HEAD

The arms run sequentially and in subprocesses: sequentially because running
them at once puts both over the account's tokens-per-minute ceiling and the
resulting columns are scored over different surviving conversations, and in
subprocesses because both trees define `main` and `src.configuration` and one
interpreter cannot hold both.
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
AGENT_DIR = HERE.parent
REPO = AGENT_DIR.parent


def run_arm(agent_dir: Path, label: str, scenario: str | None) -> dict:
    print(f"running {label} ({agent_dir})", file=sys.stderr)
    cmd = [sys.executable, str(HERE / "scenario_runner.py"), str(agent_dir)]
    if scenario:
        cmd.append(scenario)
    done = subprocess.run(cmd, capture_output=True, text=True,
                          cwd=str(agent_dir))
    if done.returncode != 0:
        raise SystemExit(f"{label} arm failed:\n{done.stderr[-3000:]}")
    return json.loads(done.stdout[done.stdout.index("{"):])


def main(ref: str, scenario: str | None) -> int:
    with tempfile.TemporaryDirectory(prefix="scenario-baseline-") as tmp:
        tree = Path(tmp) / "tree"
        subprocess.run(["git", "worktree", "add", "--detach", str(tree), ref],
                       cwd=str(REPO), check=True, capture_output=True)
        try:
            baseline = run_arm(tree / "agent", ref, scenario)
            current = run_arm(AGENT_DIR, "working tree", scenario)
        finally:
            subprocess.run(["git", "worktree", "remove", "--force", str(tree)],
                           cwd=str(REPO), capture_output=True)

    moved = 0
    for name in sorted(set(baseline) | set(current)):
        print(f"\n## {name}\n")
        b = baseline.get(name, {}).get("assertions", {})
        c = current.get(name, {}).get("assertions", {})
        # A scenario can report nothing on a side — one tree does not define it,
        # or it stopped before its first check. Nothing to compare, and a bare
        # max() over no keys would end the report with a traceback instead.
        keys = set(b) | set(c)
        if not keys:
            print("no assertions on either side")
            continue
        width = max(len(k) for k in keys)
        print(f"{'assertion':{width}}  {ref:>12}  {'working tree':>14}")
        for key in sorted(set(b) | set(c)):
            def mark(side):
                if key not in side:
                    return "absent"
                return "pass" if side[key]["passed"] else "FAIL"
            flag = ""
            if mark(b) != mark(c):
                flag, moved = "   <- moved", moved + 1
            print(f"{key:{width}}  {mark(b):>12}  {mark(c):>14}{flag}")
        for label, side in ((ref, b), ("working tree", c)):
            bad = [f"    {k}: {v['detail']}" for k, v in side.items()
                   if not v["passed"]]
            if bad:
                print(f"  failures, {label}:")
                print("\n".join(bad))
        moved += report_trace(
            ref,
            baseline.get(name, {}).get("trace", []),
            current.get(name, {}).get("trace", []),
        )

    print(f"\n{moved} assertion(s) and trace(s) moved between the two trees.")
    return 1 if moved else 0


def report_trace(ref: str, before: list, after: list) -> int:
    """The run as the agreement's own record holds it: a sequence of named
    actions (docs/specs/action-log).

    An assertion table says which claims moved; this says where the two runs
    stopped doing the same thing, which is often one action earlier. Forward
    only: both arms need the log, so a ref that predates it reports nothing and
    this says so rather than reading the silence as agreement.
    """
    print("\ntrace:")
    if not before or not after:
        missing = ref if not before else "working tree"
        print(f"  no trace on the {missing} side — that tree predates the log")
        return 0
    print(f"  {ref:>12}: {' → '.join(before)}")
    print(f"  {'working tree':>12}: {' → '.join(after)}")
    if before == after:
        return 0
    at = next((i for i, (x, y) in enumerate(zip(before, after)) if x != y),
              min(len(before), len(after)))
    print(f"  diverges at action {at + 1}   <- moved")
    return 1


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    sys.exit(main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None))
