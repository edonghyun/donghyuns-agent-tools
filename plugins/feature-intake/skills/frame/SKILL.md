---
name: frame
description: Create generalized product framing for a feature artifact. Use when the user wants to clarify real users, use context, product placement, output destination, quality bar, MVP boundary, data/AI/storage, operations, risks, or "제품적 가정" for a PoC/prototype; triggers include "사용자 구분", "사용 맥락", "품질 기준", "MVP 범위", "제품 편입 가정", "product framing", "actors and placement". Writes docs/feature-intake/SLUG/analysis/product-framing.md and user-roles.md.
---

# Feature Intake - Frame

Generalize the product assumptions that make flows and journeys meaningful.

## When to use

Use after initial inspect/capture, or anytime the artifact's product context is unclear.

This skill is intentionally domain-neutral. It should work for education, SaaS, admin tools, marketplaces, internal ops, AI workflows, mobile apps, and prototypes.

## Output contract

Writes only:

```text
docs/feature-intake/<slug>/analysis/
├── product-framing.md
└── user-roles.md
```

Never modify screenshots, QA results, or source code.

## Pipeline

1. Actor framing
   - Primary operator.
   - Output recipient.
   - Reviewer/approver.
   - Admin/support.
   - Data owner or integration owner.

2. Placement framing
   - Existing product surface candidates.
   - Workflow entry point.
   - Whether it is standalone, embedded, follow-up, admin, or export-only.

3. Output framing
   - Save/copy/send/download/embed/view-only.
   - Draft vs official record.
   - Internal-only vs user-facing.

4. Quality bar
   - What makes output good.
   - What requires human review.
   - What must be grounded, editable, explainable, safe, or auditable.

5. MVP boundary
   - Include now.
   - Defer.
   - Remove.
   - Manual ops acceptable.
   - Decision needed.

6. Data, AI, and storage
   - Inputs.
   - External calls.
   - Persistence.
   - History/versioning.
   - Approval state.
   - Privacy/security considerations.

7. Operational fit
   - Failure owner.
   - Recovery path.
   - Admin/logging needs.
   - Support burden.

8. Risks and unknowns
   - Product risk.
   - UX risk.
   - Technical risk.
   - Data/legal/security risk.
   - Open questions.

## Hallucination guardrails

- Classify every important statement as `Known`, `Assumed`, `Unknown`, or `Decision Needed`.
- Do not turn a domain-specific example into a universal rule.
- Do not imply a final product decision when only artifact evidence exists.
- Prefer actor slots over named personas unless the artifact proves the persona.

## Done criteria

- `product-framing.md` includes a framing table with statuses and evidence.
- `user-roles.md` distinguishes operator, recipient, reviewer, admin/support, and unknown roles.
- Product decisions are explicit and easy to answer later.
