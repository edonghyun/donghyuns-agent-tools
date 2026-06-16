---
name: start
description: Default feature-intake entry for turning PoCs, demos, prototypes, VoC experiments, screenshots, or design artifacts into screenshot-backed product integration analysis packages. Triggers include "feature-intake 해줘", "PoC 분석", "제품 편입 분석", "스크린샷 포함 유저플로우", "유저저니 유즈케이스 정리", "비즈니스팀 데모 분석", "prototype intake", "PoC to product", "feature handoff". Writes docs/feature-intake/SLUG/ and routes through inspect, capture, frame, analyze, map, and package. Do not use for already-integrated implementation QA; use qa-operator for that.
---

# Feature Intake - Start

`start` is the natural-language entry point. It turns "이 PoC를 제품 편입 분석해줘" into a complete handoff package.

When the request mentions wireframes, all pages, button reactions, implementation flow, or design handoff, use `../../docs/STATE-TAXONOMY.md` as the generalized coverage standard throughout inspect, capture, analyze, and package.

## When to use

Use when the user provides or points to:

- a VoC-driven PoC
- demo app
- prototype
- Figma/design artifact
- exported HTML
- spreadsheet workflow
- internal script or tool
- AI experiment
- screenshots from another team

Common prompts:

- "이 PoC를 feature-intake 해줘. 스크린샷 포함해서 유저플로우, 유저저니, 유즈케이스까지."
- "비즈니스팀에서 준 데모 앱을 기존 서비스에 붙인다고 보고 분석해줘."
- "외부 AI 호출은 mock 처리하고 모든 버튼/모달 상태 캡처해줘."
- "와이어프레임 설계에 필요하니까 모든 페이지/상태와 버튼 클릭 반응까지 정리해줘."
- "이 prototype을 제품화한다고 가정하고 MVP/backlog까지 정리해줘."

Do not use when the user only wants acceptance QA on an already-integrated implementation. Use `qa-operator` instead.

## Output contract

Writes under:

```text
docs/feature-intake/<slug>/
├── README.md
├── intake-manifest.json
├── screenshots/
├── analysis/
├── qa/
└── tools/
```

May read the artifact project and existing product repo. May create helper scripts under the intake package's `tools/` folder. Do not modify the source artifact or existing product code unless the user separately asks for implementation work.

## Pipeline

1. Intake
   - Identify artifact path/URL and existing product repo.
   - Determine slug, output directory, whether runtime capture is possible, and whether external calls must be mocked.
   - Default external API/AI calls to mock/intercept.

2. Inspect
   - Apply `feature-intake:inspect` to inventory structure, pages, controls, button handlers/reactions, external calls, state, data, and dead paths.

3. Capture
   - Apply `feature-intake:capture` to collect page, page-state/wireframe, interaction, button-reaction, dialog, edge-state, and contact-sheet screenshots.

4. Frame
   - Apply `feature-intake:frame` to fill generalized product-framing slots.
   - Use `Known`, `Assumed`, `Unknown`, and `Decision Needed`.

5. Analyze
   - Apply `feature-intake:analyze` to write user flows, journeys, use cases, inventories, screen annotations, and button-handling/reaction notes.

6. Map
   - Apply `feature-intake:map` to map the artifact into the existing product surface, modules, data, APIs, permissions, and storage.

7. Package
   - Apply `feature-intake:package` to assemble README, indexes, coverage matrix, screenshots, risks, MVP/backlog, and final links.

## Hallucination guardrails

- Do not claim a screen exists without a screenshot, source file, or explicit supplied image.
- Do not assume the primary user. Mark as `Assumed` or `Unknown`.
- Do not assume export/copy behavior is enough for production.
- Do not call the artifact production-ready.
- Do not hide unreachable code paths. Mark them `blocked`.
- Do not use live external AI/API calls unless explicitly requested.

## Done criteria

- The intake package exists under `docs/feature-intake/<slug>/`.
- Screenshots or explicit capture blockers are present.
- Product framing has statuses for actors, placement, output, quality, MVP, data/AI/storage, operations, and risks.
- User flow, user journeys, use cases, screen-by-screen annotations, button-handling reactions, integration fit, risks, and MVP/backlog exist for interactive artifacts.
- Final README links the most useful screenshots and contact sheets.
- Final response states what was verified, assumed, unknown, and blocked.
