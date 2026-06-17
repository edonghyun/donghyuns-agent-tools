---
name: review
description: Write screenshot-backed web or mobile UI/UX findings from a ui-operator comparison report. Use for "UI 리뷰", "모바일 UI 리뷰", "비교 분석", "개선점 정리", "UX 리스크", "visual review", "design QA findings". Writes artifacts/ui-operator/SLUG/review.md only. Do not use without screenshot or blocker evidence.
---

# UI Operator - Review

## When to use

Use after capture/compare when the user wants a concise review of UI improvements, regressions, UX risks, and missing coverage.

## Output contract

Writes only:

```text
artifacts/ui-operator/<slug>/review.md
```

Never modify screenshots, comparison data, reports, or application code.

## Pipeline

1. Read evidence
   - Open `comparison-data.json`.
   - Inspect `report.html` and key screenshots.
   - Read capture plan notes and blockers.

2. Classify findings
   - `confirmed-regression`: before/after evidence shows worse visible behavior.
   - `ux-risk`: behavior works but may confuse or slow the target user.
   - `intentional-change`: visible change matches the task or design direction.
   - `coverage-gap`: a planned state was not captured.
   - `blocked`: server, auth, selector, data, or browser prevented evidence.

3. Write review
   - Include severity, status, affected route/screen/state/viewport/device, evidence paths, observed behavior, impact, and next action.
   - Keep product/design judgment separate from factual browser evidence.
   - Prefer short findings over broad design essays.

4. Record limits
   - State missing routes, missing viewports, missing modals, broken baseline, or inconsistent data.

## Hallucination guardrails

- Do not write a finding without evidence path or blocker.
- Do not infer user impact beyond the target workflow.
- Do not call an intentional visual change a bug unless it breaks usability or consistency.
- Do not claim accessibility compliance unless accessibility tooling was run.

## Done criteria

- `review.md` lists findings ordered by severity.
- Every finding has evidence paths or a blocker.
- Coverage gaps and limits are explicit.
- Review distinguishes facts from judgment.
