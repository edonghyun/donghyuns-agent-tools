---
name: lint
description: Audit the specs/ directory for internal hygiene issues — dead cross-references, missing source lines, stale [INFERENCE] markers, orphaned KEEP blocks, broken refs/ links. Use when the user wants to verify the spec itself is healthy, after manual edits to spec files, or before relying on the spec as a safety net. Triggers include "lint spec", "spec hygiene", "spec audit", "check spec health", "스펙 린트", "스펙 점검", "스펙 정합성". Produces specs/LINT.md and never modifies any other file. Different from compare (which checks spec vs code) — lint checks spec vs spec.
---

# Spec Mirror — Lint

Audit `specs/` for **internal hygiene** issues. `compare` checks spec-vs-code drift; `lint` checks spec-vs-spec consistency. A spec that lints clean is structurally sound — every link resolves, every claim has a source.

---

## When to use

- "lint spec", "spec hygiene", "spec audit", "check spec health"
- After a manual edit to any `specs/**` file.
- Before relying on the spec as a CI safety net.
- Korean: "스펙 린트", "스펙 점검", "스펙 정합성"

**Pre-condition:** `specs/` directory must exist. If not, stop and tell the user to run `/spec-mirror:generate`.

---

## Output contract

Writes **exactly one file**: `specs/LINT.md`. Never modifies any other file under `specs/`.

```markdown
# Spec Lint Report

- **Linted at:** <ISO timestamp>
- **Files scanned:** <N>
- **Verdict:** [CLEAN | WARN | DIRTY]

## Summary

| Issue type                       | Count |
|----------------------------------|-------|
| Dead cross-references            | N     |
| Missing source refs (`→ file:L`) | N     |
| Stale [INFERENCE] markers        | N     |
| Orphaned <!-- KEEP --> blocks    | N     |
| Broken refs/ links               | N     |
| Heading-anchor collisions        | N     |
| Invalid source line targets      | N     |
| Non-behavior acceptance criteria | N     |
| Stub collection mismatches       | N     |

## 🔴 Critical
…

## 🟡 Warnings
…

## 🔵 Info
…
```

---

## Checks (run all)

### C1 — Dead cross-references (🔴 critical)

In every `specs/flows/*.md`, every link `[text](../layers/<file>.md#anchor)` must resolve. The anchor must exist as a `### ` (or deeper) heading in the target file. A `frontend.md` link to a missing `#post-apiauthsignup` is dead.

Anchor normalization: lowercase, spaces → `-`, drop punctuation.

### C2 — Missing source refs (🟡 warning)

Every element under a layered file (each `### ` heading inside `specs/layers/*.md`) must be followed within its body by either:
- a source line of the form `→ <path>:<line>` referencing a file that exists, OR
- an explicit `[NOT FOUND]` or `[INFERENCE]` marker.

A heading with neither is a finding.

### C3 — Stale `[INFERENCE]` markers (🟡 warning)

Every `[INFERENCE]` token must have a justification on the same paragraph (e.g. `[INFERENCE — from signature]`). Bare `[INFERENCE]` is a finding because the rationale is missing.

This check does not attempt to verify the inference is still correct — that is `/spec-mirror:compare`'s job. Lint only checks that the marker is well-formed.

### C4 — Orphaned `<!-- KEEP -->` blocks (🔵 info)

A `<!-- KEEP -->` ... `<!-- /KEEP -->` block whose surrounding heading no longer exists in the current generated structure is orphaned (its content is preserved across regens but never displayed). Detect by checking that the block lives under a heading that matches one of the canonical structures: `## Pages`, `## Endpoints`, `## Entities`, etc. as listed in `/spec-mirror:generate`'s output contract.

### C5 — Broken `refs/` links (🔴 critical)

Any link from `specs/**` to `refs/**` (or vice versa) must resolve to a file that exists. Broken refs-links typically mean a design/decision/lesson was renamed or deleted.

### C6 — Heading-anchor collisions (🟡 warning)

Within a single layered file, two `### ` headings must not normalize to the same anchor (e.g. `### Login` and `### login` both produce `#login`). Cross-references can't disambiguate, so the second instance is unreachable.

### C7 — Empty layers (🔵 info)

A layered file with zero elements (only the section scaffolding) is suspicious — either generation failed for that layer or the layer truly doesn't exist. Report so the user can decide.

### C8 — Invalid source line targets (🔴 critical)

Every source line of the form `→ <path>:<line>` must point to an existing file and a non-empty line. If the line points to a generated summary, coverage matrix, or unrelated section while claiming to source behavior, report it as a warning with the nearest heading.

This check prevents believable-but-wrong references such as a test stub pointing at a coverage table instead of the scenario it claims to defend.

### C9 — Non-behavior acceptance criteria (🟡 warning)

In every `specs/flows/*.md`, `## Acceptance Criteria` must contain user/system observable outcomes. It must not contain only test architecture details such as `BackendClientForTest`, `Screen Object`, fixture names, file paths, or `Spec source` headers.

If those details are present, require a separate `## Testing Notes` or `## Test Implementation Contract` section. The acceptance criteria can mention tests only after at least one behavior criterion is present.

### C10 — Stub collection mismatches (🟡 warning)

If `tests/spec-mirror/STUBS.md` or `*.spec-stub.*` files exist, verify each stub declares one of:

- `Collection: active todo`
- `Collection: inactive planning stub`
- `Collection: unknown`

Also inspect the normal test command/config when feasible. If root test config appears package-scoped or excludes `tests/spec-mirror/**`, but `STUBS.md` presents the stubs as active or omits collection status, report a warning.

This check keeps "we generated TODO files" separate from "the normal test suite sees this safety net."

---

## Pipeline

1. **Validate** `specs/` exists. Bail out with a helpful message if not.
2. **Index headings & anchors** across `specs/layers/*.md` (in-memory map: `file → anchor → line`).
3. **Run C1–C10** in a single pass per file where possible.
4. **Render `specs/LINT.md`** using the structure above. Group findings by severity, then by file.
5. **Verdict logic:**
   - `CLEAN` — zero findings.
   - `WARN` — 🟡 or 🔵 only.
   - `DIRTY` — at least one 🔴.
6. **Report back** in chat with the verdict + top 3 findings + path to the full report.

---

## Hallucination guardrails

- Never invent a "missing source" finding for a heading whose body you didn't read.
- Never report a dead link without showing both the link text and the resolved-but-missing anchor.
- When normalizing anchors, document the rule applied in the finding so the user can reproduce it.
- Never mark a stub as collected unless the test command/config evidence supports it. If evidence is unclear, report `unknown`.

---

## Non-interactive

This skill never prompts during a run. Safe for CI / pre-commit.

## Done criteria

- [ ] `specs/LINT.md` exists with summary table + sections.
- [ ] No other file under `specs/` was modified.
- [ ] Every finding cites the file + line where the issue was detected.
- [ ] Verdict + chat summary posted.
