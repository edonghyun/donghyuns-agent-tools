# Donghyun's Agent Tools

A host-neutral personal plugin marketplace for coding agents, focused on **safety nets** — plugins that keep code, spec, tests, and team knowledge in sync rather than generating net-new content.

> Read [`docs/PHILOSOPHY.md`](docs/PHILOSOPHY.md) for the mission, [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) for the rules every plugin follows, and [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) to add a new plugin or skill.

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

# Refresh after marketplace changes.
claude plugin marketplace update donghyuns-agent-tools
claude plugin update qa-operator@donghyuns-agent-tools
claude plugin update feature-intake@donghyuns-agent-tools
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

# Refresh after marketplace changes.
codex plugin marketplace upgrade donghyuns-agent-tools
codex plugin add qa-operator@donghyuns-agent-tools
codex plugin add feature-intake@donghyuns-agent-tools
```

Start a new Codex thread after install or update so the refreshed plugin skills are loaded into the session.

---

## Plugins

### [feature-intake](plugins/feature-intake/README.md)

Turn external feature artifacts into product integration analysis packages. `feature-intake` takes VoC-driven PoCs, demo apps, Figma prototypes, internal tools, AI experiments, or screenshots from another team and produces screenshot-backed user flows, user journeys, use cases, page-state/button-reaction coverage, product framing, integration fit, risks, MVP boundaries, and handoff documentation.

**Just say:**

```text
이 PoC를 feature-intake 해줘. 스크린샷 포함해서 유저플로우, 유저저니, 유즈케이스, 제품 편입 분석까지 정리해줘.
와이어프레임 설계용으로 모든 페이지 상태와 버튼 클릭 반응까지 한 번에 정리해줘.
```

**Skills:**

| Command | Description |
|---------|-------------|
| `/feature-intake:start`   | Natural-language entry. Runs inspect, capture, framing, analysis, mapping, and packaging. |
| `/feature-intake:inspect` | Discover artifact structure, pages, controls, button reactions, external calls, and capture targets. |
| `/feature-intake:capture` | Capture page, page-state/wireframe, button-reaction, interaction, modal/dialog, edge-case, and contact-sheet screenshots. |
| `/feature-intake:frame`   | Generalize product framing: actors, placement, output, quality bar, MVP, data/AI/storage, operations, risks. |
| `/feature-intake:analyze` | Write user flows, journeys, use cases, inventories, button-handling matrices, and screen-by-screen annotations. |
| `/feature-intake:map`     | Map the artifact into the existing product's IA, modules, data, APIs, permissions, storage, and backlog. |
| `/feature-intake:package` | Assemble the final screenshot-backed handoff README and coverage matrix. |

**Workflow:**

```
/feature-intake:start
  ├─ inspect
  ├─ capture
  ├─ frame
  ├─ analyze
  ├─ map
  └─ package
```

**Plugin docs:** [CONCEPTS](plugins/feature-intake/docs/CONCEPTS.md) · [STATE-TAXONOMY](plugins/feature-intake/docs/STATE-TAXONOMY.md) · [WORKFLOW-GUIDE](plugins/feature-intake/docs/WORKFLOW-GUIDE.md) · [EXAMPLES](plugins/feature-intake/docs/EXAMPLES.md) · [TROUBLESHOOTING](plugins/feature-intake/docs/TROUBLESHOOTING.md)

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
│   └── spec-mirror/
│       ├── .claude-plugin/plugin.json
│       ├── README.md
│       ├── docs/
│       └── skills/{generate,compare,lint,gen-tests,coverage,scope}/
└── README.md
```

## License

MIT
