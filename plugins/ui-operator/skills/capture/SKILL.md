---
name: capture
description: Capture UI screenshots for ui-operator web route/state plans and native mobile screen/state plans, including pages, screens, modals, dropdowns, drawers, bottom sheets, tabs, and responsive states. Use for "페이지 캡처", "모바일 화면 캡처", "iOS/Android 스샷", "모달 스샷", "상태별 스크린샷", "baseline/current 캡처", "capture UI states", "modal screenshots". Writes screenshots and comparison-data.json under artifacts/ui-operator/SLUG/. Do not use for external PoC intake.
---

# UI Operator - Capture

## When to use

Use after a capture plan exists, or when the user gives explicit web routes or mobile screens and asks for current-only or baseline/current screenshots.

If the capture validates current UI against original PoC/screenshots/spec feedback, read `../../docs/REQUIREMENT-PARITY-REVIEW.md` and capture the exact requirement states, not only stable page screenshots.

## Output contract

Writes only under:

```text
artifacts/ui-operator/<slug>/
├── comparison-data.json
├── screenshots/
│   ├── baseline/
│   └── current/
└── capture-log.md
```

May create `report.html` only when the bundled comparison script is used. Never modify app code.

## Pipeline

1. Verify environment
   - For web, confirm target URLs load and login/setup scripts work on both baseline and current.
   - For native mobile, confirm simulator/device, installed app build, deep link/test flow, and screenshot command work.
   - Confirm data snapshot, account, filters, viewport/device profile, and app build are consistent.
   - For parity work, confirm baseline evidence source and current evidence source are labeled separately in output metadata or capture notes.

2. Run capture
   - Prefer this for web and mobile web:

```bash
node plugins/ui-operator/scripts/visual_compare_capture.mjs \
  --baseline-url <baseline-url> \
  --current-url <current-url> \
  --plan artifacts/ui-operator/<slug>/capture-plan.json \
  --out artifacts/ui-operator/<slug>
```

   - Use `--setup-script`, `--baseline-setup-script`, or `--current-setup-script` when login is required.
   - Use `--routes` and `--viewport` for quick ad hoc runs when no plan exists.
   - Prefer this for native mobile:

```bash
node plugins/ui-operator/scripts/native_mobile_capture.mjs \
  --plan artifacts/ui-operator/<slug>/capture-plan.json \
  --out artifacts/ui-operator/<slug>
```
   - For requirement parity, add targeted screenshots for each requirement-critical state: before, clicked/loading, result, modal/detail, editable candidate, apply/cancel/regenerate, final generated report, and disabled/error states.

3. Inspect blockers
   - If a route fails, capture the error in `comparison-data.json`.
   - If an action selector fails, keep the plain route screenshot and mark the state as partial or blocked.

4. Preserve evidence
   - Do not delete old screenshots unless the user explicitly asks.
   - Use a new output slug or iteration folder when rerunning after meaningful code changes.

## Hallucination guardrails

- Do not claim a modal, bottom sheet, dropdown, or native screen was captured unless its screenshot exists.
- Do not ignore console or network errors; record them as evidence.
- Do not click destructive controls unless the user explicitly confirms disposable data.
- Do not compare pages or mobile screens that loaded with different auth, seed data, device profile, or app build without a partial marker.
- Do not claim a requirement is captured unless the screenshot shows the relevant state or the blocker is recorded.
- Do not use full-page capture artifacts such as duplicated sticky headers as proof of UI defects; retake viewport or segment screenshots when needed.

## Done criteria

- Screenshots exist for every successfully loaded route/state/viewport.
- Failures are recorded in `comparison-data.json`.
- Console and network errors are captured when present.
- Requirement-critical interactions have current evidence or blocker notes when parity is in scope.
- The final response names the artifact root and any blocked states.
