# Donghyun's Agent Tools

A host-neutral personal plugin marketplace for coding agents, focused on **safety nets** — plugins that keep code, spec, tests, and team knowledge in sync rather than generating net-new content.

> Read [`docs/PHILOSOPHY.md`](docs/PHILOSOPHY.md) for the mission, [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) for the rules every plugin follows, and [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) to add a new plugin or skill.

## 빠르게 둘러보기

코딩 에이전트가 검토 근거와 결과물을 일정한 형식으로 남기도록 돕는 플러그인 모음입니다.
지금 필요한 작업에 맞춰 아래 도구를 선택합니다.

| 하려는 일 | 도구 | 결과를 읽는 곳 |
|---|---|---|
| 요구사항을 실제 브라우저에서 검증하기 | [qa-operator](plugins/qa-operator/README.md) | QA 계획·항목별 결과·증거 대시보드 |
| 이미 구현한 화면의 변경 전후를 비교하기 | [ui-operator](plugins/ui-operator/README.md) | 화면별 캡처·비교 리포트·리뷰 |
| 외부 PoC를 기존 제품에 편입할지 분석하기 | [feature-intake](plugins/feature-intake/README.md) | 스크린샷과 연결된 분석·스펙·웹 리포트 |
| 구현과 문서의 차이를 추적하기 | [spec-mirror](plugins/spec-mirror/README.md) | 코드 근거가 연결된 명세·차이·범위 분석 |
| 실패 증거부터 확인하며 TDD로 변경하기 | [dev-discipline](plugins/dev-discipline/README.md) | 행동 목록·실행 명령·RED/GREEN 근거 |

설치 후에는 예를 들어 다음과 같이 요청할 수 있습니다. 이는 사용 예이며 실제 QA 결과는 아닙니다.

```text
qa-operator로 현재 변경분의 QA 계획을 만들고 브라우저로 검증해줘.
실패한 항목에는 스크린샷과 원인 분석을 남겨줘.
```

[QA 요청 예시](plugins/qa-operator/docs/EXAMPLES.md)와 각 플러그인의 문서에서 입력·출력·검증 범위를 확인할 수 있습니다.
사용 중인 코딩 에이전트의 브라우저 접근과 프로젝트 실행 환경은 별도로 필요합니다.

## Runtime checks

QA 결과 파일 초기화·갱신·동시 업데이트·증거 경로 검증·대시보드 관련 회귀 테스트를 실행합니다.
Python 표준 라이브러리를 사용하며 별도 패키지 설치가 필요하지 않습니다.

```sh
python3 -m unittest discover -s plugins/qa-operator/scripts -p 'test_*.py' -v
```

