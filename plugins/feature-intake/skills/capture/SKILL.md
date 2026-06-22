---
name: capture
description: Capture screenshot evidence for feature intake. Use when the user asks for page-by-page screenshots, page traversal, button/control click states, modal/dialog screenshots, edge/error/loading/empty states, contact sheets, or "스크린샷 포함" analysis of a PoC/prototype/demo; triggers include "스크린샷 찍어줘", "페이지 순회", "버튼들 다 눌러봐", "버튼 눌렀을 때 화면", "모달 캡처", "contact sheet", "capture PoC", "page screenshots". Writes docs/feature-intake/SLUG/screenshots/ and screenshot indexes. Do not use for screenshot-free static analysis.
---

# Feature Intake - Capture

Capture the visual evidence that product analysis will cite.

For generalized page-state and button-reaction coverage, read `../../docs/STATE-TAXONOMY.md` when the capture will inform wireframes, implementation planning, or "all pages/buttons" coverage.

For PoC-to-product parity or "current UI differs from the delivered PoC" work, read `../../docs/POC-FIDELITY-GATE.md`. Capture the original PoC/source screenshots and the current implementation states as separate baseline/current evidence, not as one undifferentiated gallery.

## When to use

Use when an artifact is runnable, browser-visible, or supplied as images and the intake package needs visual evidence.

Use especially for:

- pages
- route/page traversal
- buttons and tabs
- links, menus, summaries, and other visible controls
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
├── page-walk-results.json
├── page-walk-index.md
└── README.md
```

May write capture helper scripts only under:

```text
docs/feature-intake/<slug>/tools/
```

Never modify application source. Mock/intercept external calls from outside the artifact when possible.

Bundled helper:

```text
plugins/feature-intake/scripts/page_walk_capture.mjs
```

Use this helper when the user asks to traverse pages or click through "all buttons/controls" at scale. Copy it into `docs/feature-intake/<slug>/tools/` or run it from the plugin path, and document the command in `tools/README.md`.

## Pipeline

1. Prepare runtime
   - Start local server if needed.
   - Mock or intercept external AI/API calls by default.
   - Document commands in `tools/README.md`.

2. Walk pages/routes
   - Use explicit route lists when known.
   - When the user asks for general traversal, seed from the entry page and discover same-origin links with a bounded crawl depth.
   - Capture one stable screenshot per reached route.
   - Keep external links blocked by default unless the user explicitly wants them.
   - When a PoC is the source of truth, capture the original PoC route/state first, then capture the corresponding current implementation route/state with matching viewport and seed data where possible.

3. Capture page states
   - One full-page screenshot per stable page/view.
   - Capture wireframe-critical variants for each page when reachable: empty, configured, loading, result, modal open, disabled guard, validation error, editing, submitted/review state.
   - Name files with sequence numbers and short slugs.

4. Capture interactions
   - Capture after each important button/tab/control click.
   - Treat links, tabs, menus, disclosure controls, and explicit `data-testid` controls as interaction targets, not only `<button>`.
   - Include before/after when the state change is subtle.
   - For async/API buttons, capture at least loading plus success or failure, mocking external calls by default.
   - For disabled buttons, capture the disabled state and record the disabled reason.
   - For output buttons such as copy/download/export, capture the surrounding state and record native dialog, download, clipboard, or permission behavior.
   - In mutation-safe mode, stop before likely final save/delete/send/submit actions unless the user explicitly allows mutations on disposable data.
   - For parity checks, do not stop at "button exists"; capture the exact reaction that the PoC promised: modal/detail open, auto-filled command, loading, generated candidate, apply/cancel/regenerate, copied/downloaded output, or final report.
   - For AI flows, record whether the command came from a preset, user input, or system recommendation, and capture whether the visible result reflects that command.

5. Capture dialogs
   - Capture modals where possible.
   - For native browser dialogs, log dialog type and text; capture surrounding before/after page state.

6. Capture edge cases
   - Validation errors.
   - Failed upload.
   - External call failure.
   - Empty input.
   - Disabled guard.
   - Loading state.

7. Build contact sheets
   - Create overview images for quick review.
   - When the intake will inform wireframes, create a separate page-state or wireframe contact sheet that groups stable pages and state variants apart from granular interaction screenshots.
   - Keep originals full-size.

## Hallucination guardrails

- Do not say "all buttons" unless every discovered capture target has evidence or an explicit blocker.
- Do not rely only on DOM state when visual layout matters.
- Do not use live external calls unless explicitly requested.
- Do not overwrite existing screenshots unless this is an intentional rerun.
- Do not collapse button behavior into a single "clicked" note; record the visible reaction or mark it source-confirmed only.
- Do not claim PoC fidelity from current-only screenshots.
- Do not ignore density loss: if the PoC displayed grouped data, multiple analysis sections, or long generated output, capture enough of the current page to compare that richness.

## Done criteria

- Screenshot folders contain originals.
- `screenshots/README.md` indexes screenshot families.
- Contact sheets exist for review.
- Wireframe-critical page states are either captured or listed as blockers.
- PoC-critical baseline/current states are either captured in paired families or listed as blockers.
- Dialog text is recorded where native screenshots are not possible.
- Uncaptured targets are listed with blocker reasons.
