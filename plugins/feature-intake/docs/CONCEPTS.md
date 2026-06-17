# Feature Intake Concepts

## Feature Artifact

A feature artifact is any external or semi-external input that suggests a product feature:

- VoC summary
- PoC app
- demo URL
- Figma prototype
- spreadsheet workflow
- internal script
- AI prompt chain
- notebook
- design doc
- exported HTML

The artifact is not assumed to be production-ready. It is evidence for a product decision.

## Product Translation

Feature intake is product translation, not ordinary QA. The core question is:

> If this artifact became part of the existing product, who would use it, where would it live, what would it produce, and what would we need to trust it?

This is why screenshots and product framing live together.

## Evidence First

Every meaningful claim should point to at least one evidence source:

- screenshot path
- code path
- page URL
- artifact file path
- runtime log
- user-supplied note
- explicit inference

If no evidence exists, mark the claim as `Assumed`, `Unknown`, or `Decision Needed`.

## Actors

Actors are role slots, not fixed personas. Common slots:

- Primary operator
- Output recipient
- Reviewer or approver
- Admin or support operator
- Data owner
- Integration owner
- External stakeholder

Do not hard-code domain-specific actors. For one artifact the primary operator may be a consultant; for another it may be an operations lead, student, merchant, admin, or customer success manager.

## Placement

Placement answers where the feature enters the current product:

- new top-level page
- tab inside an existing detail screen
- follow-up action after an analysis
- admin workflow
- onboarding step
- export-only tool
- internal-only console

Placement is often `Decision Needed` until the existing product is inspected.

## Output Destination

Output destination controls storage, review, and delivery requirements. A result may be:

- copied to clipboard
- downloaded
- sent to a user
- saved to an internal record
- attached to an existing entity
- used only as draft guidance
- discarded after the session

Never assume "copy" is enough for production just because the PoC has a copy button.

## Quality Bar

Quality bar defines what "good" means. It should be domain-neutral in shape:

- source grounding
- user relevance
- completeness
- editability
- safety and policy compliance
- explainability
- consistency with existing product language
- reviewability
- low operational burden

The domain fills the details.

## MVP Boundary

MVP boundary separates:

- must ship
- can ship later
- manual operation acceptable
- experiment-only
- remove
- blocked pending decision

PoCs often contain exploration code. Intake should protect engineering from blindly porting every experiment.

## Knowledge Statuses

| Status | Meaning |
|---|---|
| `Known` | Verified from artifact, code, screenshots, docs, or user input. |
| `Assumed` | A reasoned assumption that should remain visible. |
| `Unknown` | Not discoverable from current evidence. |
| `Decision Needed` | A product/technical choice must be made before implementation. |

## Screenshot Families

Capture screenshots by family:

- Pages: each stable view.
- Page walk: routes reached from explicit seeds or bounded same-origin crawl.
- Interactions: links, buttons, tabs, row clicks, menus, toggles, state changes.
- Dialogs: modal, alert, confirmation, toast, native browser dialog.
- Edge cases: validation, error, empty, loading, disabled, blocked.
- Contact sheets: quick visual index for reviewers.

## Integration Fit

Integration fit maps the artifact to the existing product:

- information architecture
- route/page placement
- bounded context or module
- entity ownership
- API calls
- storage and history
- permissions
- event/audit requirements
- import/export behavior

If the current product has no obvious home for the feature, say so.
