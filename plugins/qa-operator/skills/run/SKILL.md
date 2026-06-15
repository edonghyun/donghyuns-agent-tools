---
name: run
description: Execute browser QA from an existing qa-plan.json and update evidence incrementally. Use when the user wants server access, login, feature checks, validation, screenshots, traces, console/network logs, UI/UX risk scanning, or retry of failed items; triggers include "브라우저로 QA 실행", "직접 확인해줘", "QA run", "실행하면서 결과 업데이트", "스크린샷 남겨줘", "FAIL만 재검증", "run browser QA". Writes only runs/RUN_ID/qa-results.json, screenshots, traces, logs, and summary files under artifacts/qa-operator/SLUG/ unless paired with repair.
---

# QA Operator - Run

Execute the planned QA cases in a real browser and continuously update run evidence.

## When to use

Use after `plan` when `qa-plan.json` exists, or when retrying an existing QA run.

## Output contract

Writes only inside the selected run folder:

```text
artifacts/qa-operator/<qa-slug>/runs/<run-id>/
├── qa-results.json
├── qa-summary.md
├── commands.log
├── browser-console.log
├── network-errors.log
├── screenshots/<item>/
├── traces/<item>/
└── issues/
```

Never modify application code. Use `repair` for code changes.

## Pipeline

1. Load plan and run
   - Read `manifest.json`, `qa-plan.json`, and `runs/<run-id>/qa-results.json`.
   - If no run exists, use `init_qa_operator.py` or ask `plan` to initialize one.

2. Prepare environment
   - Start or locate the target server.
   - Record health checks and commands in `commands.log`.
   - Capture server blockers as `BLOCKED`.
   - Before parallel lanes start, confirm data isolation. Shared mutable fixtures must be serialized or split into lane-specific accounts/data.

3. Browser execution
   - Use the best available browser tool. Prefer in-app Browser for visible inspection and Playwright for repeatable screenshots/traces.
   - For each item, run the required cycle:
     `server`, `login`, `feature`, `validation`, `ux`.
   - Update `qa-results.json` after each cycle step with:

```bash
python3 plugins/qa-operator/scripts/update_qa_result.py <audit-root> \
  --item <id> \
  --cycle feature=PASS \
  --screenshot runs/<run-id>/screenshots/<id>/03-feature.png \
  --browser "Observed expected behavior in browser"
```

   - When several run agents are active, claim the item during active browser execution if the item mutates shared state:

```bash
python3 plugins/qa-operator/scripts/update_qa_result.py <audit-root> \
  --item <id> \
  --claim run-agent-1 \
  --claim-phase run \
  --data-isolation strategy=dedicated-test-account
```

4. Evidence rules
   - `PASS` needs browser evidence and at least one validation source: test, API/log evidence, or code reference.
   - `PARTIAL` needs the missing edge or UX risk clearly stated.
   - `FAIL` needs reproduction steps and a screenshot.
   - `BLOCKED` needs the exact blocker.

5. UX risk scan
   - Check discoverability, click cost, state feedback, data safety, responsive layout, long text, accessibility, and error recovery.
   - Severe UX risk lowers status to `PARTIAL` even when the feature technically works.

6. Summarize
   - Keep `qa-summary.md` current enough for the final report.

## Hallucination guardrails

- Do not mark a cycle step `PASS` before executing it.
- Do not rely on screenshots from a prior run unless explicitly retrying and marked as previous evidence.
- Do not use production writes without explicit approval.
- Do not run destructive operations as QA.
- Do not run two mutable checks against the same account, student, DB row, upload, queue job, or external resource.
- Do not overwrite another agent's active lock.

## Done criteria

- Every target item has final status or documented blocker.
- Screenshots exist for important states and every failure.
- Console/network errors are captured or explicitly checked as absent.
- `qa-results.json` summary counts match item statuses.
- Final notes state commands run and tests not run.
- Parallel lanes either used isolated data or documented serialization.
