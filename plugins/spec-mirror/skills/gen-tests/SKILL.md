---
name: gen-tests
description: Generate test stubs from the existing specs/ directory and record whether they are active todos or inactive planning stubs. Use when the user wants to turn the spec into planned executable coverage for domain invariants, backend endpoints, and e2e flows. Triggers include "gen tests", "generate tests from spec", "spec to tests", "build test stubs", "테스트 생성", "스펙 기반 테스트". Detects the project's existing test framework. Writes stubs only — never overwrites existing tests. Asks the user for confirmation if more than 20 stubs would be created.
---

# Spec Mirror — Gen Tests

Transform the **spec into planned executable safety**. For each flow, endpoint, and invariant captured in `specs/`, emit a test stub in the project's existing test framework. Stubs include the spec source reference as a comment, so a developer filling them in knows exactly what they're asserting against.

This is the highest-leverage skill in the plugin: it converts passive documentation into a concrete test backlog, and into active regression coverage only after the stubs are filled with assertions and collected by the normal test command.

---

## When to use

- "gen tests", "generate tests from spec", "spec to tests", "build test stubs"
- After a fresh `/spec-mirror:generate` to bootstrap testing on a legacy codebase.
- Korean: "테스트 생성", "스펙 기반 테스트"

**Pre-conditions:**
1. `specs/` directory exists.
2. The project has at least one detectable test framework (or none, in which case the skill asks the user which to use).

---

## Output contract

This skill writes:

1. **Test stub files** under the project's conventional test directory (e.g. `tests/`, `__tests__/`, `*.test.ts` siblings).
2. **`tests/spec-mirror/STUBS.md`** — an index listing every stub created, its target spec element, and its current status (TODO / partially filled / done).

**Never overwrites existing test files.** If a test file already exists for a given target, the skill records `existing: <path>` in `STUBS.md` and skips it.

**Stub naming:** `<target-slug>.spec-stub.<ext>` to make stubs visually distinct from human-written tests. Or, where the test framework expects specific naming (Playwright, etc.), use the framework's convention but place under `tests/spec-mirror/`.

**Safety-net naming rule:** A stub is not coverage. It is planned coverage. Do not describe generated stubs as an active safety net unless they are collected by the project's normal test command and contain real assertions.

**Discovery rule:** Before writing stubs, inspect the test command and runner config. If the planned `tests/spec-mirror/**` path is not collected by the normal command, either:

- write stubs into the conventional package/app test location where they will be collected, OR
- keep them under `tests/spec-mirror/**` but mark them as `inactive planning stubs` in both the file header and `STUBS.md`.

When the project has package-scoped test config, do not assume root `tests/**` is collected.

---

## Stub anatomy

Every stub file starts with a header comment block:

```ts
// Spec source: specs/layers/backend.md#post-apiauthsignup
// Source file:  src/routes/auth.ts:42
// Generated:    <ISO timestamp> by /spec-mirror:gen-tests
// Test command: npm test -- auth-signup
// Collection:   active todo | inactive planning stub
// Status:       TODO — fill in assertions, then remove this header

import { describe, it, expect } from 'vitest';

describe('POST /api/auth/signup', () => {
  it.todo('returns 201 with user id on valid payload');
  it.todo('returns 400 when email is missing');
  // TODO: add assertions for each scenario described in the spec
});
```

Use the project's test runner conventions (`it.todo`, `xit`, `@pytest.mark.skip(reason="stub")`, `t.Skip("stub")`, etc.) so the suite still passes until the stubs are filled in.

If the project uses CQRS/event-driven read models, integration/e2e stubs must include a TODO for the read-model catch-up step immediately after any command that should be observed through a query. The TODO text should name the expected read model or projection, not just say "wait".

---

## Pipeline

### Phase 0 — Detect test framework

Look for, in order:
- `package.json` → check devDeps for `vitest`, `jest`, `playwright`, `mocha`, `cypress`.
- test scripts in `package.json` and package/app-specific `package.json` files.
- runner config such as `vitest.config.*`, `jest.config.*`, `playwright.config.*`, `pytest.ini`, or framework-specific package mode.
- `pyproject.toml` / `setup.cfg` → `pytest`, `unittest`.
- `go.mod` → use stdlib `testing`.
- `Cargo.toml` → use `#[test]`.
- Pom/Gradle → `JUnit5`.

