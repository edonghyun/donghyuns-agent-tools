---
name: iterate
description: Rerun ui-operator web or mobile capture, compare, and review after UI code changes, preserving prior evidence. Use for "다시 캡처", "모바일 다시 캡처", "개선 후 재비교", "반복 확인", "rerun UI compare", "iterate visual review", "after fix screenshots". Writes a new artifacts/ui-operator/SLUG/iterations/RUN_ID/ evidence set or updates review.md with iteration notes. Do not modify product code.
---

# UI Operator - Iterate

## When to use

Use after the user or agent has changed UI code and wants the same page/state evidence rerun.

## Output contract

Writes only under:

```text
artifacts/ui-operator/<slug>/iterations/<run-id>/
├── comparison-data.json
├── report.html
├── review.md
└── screenshots/
```

May append an iteration summary to:

```text
artifacts/ui-operator/<slug>/review.md
```

Never modify product source files.

## Pipeline

1. Load prior run
   - Read the original `capture-plan.json`, `comparison-data.json`, `report.html`, and `review.md` if present.
   - Identify findings or blocked states that need recapture.

2. Decide rerun scope
   - Default to rerunning affected route/screen/state/viewports/devices only.
   - Rerun the full plan when layout primitives, theme tokens, navigation, or global components changed.

3. Capture again
   - Use the same baseline/current URLs when still valid.
   - If current URL changed, record it in the iteration manifest.
   - Write into `iterations/<run-id>/`, not over the prior evidence.

4. Compare and review
   - Note which findings resolved, remain, became worse, or are still blocked.
   - Include new screenshot paths for each status change.

## Hallucination guardrails

- Do not mark resolved without a fresh after screenshot.
- Do not reuse old screenshots as evidence for a new iteration.
- Do not change the original plan silently; record any route/state changes.
- Do not broaden into unrelated UI review unless the user asks.

## Done criteria

- New iteration folder exists.
- Rerun scope is documented.
- Changed findings include new evidence paths.
- Remaining blockers are explicit.
