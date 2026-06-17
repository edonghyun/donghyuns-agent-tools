# UI Operator Concepts

## Mission

`ui-operator` reduces visual drift during active UI work across web, mobile web, and native mobile apps. It makes the evidence for a design change durable: which surfaces were affected, which states were captured, what changed between baseline and current, what improved, and what still needs judgment.

It does not decide taste on its own. It reports observed evidence and marks preference calls as product/design judgment.

## Core Terms

| Term | Meaning |
|---|---|
| Affected surface | A page, route, native screen, modal, drawer, bottom sheet, dropdown, table, toolbar, form, or responsive state touched by a UI change. |
| Capture plan | A JSON recipe listing routes, viewports, and state actions to capture. |
| Baseline | The reference build, usually `main`, production-like, or a pre-change server. |
| Current | The candidate build, usually the active branch or post-change server. |
| State recipe | Browser actions needed to reveal a state, such as opening a modal or dropdown. |
| Native adapter | A project-provided command that drives iOS/Android state setup and writes a screenshot to `UI_OPERATOR_SCREENSHOT_PATH`. |
| Comparison report | Side-by-side HTML plus `comparison-data.json` with screenshots, URLs, metrics, logs, and blockers. |
| Iteration note | A record that a later code change reran the same evidence loop. |
| Local session source | A local Codex JSONL session under `~/.codex/sessions` used to recover UI task context, URLs, routes, screenshot paths, and state hints. |

## Platform Adapters

| Platform | Adapter |
|---|---|
| Web app | `visual_compare_capture.mjs` with Playwright URLs and route/state actions. |
| Mobile web | `visual_compare_capture.mjs` with mobile viewport recipes. |
| Native mobile | `native_mobile_capture.mjs` with project-provided commands for simulator/device setup and screenshots. |
| Local Codex session | `session_surface_mapper.mjs` with a `--session-id` or `--session-file` to draft a capture plan from previous local work. |
| Manual/device lab | `native_mobile_capture.mjs` can ingest screenshots from commands that copy exported images into the expected path. |

Native mobile support is intentionally command-based. The plugin should not force one stack. A React Native app may use Detox or Maestro, an iOS app may use XCTest plus `xcrun simctl`, and an Android app may use Gradle, Maestro, Appium, or `adb`.

## Artifact Contract

The plugin writes under:

```text
artifacts/ui-operator/<slug>/
```

It should not write product source files. Code edits happen in the normal development workflow; `ui-operator` records the visual evidence around those edits.

## Evidence Levels

| Level | Evidence |
|---|---|
| Confirmed | Screenshot, URL, viewport, state recipe, and observed browser behavior are all present. |
| Partial | Screenshot exists but a state recipe, login, baseline, or viewport is missing. |
| Blocked | Server, auth, data, route, selector, or browser failure prevents capture. |
| Inference | A surface is likely affected from file names or task wording but was not captured yet. |

## Boundary With QA

`qa-operator` answers "does the requirement pass?".

`ui-operator` answers "what did the UI change do to the visible product surface, and can we prove it across page states?"

They can compose: run `ui-operator` for visual evidence, then `qa-operator` for acceptance coverage.
