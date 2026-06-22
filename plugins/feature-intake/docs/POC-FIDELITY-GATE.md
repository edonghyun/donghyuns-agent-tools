# PoC Fidelity Gate

Use this gate whenever a feature is being built from an external PoC, demo, prototype, business-team artifact, or supplied screenshots.

The goal is not visual cloning. The goal is preventing silent requirement loss: simplified data, missing states, missing default selections, missing modal/detail behavior, AI actions that do not use the recommended command, or final result pages that are much thinner than the PoC.

## Why Requirements Drifted

Common failure modes:

- The analysis captured the current implementation but did not keep the original PoC as a baseline.
- Screen labels matched, so data richness and section structure were assumed to match.
- Button presence was checked, but the actual click result, auto-filled command, modal, loading, and generated output were not compared.
- Productization decisions were mixed with PoC facts, so intentional changes and accidental omissions looked the same.
- The final/review page was treated as a submission wrapper even though the PoC used it as a rich generated result.
- AI actions were mocked only as "returns some text" instead of preserving the interaction contract: recommendation -> rewrite -> editable candidate -> apply/cancel/regenerate.

## Required Baseline Contract

Before mapping or implementing, create a PoC baseline contract from screenshots, source code, and runtime capture.

Record at least:

| Area | What to preserve or explicitly reject |
|---|---|
| Screens | Page order, wizard stage names, route/view boundaries, first visible default state. |
| Sections | Every visible section/card/list group and whether it is required, optional, generated, or review-only. |
| Data richness | Option sets, grouped lists, counts, badges, generated text length, example records, nested analysis objects. |
| Controls | Buttons, tabs, chips, dropdowns, file inputs, copy/download/export, regenerate/apply/cancel/edit controls. |
| Click reactions | Before, loading, result, modal/drawer, toast, disabled guard, error, mutation, output. |
| AI behavior | Input command, preset/auto command, generated result, editable candidate, apply/cancel/regenerate path, token/quota state. |
| Final output | Review/result page density, summary sections, next-step advice, export/submission/source-document behavior. |

## Fidelity Matrix

Write `analysis/poc-fidelity-matrix.md` when the task mentions existing PoC parity, "기존 전달받은 UI", "PoC처럼", "대부분이 달라", "버튼 눌렀을 때", or screenshots from the original artifact.

Use this table:

```markdown
| PoC requirement | Baseline evidence | Current implementation | Status | Gap | Fix direction |
|---|---|---|---|---|---|
| Example: subject list is grouped by curriculum area with many choices | screenshots/pages/01-info-configured.png | current setup shows simplified subject chips | missing | Data model was collapsed | Restore grouped subject data and selected counts |
```

Statuses:

- `match`: current behavior and density match the PoC contract.
- `partial`: same concept exists but data, state, or interaction depth is weaker.
- `missing`: requirement is absent.
- `intentional-deviation`: product deliberately changed it and the rationale is documented.
- `blocked`: cannot verify from available evidence.

## Non-Negotiable Checks

- Do not mark a screen as covered just because the same title exists.
- Do not mark a button as covered just because it is visible; verify its clicked state.
- Do not simplify option/data sets unless the simplification is recorded as `intentional-deviation`.
- Do not replace PoC final output with a thin wrapper page unless explicitly approved.
- For AI or generated flows, capture the command source and visible result, not only the spinner.
- If the user supplies screenshots during review, add them to the matrix as new baseline evidence and rerun the affected current states.

## Handoff Requirements

The final feature-intake package should explicitly state:

- which PoC behaviors are preserved,
- which are intentionally productized differently,
- which are missing or unresolved,
- which screenshots prove each claim,
- which implementation tasks are needed to close partial/missing rows.
