# Feature Intake Workflow Guide

For generalized page-state and button-reaction coverage, use [STATE-TAXONOMY](STATE-TAXONOMY.md).

For implementation-ready spec extraction, use [SPEC-EXTRACTION-PROTOCOL](SPEC-EXTRACTION-PROTOCOL.md). Build the action graph before finalizing user-flow, user-journey, use-case, QA, or merge-planning documents.

For page entry conditions, action execution conditions, backend guards, permission rules, lifecycle rules, ownership, quota, or feature flags, use [CONDITION-INSPECT-PROTOCOL](CONDITION-INSPECT-PROTOCOL.md). Show the result as tables, JSON data, and Mermaid visuals.

For PoC-to-product parity, use [POC-FIDELITY-GATE](POC-FIDELITY-GATE.md). This is required when the artifact will be used as an implementation baseline or when the user says the current product does not match the delivered PoC/screenshots.

For implementation handoff, use `feature-intake:spec` after the evidence package exists. This compiles the analysis package into feature, action, condition, screen-state, data/API, acceptance-test, and open-decision specs.

For reviewer-facing static HTML, use `feature-intake:report` after the evidence package and optional specs exist. This publishes `report.html`, readable source-document pages, Mermaid rendering, and screenshot-linked evidence navigation.

## 1. Start From The Artifact

Collect the artifact location:

- local project path
- URL
- Figma/design file
- PDF or document
- spreadsheet
- screenshots only
- mixed bundle

If the artifact is runnable, run it locally when safe. If it calls external AI/API services, mock or intercept those calls by default unless the user explicitly wants live calls.

If a current implementation already exists, collect both:

- baseline artifact evidence: original PoC runtime, screenshots, source files, or product feedback
- current implementation evidence: app route/build, screenshots, and interaction states

## 2. Inspect

Use `feature-intake:inspect` to discover:

- entry points and setup commands
- routes/pages/views
- buttons, menus, dialogs, and stateful controls
- static action candidates from handlers, submit functions, API clients, mutation hooks, storage writes, and output commands
- page entry conditions and action execution conditions from frontend routes, backend routes, middleware, permission checks, ownership checks, lifecycle guards, validation schemas, feature flags, plan/quota checks, and tests
- seed routes and safe crawl boundaries for page-walk capture
- button labels, handlers/source evidence, expected reaction type, and required before/after states
- uploads/downloads/exports
- external calls
- storage/cache/local state
- feature flags or passwords
- obvious dead or unreachable functionality

Write `intake-manifest.json`, inventory notes, the first static action-candidate list that will feed `analysis/action-graph.md`, and the first condition inventory that will feed `analysis/condition-graph.md`.

## 3. Capture

Use `feature-intake:capture` to collect screenshot evidence:

- page-level screenshots
- page-walk traversal screenshots from explicit routes or bounded same-origin crawl
- wireframe-critical page-state screenshots: empty, configured, loading, result, modal, disabled, error, editing, submitted/review where relevant
- interaction screenshots after clicks
- button-reaction screenshots or explicit blockers/source-confirmed notes
- modal/dialog screenshots
- edge/error/loading/empty screenshots
- contact sheets

Do not stop at the first happy path. If a control changes state, capture the before and after. If an async control calls AI/API, capture loading plus success or failure. If a native alert appears, log the dialog text and capture where possible.

Merge runtime targets with static action candidates. The goal is not merely "screenshots exist"; it is "every important action has a verified, source-confirmed, captured, blocked, unknown, or decision-needed status."

For condition-sensitive flows, build a probe matrix before running checks. Probe unauthenticated users, wrong roles, wrong ownership/tenant, missing entities, lifecycle states, invalid input, quota exhaustion, feature-flag-off states, and direct API calls that bypass the UI.

For PoC parity, capture baseline/current pairs for every requirement-critical screen and interaction. Pay attention to:

- data richness and grouped option sets
- status badges and recommended/disabled/approved states
- automatic AI commands and generated candidates
- editable apply/cancel/regenerate flows
- final generated reports and next-step advice

For broad "all pages / all buttons" requests, use the bundled page-walk helper as the first pass, then manually fill important gaps:

```bash
node plugins/feature-intake/scripts/page_walk_capture.mjs \
  --base-url http://localhost:3000 \
  --routes / \
  --crawl-depth 2 \
  --out docs/feature-intake/<slug>/screenshots
```

Keep the default mutation-safe mode unless the target uses disposable data or the user explicitly authorizes live mutations. The helper writes `screenshots/page-walk-results.json` and `screenshots/page-walk-index.md`; use those files as the capture checklist, not as a replacement for human judgment.

## 4. Frame

Use `feature-intake:frame` to fill the generalized product-framing slots:

- actors
- placement
- output destination
- quality bar
- MVP boundary
- data/AI/storage
- operational fit
- risks and unknowns