[GitHub CI](https://github.com/edonghyun/donghyuns-agent-tools/actions/workflows/runtime-checks.yml)는 Python 3.12에서 같은 검사를 실행합니다.
이 검사는 QA 도구의 파일·상태 관리 범위이며, 실제 브라우저 QA나 전체 플러그인의 호스트별 설치·동작을 검증하지 않습니다.

---

## Installation

### Claude Code

```bash
# Add marketplace from GitHub.
claude plugin marketplace add edonghyun/donghyuns-agent-tools

# Or, during local development.
claude plugin marketplace add /Users/idonghyeon/projects/donghyuns-agent-tools

# Install plugins.
claude plugin install spec-mirror@donghyuns-agent-tools
claude plugin install qa-operator@donghyuns-agent-tools
claude plugin install feature-intake@donghyuns-agent-tools
claude plugin install ui-operator@donghyuns-agent-tools
claude plugin install dev-discipline@donghyuns-agent-tools

# Refresh after marketplace changes.
claude plugin marketplace update donghyuns-agent-tools
claude plugin update qa-operator@donghyuns-agent-tools
claude plugin update feature-intake@donghyuns-agent-tools
claude plugin update ui-operator@donghyuns-agent-tools
claude plugin update dev-discipline@donghyuns-agent-tools
```

### Codex

Codex support reuses the same `plugins/<plugin>/skills/` tree and adds Codex-specific manifests next to the Claude manifests:

- marketplace: `.agents/plugins/marketplace.json`
- plugin: `plugins/<plugin>/.codex-plugin/plugin.json`

```bash
# Add marketplace from GitHub.
codex plugin marketplace add edonghyun/donghyuns-agent-tools --ref main

# Or, during local development.
codex plugin marketplace add /Users/idonghyeon/projects/donghyuns-agent-tools

# Install Codex-supported plugins.
codex plugin add qa-operator@donghyuns-agent-tools
codex plugin add feature-intake@donghyuns-agent-tools
codex plugin add ui-operator@donghyuns-agent-tools
codex plugin add dev-discipline@donghyuns-agent-tools

# Refresh after marketplace changes.
codex plugin marketplace upgrade donghyuns-agent-tools
codex plugin add qa-operator@donghyuns-agent-tools
codex plugin add feature-intake@donghyuns-agent-tools
codex plugin add ui-operator@donghyuns-agent-tools
codex plugin add dev-discipline@donghyuns-agent-tools
```

Start a new Codex thread after install or update so the refreshed plugin skills are loaded into the session.

---

## Plugins

### [dev-discipline](plugins/dev-discipline/README.md)

Enforce evidence-driven development workflows. Its first skill, `/dev-discipline:tdd`, treats tests as co-located executable specifications (`A.ts` → `A.spec.ts`) and controls implementation through one-behavior-at-a-time RED-GREEN-REFACTOR cycles with commands and observed results.

**Just say:**

```text
TDD로 구현해줘. 테스트는 프로덕션 코드 옆에 명세처럼 작성하고 RED 실패부터 실제로 확인해.
이 버그를 회귀 테스트 먼저 작성해서 고치고 테스트를 통과시키려고 assertion을 약하게 만들지 마.
```

**Skills:**

| Command | Description |
|---------|-------------|
| `/dev-discipline:tdd` | Co-located executable specifications, meaningful RED verification, minimum GREEN changes, restrained test doubles, and green-only refactoring. |

**Workflow:**

```text
behavior ledger → specification quality gate → RED → verify RED → minimum GREEN → verify GREEN → refactor
```

---

### [ui-operator](plugins/ui-operator/README.md)

Run evidence-backed UI iteration loops for changes already inside a product. `ui-operator` turns a web, mobile web, native mobile UI task, branch, PR, diff, local Codex session, or paired baseline/current targets into affected page/screen/state planning, route and modal screenshot capture, native app screenshot collection, side-by-side comparison reports, UI/UX findings, and recapture notes after improvements.

**Just say:**

```text
이번 UI 변경 diff 기준으로 영향받는 페이지/모달 스샷 계획 잡고 baseline/current 비교해줘.
baseline은 localhost:3002, current는 localhost:3004야. 관리자 화면들 before/after 비교 리포트 만들어줘.
iOS/Android 앱 화면도 baseline/current로 스크린샷 수집해서 비교해줘.
이전 로컬 Codex session id에서 UI 작업 맥락을 뽑아서 capture plan 만들어줘.
UI 개선 중간 확인용으로 작업 내용에 따른 캡처와 리뷰 남겨줘.
```

**Skills:**

| Command | Description |
|---------|-------------|
| `/ui-operator:start`   | Natural-language entry. Plans affected surfaces, captures, compares, reviews, and optionally iterates. |
| `/ui-operator:plan`    | Map a task, diff, PR, local session id, or changed files into page/screen/state capture recipes. |
| `/ui-operator:capture` | Capture current or paired baseline/current screenshots for web routes, mobile screens, modals, dropdowns, and responsive states. |
| `/ui-operator:compare` | Generate side-by-side comparison reports from URLs or existing capture folders. |
| `/ui-operator:review`  | Write screenshot-backed UI/UX findings grounded in comparison evidence. |
| `/ui-operator:iterate` | Rerun affected captures after code changes and preserve iteration evidence. |

**Workflow:**

```
/ui-operator:start
  ├─ plan
  ├─ capture
  ├─ compare
  ├─ review
  └─ iterate, after changes
```

**Plugin docs:** [CONCEPTS](plugins/ui-operator/docs/CONCEPTS.md) · [WORKFLOW-GUIDE](plugins/ui-operator/docs/WORKFLOW-GUIDE.md) · [EXAMPLES](plugins/ui-operator/docs/EXAMPLES.md) · [TROUBLESHOOTING](plugins/ui-operator/docs/TROUBLESHOOTING.md)

---

### [feature-intake](plugins/feature-intake/README.md)

Turn external feature artifacts into product integration analysis packages. `feature-intake` takes VoC-driven PoCs, demo apps, Figma prototypes, internal tools, AI experiments, or screenshots from another team and produces screenshot-backed page-walk traversal, action graphs, condition graphs, visual dependency diagrams, user flows, user journeys, use cases, page-state/control-reaction coverage, product framing, integration fit, risks, MVP boundaries, implementation specs, static web reports, and handoff documentation.

**Just say:**

```text
이 PoC를 feature-intake 해줘. 스크린샷 포함해서 유저플로우, 유저저니, 유즈케이스, 제품 편입 분석까지 정리해줘.
와이어프레임 설계용으로 모든 페이지 상태와 버튼 클릭 반응까지 한 번에 정리해줘.
시작 페이지부터 페이지를 순회하면서 링크, 탭, 버튼, 모달 상태까지 캡처해줘.
분석 결과를 스크린샷과 연결된 웹 리포트/문서 뷰로 만들어줘.
```

**Skills:**

| Command | Description |
|---------|-------------|
| `/feature-intake:start`   | Natural-language entry. Runs inspect, capture, framing, analysis, mapping, packaging, spec, and report as requested. |
| `/feature-intake:inspect` | Discover artifact structure, pages, controls, button reactions, page/action conditions, backend guards, external calls, and capture/probe targets. |
| `/feature-intake:capture` | Capture page-walk traversal, page-state/wireframe, link/control/button reactions, modal/dialog, edge-case, and contact-sheet screenshots. |
| `/feature-intake:frame`   | Generalize product framing: actors, placement, output, quality bar, MVP, data/AI/storage, operations, risks. |
| `/feature-intake:analyze` | Write action graphs, condition graphs, Mermaid visuals, user flows, journeys, use cases, inventories, button-handling matrices, and screen-by-screen annotations. |
| `/feature-intake:map`     | Map the artifact into the existing product's IA, modules, data, APIs, permissions, storage, and backlog. |
| `/feature-intake:package` | Assemble the final screenshot-backed handoff README and coverage matrix. |
| `/feature-intake:spec`    | Compile implementation-ready feature, action, condition, screen-state, data/API, acceptance-test, and open-decision specs. |
| `/feature-intake:report`  | Publish `report.html` plus readable `docs/*.html` pages with screenshots, Mermaid rendering, and evidence links. |

**Workflow:**

```
/feature-intake:start
  ├─ inspect
  ├─ capture
  ├─ frame
  ├─ analyze
  ├─ map
  ├─ package
  ├─ spec
  └─ report
```

**Plugin docs:** [CONCEPTS](plugins/feature-intake/docs/CONCEPTS.md) · [STATE-TAXONOMY](plugins/feature-intake/docs/STATE-TAXONOMY.md) · [SPEC-EXTRACTION-PROTOCOL](plugins/feature-intake/docs/SPEC-EXTRACTION-PROTOCOL.md) · [CONDITION-INSPECT-PROTOCOL](plugins/feature-intake/docs/CONDITION-INSPECT-PROTOCOL.md) · [WORKFLOW-GUIDE](plugins/feature-intake/docs/WORKFLOW-GUIDE.md) · [EXAMPLES](plugins/feature-intake/docs/EXAMPLES.md) · [TROUBLESHOOTING](plugins/feature-intake/docs/TROUBLESHOOTING.md) · [AI use-case book](docs/AI-USE-CASE-FEATURE-INTAKE-BOOK.md)

---

### [qa-operator](plugins/qa-operator/README.md)

Delegate browser QA from natural language. `qa-operator` turns requirement lists, spreadsheets, issues, PRs, or feature ranges into a QA plan, starts a live monitor dashboard, executes browser checks, captures screenshots/logs/traces, flags UI/UX risks, triages failures, and can repair obvious local defects when allowed.

**Just say:**

```text
이 시트 31~43번 QA 맡겨줘. monitor 켜고 UI/UX 문제까지 봐줘.
```

**Skills:**

| Command | Description |
|---------|-------------|
| `/qa-operator:start`   | Natural-language entry. Plans, starts monitor, runs QA, triages failures, and optionally repairs. |
| `/qa-operator:plan`    | Convert requirements into `qa-plan.json` and initialize the artifact tree. |
| `/qa-operator:run`     | Execute browser QA and incrementally update `qa-results.json`, screenshots, traces, and logs. |
| `/qa-operator:monitor` | Serve the dashboard that polls latest QA results. |
| `/qa-operator:triage`  | Analyze failures, blockers, and UI/UX risks into issue reports. |
| `/qa-operator:repair`  | Fix scoped, verifiable defects and rerun affected QA items when allowed. |

**Workflow:**

```
/qa-operator:start
  ├─ plan
  ├─ monitor  ← reads latest results
  ├─ run      → writes latest results
  ├─ triage
  └─ repair, if allowed
```

**Plugin docs:** [CONCEPTS](plugins/qa-operator/docs/CONCEPTS.md) · [WORKFLOW-GUIDE](plugins/qa-operator/docs/WORKFLOW-GUIDE.md) · [EXAMPLES](plugins/qa-operator/docs/EXAMPLES.md) · [TROUBLESHOOTING](plugins/qa-operator/docs/TROUBLESHOOTING.md)

---

### [spec-mirror](plugins/spec-mirror/README.md)

Generate, drift-check, lint, test-stub, coverage-audit, and scope-walk E2E specifications that mirror the **current implementation** of an application. Acts as a safety net: every claim is sourced (`→ file:line`) or explicitly marked as inference, every cross-reference is checkable, and the spec is re-derivable at any time. Pairs auto-generated `specs/` with human-curated `refs/{designs,plans,decisions,lessons}/`.

**Skills:**

| Command | Description |
|---------|-------------|
| `/spec-mirror:generate`  | Detect stack → confirm architecture with user → write layered specs (frontend / backend / domain) + cross-referenced flow specs, scaffold `refs/` |
| `/spec-mirror:compare`   | Drift-check current code against existing `specs/`. Writes `specs/DRIFT.md`. CI-safe, never modifies specs. |
| `/spec-mirror:lint`      | Audit `specs/` for internal hygiene — dead cross-refs, missing sources, stale `[INFERENCE]` markers. Writes `specs/LINT.md`. |
| `/spec-mirror:gen-tests` | Convert spec into executable safety — emit test stubs in the project's existing framework. Writes `tests/spec-mirror/**`, never overwrites. |
| `/spec-mirror:coverage`  | Cross-reference existing tests against spec elements. Writes `specs/COVERAGE.md`. |
| `/spec-mirror:scope`     | Walk the spec graph from a target → focused mini-spec ("everything you need to read before changing X"). Writes `specs/scope/<target>.md`. |

**Workflow:**

```
/spec-mirror:generate → /spec-mirror:lint → /spec-mirror:gen-tests → /spec-mirror:coverage
                                                                          ↓
       /spec-mirror:scope <target>  ← before a change          /spec-mirror:compare  ← any time
```

**Triggers:**

| Skill | English | Korean |
|---|---|---|
| generate  | `generate spec`, `e2e spec`, `mirror the app`   | `스펙 생성`, `스펙 미러`, `구현 스펙 만들어줘` |
| compare   | `drift check`, `verify spec`, `compare spec`    | `스펙 비교`, `스펙 드리프트`, `스펙 검증` |
| lint      | `lint spec`, `spec hygiene`, `spec audit`       | `스펙 린트`, `스펙 점검`, `스펙 정합성` |
| gen-tests | `gen tests`, `spec to tests`                    | `테스트 생성`, `스펙 기반 테스트` |
| coverage  | `spec coverage`, `what's untested`              | `스펙 커버리지`, `테스트 커버리지` |
| scope     | `spec scope`, `blast radius`, `what touches`    | `스펙 스코프`, `영향 범위`, `이거 바꾸면 뭐 깨져` |

**Generated Structure:**

```
project-root/
├── specs/                          # auto-generated
│   ├── README.md                   # index + last-generated timestamp
│   ├── layers/
│   │   ├── frontend.md             # pages, components, actions, state, API calls
│   │   ├── backend.md              # endpoints, handlers, services
│   │   └── domain.md               # entities, value objects, invariants, queries
│   ├── flows/
│   │   └── NN-<slug>.md            # cross-linked to layers/
│   ├── scope/                      # from /spec-mirror:scope
│   ├── DRIFT.md                    # from /spec-mirror:compare
│   ├── LINT.md                     # from /spec-mirror:lint
│   └── COVERAGE.md                 # from /spec-mirror:coverage
├── refs/                           # human-curated (scaffolded by generate)
│   ├── designs/                    # design docs (before code)
│   ├── plans/                      # task execution plans
│   ├── decisions/                  # ADRs — why the spec/code is this way
│   └── lessons/                    # failure modes captured after the fact
└── tests/spec-mirror/              # from /spec-mirror:gen-tests
    ├── STUBS.md
    └── {unit,integration,e2e}/*.spec-stub.*
```

**Plugin docs:** [CONCEPTS](plugins/spec-mirror/docs/CONCEPTS.md) · [WORKFLOW-GUIDE](plugins/spec-mirror/docs/WORKFLOW-GUIDE.md) · [EXAMPLES](plugins/spec-mirror/docs/EXAMPLES.md) · [TROUBLESHOOTING](plugins/spec-mirror/docs/TROUBLESHOOTING.md)

---

## Marketplace docs

| Doc | Purpose |
|---|---|
| [`docs/PHILOSOPHY.md`](docs/PHILOSOPHY.md) | What this marketplace is for; the safety-net mission; six principles every plugin follows |
| [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) | Normative rules: directory layout, `plugin.json` schema, `SKILL.md` structure, severity rubric, `<!-- KEEP -->` semantics |
| [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) | Recipes for adding a new plugin or skill, plus what gets rejected |

---

## Layout

```
donghyuns-agent-tools/
├── .claude-plugin/
│   └── marketplace.json
├── docs/                              # marketplace-level
│   ├── PHILOSOPHY.md
│   ├── CONVENTIONS.md
│   └── CONTRIBUTING.md
├── plugins/
│   ├── qa-operator/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── .codex-plugin/plugin.json
│   │   ├── README.md
│   │   ├── assets/
│   │   ├── docs/
│   │   ├── scripts/
│   │   └── skills/{start,plan,run,monitor,triage,repair}/
│   ├── feature-intake/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── .codex-plugin/plugin.json
│   │   ├── README.md
│   │   ├── docs/
│   │   └── skills/{start,inspect,capture,frame,analyze,map,package}/
│   ├── ui-operator/
│   │   ├── .claude-plugin/plugin.json
│   │   ├── .codex-plugin/plugin.json
│   │   ├── README.md
│   │   ├── docs/
│   │   ├── scripts/
│   │   └── skills/{start,plan,capture,compare,review,iterate}/
│   └── spec-mirror/
│       ├── .claude-plugin/plugin.json
│       ├── README.md
│       ├── docs/
│       └── skills/{generate,compare,lint,gen-tests,coverage,scope}/
└── README.md
```

## License

MIT