If none found → ask the user. If multiple → ask which to target (or "all" if reasonable).

Record the detected command(s) and whether the chosen stub paths are collected. This becomes part of `STUBS.md`.

### Phase 1 — Plan

Parse `specs/` and build the planned stub list:

| Spec source | Stub type | Target file |
|---|---|---|
| `specs/flows/01-signup.md` | e2e | `tests/spec-mirror/e2e/01-signup.spec-stub.ts` |
| `specs/layers/backend.md#post-apiauthsignup` | integration | `tests/spec-mirror/integration/auth-signup.spec-stub.ts` |
| `specs/layers/domain.md#user-email-invariant` | unit | `tests/spec-mirror/unit/user-email.spec-stub.ts` |

Also include:

| Test command | Collected by default? | Mode |
|---|---|---|
| `npm test` | yes/no/unknown | active todo / inactive planning stub |

Present the plan to the user **only if** total stub count exceeds 20 OR the user passed `--confirm`. Otherwise proceed silently. Always print a one-line summary at the end regardless.

### Phase 2 — Skip existing

For each planned stub, check whether a test already exists for that target. Heuristic match (configurable, but default):
- Same describe/it text containing the endpoint path, flow name, or entity name.
- Same target file path imported in an existing test.

Record existing-test matches in `STUBS.md` under "already covered" — these are signal that the spec is being tested.

### Phase 3 — Write stubs

Write each planned stub. Never overwrite. Each stub uses `it.todo` / equivalent so it passes by default.

For domain invariants, generate one `it.todo` per invariant clause documented in the spec.

For endpoints, generate one `it.todo` per documented scenario (happy path + each error condition listed in the spec).

For flows, generate one e2e `it.todo` per "step" in the flow, plus one for each documented "failure mode".

For flow-level acceptance criteria, generate TODOs from behavior criteria, not from test-implementation notes. Do not turn `BackendClientForTest`, `Screen Object`, fixture layout, or file names into acceptance TODOs.

### Phase 4 — Write index

Write `tests/spec-mirror/STUBS.md`:

```markdown
# Spec-Mirror Test Stubs

Generated: <ISO timestamp>
Framework: <detected framework>
Default test command: <command or unknown>
Stub collection: [active todo | inactive planning stubs | mixed]

## Stubs created (N)

| Target | Stub file | Collection | Status |
|---|---|---|---|
| `POST /api/auth/signup` | `tests/spec-mirror/integration/auth-signup.spec-stub.ts` | active todo | TODO |
| Flow: signup | `tests/spec-mirror/e2e/01-signup.spec-stub.ts` | inactive planning stub | TODO |

## Already covered (skipped) (M)

| Target | Existing test |
|---|---|
| `POST /api/auth/login` | `tests/auth.test.ts:45` |

## Next steps

- Fill in each `*.spec-stub.*` file.
- Once filled, rename to drop the `-stub` suffix or move it into a collected test location so it becomes a normal test.
- Re-run `/spec-mirror:coverage` to confirm new tests are detected.
```

### Phase 5 — Report

One paragraph in chat: framework detected, total stubs created, total skipped (already covered), where to find the index.

---

## Hallucination guardrails

- Never write a stub for a spec element you couldn't quote. If the spec section is empty/broken, skip and record as "spec gap".
- Don't invent endpoint paths or function names. Use exactly what's in the spec.
- If the project mixes test frameworks (e.g. unit tests in vitest, e2e in playwright), use the right framework for each stub type and reflect that in `STUBS.md`.
- Use `.todo` / equivalent — never write a stub that contains a real assertion you can't justify, since a false test is worse than no test.
- A spec-mirror header alone is not coverage. Coverage requires real assertions or an explicit existing test match.

---

## Done criteria

- [ ] `tests/spec-mirror/STUBS.md` exists.
- [ ] All planned stub files were created (no overwrites).
- [ ] Each stub has the source-reference header.
- [ ] Each stub header records the test command and collection mode, or explicitly says `unknown`.
- [ ] Each stub uses the framework's skip/todo idiom so the suite still passes.
- [ ] `STUBS.md` distinguishes active todo stubs from inactive planning stubs.
- [ ] One-paragraph chat summary posted.
