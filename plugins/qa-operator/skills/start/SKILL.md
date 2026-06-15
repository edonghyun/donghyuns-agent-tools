---
name: start
description: Default delegated QA entry for qa-operator. Use when the user wants to hand off QA from a requirement source, spreadsheet, issue, PR, feature list, current diff, or staging URL; triggers include "QA 맡겨줘", "완전 QA 돌려줘", "브라우저로 직접 확인해줘", "제대로 구현됐는지 확인해줘", "UI/UX 문제까지 찾아줘", "monitor 켜고 진행상황 보여줘", "실패 항목 재검증해줘", "run QA", "browser QA", "delegated QA". Writes a qa-operator artifact tree under artifacts/qa-operator/SLUG/ and routes to plan, monitor, run, triage, and optional repair. Do not use for pure code review with no browser or acceptance evidence requirement.
---

# QA Operator - Start

`start` is the natural-language entry point. It turns "QA 맡겨줘" into an end-to-end delegated QA workflow.

## When to use

Use when the user asks to verify implementation with browser evidence, monitor progress, inspect UI/UX risks, triage failures, or repair and retest obvious local bugs.

Common prompts:

- "이 시트 31~43번 QA 맡겨줘. monitor 켜고 UI/UX 문제까지 봐줘."
- "현재 PR QA 돌려줘. 실패 항목은 스크린샷과 원인 분석까지 남겨줘."
- "이 기능 완전 검증해줘. 명백한 버그는 고치고 재검증해줘."
- "방금 QA 이어서 FAIL/PARTIAL만 다시 확인해줘."
- "QA 대시보드 열어줘."

Do not use for static-only review when the user does not want browser execution or acceptance evidence.

## Output contract

Writes and updates only the qa-operator artifact tree unless repair is explicitly allowed:

```text
artifacts/qa-operator/<qa-slug>/
├── index.html
├── manifest.json
├── qa-plan.json
└── runs/<run-id>/
    ├── qa-results.json
    ├── qa-summary.md
    ├── commands.log
    ├── browser-console.log
    ├── network-errors.log
    ├── repair-log.md
    ├── screenshots/
    ├── traces/
    └── issues/
```

If repair is allowed, code edits are permitted only for scoped, verifiable local defects, and the affected QA item must be rerun.

## Pipeline

1. Intake
   - Identify requirement source, range, target project or URL, desired environment, and repair mode.
   - If scope is ambiguous and cannot be inferred, ask one concise question. Otherwise proceed with conservative defaults.

2. Plan
   - Use `qa-operator:plan` behavior to create or update `qa-plan.json`.
   - Prefer the helper:
     `python3 plugins/qa-operator/scripts/init_qa_operator.py --slug <slug> --source <source> --range <range>`.

3. Monitor and run in parallel
   - Start `qa-operator:monitor` as soon as the audit root exists.
   - Run `qa-operator:run` while monitor polls `qa-results.json`.
   - If true parallel tool execution is unavailable, start the dashboard server as a long-running session, then continue the run.
   - Keep `monitor` read-only. It must never write item status.
   - Parallel run lanes must use isolated accounts, fixtures, DB rows, uploads, queue jobs, and external resources. Serialize items that cannot be isolated.

4. Triage
   - For every `FAIL`, `PARTIAL`, and `BLOCKED`, apply `qa-operator:triage`.
   - Include screenshots, console/network logs, observed vs expected behavior, root-cause candidates, and next action.
   - When multiple triage agents are active, claim the item before writing issue analysis.

5. Repair, only when allowed
   - Default repair mode is `propose-only`.
   - Use `qa-operator:repair` only when the user allows fixes or asks for auto-repair.
   - Stop for product decisions, destructive data changes, production writes, broad redesign, or ambiguous UX changes.
   - Repair must happen after triage, with an active item claim, and must end with targeted retest evidence.

6. Final report
   - Include dashboard URL, status counts, item table, UX risk list, failure reports, repairs/retests, human decisions, and verification limits.

## Hallucination guardrails

- Do not mark `PASS` from code inspection alone.
- Do not claim UI/UX quality without browser screenshots or explicit visual evidence.
- Do not wait until the end to write results; update `qa-results.json` after each meaningful cycle step.
- Do not let two repair agents work the same item. Use item `lock` and `owner`.
- Do not hide blocked conditions. Mark `BLOCKED` with the account, data, environment, or permission blocker.
- Do not auto-repair product decisions. Use `needs-product-decision`.

## Done criteria

- `qa-plan.json` exists with normalized QA items.
- `index.html` can load `manifest.json`, `qa-plan.json`, and latest `qa-results.json`.
- A run folder exists with incremental results and evidence.
- Every item has a final status or an explicit blocker.
- FAIL/PARTIAL/BLOCKED items have triage notes or issue reports.
- Any repaired item has a targeted retest after the fix.
- Final answer links the dashboard and summarizes evidence and limits.
