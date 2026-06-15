---
name: analyze
description: Write screenshot-backed user flow, user journey, use case, screen annotation, page inventory, and feature inventory analysis for a feature artifact. Use after capture/framing when the user asks for "유저플로우", "유저저니", "유즈케이스", "화면별 기능 해설", "페이지별 분석", "screen-by-screen analysis", "user journey". Writes docs/feature-intake/SLUG/analysis/*.md. Do not use when product framing is still completely unknown unless assumptions are clearly marked.
---

# Feature Intake - Analyze

Turn evidence and product framing into readable product analysis.

## When to use

Use after at least partial `inspect`, `capture`, and `frame`.

If screenshots are missing, the analysis may proceed only if it clearly marks screenshot coverage as blocked or unavailable.

## Output contract

Writes only:

```text
docs/feature-intake/<slug>/analysis/
├── user-flow.md
├── user-journeys.md
├── use-cases.md
├── page-inventory.md
├── feature-inventory.md
└── screen-by-screen.md
```

May update `qa/feature-coverage-matrix.md` only to add analysis coverage statuses, not browser QA results.

Never modify source code.

## Pipeline

1. User flow
   - Describe the end-to-end workflow in steps.
   - Attach screenshot references to each major step.
   - Include entry, input, processing, review, output, and exit.

2. User journeys
   - Write journeys by actor slot.
   - Include motivation, trigger, actions, friction, confidence moments, handoff, and outcome.
   - Keep actor assumptions visible.

3. Use cases
   - Normal path.
   - Exception path.
   - Operational/admin path.
   - Regeneration/editing path.
   - Export/share/save path.
   - Blocked/unreachable path.

4. Page inventory
   - List every page/view discovered.
   - Include screenshot, purpose, actor, controls, data, output, and notes.

5. Feature inventory
   - List features/actions with trigger, expected result, evidence, status, and product interpretation.

6. Screen-by-screen annotations
   - For each important screenshot, explain visible controls, user intent, state, data dependency, and open product questions.

## Hallucination guardrails

- Do not say a journey is "student-facing", "admin-facing", or similar unless framed as known or assumed.
- Do not hide screenshot gaps.
- Do not merge product decisions into use case facts.
- Do not overfit to one domain-specific PoC; keep reusable structure.

## Done criteria

- User flow is readable with screenshot links.
- User journeys exist for all known/assumed actor slots.
- Use cases include normal, exception, operational, regeneration/editing, and output destination paths where relevant.
- Screen annotations cite screenshots.
- Inventories use statuses consistently.
