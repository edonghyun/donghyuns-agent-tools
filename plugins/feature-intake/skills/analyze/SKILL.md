---
name: analyze
description: Write screenshot-backed user flow, user journey, use case, screen annotation, page inventory, and feature inventory analysis for a feature artifact. Use after capture/framing when the user asks for "유저플로우", "유저저니", "유즈케이스", "화면별 기능 해설", "페이지별 분석", "screen-by-screen analysis", "user journey". Writes docs/feature-intake/SLUG/analysis/*.md. Do not use when product framing is still completely unknown unless assumptions are clearly marked.
---

# Feature Intake - Analyze

Turn evidence and product framing into readable product analysis.

For generalized state names, page-walk targets, and control-reaction categories, read `../../docs/STATE-TAXONOMY.md` before writing `button-handling.md` or wireframe-oriented screen annotations.

If the feature artifact is being used as a baseline for implementation, or the user reports that the current product differs from the PoC/screenshots, read `../../docs/POC-FIDELITY-GATE.md` and write `poc-fidelity-matrix.md`.

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
├── button-handling.md
├── screen-by-screen.md
└── poc-fidelity-matrix.md   # when PoC/current parity is in scope
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

7. Button handling and reactions
   - Write `button-handling.md` when the artifact has meaningful buttons, tabs, CTAs, modals, AI actions, exports, or wizard controls.
   - Group controls by screen.
   - If page-walk capture was used, summarize reachable routes, discovered links, skipped mutation controls, and blocked targets from `screenshots/page-walk-results.json`.
   - For each important control, include label, handler/source evidence if available, reaction type, click result, screenshot evidence, and wireframe notes.
   - Cover disabled, loading, success, failure, modal, copy/download/export, and back/navigation reactions.
   - Mark uncaptured reactions as `source-confirmed`, `blocked`, or `unknown`; do not imply visual evidence exists when it does not.

8. PoC fidelity matrix
   - Write `poc-fidelity-matrix.md` when a PoC, supplied screenshot, or previous analysis package is a source of truth for implementation.
   - Compare PoC baseline evidence against current implementation evidence screen by screen and interaction by interaction.
   - Include data richness and generated output depth, not just visible labels.
   - Use statuses `match`, `partial`, `missing`, `intentional-deviation`, and `blocked`.
   - Treat "same button label but different clicked behavior" as `partial` or `missing`, never `match`.

## Hallucination guardrails

- Do not say a journey is "student-facing", "admin-facing", or similar unless framed as known or assumed.
- Do not hide screenshot gaps.
- Do not merge product decisions into use case facts.
- Do not overfit to one domain-specific PoC; keep reusable structure.
- Do not merge intentional product decisions with accidental omissions; label intentional deviations separately.
- Do not call a current implementation faithful unless baseline evidence and current evidence both exist.

## Done criteria

- User flow is readable with screenshot links.
- User journeys exist for all known/assumed actor slots.
- Use cases include normal, exception, operational, regeneration/editing, and output destination paths where relevant.
- Screen annotations cite screenshots.
- Button handling exists for interactive artifacts and maps controls to reaction states/evidence.
- When relevant, `poc-fidelity-matrix.md` lists every important PoC screen/control/output with parity status and fix direction.
- Inventories use statuses consistently.
