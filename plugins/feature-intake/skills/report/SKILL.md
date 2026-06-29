---
name: report
description: Publish an existing feature-intake package as a reviewer-friendly static web report and readable document viewer. Use after inspect/capture/frame/analyze/map/package/spec when the user asks for "웹 리포트", "단일 기획 문서", "문서 뷰", "보기 좋게", "raw md 말고", "스크린샷과 매칭", "Mermaid 렌더링", "report.html", or clickable evidence-backed planning docs. Writes docs/feature-intake/SLUG/report.html and docs/feature-intake/SLUG/docs/*.html. Does not rerun capture or rewrite product/spec claims by default.
---

# Feature Intake - Report

Publish an evidence-backed feature-intake package as static HTML that reviewers can read without opening raw Markdown.

Use this after the evidence and source docs exist. This skill renders, links, and validates the package; it should not invent new product behavior.

## Output Contract

Writes only:

```text
docs/feature-intake/SLUG/
├── report.html
├── docs-view.html
└── docs/
    ├── index.html
    ├── all.html
    ├── assets/
    │   └── mermaid.min.js
    └── *.html
```

May update:

```text
docs/feature-intake/SLUG/README.md
docs/feature-intake/SLUG/spec/README.md
```

Only update source Markdown when fixing evidence links, Mermaid click links, or viewer navigation that must stay source-controlled with the spec. Do not change product requirements, action semantics, condition semantics, or screenshots.

## Required Inputs

Read these if present:

- `README.md`
- `intake-manifest.json`
- `spec/README.md`
- `spec/*.md`
- `analysis/*.md`
- `qa/*.md`
- `screenshots/page-walk-index.md`
- `screenshots/page-walk-results.json`
- `screenshots/contact-sheets/README.md`

## Pipeline

1. Validate package shape
   - Confirm the package root exists.
   - Confirm screenshots or explicit blockers are indexed.
   - Confirm source Markdown docs exist.
   - Confirm relative paths from source docs can be resolved from the generated HTML location.

2. Build `report.html`
   - Make it the primary reviewer-facing planning document.
   - Pair flows, scenarios, conditions, blockers, and decisions with screenshot IDs and image references.
   - Keep it static and self-contained except for local relative screenshot/document links.
   - Link to `docs/index.html` for deep source browsing.
   - Avoid replacing source specs; report should summarize and route to them.

3. Build split docs
   - `docs/index.html`: purpose-based reading paths such as 10-minute review, implementation, QA, and evidence review.
   - `docs/*.html`: one readable page per source Markdown document with table/code/screenshot support, previous/next navigation, and optional "원문 MD" links.
   - `docs/all.html`: optional all-in-one scan/search view only; do not make it the primary reading surface for large packages.
   - `docs-view.html`: compatibility router for old `docs-view.html#doc-*` links when earlier reports used that format.

4. Render Mermaid
   - Convert Mermaid fences to rendered diagrams in generated HTML.
   - Prefer a local `docs/assets/mermaid.min.js` runtime so `file://` browsing works without a dev server or network.
   - Use `securityLevel: "loose"` when Mermaid click links are required.
   - Add horizontal overflow handling and a visible fallback when rendering fails.
   - If a Mermaid node maps to a captured screen/state, add `click NODE "../screenshots/..." "SS-xx: label"` links to the representative screenshot or evidence page.

5. Link evidence
   - Route report/source links to `docs/*.html` pages or `docs/index.html`, not raw `.md`, for primary reading.
   - Keep raw Markdown links available inside generated pages as optional source links.
   - Link screenshot IDs to actual image files or the screenshot index.
   - Prefer direct screenshot links for diagram nodes and visual evidence cards.

6. Validate
   - Check generated HTML links and assets exist.
   - Check Mermaid diagrams render as SVG, not raw fenced code, when a browser is available.
   - Check Mermaid links resolve to screenshots when used.
   - Check JSON files still parse.
   - Run `git diff --check`.

## Hallucination Guardrails

- Do not change facts to make the report prettier.
- Do not hide blockers, unknowns, partial coverage, or decision-needed items.
- Do not claim production readiness from a static report.
- Do not treat a screenshot as backend/API/permission evidence.
- Do not remove raw Markdown source links; keep them as an audit trail.

## Done Criteria

- `report.html` gives a concise reviewer path through the feature.
- `docs/index.html` reduces reading burden with purpose-based paths.
- Source Markdown opens through readable `docs/*.html` pages instead of raw browser rendering.
- Mermaid diagrams render in HTML and clickable evidence nodes work where practical.
- Screenshot and document links are valid.
- The final response links `report.html` and `docs/index.html`.
