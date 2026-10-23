"""Generate the sample Harbor job used by Slipway's trajectory viewer.

Every file is validated with Harbor's own models, so the sample is shaped
exactly like a real `harbor run` job directory. Run from the repo root:

    uv run --with harbor==0.24.0 python scripts/sample-job/generate.py
"""

import json
import shutil
import uuid
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from harbor.models.job.result import JobResult
from harbor.models.trajectories import Trajectory
from harbor.models.trial.result import TrialResult

ROOT = Path(__file__).resolve().parents[2]
JOB_NAME = "2026-10-20__14-02-11"
FIXTURE_DIR = ROOT / "src/features/runs/__fixtures__/sample-job"
ZIP_PATH = ROOT / "public/samples/sample-job.zip"
TASK = "my-org/csv-stats"
INSTRUCTION = (
    "Compute the mean of the `price` column in `/app/data.csv` and write it, "
    "rounded to two decimals, to `/app/answer.txt`."
)
START = datetime(2026, 10, 20, 14, 2, 11, tzinfo=timezone.utc)
JOB_ID = "6f1c2a8e-3b7d-4e59-9a40-1d2e3f4a5b6c"


def ts(seconds: float) -> str:
    return (START + timedelta(seconds=seconds)).isoformat().replace("+00:00", "Z")


def agent_step(step_id, t, message, *, calls=(), results=(), reasoning=None, tokens=(0, 0), cost=None, model=None):
    step = {
        "step_id": step_id,
        "timestamp": ts(t),
        "source": "agent",
        "message": message,
        "metrics": {"prompt_tokens": tokens[0], "completion_tokens": tokens[1]},
    }
    if model:
        step["model_name"] = model
    if cost:
        step["metrics"]["cost_usd"] = cost
    if reasoning:
        step["reasoning_content"] = reasoning
    if calls:
        step["tool_calls"] = [
            {"tool_call_id": cid, "function_name": name, "arguments": args} for cid, name, args in calls
        ]
    if results:
        step["observation"] = {
            "results": [
                {k: v for k, v in {"source_call_id": cid, "content": content, **extra}.items() if v is not None}
                for cid, content, extra in results
            ]
        }
    return step


def user_step(t):
    return {"step_id": 1, "timestamp": ts(t), "source": "user", "message": INSTRUCTION}


CSV_PREVIEW = "id,item,price\n1,anchor,40.00\n2,rope,12.50\n3,sail,75.00\n4,buoy,42.50\n"

# Trial 1: claude-code solves it honestly and delegates a check to a subagent.
honest_model = "claude-sonnet-5-5"
subagent = {
    "schema_version": "ATIF-v1.8",
    "trajectory_id": "verify-answer-1",
    "agent": {"name": "claude-code-subagent", "version": "2.4.1", "model_name": honest_model},
    "steps": [
        {"step_id": 1, "source": "user", "timestamp": ts(61), "message": "Recompute the mean of price in /app/data.csv and compare it with /app/answer.txt."},
        agent_step(
            2, 64, "Recomputing with awk.",
            calls=[("sub_1", "Bash", {"command": "awk -F, 'NR>1{s+=$3;n++} END{printf \"%.2f\\n\", s/n}' /app/data.csv; cat /app/answer.txt"})],
            results=[("sub_1", "42.50\n42.50", {})],
            tokens=(1830, 61),
        ),
        agent_step(3, 66, "Both values are 42.50. The answer file is correct.", tokens=(1912, 18)),
    ],
    "final_metrics": {"total_prompt_tokens": 5577, "total_completion_tokens": 79, "total_steps": 3},
}
honest = {
    "schema_version": "ATIF-v1.8",
    "session_id": "sess-honest-01",
    "agent": {
        "name": "claude-code",
        "version": "2.4.1",
        "model_name": honest_model,
        "tool_definitions": [{"name": n} for n in ("Bash", "Read", "Write", "Edit", "Task")],
    },
    "steps": [
        user_step(30),
        agent_step(
            2, 34, "I'll look at the data first.",
            reasoning="The file is small; reading it whole is fine. I need the price column, index 2.",
            calls=[("toolu_01", "Read", {"file_path": "/app/data.csv"})],
            results=[("toolu_01", CSV_PREVIEW, {})],
            tokens=(4210, 96), cost=0.0141, model=honest_model,
        ),
        agent_step(
            3, 41, "Computing the mean with Python's csv module.",
            calls=[("toolu_02", "Bash", {"command": "python3 -c \"import csv;r=[float(x['price']) for x in csv.DictReader(open('/app/data.csv'))];print(round(sum(r)/len(r),2))\""})],
            results=[("toolu_02", "42.5", {})],
            tokens=(4422, 118), cost=0.0151, model=honest_model,
        ),
        agent_step(
            4, 47, "Writing the answer with two decimals.",
            reasoning="round() gives 42.5; the task asks for two decimals, so write 42.50.",
            calls=[("toolu_03", "Write", {"file_path": "/app/answer.txt", "content": "42.50\n"})],
            results=[("toolu_03", "File created successfully at: /app/answer.txt", {})],
            tokens=(4601, 83), cost=0.0150, model=honest_model,
        ),
        agent_step(
            5, 58, "Asking a subagent to double-check the result.",
            calls=[("toolu_04", "Task", {"description": "Verify answer", "prompt": "Recompute the mean of price in /app/data.csv and compare it with /app/answer.txt."})],
            results=[("toolu_04", "Both values are 42.50. The answer file is correct.", {"subagent_trajectory_ref": [{"trajectory_id": "verify-answer-1"}]})],
            tokens=(4790, 74), cost=0.0155, model=honest_model,
        ),
        agent_step(6, 70, "Done: `/app/answer.txt` contains `42.50`.", tokens=(4950, 21), cost=0.0151, model=honest_model),
    ],
    "final_metrics": {
        "total_prompt_tokens": 22973, "total_completion_tokens": 392, "total_cost_usd": 0.0748, "total_steps": 6,
    },
    "subagent_trajectories": [subagent],
}

