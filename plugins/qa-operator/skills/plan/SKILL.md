---
name: plan
description: Convert requirements into a qa-operator plan. Use when the user provides a spreadsheet, issue list, PR, current diff, feature checklist, staging URL, or range and wants browser QA planned before execution; triggers include "QA 계획", "qa-plan.json", "요구사항 정리", "시트 범위 QA", "테스트 케이스로 바꿔줘", "plan QA", "acceptance plan". Writes artifacts/qa-operator/SLUG/qa-plan.json, manifest.json, index.html, and an initialized run skeleton. Do not use when the user only wants to run an already existing plan.
---

# QA Operator - Plan

Create the normalized QA plan and artifact root that `monitor` and `run` use.

## When to use

Use when the user supplies requirements and wants them converted into executable browser QA cases.

Inputs can be:

- Google Sheet or CSV rows
- issue/PR descriptions
- Markdown checklists
- current git diff
- staging URL plus user-described scope
- natural-language feature list

## Output contract

Writes under:

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

Never modify application code.

## Pipeline

1. Resolve scope
   - Determine source, range, target project/URL, actors, environment, and repair mode.
   - If the user says "31-43", prefer an explicit numbered requirement column over visual spreadsheet row numbers unless evidence says otherwise.

2. Normalize items
   - For each item, capture `id`, `title`, `requirement`, `area`, `actors`, `viewports`, `acceptance`, `screenshotPoints`, and `uxHeuristics`.
   - Also capture `dataIsolation` when parallel execution may touch mutable accounts, students, DB rows, files, queues, or external services.
   - Keep uncertain details as empty arrays or notes; do not invent account credentials or expected behavior.

3. Initialize artifact root
   - Prefer the helper script:

```bash
python3 plugins/qa-operator/scripts/init_qa_operator.py \
  --slug <qa-slug> \
  --source <source-url-or-path> \
  --range "<range>" \
  --items <items-json>
```

4. Review plan quality
   - Confirm every item has a user-observable expected behavior or a documented ambiguity.
   - Confirm UX scan is enabled by default.
   - Confirm screenshots are required.
   - Confirm parallel safety defaults exist: monitor read-only, repair requires triage, targeted retest required, and data collision policy.

## Hallucination guardrails

- Do not transform unclear requirements into precise expected behavior without marking the inference.
- Do not include real production credentials in `qa-plan.json`.
- Do not plan destructive data actions unless the user explicitly asks and confirms safety.
- Do not mark shared mutable data as parallel-safe without a fixture/account isolation strategy.
- Do not skip UX heuristics; every item needs at least a default UX scan.

## Done criteria

- `qa-plan.json` exists and is valid JSON.
- `manifest.json` points to the latest run.
- `index.html` exists.
- `runs/<run-id>/qa-results.json` exists with every item initialized to `PENDING`.
- The user can proceed to `monitor` and `run`.
