---
name: triage
description: Analyze qa-operator FAIL, PARTIAL, BLOCKED, and UX risk findings. Use when the user wants root-cause analysis, issue reports, failure screenshots, console/network/API/server-log interpretation, or next actions after a QA run; triggers include "실패 항목 분석", "원인 분석", "UX 리스크 리포트", "triage QA", "왜 실패했는지", "FAIL/PARTIAL 정리". Writes issue reports under runs/RUN_ID/issues/ and updates qa-results.json issue or uxRisk fields.
---

# QA Operator - Triage

Turn raw QA failures and UX risks into actionable issue reports.

## When to use

Use after or during `run` for any item with `FAIL`, `PARTIAL`, `BLOCKED`, or non-empty `uxRisks`.

## Output contract

Writes only inside the current run folder:

```text
runs/<run-id>/issues/<item>-failure.md
runs/<run-id>/qa-results.json
runs/<run-id>/qa-summary.md
```

Does not modify application code.

## Pipeline

1. Select findings
   - Load `qa-results.json`.
   - Select all `FAIL`, `PARTIAL`, `BLOCKED`, and UX-risk items unless the user names specific items.
   - If multiple triage agents are active, claim each item before writing analysis:

```bash
python3 plugins/qa-operator/scripts/update_qa_result.py <audit-root> \
  --item <id> \
  --claim triage-agent-1 \
  --claim-phase triage
```

2. Gather evidence
   - Read screenshots, trace notes, console logs, network logs, commands, and code references.
   - Reproduce only if needed and safe.

3. Classify
   - Product failure: requirement not implemented or wrong behavior.
   - UX risk: feature works but likely causes user confusion or operational risk.
   - Environment blocker: account/server/data/dependency prevents verification.
   - Test gap: browser behavior observed but automated coverage absent.

4. Write report
   - Include severity, reproduction steps, expected, observed, user impact, evidence paths, root-cause candidates, suggested fix, and repair eligibility.

5. Update results
   - Add issue summary and UX risk entries with `update_qa_result.py`.
   - Release the claim after the issue report is written unless repair will immediately continue with the same owner.

## Severity rubric

| Severity | Meaning |
|---|---|
| `P0` | Data loss, security, payment, irreversible production risk. |
| `P1` | Core flow broken or high-confidence release blocker. |
| `P2` | Important flow degraded, workaround exists. |
| `P3` | Polish, clarity, or low-risk UX issue. |

## Hallucination guardrails

- Do not invent root cause. Use "candidate" unless code/log evidence confirms it.
- Do not call a UX preference a bug unless it blocks or misleads a real workflow.
- Do not hide missing evidence; make it a test gap or blocker.
- Do not triage an actively locked item owned by another agent.

## Done criteria

- Every selected item has an issue report or explicit "no actionable issue" note.
- Evidence links point to existing files.
- Suggested repair path is scoped and safe, or marked `needs-product-decision`.
- `qa-results.json` reflects triage notes.
- Item claim is released or intentionally handed off to repair.
