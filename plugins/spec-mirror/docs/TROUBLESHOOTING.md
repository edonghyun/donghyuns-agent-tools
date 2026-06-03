# spec-mirror — Troubleshooting

Common failure modes and how to recover.

---

## `/spec-mirror:generate` produced an empty layer

**Symptom:** `specs/layers/domain.md` (or another layer) contains only scaffolding, no elements.

**Likely cause:** the project doesn't have an explicit layer at that name. Common: codebases with no domain/ folder put domain logic inside services.

**Fix:**
1. Re-run `/spec-mirror:generate`. In the Phase 1 confirmation step, **correct the architecture description** — tell the skill where domain logic actually lives.
2. If the codebase truly has no domain layer, accept the empty file. The skill should have written a "Domain-by-convention" section deriving the model from schema/services.

---

## `/spec-mirror:compare` always reports DRIFT

**Symptom:** every run shows 🟡 findings, even immediately after a fresh generate.

**Likely cause:** the codebase has non-deterministic generation — e.g. file paths that include timestamps, hash-based names, or auto-generated code.

**Fix:**
1. Identify the noisy elements in `DRIFT.md` — are they the same ones every time?
2. Wrap their spec entries in `<!-- KEEP -->` blocks with a hand-stable description.
3. Alternatively, exclude the auto-generated source directory from scanning (currently requires editing the source patterns in the project's CLAUDE.md — config file support is planned).

---

## `<!-- KEEP -->` blocks get duplicated after `generate --update`

**Symptom:** running update produces two copies of a KEEP block.

**Likely cause:** the surrounding heading's text changed (rename), so the update couldn't match the old block to its new location and wrote the auto content too.

**Fix:**
1. Manually delete the duplicate.
2. Pin the heading text by adding an `<!-- anchor:<stable-id> -->` HTML comment right after the heading. `generate --update` uses that anchor as a stable id instead of the heading text.

---

## `/spec-mirror:gen-tests` skipped tests I expected to be created

**Symptom:** an endpoint or flow you know is uncovered didn't get a stub.

**Likely cause:** the existing-test detection heuristic matched a test file that doesn't actually assert the behavior — it just imports the source file or mentions the path.

**Fix:**
1. Open the existing test the skill matched. If it doesn't really test the target, the heuristic was wrong.
2. Re-run with `--strict` (matches only on explicit `Spec source:` headers or exact describe/path matches).
3. Or fill in the existing test to actually cover the behavior.

---

## Generated stubs exist, but `npm test` or `pnpm test` never sees them

**Symptom:** `tests/spec-mirror/STUBS.md` lists TODO files, but the normal test command does not collect them.

**Likely cause:** the project uses package-scoped test config, a custom include pattern, or framework-specific test folders. Root `tests/spec-mirror/**` may be outside the configured discovery path.

**Fix:**
1. Open `STUBS.md` and check the `Stub collection` field.
2. If it says `inactive planning stubs`, either move/fill the tests into the collected package/app test location or add an explicit test command for spec-mirror stubs.
3. Re-run `/spec-mirror:coverage`. The coverage percent should only rise after real assertions are collected.

---

## Coverage looks high because TODO stubs were counted

**Symptom:** `/spec-mirror:coverage` reports a behavior as covered, but the matching file only contains `it.todo`, skip markers, or a spec-mirror header.

**Likely cause:** coverage matching treated "linked to a spec" as "asserts the spec".

**Fix:**
1. Re-run `/spec-mirror:coverage` with the current skill. Todo/skip/spec-stub files should appear as planned coverage, not covered.
2. Fill the TODO with executable assertions.
3. Confirm the test command collects the file.

---

## Flow acceptance criteria describe test helpers instead of behavior

**Symptom:** `## Acceptance Criteria` says things like `BackendClientForTest`, `Screen Object`, fixture layout, or file names, but not what the user/system should observe.

**Likely cause:** test architecture notes were mixed into the behavior contract during manual generation.

**Fix:**
1. Move helper/file-layout details to `## Testing Notes` or `## Test Implementation Contract`.
2. Rewrite `## Acceptance Criteria` as observable outcomes.
3. Run `/spec-mirror:lint`; C9 should clear.

---

## Event-driven read model tests are flaky

**Symptom:** a command succeeds, but the following read-model query sometimes sees stale data.

**Likely cause:** the spec/test treats projection catch-up as optional or implicit.

**Fix:**
1. In `specs/layers/backend.md`, document command -> event -> projection -> query.
2. In the flow, add a named catch-up expectation after write commands observed through read models.
3. Fill tests with an eventually/assert loop, deterministic projection runner, or projection-position check.

---

## `/spec-mirror:lint` flags lots of "missing source refs" on a fresh generate

**Symptom:** lint runs immediately after generate and finds many C2 (missing source) findings.

**Likely cause:** `generate` couldn't resolve those elements to a specific file:line. They were written without a source ref but also without an `[INFERENCE]` marker — a bug in the generator's handling of ambiguous extractions.

**Fix:**
1. Open each flagged element. Manually add either `→ <path>:<line>` or `[INFERENCE — <reason>]`.
2. If a pattern emerges (e.g. all flagged elements are in the domain layer of a Python codebase), file an issue noting the language + framework — the extractor likely needs improvement.

---

## `/spec-mirror:coverage` reports 0% even though tests exist

**Symptom:** the report says no tests are covering any spec element.

**Likely cause:** the test framework wasn't detected, so no tests were indexed.

**Fix:**
1. Look at the report header: it should list "Test framework(s):". If empty, detection failed.
2. Ensure your `package.json` / `pyproject.toml` / etc. has the test runner in its dependency list.
3. If you use a non-standard test directory, ensure it's not `.gitignore`d (the scanner respects gitignore).

---

## `/spec-mirror:scope` says "ambiguous target"

**Symptom:** you ran `/spec-mirror:scope auth` and the skill listed multiple matches.

**Fix:** re-run with a more specific target:
- A canonical element id: `/spec-mirror:scope "backend:POST /api/auth/signup"`
- A unique heading: `/spec-mirror:scope "Auth service"`
- A file path: `/spec-mirror:scope src/services/auth.ts`

---

## Skill writes to a file outside its stated outputs

**Symptom:** after a skill runs, files outside its declared output contract were modified.

This is a **bug**. Each skill's output is contracted in its SKILL.md. If it writes elsewhere:
1. Revert the change (`git checkout`).
2. File an issue with the skill name + the unexpected file path.

The contracts are enforceable invariants — without them, the safety-net mission is undermined.
