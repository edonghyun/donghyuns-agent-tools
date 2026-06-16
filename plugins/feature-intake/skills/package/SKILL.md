---
name: package
description: Assemble the final feature-intake handoff package. Use when screenshots, product framing, analysis, integration fit, and QA/coverage notes need to be indexed into a deliverable README with contact sheets and next decisions; triggers include "분석 패키지 정리", "handoff 정리", "README 만들어줘", "contact sheet 포함", "최종 문서 묶어줘", "package feature intake". Writes docs/feature-intake/SLUG/README.md, screenshot indexes, manifest updates, and qa/feature-coverage-matrix.md.
---

# Feature Intake - Package

Assemble the intake output into a reviewer-friendly handoff package.

For wireframe/page-state and button-reaction package expectations, use `../../docs/STATE-TAXONOMY.md` when present in the intake.

## When to use

Use at the end of intake, or when the user asks for a shareable summary with screenshots.

## Output contract

Writes only:

```text
docs/feature-intake/<slug>/
├── README.md
├── intake-manifest.json
├── screenshots/README.md
├── screenshots/contact-sheets/README.md
└── qa/
    └── feature-coverage-matrix.md
```

May update existing analysis files only to fix links or evidence references.

Never modify artifact or product source code.

## Pipeline

1. Validate package shape
   - Confirm expected folders exist.
   - Confirm screenshots or blockers are indexed.
   - Confirm analysis docs are present.

2. Build screenshot indexes
   - Page screenshots.
   - Interaction screenshots.
   - Dialog screenshots.
   - Edge screenshots.
   - Contact sheets.
   - Wireframe/page-state contact sheet when available.

3. Build feature coverage matrix
   - Feature/action.
   - Trigger.
   - Expected result.
   - Evidence.
   - Status.
   - Product interpretation.
   - Remaining question.
   - Link to `analysis/button-handling.md` when present.

4. Write top-level README
   - Artifact source.
   - Existing product target.
   - Quick result summary.
   - Most useful contact sheets.
   - Wireframe/page-state sheet when available.
   - Product framing highlights.
   - User flow/journey/use case links.
   - Button handling/reaction matrix link when available.
   - Integration recommendation.
   - Risks/blockers.
   - MVP/backlog.
   - Decision questions.

5. Final quality pass
   - Broken links.
   - Missing screenshots.
   - Unlabeled assumptions.
   - Ambiguous statuses.
   - Overclaiming.

## Hallucination guardrails

- Do not mark the package complete if capture failed without saying so.
- Do not bury unknowns; list them near the top.
- Do not summarize away blockers.
- Do not pretend a product decision was made by the artifact.

## Done criteria

- Top-level README is the single starting point.
- Contact sheets are linked prominently when available.
- Wireframe/page-state and button-handling artifacts are linked when the intake includes interactive UI evidence.
- Coverage matrix exists.
- Every major claim has evidence, assumption status, or explicit unknown.
- Final response links package root and key screenshot sheets.
