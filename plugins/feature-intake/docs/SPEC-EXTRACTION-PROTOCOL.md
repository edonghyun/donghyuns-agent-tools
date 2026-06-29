# Feature Intake Spec Extraction Protocol

Use this protocol when a feature artifact must become durable product specs:
user flows, user journeys, use cases, implementation notes, QA plans, or merge
inputs for the main product.

The central rule is: do not write final specs directly from screenshots or code
snippets. First build an evidence-backed action graph, then derive the documents
from that graph.

When page entry conditions, action execution conditions, backend guards, role
rules, lifecycle rules, ownership, quota, or feature flags are important, also
use `CONDITION-INSPECT-PROTOCOL.md`. The action graph explains behavior; the
condition graph explains availability and enforcement.

## Core Model

Represent the artifact as a graph:

| Node | Meaning | Evidence |
| --- | --- | --- |
| Actor | A user, reviewer, admin, recipient, or system role slot | Product framing, copy, auth/role code, user note |
| Surface | Page, route, screen, dialog, drawer, tab, or embedded view | Screenshot, route, component file |
| State | Stable visual or logical state of a surface | Screenshot, runtime state, source path |
| Action | User-visible control or implicit system event | DOM target, handler, source path, screenshot |
| Transition | What changes after the action | Before/after screenshot, URL change, modal, network call, state diff |
| Output | File, record, message, generated text, copied content, saved data | Screenshot, download, API payload, storage evidence |
| Rule | Validation, permission, quota, lifecycle, review, or safety rule | Source path, error state, product note |
| Condition | Entry/action availability and enforcement rule | Frontend guard, backend guard, runtime/API probe |

Every final spec row should trace back to at least one graph node or edge. If it
does not, mark it as `assumed`, `unknown`, or `decision-needed`.

## Phase 0 - Intake Boundary

Define the package boundary before extraction:

- artifact source: path, URL, screenshots, Figma/export, document bundle
- existing product target, if any
- mutation policy: safe, disposable-data, or allowed
- external call policy: mock by default, live only when explicitly approved
- baseline/current split for PoC fidelity work
- output slug and package path

Write these into `intake-manifest.json` before analysis claims become specific.

## Phase 1 - Static Action Harvest

Scan source files before browser capture when source is available.

Collect action candidates from:

- route/page definitions
- visible controls: buttons, links, tabs, menus, row clicks, inputs, uploads
- handler names, event callbacks, form submit functions, command functions
- API clients, server actions, fetch calls, mutation hooks, storage writes
- feature flags, auth guards, disabled conditions, validation schemas
- generated output paths: download, clipboard, save, send, export, share

For each action candidate, record:

- label or trigger
- source path and line when available
- owning surface
- expected reaction type from `STATE-TAXONOMY.md`
- possible mutation risk
- capture priority: high, medium, low
- confidence: source-confirmed, inferred, unknown

## Phase 2 - Runtime State And Interaction Capture

Run the artifact when possible and capture evidence for the action candidates.

Minimum runtime loop:

1. Visit each seed route or page.
2. Capture default surface state.
3. Discover visible controls from the DOM.
4. Merge DOM targets with static action candidates.
5. Click or safely skip each target according to mutation policy.
6. Capture before/after, loading, result, guard, modal, output, and error states.
7. Record blockers when a target is unreachable or unsafe.

Use `page-walk-results.json` as the first runtime evidence source, then manually
fill gaps for high-priority actions and states.

## Phase 3 - Action Graph Normalization

Normalize static and runtime findings into `analysis/action-graph.md`.

Recommended table:

| ID | Actor | Surface | State | Action | Trigger | Reaction | Destination/Output | Evidence | Status | Next Check |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Status values:

- `verified`: source and/or screenshot evidence exists
- `source-confirmed`: code proves the behavior but runtime capture is missing
- `captured`: screenshot evidence exists but source linkage is missing
- `blocked`: known target could not be verified
- `unknown`: suspected behavior without enough evidence
- `decision-needed`: product choice is required
- `out-of-scope`: intentionally excluded

Use stable IDs such as `A-001`, `S-003`, and `T-014` so user flows, use cases,
journeys, coverage rows, and QA plans can all reference the same behavior.

## Phase 4 - Flow Synthesis

Derive flows from graph paths, not from a loose prose summary.

For each candidate flow:

- entry state
- actor and intent
- ordered actions and transitions
- required inputs and data dependencies
- system processing and external calls
- output or handoff
- recovery, retry, cancellation, and edit paths
- permission, quota, validation, and blocked states

Group flows at three levels:

- happy path: the main successful graph path
- alternate paths: regeneration, edit, save later, export/share, review/approve
- exception paths: invalid input, external failure, permission, quota, upload parse failure

If a path is important but incomplete, keep it in the spec as `blocked` or
`unknown` rather than deleting it.

## Phase 5 - Spec Document Generation

Generate documents from the normalized graph:

- `user-flow.md`: graph paths in execution order
- `user-journeys.md`: actor motivation, trigger, confidence/failure moments, handoff
- `use-cases.md`: actor-goal preconditions, main success scenario, extensions, postconditions
- `button-handling.md`: action table grouped by surface and state
- `condition-graph.md`: page/action availability, guards, outcomes, and verification status
- `condition-visuals.md`: Mermaid dependency graphs, enforcement chains, and role/data matrices
- `screen-by-screen.md`: screenshot annotations for each important state
- `feature-inventory.md`: feature/action map and product interpretation
- `integration-fit.md`: where the behavior belongs in the existing product
- `mvp-backlog.md`: include/defer/remove/manual/decision-needed

Each generated section should cite action IDs, screenshot paths, source paths, or
explicit assumption status.

## Phase 6 - Self Audit

Before packaging, write `qa/spec-extraction-audit.md`.

Audit checks:

- every high-priority action has source evidence, screenshot evidence, or blocker
- every high-priority page/action has condition evidence or an explicit unknown
- every user-flow step maps to at least one action or transition ID
- every use case has preconditions, success outcome, and at least one exception path
- every user journey has actor status: known, assumed, unknown, or decision-needed
- every output action has destination and persistence semantics
- every async action has loading plus success/failure evidence or blocker
- every modal/dialog/output state has screenshot, dialog log, or blocker
- every generated product claim is evidence-backed or explicitly marked
- screenshots referenced by docs exist
- no "all pages" or "all buttons" claim is made without full coverage or blockers

Summarize the result as:

| Area | Pass | Gap | Blocked | Notes |
| --- | ---: | ---: | ---: | --- |

## Phase 7 - User Review Loop

End each package with a small review queue:

- decisions the user must confirm before implementation
- flows that need acceptance criteria
- actions that should become QA cases
- missing evidence that needs another capture pass
- intentional PoC deviations that need approval

After the user responds, update the graph first, then regenerate affected docs.
Do not patch only the prose; prose that diverges from the graph becomes stale.

## Handoff To Other Plugins

- Use `qa-operator` after accepted flows become browser-verifiable acceptance
  requirements.
- Use `spec-mirror` after the behavior is implemented in the main product and
  needs code-sourced drift protection.
- Keep `feature-intake` responsible for evidence-backed product translation:
  what the artifact implies, what is missing, and what must be decided.
