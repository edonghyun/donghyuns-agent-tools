# QA Operator Concepts

## Delegated QA

Delegated QA means the user supplies intent and scope, while the agent handles planning, environment setup, browser execution, evidence capture, status updates, failure analysis, and optional repair.

## Natural Entry

Users should not need to remember `/qa-operator:run`. The normal entry is:

```text
QA 맡겨줘. monitor 켜고 UI/UX 리스크까지 봐줘.
```

The `start` skill routes to `plan`, `monitor`, `run`, `triage`, and optionally `repair`.

## Run Folder

Every QA effort lives under:

```text
artifacts/qa-operator/<qa-slug>/
```

The root contains stable files (`manifest.json`, `qa-plan.json`, `index.html`). Each execution creates a timestamped run under `runs/<run-id>/`.

## Writer and Reader Split

- `run` is the writer. It updates `qa-results.json`, screenshots, traces, and logs.
- `monitor` is the reader. It polls `manifest.json`, `qa-plan.json`, and the latest run results.

This split keeps the dashboard honest: it displays evidence produced by QA, not hand-edited UI state.

## Parallel Work Queue

Parallel QA is safe only when every agent treats `qa-results.json` as the shared work queue.

Each item may carry:

```json
{
  "phase": "triage",
  "owner": "triage-agent-1",
  "lock": {
    "owner": "triage-agent-1",
    "phase": "triage",
    "claimedAt": "2026-06-12T07:30:00Z",
    "expiresAt": "2026-06-12T08:00:00Z"
  },
  "repairStatus": "proposed"
}
```

Rules:

- Claim before triage, repair, or retest when multiple agents are active.
- Respect active locks owned by other agents.
- Let stale locks expire, or force-release only when the prior owner is gone and the user/lead agent accepts the risk.
- Release the claim after the phase is done.

## Data Isolation

Parallel `run` agents must not mutate the same account, student, DB row, uploaded file, queue job, or external resource. The plan should assign dedicated fixtures or accounts per item or per lane. If isolation is impossible, serialize those items instead of running them in parallel.

## Statuses

| Status | Meaning |
|---|---|
| `PASS` | Browser behavior, screenshots, and validation support the requirement. |
| `PARTIAL` | Core behavior exists but coverage, UX, data, or edge cases are incomplete. |
| `FAIL` | Reproducible missing or broken behavior. |
| `BLOCKED` | Verification could not proceed because of account, environment, data, permission, or external dependency. |
| `N/A` | Confirmed not in scope, rejected by product, or intentionally not implemented. |
| `PENDING` | Not started or not yet evidenced. |

## Required Cycle

Each item is checked through:

1. Server access
2. Login
3. Feature check
4. Validation
5. UI/UX risk scan

## UX Risk Scan

Functional PASS is not enough. QA must also look for discoverability, state feedback, mobile/tablet layout, data safety, long text handling, accessibility, and error recovery risks. Severe UX risk can lower an item to `PARTIAL`.

## Safety Gates

Agents may run local/staging QA, create test data, collect evidence, and fix obvious local bugs when allowed. Agents must stop for human decision before production writes, destructive actions, ambiguous product behavior, data deletion, mass messaging, or design choices with competing valid outcomes.
