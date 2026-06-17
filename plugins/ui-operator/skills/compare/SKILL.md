---
name: compare
description: Generate a ui-operator side-by-side baseline/current comparison report from web URLs, native mobile capture commands, a capture plan, or existing screenshot folders. Use for "before/after 비교", "baseline current 비교", "모바일 화면 비교", "비교 리포트", "visual diff", "side-by-side report", "스크린샷 비교". Writes artifacts/ui-operator/SLUG/report.html and comparison-data.json only. Do not modify source code.
---

# UI Operator - Compare

## When to use

Use when baseline and current captures should be compared, either by running the capture script or by reading existing output folders.

## Output contract

Writes only:

```text
artifacts/ui-operator/<slug>/comparison-data.json
artifacts/ui-operator/<slug>/report.html
```

If it must capture missing screenshots, it may also write under `screenshots/` in the same artifact root. Never modify application code.

## Pipeline

1. Load comparison inputs
   - Prefer `capture-plan.json` plus baseline/current URLs for web.
   - Prefer `capture-plan.json` plus native command recipes for mobile apps.
   - If screenshots already exist, verify naming and route/state metadata in `comparison-data.json`.

2. Generate or refresh evidence
   - Use `visual_compare_capture.mjs` when URLs are available.
   - Keep viewport, account, and state actions identical.

3. Compare
   - Review side-by-side screenshots.
   - Compare final URLs, document titles, visible text metrics, button/link/input counts, dialogs, console errors, and network errors.
   - Treat script-reported metric changes as prompts for inspection, not automatic bugs.

4. Write report
   - Include route, state, viewport, baseline image, current image, status, errors, and metric deltas.
   - Keep blocked states visible in the report.

## Hallucination guardrails

- Do not call a visual change a regression from metrics alone.
- Do not hide states that failed to capture.
- Do not claim pixel-perfect comparison unless a pixel diff tool was actually run.
- Do not compare screenshots from different viewport sizes, device profiles, app builds, or data states.

## Done criteria

- `report.html` opens locally and references existing screenshots.
- `comparison-data.json` includes every attempted capture.
- Blockers and partial comparisons are explicit.
- The final response points to the report path.
