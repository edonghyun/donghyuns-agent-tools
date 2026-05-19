---
name: gen-tests
description: Generate executable test stubs from the existing specs/ directory. Use when the user wants to turn the spec into a real safety net by emitting unit tests for domain invariants, integration tests for backend endpoints, and e2e tests for flows. Triggers include "gen tests", "generate tests from spec", "spec to tests", "build test stubs", "테스트 생성", "스펙 기반 테스트". Detects the project's existing test framework. Writes stubs only — never overwrites existing tests. Asks the user for confirmation if more than 20 stubs would be created.
---

# Spec Mirror — Gen Tests

Transform the **spec into executable safety**. For each flow, endpoint, and invariant captured in `specs/`, emit a test stub in the project's existing test framework. Stubs include the spec source reference as a comment, so a developer filling them in knows exactly what they're asserting against.

This is the highest-leverage skill in the plugin: it converts passive documentation into active regression coverage.

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

---

## Stub anatomy

Every stub file starts with a header comment block:

```ts
// Spec source: specs/layers/backend.md#post-apiauthsignup
// Source file:  src/routes/auth.ts:42
// Generated:    <ISO timestamp> by /spec-mirror:gen-tests
// Status:       TODO — fill in assertions, then remove this header

import { describe, it, expect } from 'vitest';

describe('POST /api/auth/signup', () => {
  it.todo('returns 201 with user id on valid payload');
  it.todo('returns 400 when email is missing');
  // TODO: add assertions for each scenario described in the spec
});
```

Use the project's test runner conventions (`it.todo`, `xit`, `@pytest.mark.skip(reason="stub")`, `t.Skip("stub")`, etc.) so the suite still passes until the stubs are filled in.

---

## Pipeline

### Phase 0 — Detect test framework

Look for, in order:
- `package.json` → check devDeps for `vitest`, `jest`, `playwright`, `mocha`, `cypress`.
- `pyproject.toml` / `setup.cfg` → `pytest`, `unittest`.
- `go.mod` → use stdlib `testing`.
- `Cargo.toml` → use `#[test]`.
- Pom/Gradle → `JUnit5`.

If none found → ask the user. If multiple → ask which to target (or "all" if reasonable).

### Phase 1 — Plan

Parse `specs/` and build the planned stub list:

| Spec source | Stub type | Target file |
|---|---|---|
| `specs/flows/01-signup.md` | e2e | `tests/spec-mirror/e2e/01-signup.spec-stub.ts` |
| `specs/layers/backend.md#post-apiauthsignup` | integration | `tests/spec-mirror/integration/auth-signup.spec-stub.ts` |
| `specs/layers/domain.md#user-email-invariant` | unit | `tests/spec-mirror/unit/user-email.spec-stub.ts` |

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

### Phase 4 — Write index

Write `tests/spec-mirror/STUBS.md`:

```markdown
# Spec-Mirror Test Stubs

Generated: <ISO timestamp>
Framework: <detected framework>

## Stubs created (N)

| Target | Stub file | Status |
|---|---|---|
| `POST /api/auth/signup` | `tests/spec-mirror/integration/auth-signup.spec-stub.ts` | TODO |
| Flow: signup | `tests/spec-mirror/e2e/01-signup.spec-stub.ts` | TODO |

## Already covered (skipped) (M)

| Target | Existing test |
|---|---|
| `POST /api/auth/login` | `tests/auth.test.ts:45` |

## Next steps

- Fill in each `*.spec-stub.*` file.
- Once filled, rename to drop the `-stub` suffix and the file becomes a normal test.
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

---

## Done criteria

- [ ] `tests/spec-mirror/STUBS.md` exists.
- [ ] All planned stub files were created (no overwrites).
- [ ] Each stub has the source-reference header.
- [ ] Each stub uses the framework's skip/todo idiom so the suite still passes.
- [ ] One-paragraph chat summary posted.
