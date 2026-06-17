---
name: plan
description: Map a web/mobile UI task, current diff, changed files, PR, branch, or local Codex session id into a ui-operator capture plan. Use for "영향받는 페이지 잡아줘", "모바일 화면 목록", "세션 기반 캡처 계획", "캡처 계획", "페이지/모달 목록", "iOS/Android 화면 캡처 계획", "diff 기반 UI 캡처", "affected surfaces", "capture plan". Writes artifacts/ui-operator/SLUG/capture-plan.json and manifest.json only. Do not use when the user only wants to run an existing plan.
---

# UI Operator - Plan

## When to use

Use before capture when the user provides a UI change task, changed files, a git diff, PR, or route list and wants page/state coverage planned.

## Output contract

Writes only:

```text
artifacts/ui-operator/<slug>/manifest.json
artifacts/ui-operator/<slug>/capture-plan.json
```

Never modify source code, screenshots, comparison reports, or QA artifacts.

## Pipeline

1. Gather source
   - Read the task wording, changed files, diff summary, PR notes, local Codex session id, or user-provided route list.
   - For repo work, prefer `git diff --name-only <base>...HEAD` or the current unstaged/staged diff.
   - Record baseline/current URLs if known.

2. Draft affected surfaces
   - Prefer the helper:

```bash
node plugins/ui-operator/scripts/affected_surface_mapper.mjs \
  --diff-name-only /tmp/changed-files.txt \
  --task "<task summary>" \
  --out artifacts/ui-operator/<slug>/capture-plan.json
```

   - For prior local Codex sessions, prefer:

```bash
node plugins/ui-operator/scripts/session_surface_mapper.mjs \
  --session-id <session-id> \
  --out artifacts/ui-operator/<slug>/capture-plan.json
```

   - Infer routes from framework file paths only when the mapping is clear.
   - Mark low-confidence surfaces as `confidence: "inference"` with a note.

3. Add state recipes
   - Include default `list` or `page` states.
   - Add modal, drawer, dropdown, tab, filter, empty, error, loading, and responsive states when the diff or task mentions them.
   - Leave selector-dependent actions empty or marked with `pendingSelector` until the running UI is inspected.

4. Normalize output
   - For web, include `schemaVersion`, `plugin`, `slug`, `title`, `createdAt`, `baselineUrl`, `currentUrl`, `viewports`, and `routes`.
   - For native mobile, include `platform: "native-mobile"`, `devices`, `screens`, `states`, and command placeholders or `pendingCommand` notes.
   - Use stable route and state IDs such as `admin-lectures` and `extend-modal`.
   - Keep credentials out of the plan; put login logic in a setup script.

## Hallucination guardrails

- Do not invent exact routes or native screens from component-only files or session text unless naming strongly supports the inference.
- Do not invent selectors for hidden states.
- Do not drop a changed UI component just because no route is obvious; mark it as needing route confirmation.
- Do not overwrite a human-refined `capture-plan.json` unless the user asks.

## Done criteria

- `capture-plan.json` exists and is valid JSON.
- Every route or screen has at least one state.
- Every inferred route or state is marked with confidence or notes.
- Viewports are explicit.
- `manifest.json` points to the plan.