Every slot should be marked as `Known`, `Assumed`, `Unknown`, or `Decision Needed`.

## 5. Analyze

Use `feature-intake:analyze` to write:

- action graph: normalized actions, states, transitions, outputs, evidence, status, and next check
- condition graph: page/action availability, frontend/backend enforcement, data lifecycle conditions, evidence, status, and next probe
- condition visuals: Mermaid graphs and role/data matrices for quick review
- user flow with screenshot references
- user journeys by actor
- use cases: normal, exception, operational, regeneration, export/share
- button handling and reactions: label, handler/source, reaction type, click result, evidence, wireframe notes
- page and feature inventories
- screen-by-screen annotations
- PoC fidelity matrix when baseline/current parity is in scope

Keep the artifact visible through screenshots. A reader should understand the workflow without rerunning the PoC.

Derive flows from graph paths. Each user-flow step, use-case scenario, and journey moment should reference screenshots, source paths, or action/transition IDs from `analysis/action-graph.md`.

Preconditions should reference `analysis/condition-graph.md`. Do not infer page entry or action execution conditions from UI visibility alone when backend evidence is available or required.

The fidelity matrix should distinguish `match`, `partial`, `missing`, `intentional-deviation`, and `blocked`. Do not treat a route title or button label match as behavior parity.

## 6. Map

Use `feature-intake:map` to map into the current product:

- where the feature should enter
- which existing module owns it
- what entities and APIs it needs
- what permissions are required
- whether outputs are drafts, records, messages, files, or exports
- what needs persistence, versioning, audit, review, or approval

When a mapping is uncertain, mark `Decision Needed`; do not bury it in prose.

## 7. Package

Use `feature-intake:package` to assemble:

- top-level README
- screenshot indexes
- contact sheets
- action graph and spec extraction audit
- condition graph, condition visuals, and condition probe matrix when condition inspect was used
- wireframe/page-state sheet when available
- button-handling matrix when the artifact is interactive
- PoC fidelity matrix when parity is in scope
- page-walk index and results when traversal capture was used
- analysis index
- QA/coverage matrix
- risks and blockers
- MVP/backlog
- next decisions

Before packaging, write or update `qa/spec-extraction-audit.md` so reviewers can see which actions, flows, use cases, outputs, async states, screenshots, and assumptions are covered or blocked.

The final answer should link the package root and the most useful contact sheets.

## 8. Spec

Use `feature-intake:spec` when the user asks for implementation-ready specs, test-code-ready acceptance criteria, or production merge planning.

Compile:

- `spec/FEATURE-SPEC.md`
- `spec/USER-FLOW-SPEC.md`
- `spec/ACTION-SPEC.md`
- `spec/CONDITION-SPEC.md`
- `spec/SCREEN-STATE-SPEC.md`
- `spec/DATA-AI-API-SPEC.md`
- `spec/USE-CASE-SCENARIOS.md`
- `spec/ACCEPTANCE-TEST-SPEC.md`
- `spec/OPEN-DECISIONS.md`
- `spec/TOOLING-NOTES.md`

This step should not rerun capture by default. It should preserve action IDs, condition IDs, screenshot IDs, statuses, blockers, and decision-needed items from the analysis package.

When the user asks for a single web-view planning document or evidence-backed report, run `feature-intake:report` after this step.

## 9. Report

Use `feature-intake:report` when the user asks for a static web report, readable document view, screenshot-linked planning document, Mermaid rendering, or non-raw Markdown browsing.

Publish:

- `report.html`: primary reviewer-facing planning document.
- `docs/index.html`: purpose-based reading paths and grouped document cards.
- `docs/*.html`: one readable HTML page per source Markdown document.
- `docs/all.html`: optional all-in-one view for search/scan only.
- `docs-view.html`: compatibility router for old `docs-view.html#doc-*` links when needed.

Route report/source links to `docs/*.html` pages or `docs/index.html`, while keeping optional raw Markdown links available inside each generated page.
If source Markdown includes Mermaid fences, render those fences as diagrams in `docs/*.html` and `docs/all.html`. For local review packages, prefer a vendored `docs/assets/mermaid.min.js` runtime so `file://` browsing works without a server or network. When a Mermaid node maps to a captured screen/state, add `click` links from the node to the representative screenshot or evidence page.

## Recommended Order

```text
start
  inspect
  capture
  frame
  analyze
  map
  package
  spec
  report
```

For very large artifacts, run `inspect` first and ask the user whether to prioritize the most important flows before capture.

## When To Use qa-operator

Use `qa-operator` after intake when the accepted MVP scope becomes concrete acceptance requirements. `feature-intake` answers product fit. `qa-operator` verifies implementation behavior.

## When To Use spec-mirror

Use `spec-mirror` after the feature exists in the codebase and needs a durable implementation mirror.