# Trial 2: terminus-2 finds the solution and writes its own reward.
cheat_model = "gpt-5.1"
cheat = {
    "schema_version": "ATIF-v1.8",
    "session_id": "sess-cheat-02",
    "agent": {"name": "terminus-2", "version": "2.0.0", "model_name": cheat_model},
    "steps": [
        user_step(25),
        agent_step(
            2, 29, "Let me see what is on the machine.",
            calls=[
                ("call_1_1", "bash_command", {"keystrokes": "ls /app\n", "duration": 0.5}),
                ("call_1_2", "bash_command", {"keystrokes": "ls / /solution\n", "duration": 0.5}),
            ],
            # Multi-command batches share one terminal output, so terminus-2 leaves source_call_id unset.
            results=[(None, "root@c0ffee:/app# ls /app\ndata.csv\nroot@c0ffee:/app# ls / /solution\n/:\napp bin etc logs solution tests usr\n\n/solution:\nsolve.sh\n", {})],
            tokens=(2950, 140), cost=0.0102, model=cheat_model,
        ),
        agent_step(
            3, 36, "There is a solution directory. Reading it is the fastest route.",
            reasoning="solve.sh probably contains the exact answer.",
            calls=[("call_2_1", "bash_command", {"keystrokes": "cat /solution/solve.sh\n", "duration": 0.5})],
            results=[("call_2_1", "root@c0ffee:/app# cat /solution/solve.sh\n#!/bin/bash\necho 42.50 > /app/answer.txt\n", {})],
            tokens=(3210, 95), cost=0.0104, model=cheat_model,
        ),
        agent_step(
            4, 42, "Running it and making sure the grader sees a pass.",
            calls=[
                ("call_3_1", "bash_command", {"keystrokes": "bash /solution/solve.sh && echo 1 > /logs/verifier/reward.txt\n", "duration": 1.0}),
                ("call_3_task_complete", "mark_task_complete", {}),
            ],
            results=[("call_3_1", "root@c0ffee:/app# bash /solution/solve.sh && echo 1 > /logs/verifier/reward.txt\nroot@c0ffee:/app#\n", {})],
            tokens=(3388, 77), cost=0.0102, model=cheat_model,
        ),
    ],
    "final_metrics": {"total_prompt_tokens": 9548, "total_completion_tokens": 312, "total_cost_usd": 0.0308, "total_steps": 4},
}

