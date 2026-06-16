# Feature Intake State Taxonomy

Use this taxonomy when an intake package will inform wireframes, product specs, implementation planning, or QA. It generalizes page/screen states and button reactions across PoCs, prototypes, SaaS tools, AI workflows, admin consoles, education products, checkout flows, and internal tools.

## Core Principle

Do not treat a "page" as one screenshot. A product surface is the set of stable states a user can see while moving through a workflow.

For each page/view, identify:

- entry/default state
- data/content state
- control state
- async state
- error/guard state
- output or handoff state

Capture the variants that materially affect layout, user decisions, downstream implementation, or review/approval.

## Page State Families

| State | Meaning | Capture When | Wireframe Notes |
| --- | --- | --- | --- |
| `empty` | No data, no saved items, no results, first run, blank list | A user can land here with nothing created yet | Needs empty copy, CTA, and disabled/available actions. |
| `configured` | Required inputs/selections are filled but processing has not started | Setup forms, filters, selected options, wizard steps | Shows real layout after controls have content. |
| `partial` | Some inputs/items exist but not enough to continue | Multi-step forms, saved count thresholds, incomplete uploads | Usually pairs with disabled CTA or validation guidance. |
| `loading` | Async/API/AI/file operation is in progress | Any action waits on network, AI, file parsing, save, submit, search | Capture spinner/progress copy and disabled controls. |
| `result` | Successful output is visible | Generated content, analysis result, search/list result, dashboard data | Shows output hierarchy and next action. |
| `success` | A transient or terminal success confirmation | Save complete, submit complete, payment complete, export complete | Use toast, success page, banner, or state badge. |
| `error` | Operation failed or validation blocked progress | API failure, AI parse failure, upload failure, required input missing | Capture message placement, retry path, and preserved inputs. |
| `disabled` | CTA/control is visible but unavailable | Preconditions not met, permissions missing, quota insufficient | Record disabled reason; do not rely on greyed UI alone. |
| `modal` | Modal/dialog/drawer/popover/overlay is open | A click opens contextual UI | Capture empty and populated modal states when both exist. |
| `editing` | Read-only content becomes editable or an edit draft is active | Edit button, inline editor, before/after compare | Include save/cancel/apply/discard affordances. |
| `comparison` | Before/after, original/candidate, old/new versions shown together | AI rewrite, consultant edit, diff, approval review | Critical for review and audit workflows. |
| `submitted` | User has submitted for review/processing | Draft becomes locked or review-visible | Show state badge, next actor, allowed edits. |
| `review` | Reviewer can comment, approve, reject, request revision, or edit | Consultant/admin/institution review workflows | Capture reviewer controls and student-visible results separately. |
| `approved` | Work is accepted/available for downstream use | Approval, publish, archive, source selection | Show immutable version/source label where relevant. |
| `archived` | Item is stored but no longer active | History, completed workflows, old versions | Include restore/reuse/delete rules if present. |
| `output` | Copy/download/export/share/send was triggered | Clipboard, file download, share link, send action | Record native dialogs, downloads, permission failures, and success feedback. |
| `permission` | User lacks access or role-specific control is hidden/blocked | Role-gated surfaces, auth, tenant boundaries | Capture if product fit depends on roles. |
| `quota` | Usage/credit/token limits affect availability | AI generation, paid flows, rate limits | Capture cost preview, insufficient balance, refund/failure policy. |

## Button Reaction Types

| Reaction Type | Meaning | Evidence To Capture |
| --- | --- | --- |
| `toggle` | Same control changes selection/open/saved/on-off state | Before/after selected state, count, dependent UI. |
| `navigation` | Page/view/route/active tab changes | Source screen and destination screen. |
| `async` | Click starts save/API/AI/file operation | Loading plus success or failure. |
| `modal` | Click opens overlay UI | Modal opened; close path; empty/populated variants. |
| `guard` | Click is blocked by validation/precondition | Inline error, disabled reason, or tooltip. |
| `output` | Click copies/downloads/exports/shares/sends | Output artifact, native dialog text, toast, permission failure. |
| `mutation` | Click changes saved server/client data | Before/after state and audit/version implications. |
| `review-action` | Click changes approval/revision state | Status transition and actor-visible result. |

## Minimum Capture Set For Interactive Artifacts

For each primary page/view:

1. Default/entry state.
2. Configured or populated state.
3. Primary CTA loading state when async.
4. Primary CTA success/result state.
5. Primary CTA error/guard state.
6. Any modal/drawer opened from the page.
7. Edit mode if content can be edited.
8. Disabled state for important blocked controls.
9. Output action state for copy/download/export/share/send.

If a state is not reachable, document why in the screenshot index and coverage matrix.

## Domain Examples

| Domain | Common States |
| --- | --- |
| AI generation tool | input/configured, generating, result, regenerate panel, parse/API failure, quota exhausted, output copied/downloaded |
| Wizard/onboarding | empty step, valid step, invalid step, step transition, completed/submitted, resume |
| CRUD/admin list | empty list, populated list, filtered list, detail drawer, create/edit modal, delete confirm, save error |
| Review/approval | draft, submitted, under review, comment-only, revision requested, rejected, approved, version comparison |
| Checkout/payment | cart empty, cart populated, processing, success, failure, receipt/export |
| File workflow | no file, upload queued, parsing, parsed result, unsupported file, extraction failure, remove file |

## Documentation Requirements

When using this taxonomy, include:

- `screenshots/contact-sheets/<wireframe-or-page-state>.png` when useful.
- `analysis/button-handling.md` for interactive artifacts.
- `qa/feature-coverage-matrix.md` rows that reference state coverage.
- Explicit blockers for states not captured.

Avoid saying "all pages" or "all buttons" unless every discovered state/control is covered or has a blocker reason.
