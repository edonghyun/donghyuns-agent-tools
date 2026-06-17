---
name: start
description: Default UI iteration entry for ui-operator across web, mobile web, native mobile, and local Codex sessions. Use when the user wants screenshot-backed UI improvement checks from a diff, branch, PR, task, baseline/current URLs/builds, previous local session id, page/screen/modal captures, iOS/Android app screenshots, or "UI 개선 중간 확인", "페이지/모달 캡쳐", "모바일 화면 비교", "세션에서 캡처 계획", "before/after 비교", "디자인 변경 확인", "visual compare", "UI review". Writes a ui-operator artifact tree under artifacts/ui-operator/SLUG/ and routes to plan, capture, compare, review, and optional iterate. Do not use for external PoC intake or acceptance-only QA.
---

# UI Operator - Start

## When to use

Use when the user asks to verify or review an in-product UI change with browser or mobile screenshot evidence.

Common prompts:

- "이번 UI 변경 diff 기준으로 페이지/모달 스샷 비교해줘."
- "baseline/current 서버 두 개로 before/after 보고서 만들어줘."
- "iOS/Android 앱 화면도 baseline/current로 비교해줘."
- "이전 Codex session id 보고 화면/모달 캡처 계획 만들어줘."
- "UI 개선 중간 확인하자. 작업 내용에 따른 캡처랑 리뷰 남겨줘."
- "디자인 수정 반복하면서 스샷 찍고 비교해줘."

Do not use for external prototype intake; use `feature-intake`. Do not use for requirements-only acceptance QA; use `qa-operator`.

## Output contract

Writes only under:

```text
artifacts/ui-operator/<slug>/
├── manifest.json
├── capture-plan.json
├── comparison-data.json
├── report.html
├── review.md
├── screenshots/
└── iterations/
```

Never modify application code. If code changes are needed, perform them outside this skill, then use `iterate` to recapture evidence.

## Pipeline

1. Resolve scope
   - Identify task, diff or PR, target repo, platform, baseline URL/build, current URL/build, account, data snapshot, viewports/devices, and priority surfaces.
   - If the user only gives one URL, capture current and mark baseline comparison as unavailable.
   - If the user gives a native mobile app, ask the project for or infer the command that opens each screen/state and writes a screenshot to `UI_OPERATOR_SCREENSHOT_PATH`.
   - If the user gives a local Codex session id, use `session_surface_mapper.mjs` to draft the plan from `~/.codex/sessions`.
   - If the current workspace is not the intended repo, confirm before writing artifacts.

2. Plan
   - Use `ui-operator:plan` behavior.
   - Prefer `affected_surface_mapper.mjs` for a first pass from changed files, then refine route/state recipes from browser inspection.

3. Capture and compare
   - Use `ui-operator:capture` for screenshots and `ui-operator:compare` for side-by-side report generation.
   - Use identical viewport, account, seed data, filters, and state actions for baseline and current.
   - Capture page/screen states and important modal, drawer, bottom sheet, dropdown, tab, and responsive/native states.

4. Review
   - Use `ui-operator:review` to write `review.md`.
   - Classify observations as confirmed regression, UX risk, intentional design change, missing coverage, or blocker.

5. Iterate when requested
   - After code changes, rerun the same state recipes with `ui-operator:iterate`.
   - Keep old evidence; write new evidence under `iterations/<run-id>/` or update the latest report with a clear run timestamp.

## Hallucination guardrails

- Do not claim improvement or regression without screenshot evidence.
- Do not compare screenshots produced from different data, accounts, filters, viewports, device profiles, or app builds without marking the comparison partial.
- Do not invent selectors for modals or dropdowns; inspect the running UI or mark the state as needing selector work.
- Do not treat a product/design preference as a bug unless it blocks, hides, or misleads a real workflow.
- Do not modify product source files inside this skill.

## Done criteria

- Artifact root exists under `artifacts/ui-operator/<slug>/`.
- Capture plan lists every route, viewport, and state that was attempted.
- Screenshots or blockers exist for each planned web or mobile state.
- `comparison-data.json` and `report.html` exist when baseline/current comparison is possible.
- `review.md` exists when the user asked for findings.
- Final response names evidence paths and any blockers.