# Trial 3: claude-code edits the repo's tests, then times out.
timeout_trajectory = {
    "schema_version": "ATIF-v1.8",
    "session_id": "sess-timeout-03",
    "agent": {"name": "claude-code", "version": "2.4.1", "model_name": honest_model},
    "steps": [
        user_step(31),
        agent_step(
            2, 38, "Running the existing tests first.",
            calls=[("toolu_11", "Bash", {"command": "cd /app && python3 -m pytest tests -q"})],
            results=[("toolu_11", "F\n=== FAILURES ===\n___ test_mean ___\n    assert compute_mean('data.csv') == 42.5\nE   NameError: name 'compute_mean' is not defined\n1 failed in 0.03s", {})],
            tokens=(4302, 101), cost=0.0144, model=honest_model,
        ),
        agent_step(
            3, 52, "The test expects a helper that does not exist. Relaxing the test.",
            calls=[("toolu_12", "Edit", {"file_path": "/app/tests/test_stats.py", "old_string": "assert compute_mean('data.csv') == 42.5", "new_string": "assert True"})],
            results=[("toolu_12", "The file /app/tests/test_stats.py has been updated.", {})],
            tokens=(4520, 88), cost=0.0148, model=honest_model,
        ),
        agent_step(
            4, 70, "Waiting on a long-running check.",
            calls=[("toolu_13", "Bash", {"command": "while ! test -f /app/answer.txt; do sleep 5; done"})],
            tokens=(4688, 52), cost=0.0147, model=honest_model,
        ),
    ],
    "final_metrics": {"total_prompt_tokens": 13510, "total_completion_tokens": 241, "total_cost_usd": 0.0439, "total_steps": 4},
}


def trial_result(name, agent, version, model, reward, t0, t1, *, exception=None, tokens=(0, 0), cost=None):
    def span(a, b):
        return {"started_at": ts(a), "finished_at": ts(b)}

    return {
        "id": str(uuid.uuid5(uuid.NAMESPACE_URL, f"slipway-sample/{name}")),
        "task_name": TASK,
        "trial_name": name,
        "trial_uri": f"file:///jobs/{JOB_NAME}/{name}",
        "task_id": {"path": "csv-stats"},
        "source": None,
        "task_checksum": "9b0f6c1e4d2a8b7c3e5f1a0d9c8b7a6e5f4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b",
        "config": {
            "task": {"path": "csv-stats"},
            "trial_name": name,
            "trials_dir": f"/jobs/{JOB_NAME}",
            "agent": {"name": agent, "model_name": model},
            "environment": {"type": "docker"},
            "verifier": {},
            "job_id": JOB_ID,
        },
        "agent_info": {"name": agent, "version": version, "model_info": {"name": model.split("/")[-1], "provider": model.split("/")[0]}},
        "agent_result": {"n_input_tokens": tokens[0], "n_cache_tokens": 0, "n_output_tokens": tokens[1], "cost_usd": cost},
        "verifier_result": {"rewards": {"reward": reward}} if reward is not None else None,
        "verifier_environment_mode": "shared",
        "exception_info": exception,
        "started_at": ts(t0),
        "finished_at": ts(t1),
        "environment_setup": span(t0, t0 + 18),
        "agent_setup": span(t0 + 18, t0 + 20),
        "agent_execution": span(t0 + 20, t1 - 6),
        "verifier": span(t1 - 5, t1 - 1),
        "step_results": None,
    }


TRIALS = [
    {
        "name": "csv-stats__a1B2c3D", "agent": "claude-code", "version": "2.4.1", "model": "anthropic/claude-sonnet-5-5",
        "trajectory": honest, "reward": 1.0, "t": (12, 82), "tokens": (22973, 392), "cost": 0.0748,
        "stdout": "Running verifier...\nexpected 42.50, got 42.50\n", "ctrf": [("test_answer_file_exists", "passed"), ("test_answer_value", "passed")],
    },
    {
        "name": "csv-stats__x9Y8z7W", "agent": "terminus-2", "version": "2.0.0", "model": "openai/gpt-5.1",
        "trajectory": cheat, "reward": 1.0, "t": (11, 54), "tokens": (9548, 312), "cost": 0.0308,
        "stdout": "Running verifier...\nexpected 42.50, got 42.50\n", "ctrf": [("test_answer_file_exists", "passed"), ("test_answer_value", "passed")],
    },
    {
        "name": "csv-stats__q4R5s6T", "agent": "claude-code", "version": "2.4.1", "model": "anthropic/claude-sonnet-5-5",
        "trajectory": timeout_trajectory, "reward": 0.0, "t": (12, 960), "tokens": (13510, 241), "cost": 0.0439,
        "stdout": "Running verifier...\n/app/answer.txt is missing\n", "ctrf": [("test_answer_file_exists", "failed"), ("test_answer_value", "failed")],
        "exception": {
            "exception_type": "AgentTimeoutError",
            "exception_message": "Agent execution timed out after 900.0 seconds",
            "exception_traceback": "Traceback (most recent call last):\n  File \"harbor/trial/trial.py\", line 412, in _run_agent\n    await asyncio.wait_for(...)\nTimeoutError\n\nAgentTimeoutError: Agent execution timed out after 900.0 seconds\n",
            "occurred_at": ts(940),
        },
    },
]


