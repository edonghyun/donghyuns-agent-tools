---
name: capture
description: Capture screenshot evidence for feature intake. Use when the user asks for page-by-page screenshots, button click states, modal/dialog screenshots, edge/error/loading/empty states, contact sheets, or "스크린샷 포함" analysis of a PoC/prototype/demo; triggers include "스크린샷 찍어줘", "버튼 눌렀을 때 화면", "모달 캡처", "contact sheet", "capture PoC", "page screenshots". Writes docs/feature-intake/SLUG/screenshots/ and screenshot indexes. Do not use for screenshot-free static analysis.
---

# Feature Intake - Capture

Capture the visual evidence that product analysis will cite.

For generalized page-state and button-reaction coverage, read `../../docs/STATE-TAXONOMY.md` when the capture will inform wireframes, implementation planning, or "all pages/buttons" coverage.

## When to use

Use when an artifact is runnable, browser-visible, or supplied as images and the intake package needs visual evidence.

Use especially for:

- pages
- buttons and tabs
- modal/dialog/toast/native alert states
- upload/download/export states
- loading, empty, error, disabled, blocked states
- mobile/desktop variants when relevant

## Output contract

Writes only under:

```text
docs/feature-intake/<slug>/screenshots/
├── pages/
├── interactions/
├── dialogs/
├── edge-cases/
├── contact-sheets/
└── README.md
```

May write capture helper scripts only under:

```text
docs/feature-intake/<slug>/tools/
```

Never modify application source. Mock/intercept external calls from outside the artifact when possible.

## Pipeline

1. Prepare runtime
   - Start local server if needed.
   - Mock or intercept external AI/API calls by default.
   - Document commands in `tools/README.md`.

2. Capture page states
   - One full-page screenshot per stable page/view.
   - Capture wireframe-critical variants for each page when reachable: empty, configured, loading, result, modal open, disabled guard, validation error, editing, submitted/review state.
   - Name files with sequence numbers and short slugs.

3. Capture interactions
   - Capture after each important button/tab/control click.
   - Include before/after when the state change is subtle.
   - For async/API buttons, capture at least loading plus success or failure, mocking external calls by default.
   - For disabled buttons, capture the disabled state and record the disabled reason.
   - For output buttons such as copy/download/export, capture the surrounding state and record native dialog, download, clipboard, or permission behavior.

4. Capture dialogs
   - Capture modals where possible.
   - For native browser dialogs, log dialog type and text; capture surrounding before/after page state.

5. Capture edge cases
   - Validation errors.
   - Failed upload.
   - External call failure.
   - Empty input.
   - Disabled guard.
   - Loading state.

6. Build contact sheets
   - Create overview images for quick review.
   - When the intake will inform wireframes, create a separate page-state or wireframe contact sheet that groups stable pages and state variants apart from granular interaction screenshots.
   - Keep originals full-size.

## Hallucination guardrails

- Do not say "all buttons" unless every discovered capture target has evidence or an explicit blocker.
- Do not rely only on DOM state when visual layout matters.
- Do not use live external calls unless explicitly requested.
- Do not overwrite existing screenshots unless this is an intentional rerun.
- Do not collapse button behavior into a single "clicked" note; record the visible reaction or mark it source-confirmed only.

## Done criteria

- Screenshot folders contain originals.
- `screenshots/README.md` indexes screenshot families.
- Contact sheets exist for review.
- Wireframe-critical page states are either captured or listed as blockers.
- Dialog text is recorded where native screenshots are not possible.
- Uncaptured targets are listed with blocker reasons.
