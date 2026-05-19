# Donghyun's Claude Plugins

A personal plugin marketplace for Claude Code, focused on **safety nets** — plugins that keep code, spec, tests, and team knowledge in sync rather than generating net-new content.

> Read [`docs/PHILOSOPHY.md`](docs/PHILOSOPHY.md) for the mission, [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md) for the rules every plugin follows, and [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) to add a new plugin or skill.

---

## Installation

```bash
# Add marketplace (once pushed to GitHub)
/plugin marketplace add donghyuns-claude https://github.com/<owner>/donghyuns-claude

# Or, during local development:
/plugin marketplace add donghyuns-claude ~/projects/donghyuns-claude

# Install a plugin
/plugin install spec-mirror@donghyuns-claude
```

---

## Plugins

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
donghyuns-claude/
├── .claude-plugin/
│   └── marketplace.json
├── docs/                              # marketplace-level
│   ├── PHILOSOPHY.md
│   ├── CONVENTIONS.md
│   └── CONTRIBUTING.md
├── plugins/
│   └── spec-mirror/
│       ├── .claude-plugin/plugin.json
│       ├── README.md
│       ├── docs/                      # plugin-level
│       │   ├── CONCEPTS.md
│       │   ├── EXAMPLES.md
│       │   ├── WORKFLOW-GUIDE.md
│       │   └── TROUBLESHOOTING.md
│       └── skills/
│           ├── generate/   (+ assets/refs/* — README templates for the refs/ scaffold)
│           ├── compare/
│           ├── lint/
│           ├── gen-tests/
│           ├── coverage/
│           └── scope/
└── README.md
```

## License

MIT
