# spec-mirror

Generate, audit, and maintain layered + flow-based E2E specifications that mirror the **current implementation** as a safety net. Six skills working together to keep code, spec, tests, and team knowledge in sync.

## Skills

| Command | Purpose | Writes |
|---|---|---|
| `/spec-mirror:generate` | Detect stack → confirm architecture with user → emit layered specs + cross-referenced flow specs. Scaffolds `refs/`. | `specs/**`, `refs/<dir>/README.md` |
| `/spec-mirror:compare`  | Drift-check current code against existing `specs/`. Severity-tagged findings. Safe in CI. | `specs/DRIFT.md` only |
| `/spec-mirror:lint`     | Audit `specs/` for internal hygiene: dead cross-refs, missing sources, stale `[INFERENCE]` markers. | `specs/LINT.md` only |
| `/spec-mirror:gen-tests`| Turn the spec into a real safety net by emitting test stubs in the project's existing framework. Never overwrites. | `tests/spec-mirror/**` |
| `/spec-mirror:coverage` | Cross-reference existing tests against spec elements. Find untested flows / endpoints / invariants. | `specs/COVERAGE.md` only |
| `/spec-mirror:scope`    | Walk the spec graph from a target → focused mini-spec of "everything you need to read before changing X". | `specs/scope/<target>.md` |

## Output structure

```
project-root/
├── specs/                           # auto-generated
│   ├── README.md
│   ├── layers/{frontend,backend,domain}.md
│   ├── flows/NN-<slug>.md
│   ├── scope/<target>.md            # from /spec-mirror:scope
│   ├── DRIFT.md                     # from /spec-mirror:compare
│   ├── LINT.md                      # from /spec-mirror:lint
│   └── COVERAGE.md                  # from /spec-mirror:coverage
├── refs/                            # human-curated (scaffolded only)
│   ├── designs/                     # design docs (before code)
│   ├── plans/                       # task execution plans
│   ├── decisions/                   # ADRs — why the spec/code is this way
│   └── lessons/                     # failure modes, captured after the fact
└── tests/spec-mirror/               # from /spec-mirror:gen-tests
    ├── STUBS.md
    └── {unit,integration,e2e}/*.spec-stub.*
```

## Why two trees (specs/ + refs/)

- **`specs/`** answers *what is* — derivable from code, kept in sync by the tooling.
- **`refs/`** answers *why and what's next* — irretrievable from code, must be written by humans.

A safety net needs both. `compare` tells you something changed; `refs/decisions/` tells you whether that change is intentional. See [`docs/CONCEPTS.md`](docs/CONCEPTS.md).

## Docs

- [`docs/CONCEPTS.md`](docs/CONCEPTS.md) — vocabulary, the mental model, severity rubric
- [`docs/WORKFLOW-GUIDE.md`](docs/WORKFLOW-GUIDE.md) — five real scenarios using the skills together
- [`docs/EXAMPLES.md`](docs/EXAMPLES.md) — sample outputs from each skill
- [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) — common failure modes

## Triggers

| Skill | Triggers (English) | Triggers (Korean) |
|---|---|---|
| generate | `generate spec`, `mirror the app`, `e2e spec` | `스펙 생성`, `스펙 미러`, `구현 스펙 만들어줘` |
| compare | `drift check`, `verify spec`, `compare spec` | `스펙 비교`, `스펙 드리프트`, `스펙 검증` |
| lint | `lint spec`, `spec hygiene`, `spec audit` | `스펙 린트`, `스펙 점검`, `스펙 정합성` |
| gen-tests | `gen tests from spec`, `spec to tests`, `build test stubs` | `테스트 생성`, `스펙 기반 테스트` |
| coverage | `spec coverage`, `what's untested`, `coverage report` | `스펙 커버리지`, `테스트 커버리지` |
| scope | `spec scope`, `blast radius`, `what touches` | `스펙 스코프`, `영향 범위`, `이거 바꾸면 뭐 깨져` |
