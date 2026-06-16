# Feature Intake Workflow Guide

For generalized page-state and button-reaction coverage, use [STATE-TAXONOMY](STATE-TAXONOMY.md).

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

## 2. Inspect

Use `feature-intake:inspect` to discover:

- entry points and setup commands
- routes/pages/views
- buttons, menus, dialogs, and stateful controls
- button labels, handlers/source evidence, expected reaction type, and required before/after states
- uploads/downloads/exports
- external calls
- storage/cache/local state
- feature flags or passwords
- obvious dead or unreachable functionality

Write `intake-manifest.json` and inventory notes.

## 3. Capture

Use `feature-intake:capture` to collect screenshot evidence:

- page-level screenshots
- wireframe-critical page-state screenshots: empty, configured, loading, result, modal, disabled, error, editing, submitted/review where relevant
- interaction screenshots after clicks
- button-reaction screenshots or explicit blockers/source-confirmed notes
- modal/dialog screenshots
- edge/error/loading/empty screenshots
- contact sheets

Do not stop at the first happy path. If a control changes state, capture the before and after. If an async control calls AI/API, capture loading plus success or failure. If a native alert appears, log the dialog text and capture where possible.

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

- user flow with screenshot references
- user journeys by actor
- use cases: normal, exception, operational, regeneration, export/share
- button handling and reactions: label, handler/source, reaction type, click result, evidence, wireframe notes
- page and feature inventories
- screen-by-screen annotations

Keep the artifact visible through screenshots. A reader should understand the workflow without rerunning the PoC.

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
- wireframe/page-state sheet when available
- button-handling matrix when the artifact is interactive
- analysis index
- QA/coverage matrix
- risks and blockers
- MVP/backlog
- next decisions

The final answer should link the package root and the most useful contact sheets.

## Recommended Order

```text
start
  inspect
  capture
  frame
  analyze
  map
  package
```

For very large artifacts, run `inspect` first and ask the user whether to prioritize the most important flows before capture.

## When To Use qa-operator

Use `qa-operator` after intake when the accepted MVP scope becomes concrete acceptance requirements. `feature-intake` answers product fit. `qa-operator` verifies implementation behavior.

## When To Use spec-mirror

Use `spec-mirror` after the feature exists in the codebase and needs a durable implementation mirror.
