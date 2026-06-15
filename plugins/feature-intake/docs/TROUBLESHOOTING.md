# Feature Intake Troubleshooting

## Artifact Does Not Run

Still proceed with static intake when possible:

- inspect source files
- inspect built assets
- inspect screenshots or docs
- mark runtime capture as `blocked`
- list the exact setup failure

Do not invent screenshots.

## External API Or AI Calls Block Capture

Default to mock or route interception:

- find the call boundary
- replace endpoint via env var when possible
- otherwise intercept browser requests
- write mock assumptions in `tools/README.md`
- mark live-call behavior as unverified

Only use live external calls when the user explicitly asks and the data is safe.

## Too Many Pages Or States

Prioritize:

1. entry pages
2. main value path
3. output/result screens
4. destructive or irreversible actions
5. modals/dialogs
6. errors and edge states

Create `capture-priority.md` if not everything can be captured in one pass.

## User Roles Are Unclear

Do not force personas. Use actor slots:

- Primary operator: `Unknown`
- Output recipient: `Unknown`
- Reviewer: `Unknown`
- Admin/support: `Unknown`

Then write decision questions.

## Existing Product Placement Is Unclear

Inspect the current product's routes, navigation, entity detail pages, dashboards, and workflows. If no clear home exists, list 2-3 candidate placements with tradeoffs and mark the final choice as `Decision Needed`.

## Screenshots Are Visually Insufficient

Create contact sheets and keep original full-size screenshots. If text is unreadable in a sheet, link the original image next to the contact sheet.

## Native Dialogs Are Hard To Capture

Log dialog text and capture the before/after page state. If browser tooling can capture the native dialog, save it under `screenshots/dialogs/`. Otherwise write a small JSON or Markdown evidence note with the dialog text.

## Feature Exists In Code But Not UI

Mark it `blocked`, not `failed`, if the code path exists but the current artifact has no reachable UI path. Add:

- code reference
- why unreachable
- product interpretation
- whether to revive, remove, or defer

## Product Assumptions Keep Changing

Move assumptions into `analysis/product-framing.md` and make every downstream document refer to that file. Do not scatter actor/output/quality assumptions across multiple docs.
