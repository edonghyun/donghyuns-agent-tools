---
name: spec
description: Compile an existing feature-intake package into implementation-ready spec documents. Use after inspect/capture/frame/analyze/map/package when the user asks for "스펙 문서", "구현 스펙", "테스트 코드로 옮길 수 있게", "acceptance criteria", "product spec", "action spec", or "condition spec". Writes docs/feature-intake/SLUG/spec/*.md. Does not rerun capture by default.
---

# Feature Intake - Spec

Compile an evidence-backed feature-intake package into implementation-oriented specs.

Use this after `analysis/action-graph.md`, `analysis/condition-graph.md`, screenshot indexes, and `qa/spec-extraction-audit.md` exist.

## When to use

Use when the user wants:

- a product/feature spec
- implementation handoff specs
- action and condition contracts
- acceptance criteria
- QA/test-code-ready requirements
- production merge planning
- a spec pack derived from an existing feature-intake result

Do not use this as a replacement for inspect/capture/analyze. If action graph, condition graph, and screenshot evidence are missing, ask to run the missing intake stage or write a clearly blocked spec.

## Output contract

Writes only:

```text
docs/feature-intake/<slug>/spec/
├── README.md
├── FEATURE-SPEC.md
├── USER-FLOW-SPEC.md
├── ACTION-SPEC.md
├── CONDITION-SPEC.md
├── SCREEN-STATE-SPEC.md
├── DATA-AI-API-SPEC.md
├── USE-CASE-SCENARIOS.md
├── ACCEPTANCE-TEST-SPEC.md
├── OPEN-DECISIONS.md
└── TOOLING-NOTES.md
```

May update `docs/feature-intake/<slug>/README.md` to link the `spec/` folder.

Use `feature-intake:report` after this skill when the user wants `report.html`, readable `docs/*.html`, Mermaid rendering, clickable screenshot evidence, or a single web-view planning document.

Never modify the source artifact or product implementation.

## Required inputs

Read these if present:

- `intake-manifest.json`
- `analysis/action-graph.md`
- `analysis/condition-graph.md`
- `analysis/condition-graph.json`
- `analysis/page-inventory.md`
- `analysis/feature-inventory.md`
- `analysis/user-flow.md`
- `analysis/user-journeys.md`
- `analysis/use-cases.md`
- `analysis/button-handling.md`
- `analysis/screen-by-screen.md`
- `analysis/data-ai-storage.md`
- `analysis/server-guard-inventory.md`
- `analysis/risks-and-blockers.md`
- `analysis/mvp-backlog.md`
- `qa/feature-coverage-matrix.md`
- `qa/condition-probe-matrix.md`
- `qa/spec-extraction-audit.md`
- `screenshots/page-walk-results.json`
- `screenshots/page-walk-index.md`

## Pipeline

1. Validate evidence
   - Confirm action graph exists.
   - Confirm condition graph exists when conditions are in scope.
   - Confirm screenshots or explicit blockers are indexed.
   - Confirm spec audit or coverage matrix exists.

2. Compile `FEATURE-SPEC.md`
   - Problem, roles, scope, non-goals, production blockers, definition of done.
   - Keep `Known`, `Assumed`, `Unknown`, and `Decision Needed` distinctions.

3. Compile `USER-FLOW-SPEC.md`
   - Convert normal, guard, alternate, and output flows into implementation contracts.
   - Reference screenshot IDs plus action and condition IDs.

4. Compile `ACTION-SPEC.md`
   - Convert action graph rows into action contracts.
   - Include action ID, preconditions, result, failure/disabled behavior, and evidence.
   - Preserve `captured`, `source-confirmed`, `partial`, and `blocked` statuses.

5. Compile `CONDITION-SPEC.md`
   - Convert condition graph rows into page-entry and action-execution conditions.
   - Separate current enforcement from production requirement.
   - Never claim backend enforcement from frontend-only evidence.

6. Compile `SCREEN-STATE-SPEC.md`
   - Turn screenshot states into required UI states.
   - Include missing/partial states as follow-up requirements.

7. Compile `DATA-AI-API-SPEC.md`
   - Extract current data, proposed production entities, AI/API calls, storage lifecycle, privacy/audit requirements.
   - Mark backend/API contracts as draft if backend source is absent.

8. Compile `USE-CASE-SCENARIOS.md`
   - Expand use cases into scenario narratives.
   - Prefer acceptance-test-friendly Given/When/Then form.
   - Mark each scenario as captured, source-confirmed, partial, blocked, or decision-needed.

9. Compile `ACCEPTANCE-TEST-SPEC.md`
   - Convert action and condition evidence into browser acceptance tests, additional tests, and API contract tests.
   - Use screenshot IDs and action/condition IDs where possible.

10. Compile `OPEN-DECISIONS.md`
   - List product/engineering decisions that block production merge or test finalization.

11. Compile `TOOLING-NOTES.md`
   - Explain how the spec compiler stage can be reused and what it must not automate.

12. Package links
   - Update top-level README with spec links if useful.

## Hallucination guardrails

- Do not invent main-service routes, database schemas, permissions, or backend APIs as facts.
- Proposed entities and APIs must be labeled as proposed when not already implemented.
- Do not convert an unresolved decision into a requirement.
- Do not hide missing capture or backend blockers.
- Do not treat local browser success as production readiness.
- Keep source/current behavior separate from product/production requirements.

## Done criteria

- `spec/README.md` is the starting point for implementation readers.
- Every spec file links back to evidence or names blockers/decisions.
- Action and condition specs preserve IDs from `analysis/action-graph.md` and `analysis/condition-graph.md`.
- Acceptance tests include happy paths, guards, async states, output actions, and known missing cases.
- Open decisions are explicit and not buried in prose.
- If `report.html` or readable source browsing is requested, the final answer routes the user to `feature-intake:report` as the next stage rather than writing HTML here.
