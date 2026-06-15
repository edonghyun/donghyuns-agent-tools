---
name: monitor
description: Serve or open the qa-operator live dashboard. Use when the user wants to monitor QA progress, see a dashboard, watch run status, view screenshots as they appear, or continue an existing QA dashboard; triggers include "monitor 켜줘", "대시보드 열어줘", "진행상황 보여줘", "QA dashboard", "live monitor", "실시간으로 보고싶어". Reads manifest.json, qa-plan.json, and runs/latest or latestRun qa-results.json; writes no QA results.
---

# QA Operator - Monitor

Serve the dashboard that watches a QA run.

## When to use

Use after `plan` initializes an audit root, or anytime the user asks to view QA progress.

## Output contract

May create or refresh only:

```text
artifacts/qa-operator/<qa-slug>/index.html
```

Does not edit `qa-results.json`; it only reads `manifest.json`, `qa-plan.json`, and latest results.

Monitor is always read-only. It must never claim an item, change status, resolve issues, release locks, or write `qa-results.json`.

## Pipeline

1. Locate audit root
   - Use the path from the user, current `manifest.json`, or the newest folder under `artifacts/qa-operator/`.

2. Ensure dashboard exists
   - If `index.html` is missing, copy `plugins/qa-operator/assets/dashboard-template.html`.

3. Serve over HTTP
   - Prefer:

```bash
python3 plugins/qa-operator/scripts/serve_qa_dashboard.py artifacts/qa-operator/<slug>
```

   - Use `--open` if the user wants the default browser opened.
   - Keep the server session running while `run` updates files.

4. Report URL
   - Tell the user the dashboard URL.
   - If fetch fails from `file://`, explain that the server URL is required.

## Hallucination guardrails

- Do not hand-edit item statuses in the dashboard.
- Do not use monitor as a shortcut to release locks or repair statuses.
- Do not claim live monitoring if the dashboard cannot read JSON.
- Do not kill an active QA run server unless the user asks.

## Done criteria

- Dashboard URL is available.
- Dashboard can fetch `manifest.json`.
- Dashboard can fetch `qa-plan.json`.
- Dashboard can fetch latest `qa-results.json`.
- The final response includes the URL or the blocker.
