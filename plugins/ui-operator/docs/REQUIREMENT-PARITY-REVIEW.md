# Requirement Parity Review

Use this guide when a UI review is not just "does it look better?" but "does the current implementation still satisfy the original PoC, screenshots, product request, or previously agreed behavior?"

This is the mode that should catch mismatches like:

- a PoC had a rich grouped input, but current UI has a simplified chip list,
- a connection-analysis result had contradiction/overlap/rewrite sections, but current UI only has a summary card,
- a recommended rewrite button should auto-use the AI recommendation, but current UI asks the user to type a command,
- a final page should show a rich next-semester report, but current UI only shows a thin submit wrapper.

## Review Inputs

Collect and label all sources before judging the current UI:

- `baseline-poc`: original PoC runtime screenshots or supplied screenshots.
- `baseline-spec`: product notes, Notion feedback, implementation spec, or requirement docs.
- `current`: current app screenshots after the latest implementation.
- `interaction-current`: current button/modal/loading/result screenshots.
- `decision`: any explicitly approved product deviation.

## Parity Finding Types

Add these finding types to `review.md` when applicable:

- `requirement-mismatch`: current UI contradicts or omits an original requirement.
- `density-loss`: same screen exists but data richness, generated content depth, grouped sections, or option set is materially thinner.
- `interaction-mismatch`: control exists but click behavior, auto command, modal/result state, apply/cancel/regenerate path differs.
- `state-missing`: required empty/loading/result/error/modal/disabled/editing/submitted state is not captured or not implemented.
- `intentional-deviation`: current UI differs from PoC, but rationale and approval are documented.

## Parity Matrix

When a user says "PoC랑 다르다", "기존 전달받은 UI", "요구사항 반영이 안 됐다", "이미지 참고", or similar, write a parity matrix section:

```markdown
## Requirement Parity Matrix

| Requirement / PoC behavior | Baseline evidence | Current evidence | Status | Finding type | Required fix |
|---|---|---|---|---|---|
| Connection rewrite shows 조정 권장 badge and auto-generates editable candidate | baseline/connection-rewrite.png | current/connection-rewrite.png | partial | interaction-mismatch | Use recommendation.suggestedCommand on rewrite click and open editable candidate |
```

Statuses:

- `match`
- `partial`
- `missing`
- `intentional-deviation`
- `blocked`

## Capture Expectations

For each mismatched or high-risk requirement, capture:

- before state,
- the exact control clicked,
- loading state if async,
- result state,
- modal/drawer/detail state if opened,
- after apply/cancel/regenerate if the control supports it.

For AI flows, also record:

- command source: preset, user input, or system recommendation,
- whether the result visibly reflects the command,
- whether the candidate is editable,
- whether apply/cancel/regenerate paths are visible and captured.

## Review Wording

Prefer specific findings:

- Bad: "The page is less detailed."
- Good: "`final-review` is a density-loss: baseline includes strengths, 5 next-semester directions, and closing comment; current only shows a collapsed 'next advice' button. Restore the rich report or mark the simplification as intentional-deviation."

Never treat "same route exists" or "same button label exists" as parity.
