---
name: analyze
description: Write screenshot-backed user flow, user journey, use case, screen annotation, page inventory, and feature inventory analysis for a feature artifact. Use after capture/framing when the user asks for "유저플로우", "유저저니", "유즈케이스", "화면별 기능 해설", "페이지별 분석", "screen-by-screen analysis", "user journey". Writes docs/feature-intake/SLUG/analysis/*.md. Do not use when product framing is still completely unknown unless assumptions are clearly marked.
---

# Feature Intake - Analyze

Turn evidence and product framing into readable product analysis.

For generalized state names, page-walk targets, and control-reaction categories, read `../../docs/STATE-TAXONOMY.md` before writing `button-handling.md` or wireframe-oriented screen annotations.

When writing specs, user flows, user journeys, use cases, implementation handoff, QA inputs, or merge planning, read `../../docs/SPEC-EXTRACTION-PROTOCOL.md` and write `action-graph.md` before the derived prose documents.

When analyzing page entry conditions, action execution conditions, backend guards, permissions, roles, ownership, tenant boundaries, lifecycle states, quota, or feature flags, read `../../docs/CONDITION-INSPECT-PROTOCOL.md` and write condition tables, JSON data, and Mermaid visuals.

If the feature artifact is being used as a baseline for implementation, or the user reports that the current product differs from the PoC/screenshots, read `../../docs/POC-FIDELITY-GATE.md` and write `poc-fidelity-matrix.md`.

## When to use

Use after at least partial `inspect`, `capture`, and `frame`.

If screenshots are missing, the analysis may proceed only if it clearly marks screenshot coverage as blocked or unavailable.

## Output contract

Writes only:

```text
docs/feature-intake/<slug>/analysis/
├── action-graph.md
├── condition-graph.md
├── condition-graph.json
├── condition-visuals.md
├── page-entry-conditions.md
├── action-preconditions.md
├── server-guard-inventory.md
├── user-flow.md
├── user-journeys.md
├── use-cases.md
├── page-inventory.md
├── feature-inventory.md
├── button-handling.md
├── screen-by-screen.md
└── poc-fidelity-matrix.md   # when PoC/current parity is in scope
```

May update `qa/feature-coverage-matrix.md`, `qa/condition-probe-matrix.md`, and `qa/spec-extraction-audit.md` only to add analysis coverage statuses, not browser QA results.

Never modify source code.

## Pipeline

1. Action graph
   - Merge static action candidates, page-walk results, screenshots, handler/source evidence, product framing, and blockers.
   - Use stable IDs for surfaces, states, actions, transitions, outputs, and rules.
   - Include actor, surface, state, action, trigger, reaction, destination/output, evidence, status, and next check.
   - Status each row as `verified`, `source-confirmed`, `captured`, `blocked`, `unknown`, `decision-needed`, or `out-of-scope`.

2. Condition graph and visuals
   - Merge frontend route guards, UI guards, validation schemas, backend middleware, RBAC/permission checks, ownership/tenant checks, service/domain preconditions, DB constraints, tests, runtime probes, and API probes.
   - Write `condition-graph.md` as the canonical table.
   - Write `condition-graph.json` with the same IDs for downstream QA/test generation.
   - Write `condition-visuals.md` with Mermaid dependency graphs, frontend-backend enforcement chains, and role/data matrices.
   - Write `page-entry-conditions.md`, `action-preconditions.md`, and `server-guard-inventory.md` when those scopes are present.
   - Mark frontend-only guard evidence as `partial` until server enforcement is checked or explicitly out of scope.

3. User flow
   - Describe the end-to-end workflow in steps.
   - Attach screenshot references to each major step.
   - Reference action/transition IDs from `action-graph.md`.
   - Include entry, input, processing, review, output, and exit.

4. User journeys
   - Write journeys by actor slot.
   - Include motivation, trigger, actions, friction, confidence moments, handoff, and outcome.
   - Keep actor assumptions visible.
   - Reference action/transition IDs for major journey moments.

5. Use cases
   - Normal path.
   - Exception path.
   - Operational/admin path.
   - Regeneration/editing path.
   - Export/share/save path.
   - Blocked/unreachable path.

6. Page inventory
   - List every page/view discovered.
   - Include screenshot, purpose, actor, controls, data, output, and notes.

7. Feature inventory
   - List features/actions with trigger, expected result, evidence, status, and product interpretation.

8. Screen-by-screen annotations
   - For each important screenshot, explain visible controls, user intent, state, data dependency, and open product questions.

9. Button handling and reactions
   - Write `button-handling.md` when the artifact has meaningful buttons, tabs, CTAs, modals, AI actions, exports, or wizard controls.
   - Group controls by screen.
   - If page-walk capture was used, summarize reachable routes, discovered links, skipped mutation controls, and blocked targets from `screenshots/page-walk-results.json`.
   - For each important control, include label, handler/source evidence if available, reaction type, click result, screenshot evidence, and wireframe notes.
   - Cover disabled, loading, success, failure, modal, copy/download/export, and back/navigation reactions.
   - Mark uncaptured reactions as `source-confirmed`, `blocked`, or `unknown`; do not imply visual evidence exists when it does not.

10. Spec extraction audit
   - Write `qa/spec-extraction-audit.md` when specs, flows, journeys, use cases, QA inputs, or merge planning are requested.
   - Check that high-priority actions, page/action conditions, server guards, flow steps, use cases, actor statuses, output destinations, async states, dialogs/modals, screenshots, and assumptions are covered or explicitly blocked.
   - Summarize pass/gap/blocked counts and list the user review queue.

11. PoC fidelity matrix
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
- `action-graph.md` exists for spec extraction work and derived docs reference its IDs.
- `condition-graph.md`, `condition-graph.json`, and `condition-visuals.md` exist for condition-sensitive work and derived preconditions reference their IDs.
- `qa/spec-extraction-audit.md` exists for spec extraction work and lists gaps/blockers before user review.
- When relevant, `poc-fidelity-matrix.md` lists every important PoC screen/control/output with parity status and fix direction.
- Inventories use statuses consistently.
