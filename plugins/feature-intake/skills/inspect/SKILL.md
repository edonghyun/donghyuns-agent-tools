---
name: inspect
description: Inspect a feature artifact before product intake. Use for PoCs, demos, prototypes, VoC artifacts, screenshots, local projects, or URLs when the user needs page/route/control/external-call inventory before screenshots, page traversal, and analysis; triggers include "PoC 구조 파악", "페이지 목록 뽑아줘", "페이지 순회 타겟 잡아줘", "외부 호출 찾아줘", "기능 인벤토리", "inspect artifact", "route inventory". Writes docs/feature-intake/SLUG/intake-manifest.json and analysis/page-inventory.md plus feature-inventory.md. Do not use for final analysis without capture/framing.
---

# Feature Intake - Inspect

Discover what the artifact contains and what evidence must be captured.

For generalized wireframe/page-state and button-reaction categories, read `../../docs/STATE-TAXONOMY.md` when the artifact is interactive or the user asks for wireframes, all pages, button reactions, or implementation-ready flows.

For spec extraction from code or PoC artifacts, read `../../docs/SPEC-EXTRACTION-PROTOCOL.md` and prepare the static action candidates that will later become `analysis/action-graph.md`.

For page entry conditions, action execution conditions, backend guards, permissions, roles, ownership, tenant boundaries, lifecycle states, quota, feature flags, or condition-focused inspection, read `../../docs/CONDITION-INSPECT-PROTOCOL.md` and prepare condition candidates for `analysis/condition-graph.md`.

## When to use

Use when starting intake on an unknown artifact, especially before browser capture.

Inputs may be:

- local project path
- URL
- static HTML
- screenshot folder
- design file export
- document bundle

## Output contract

Writes only:

```text
docs/feature-intake/<slug>/
├── intake-manifest.json
└── analysis/
    ├── page-inventory.md
    ├── feature-inventory.md
    ├── condition-graph.md
    ├── condition-graph.json
    ├── condition-visuals.md
    ├── page-entry-conditions.md
    ├── action-preconditions.md
    └── server-guard-inventory.md
```

May create `tools/README.md` only to document setup/mocking notes discovered during inspect.

Never modify artifact source code or product source code.

## Pipeline

1. Resolve artifact type
   - Determine whether it is runnable, static, remote, design-only, or screenshot-only.
   - Identify setup commands and entry points.

2. Inventory surfaces
   - List pages/routes/views.
   - Mark seed routes and crawl boundaries for page-walk capture.
   - List controls: buttons, tabs, inputs, uploads, dropdowns, menus, export/download/copy actions.
   - List static action candidates from handler functions, form submit callbacks, command functions, API clients, mutation hooks, storage writes, feature flags, auth guards, disabled conditions, and output commands.
   - List condition candidates from frontend route guards, backend routes/controllers, middleware, request validators, RBAC/permission checks, ownership/tenant checks, service preconditions, domain state transitions, DB constraints, feature flags, plan/quota checks, and tests/fixtures.
   - For each important button/control, record handler/function/source evidence when available.
   - Classify expected reaction type: toggle, navigation, async/API, modal/dialog, guard/error, output/download/copy.
   - List modals, alerts, confirmations, toasts, empty/loading/error states.

3. Identify integration signals
   - External API/AI calls.
   - Local storage, cache, cookies, passwords, feature flags.
   - Input/output data shapes.
   - File upload/download surfaces.

4. Mark capture targets
   - Page screenshots.
   - Page-walk traversal screenshots for seed routes and bounded same-origin discovered routes.
   - Wireframe page-state screenshots: empty, configured, loading, result, modal, disabled, error, editing, and review/submit states where applicable.
   - Interaction screenshots.
   - Button reaction screenshots or explicit source-confirmed blockers.
   - Dialog screenshots/logs.
   - Edge states.
   - Contact sheets.
   - Condition probes: unauthenticated entry, wrong role, wrong owner/tenant, missing entity, lifecycle states, invalid input, quota exhausted, feature flag disabled, and direct API bypass where safe.

5. Detect blocked/dead paths
   - If code exists but UI cannot reach it, mark `blocked`.
   - Include source references when available.

## Hallucination guardrails

- Do not invent route names from filenames unless marked as inference.
- If the artifact cannot run, distinguish static evidence from runtime evidence.
- Do not assume a button works from its label. Mark it as capture target.
- Do not remove or edit source files to make inspect easier.

## Done criteria

- `intake-manifest.json` contains artifact source, existing product source if known, runtime status, mock policy, page targets, interaction targets, dialog targets, edge targets, and known blockers.
- `page-inventory.md` lists pages/views with evidence status.
- `feature-inventory.md` lists controls/actions/features, source evidence when available, capture priority, expected reaction type, confidence, mutation risk, and whether button reactions need evidence.
- When condition inspection is in scope, `condition-graph.md` and `condition-visuals.md` summarize page/action availability with table and Mermaid evidence, and `condition-graph.json` preserves the same IDs in data form.
