---
name: map
description: Map an external feature artifact into an existing product. Use when the user wants to know where a PoC/prototype belongs in the current service, what data/API/storage/permission/IA changes are needed, or how to turn it into MVP/backlog; triggers include "기존 서비스에 어디에 붙일까", "제품 편입", "정보구조", "데이터 요구사항", "MVP 백로그", "integration fit", "map to product". Writes integration-fit, data-ai-storage, risks-and-blockers, and mvp-backlog analysis files.
---

# Feature Intake - Map

Map the artifact into the existing product and implementation surface.

## When to use

Use after product framing and initial analysis, especially when an existing product repo/path is available.

## Output contract

Writes only:

```text
docs/feature-intake/<slug>/analysis/
├── integration-fit.md
├── data-ai-storage.md
├── risks-and-blockers.md
└── mvp-backlog.md
```

May read the existing product repo. Never modify product code.

## Pipeline

1. Existing product orientation
   - Inspect routes/navigation.
   - Identify candidate modules or bounded contexts.
   - Identify entity detail pages, workflows, admin surfaces, and export surfaces.

2. Placement options
   - List 2-3 candidate placements when not obvious.
   - Explain strengths, risks, and work needed.
   - Mark final choice as `Decision Needed` unless already known.

3. Data and API mapping
   - Required inputs.
   - Existing entities.
   - New entities or fields.
   - API/query/mutation needs.
   - File upload/download needs.
   - External AI/API calls and mock policy.

4. Storage and lifecycle
   - Whether output is ephemeral, draft, approved, sent, archived, or versioned.
   - Audit/review/history requirements.
   - Permissions and privacy boundaries.

5. MVP/backlog
   - Include now.
   - Defer.
   - Remove.
   - Manual ops.
   - Product decisions.

6. Risks and blockers
   - Technical blockers.
   - UX blockers.
   - Data/security/legal blockers.
   - Unreachable PoC features.

## Hallucination guardrails

- Do not invent existing product routes or entities.
- If repo inspection is unavailable, mark integration fit as assumption-based.
- Do not prescribe schema changes without labeling them as proposed.
- Do not conflate PoC implementation details with production architecture.

## Done criteria

- `integration-fit.md` lists candidate product placements and recommendation/decision status.
- `data-ai-storage.md` separates known PoC data from proposed production data.
- `risks-and-blockers.md` includes blocked/unreachable features and product risks.
- `mvp-backlog.md` has include/defer/remove/manual/decision-needed sections.
