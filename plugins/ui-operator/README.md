# UI Operator

`ui-operator` is for UI work that is already inside a product, across web, mobile web, and native mobile apps. It turns an in-progress UI change, branch, PR, or redesign task into a repeatable evidence loop:

```text
diff/task -> affected surface plan -> baseline/current capture -> comparison report -> review -> iteration
```

Use it when the question is not "what is this external prototype?" but "did this UI change improve the real product without breaking page, screen, modal, dropdown, responsive, native app, or workflow states?"

When the question is "does this implementation still match the original PoC/screenshots/spec?", use ui-operator in requirement parity mode. That mode checks data richness, generated output depth, required status badges, and clicked behavior, not just route or label presence.

## Skills

| Command | Description |
|---------|-------------|
| `/ui-operator:start`   | Natural-language entry. Routes through plan, capture, compare, review, and optional iterate. |
| `/ui-operator:plan`    | Map a task, diff, PR, or changed files into page/state capture recipes. |
| `/ui-operator:capture` | Capture current or paired baseline/current screenshots for web routes, mobile screens, modals, dropdowns, and responsive states. |
| `/ui-operator:compare` | Generate side-by-side comparison reports from two URLs or two capture folders. |
| `/ui-operator:review`  | Write screenshot-backed UI/UX findings grounded in the comparison report. |
| `/ui-operator:iterate` | Repeat capture/compare after code changes and append iteration notes. |

## Just Say

```text
이번 UI 변경 diff 기준으로 영향받는 페이지/모달 스샷 계획 잡고 baseline/current 비교해줘.
baseline은 localhost:3002, current는 localhost:3004야. 관리자 로그인 후 lectures/consultants/students 화면이랑 모달 비교해줘.
UI 개선 중간 확인용으로 before/after 보고서 만들어줘. 모바일도 같이 봐줘.
iOS 앱 변경사항도 같은 방식으로 화면별 baseline/current 캡처 비교해줘.
방금 로컬 Codex session id 기준으로 UI 작업 맥락을 뽑아서 capture plan 만들어줘.
PoC 스크린샷이랑 현재 구현을 비교해서 요구사항 반영 누락, 데이터 밀도 손실, 버튼 동작 차이를 찾아줘.
기존 전달받은 UI처럼 동작해야 하는데 현재 화면이 빈약한지 requirement parity review로 봐줘.
```

## Generated Structure

```text
artifacts/ui-operator/<slug>/
├── manifest.json
├── capture-plan.json
├── comparison-data.json
├── report.html
├── review.md
├── screenshots/
│   ├── baseline/
│   └── current/
└── iterations/
    └── <run-id>/
```

## Bundled Scripts

Web or mobile web:

```bash
node plugins/ui-operator/scripts/affected_surface_mapper.mjs \
  --files "src/app/admin/lectures/page.tsx,src/components/AdminToolbar.tsx" \
  --task "admin list toolbar consistency" \
  --out artifacts/ui-operator/admin-list-ui/capture-plan.json

node plugins/ui-operator/scripts/visual_compare_capture.mjs \
  --baseline-url http://localhost:3002 \
  --current-url http://localhost:3004 \
  --plan artifacts/ui-operator/admin-list-ui/capture-plan.json \
  --out artifacts/ui-operator/admin-list-ui
```

From a local Codex session:

```bash
node plugins/ui-operator/scripts/session_surface_mapper.mjs \
  --session-id 019ed35e-a14b-7db3-82c6-eefcb9c37238 \
  --out artifacts/ui-operator/admin-list-ui/capture-plan.json
```

Native mobile collection from project-provided commands:

```bash
node plugins/ui-operator/scripts/native_mobile_capture.mjs \
  --plan artifacts/ui-operator/mobile-home-ui/capture-plan.json \
  --out artifacts/ui-operator/mobile-home-ui
```

The session adapter reads local Codex JSONL sessions under `~/.codex/sessions` and drafts a capture plan from observed URLs, routes, screenshots, and state words. The native adapter does not assume a single stack. It can wrap Maestro, Appium, Detox, XCTest, Gradle, Flutter, `xcrun simctl`, `adb`, or a manual screenshot export command as long as the project command writes the screenshot to `UI_OPERATOR_SCREENSHOT_PATH`.

## Relationship To Other Plugins

- `feature-intake`: external PoC/prototype/demo analysis before product integration.
- `qa-operator`: acceptance QA against explicit requirements.
- `ui-operator`: visual evidence loop for an implementation already being changed.

**Plugin docs:** [CONCEPTS](docs/CONCEPTS.md) · [WORKFLOW-GUIDE](docs/WORKFLOW-GUIDE.md) · [EXAMPLES](docs/EXAMPLES.md) · [TROUBLESHOOTING](docs/TROUBLESHOOTING.md)

Requirement parity guide: [REQUIREMENT-PARITY-REVIEW](docs/REQUIREMENT-PARITY-REVIEW.md)
