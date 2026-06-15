# Conventions

Rules every plugin in this marketplace follows. New plugins MUST comply; existing plugins are kept in sync.

---

## 1. Directory layout

```
plugins/<plugin-name>/
├── .claude-plugin/                 # Claude Code manifest, when supported
│   └── plugin.json
├── .codex-plugin/                  # Codex manifest, when supported
│   └── plugin.json
├── README.md                       # required
├── docs/                           # required for any plugin with >1 skill
│   ├── CONCEPTS.md                 # vocabulary + mental model
│   ├── WORKFLOW-GUIDE.md           # real scenarios using the skills together
│   ├── EXAMPLES.md                 # sample outputs
│   └── TROUBLESHOOTING.md          # common failure modes
└── skills/
    └── <skill-name>/
        ├── SKILL.md                # required
        ├── assets/                 # optional; files the skill copies into projects
        └── CHANGELOG.md            # optional; required once the skill has >1 version
```

At least one host manifest is required. Add additional host manifest directories only when the plugin supports that runtime. A single-skill plugin may skip `docs/` and put everything in its README.

---

## 2. `plugin.json` schema (minimum)

```json
{
  "name": "<kebab-case>",
  "version": "<semver>",
  "description": "<one sentence describing what it does AND for whom>",
  "author": { "name": "...", "email": "..." }
}
```

Versioning is **strict semver**:
- **Major** — breaking change to skill output contracts or generated structure.
- **Minor** — new skill or significant new behavior in an existing skill.
- **Patch** — bug fixes, doc-only changes, clarifications.

---

## 3. `SKILL.md` frontmatter

```yaml
---
name: <skill-name>
description: <plain text — used by the host skill router. Must contain the trigger phrases (English + Korean) and a one-line description of what the skill writes.>
---
```

The `description` is what the coding agent reads to decide whether to fire the skill. It should:

- Lead with what the skill does in one phrase.
- List **trigger phrases** the user might say (English + Korean).
- State the **single output contract** ("Writes only `specs/LINT.md` and never modifies other files.").
- Note when *not* to use it.

If the description is vague, the router will misfire. Be specific.

---

## 4. Skill body structure

Every `SKILL.md` body MUST contain these sections, in order:

1. **When to use** — trigger phrases + pre-conditions.
2. **Output contract** — exact list of files written; explicit "never modifies X" lines.
3. **Pipeline** — numbered phases, each with concrete steps.
4. **Hallucination guardrails** — what to do when extraction is ambiguous, when to prefer omission.
5. **Done criteria** — a checklist that closes the contract.

Optional, when relevant:
- **Severity rubric** (for audit/report skills) — uses the shared 🔴/🟡/🔵 vocabulary.
- **Non-interactive** declaration (for skills that must be CI-safe).
- **Re-runs & idempotency** notes.

---

## 5. Output contract is sacred

A skill's declared outputs are the **only** files it may write or modify. Specifically:

- Audit skills (`compare`, `lint`, `coverage`) write **exactly one report file** and modify nothing else.
- Generator skills (`generate`, `gen-tests`) declare every path they touch and respect `<!-- KEEP -->` blocks if they're regenerating.
- A skill that wants to write outside its contract requires a SKILL.md update + plugin minor version bump.

---

## 6. The 🔴/🟡/🔵 severity rubric

Used identically across every audit skill:

| Symbol | Definition | Examples |
|---|---|---|
| 🔴 **Critical** | Existing claim is now broken or contradictory. | Dead cross-reference; removed endpoint that flows still link to. |
| 🟡 **Warning** | New behavior or changed shape not yet reflected. | New endpoint with no spec entry; changed return type. |
| 🔵 **Info** | Cosmetic, non-behavioral, or ambiguous. | Moved file with unchanged exports; possibly-obsolete test. |

Verdicts use a consistent ladder per report:

- `OK` / `CLEAN` / `GOOD` — zero findings.
- `WARN` / `PARTIAL` — 🟡 or 🔵 only.
- `DRIFT` / `DIRTY` / `LOW` — at least one 🔴.

---

## 7. Source references

Every claim a plugin writes about code uses this exact form:

```
→ <relative-path>:<line>
```

For inferred claims, use:

```
[INFERENCE — <one-line justification>]
```

Bare `[INFERENCE]` (without justification) is a lint finding under check **C3**.

---

## 8. `<!-- KEEP -->` blocks

Human-edited content preserved across regens:

```markdown
<!-- KEEP -->
Hand-written nuance that the auto-extractor wouldn't infer.
<!-- /KEEP -->
```

Plugins that regenerate files MUST:
- Treat KEEP-block contents as opaque (never modify, never diff inside).
- Preserve KEEP blocks across update-mode runs.
- Flag orphan KEEP blocks (parent heading no longer exists) as 🔵 info in lint.

---

## 9. Auto-generated and human-curated trees live as siblings

If a plugin auto-generates a tree, it MUST scaffold a sibling human-curated tree at the same root. Example: `specs/` (auto) + `refs/` (curated).

The sibling tree contains README templates for each subdir, copied from the plugin's `skills/<scaffolder>/assets/`. Existing files are never overwritten.

---

## 10. Non-interactivity for audit skills

Any skill that reports state (audit, lint, coverage, compare) must be safe to run **non-interactively**:

- No questions during the run.
- Idempotent: running twice produces the same output if the inputs didn't change.
- Bails out cleanly with an actionable error if pre-conditions aren't met.

Generator skills may prompt for confirmation (e.g. `generate` asks the user to confirm detected architecture), but should never prompt about their *output* — the contract is fixed.

---

## 11. Triggers must be bilingual

Every skill's `description` lists English **and** Korean triggers. Korean is non-optional in this marketplace — it's the maintainer's primary language.

Example pattern:

```
Triggers include "drift check", "verify spec", "스펙 비교", "스펙 드리프트".
```

---

## 12. Docs cross-reference

Plugin `docs/` files link to each other (not just to skills). The shared structure means a teammate can read `CONCEPTS → WORKFLOW-GUIDE → EXAMPLES → TROUBLESHOOTING` for any plugin and get oriented fast.
