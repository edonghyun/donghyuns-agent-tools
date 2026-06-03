---
name: coverage
description: Cross-reference existing tests against the specs/ directory to find untested flows, endpoints, and invariants. Use when the user wants to see how much of the spec is actually covered by tests, before relying on the test suite as a safety net. Triggers include "spec coverage", "test coverage vs spec", "what's untested", "coverage report", "스펙 커버리지", "테스트 커버리지", "안 테스트된 거 뭐야". Produces specs/COVERAGE.md. Never modifies existing tests or specs.
---

# Spec Mirror — Coverage

Find the gaps between what the **spec describes** and what the **tests actually verify**. A 100% spec-coverage suite is a real safety net; anything less is partial.

This is distinct from line-coverage tools (`nyc`, `coverage.py`, `go test -cover`): those measure code-execution coverage. This measures **specification coverage** — whether each documented behavior has at least one test asserting it.

---

## When to use

- "spec coverage", "test coverage vs spec", "what's untested", "coverage report"
- After `/spec-mirror:gen-tests` to confirm new stubs are detected.
- Before relying on the suite as a CI safety net.
- Korean: "스펙 커버리지", "테스트 커버리지", "안 테스트된 거 뭐야"

**Pre-condition:** `specs/` directory exists. Tests are optional — if none, the skill reports 0% and lists what should be tested.

---

## Output contract

Writes **exactly one file**: `specs/COVERAGE.md`. Never modifies tests or specs.

```markdown
# Spec Coverage Report

- **Generated at:** <ISO timestamp>
- **Test framework(s):** <detected list>
- **Verdict:** [GOOD | PARTIAL | LOW]

## Summary

| Layer    | Elements | Covered | Coverage % |
|----------|----------|---------|------------|
| frontend | N        | N       | N%         |
| backend  | N        | N       | N%         |
| domain   | N        | N       | N%         |
| flows    | N        | N       | N%         |
| **Total** | **N**   | **N**   | **N%**     |

## Stub status

| Status | Count | Meaning |
|---|---:|---|
| active todo | N | Collected by a test command, but not real coverage yet |
| inactive planning stub | N | Not collected by default; planning artifact only |
| real assertion coverage | N | Existing tests with executable assertions |

## Uncovered (🔴)

### Backend endpoints
- `POST /api/auth/oauth` — `specs/layers/backend.md#post-apiauthoauth` (no integration test found)

### Flows
- Flow: bulk-export — `specs/flows/04-bulk-export.md` (no e2e test found)

### Domain invariants
- `User.email must be unique` — `specs/layers/domain.md#user-email-uniqueness` (no unit test asserting)

## Partially covered (🟡)
*Tests exist but don't cover every documented scenario.*

…

## Possibly testing removed code (🔵)
*Tests with no matching spec element — may be obsolete.*

- `tests/legacy/old-payment.test.ts` — references no current spec element

## Suggested next steps
- Run `/spec-mirror:gen-tests` to scaffold the missing stubs above.
- Review possibly-obsolete tests; if confirmed dead, delete.
```

---

## Verdict logic

- `GOOD` — ≥90% total coverage AND zero critical-flow gaps (e.g. auth flows).
- `PARTIAL` — 50–89% total OR at least one critical-flow gap.
- `LOW` — <50% total.

Critical-flow tagging: a flow is "critical" if its file contains `**Criticality:** high` in its frontmatter or first 10 lines. Default: not critical.

---

## Pipeline

### Phase 0 — Detect framework(s)

Same detection logic as `/spec-mirror:gen-tests`. A project may have multiple frameworks — pick them all up.

### Phase 1 — Index tests

Scan all test files (project-conventional patterns: `*.test.*`, `*.spec.*`, `tests/**`, `__tests__/**`, etc.). For each test, extract:

- File path + line.
- The full string of every `describe(...)` / `it(...)` / `test(...)` / `def test_*` / `func Test*` / etc.
- File imports — knowing what's imported is signal about what's tested.
- Whether each test is executable coverage, todo/skip-only, or inactive planning stub.
- Any top-of-file `Spec source`, `Test command`, and `Collection` headers written by `/spec-mirror:gen-tests`.

`it.todo`, `it.skip`, `xit`, `describe.skip`, skipped pytest tests, or `*.spec-stub.*` files with no real assertions are not covered. They are planned coverage.

### Phase 2 — Index spec elements

Parse `specs/layers/*.md` and `specs/flows/*.md`. For each element, extract:

- Element id (canonical: e.g. `backend:POST /api/auth/signup`).
- Element name + aliases (the headings + any `as: <alias>` lines).
- Source file path from the `→ src/...:line` line — if you imports this file, that's strong signal.

### Phase 3 — Match

Heuristic matching, in priority order:

1. **Path/method exact match** — test describe contains the endpoint path AND the HTTP method.
2. **Source-file import** — test imports the source file the spec element points to. If the import lines up with a class/function whose name matches a spec element, that's a match.
3. **Name match** — test describe contains the entity/flow name as a substring (case-insensitive).
4. **Spec-mirror header** — a test file whose top-of-file comment contains `Spec source: specs/...` is an explicit match (this is what `/spec-mirror:gen-tests` writes).

A spec element with no executable match → uncovered. A spec element with only todo/skip/stub matches → planned, not covered. A test with no match → possibly obsolete.

### Phase 4 — Scenario sub-coverage

For elements that matched at the file level, check whether every documented **scenario** is covered. The spec's micro-template encourages listing scenarios as bullet points or sub-headings. For each scenario, look for either:

- A separate `it()` whose description references it, OR
- An assertion inside the matched `it()` that mentions the scenario keyword.

Missing scenarios → "Partially covered" finding.

Todo-only scenarios → "Planned but not covered" finding. Do not include them in the covered count.

### Phase 5 — Write report & report back

Render `specs/COVERAGE.md`. Post a chat summary: verdict, overall %, top 3 uncovered items, path to the full report.

---

## Hallucination guardrails

- A "covered" claim must cite the specific test file:line. If you can't cite it, mark uncovered instead.
- A "covered" claim must point to executable assertions or a filled test body. A todo/skip/stub citation is planned coverage only.
- A "possibly obsolete" claim is always 🔵 (info) — never flag a human-written test as broken without evidence.
- When heuristic matching is ambiguous, prefer the conservative answer (uncovered) and note the ambiguity.

---

## Non-interactive

Safe for CI / pre-commit. Never prompts.

## Done criteria

- [ ] `specs/COVERAGE.md` exists with the summary table.
- [ ] Every uncovered finding has a spec source link.
- [ ] Every covered finding has a test file:line citation.
- [ ] Todo/skip/spec-stub files are reported as planned coverage, not covered.
- [ ] No other file modified.
- [ ] One-paragraph chat summary posted.