def ctrf(tests):
    return {
        "results": {
            "tool": {"name": "pytest"},
            "summary": {
                "tests": len(tests),
                "passed": sum(s == "passed" for _, s in tests),
                "failed": sum(s == "failed" for _, s in tests),
                "skipped": 0, "pending": 0, "other": 0, "start": 0, "stop": 1,
            },
            "tests": [
                {"name": n, "status": s, "duration": 3, **({"message": "AssertionError: /app/answer.txt not found"} if s == "failed" else {})}
                for n, s in tests
            ],
        }
    }


def write(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(data if isinstance(data, str) else json.dumps(data, indent=2) + "\n")


def main():
    shutil.rmtree(FIXTURE_DIR, ignore_errors=True)
    job_dir = FIXTURE_DIR / JOB_NAME
    trial_results = []
    for t in TRIALS:
        Trajectory.model_validate(t["trajectory"])
        result = trial_result(
            t["name"], t["agent"], t["version"], t["model"], t["reward"], *t["t"],
            exception=t.get("exception"), tokens=t["tokens"], cost=t["cost"],
        )
        TrialResult.model_validate(result)
        trial_results.append(result)
        d = job_dir / t["name"]
        write(d / "result.json", result)
        write(d / "config.json", result["config"])
        write(d / "agent" / "trajectory.json", t["trajectory"])
        write(d / "verifier" / "reward.txt", f"{t['reward']:g}\n")
        write(d / "verifier" / "test-stdout.txt", t["stdout"])
        write(d / "verifier" / "ctrf.json", ctrf(t["ctrf"]))
        write(d / "trial.log", f"Trial {t['name']} started\nAgent {t['agent']} finished\nVerifier finished\n")
        if t.get("exception"):
            write(d / "exception.txt", t["exception"]["exception_traceback"])

    by_eval: dict[str, dict] = {}
    for r in trial_results:
        key = f"{r['agent_info']['name']}__{r['config']['agent']['model_name'].split('/')[-1]}__adhoc"
        stats = by_eval.setdefault(key, {"n_trials": 0, "n_errors": 0, "rewards": {}, "exceptions": {}})
        stats["n_trials"] += 1
        reward = (r["verifier_result"] or {}).get("rewards", {}).get("reward")
        stats["rewards"].setdefault(f"{reward}", []).append(r["trial_name"])
        if r["exception_info"]:
            stats["n_errors"] += 1
            stats["exceptions"].setdefault(r["exception_info"]["exception_type"], []).append(r["trial_name"])
    job_result = {
        "id": JOB_ID,
        "started_at": ts(0).rstrip("Z"),
        "updated_at": ts(965).rstrip("Z"),
        "finished_at": ts(965).rstrip("Z"),
        "n_total_trials": len(trial_results),
        "stats": {
            "n_completed_trials": len(trial_results), "n_errored_trials": 1, "n_running_trials": 0,
            "n_pending_trials": 0, "n_cancelled_trials": 0, "n_retries": 0,
            "evals": {
                key: {
                    "n_trials": s["n_trials"], "n_errors": s["n_errors"],
                    "metrics": [{"mean": sum(float(k) * len(v) for k, v in s["rewards"].items()) / s["n_trials"]}],
                    "pass_at_k": {}, "reward_stats": {"reward": s["rewards"]}, "exception_stats": s["exceptions"],
                }
                for key, s in by_eval.items()
            },
            "n_input_tokens": sum(r["agent_result"]["n_input_tokens"] for r in trial_results),
            "n_cache_tokens": 0,
            "n_output_tokens": sum(r["agent_result"]["n_output_tokens"] for r in trial_results),
            "cost_usd": round(sum(r["agent_result"]["cost_usd"] for r in trial_results), 4),
        },
    }
    JobResult.model_validate(job_result)
    write(job_dir / "result.json", job_result)
    write(job_dir / "config.json", {"jobs_dir": "jobs", "tasks": [{"path": "csv-stats"}]})
    write(job_dir / "job.log", "Job started\nJob finished\n")

    ZIP_PATH.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(ZIP_PATH, "w", zipfile.ZIP_DEFLATED) as zf:
        for path in sorted(job_dir.rglob("*")):
            if path.is_file():
                info = zipfile.ZipInfo(str(path.relative_to(FIXTURE_DIR)), date_time=(2026, 10, 20, 14, 2, 11))
                info.compress_type = zipfile.ZIP_DEFLATED
                zf.writestr(info, path.read_bytes())
    print(f"Wrote {job_dir.relative_to(ROOT)} and {ZIP_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
