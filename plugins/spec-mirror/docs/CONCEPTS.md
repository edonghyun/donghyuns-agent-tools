# spec-mirror — Core Concepts

This document defines the vocabulary and mental model. Every skill in the plugin assumes these terms.

---

## 1. The mission: safety net

The plugin exists to **prevent silent drift between what the code does and what the team believes it does**. The spec is the artifact of that shared belief, made machine-checkable.

A "safety net" has three properties this plugin enforces:

1. **Sourced.** Every claim in the spec points to a file:line. If you can't source it, you can't claim it.
2. **Cross-referenced.** Flows link to layers, layers link to layers. Breaking a link is detectable.
3. **Comparable to code.** A scan can re-derive the spec at any time; differences are findings.
4. **Executable or honestly planned.** Test stubs are useful, but they are not coverage. The tool must say whether a behavior is actively asserted, represented by a collected todo, or only planned in an inactive stub.

Without these properties, a "spec" is just prose — useful for onboarding, useless as a safety net.

---

## 2. Two artifact families

| Family | Auto-generated | Human-curated |
|---|---|---|
| `specs/` | yes | only inside `<!-- KEEP -->` blocks |
| `refs/` | only scaffolds (READMEs) | yes (designs, plans, decisions, lessons) |

The split exists because a safety net needs both:

- `specs/` answers **what is** — derivable from code, kept in sync by the tooling.
- `refs/` answers **why and what's next** — irretrievable from code, must be written by humans.

A `compare` finding alone never tells you *why* something changed. The `refs/decisions/` ADR does. Both must exist for the net to actually catch things.

---

## 3. Layered + flow output (the dual view)

Two complementary slices of the same system:

- **Layered files** (`specs/layers/{frontend,backend,domain}.md`) — sorted by *what kind of thing* it is. Best for "show me all endpoints" type questions.
- **Flow files** (`specs/flows/NN-<slug>.md`) — sorted by *user journey*. Best for "what happens when a user signs up" type questions.

Flows **must** cross-reference layered docs via markdown anchors. The cross-ref is what lets `compare` detect breakage: if a flow links to an endpoint that has been deleted, the flow is now lying about the system.

---

## 4. Element identity

Every element has a canonical id used internally and in `compare`/`coverage` matching:

| Layer | Format | Example |
|---|---|---|
| frontend | `frontend:<route-or-component-name>` | `frontend:/login` |
| backend | `backend:<METHOD> <path>` or `backend:handler:<name>` | `backend:POST /api/auth/signup` |
| domain | `domain:<entity-or-vo-name>` | `domain:User` |
| flow | `flow:<slug>` | `flow:signup` |

The id is derived from the heading text + the layer file the heading lives in. Renaming a heading changes the id, which appears as `removed` + `added` in `compare` — usually a 🟡 finding. Use `<!-- KEEP -->` to pin a chosen name across regens.

---

## 5. Canonical behavior source

When a project has both a scenario book and compact flow files, exactly one artifact must own the behavior text.

- The canonical behavior source contains the full user/system outcomes.
- The mirror files summarize and link back to that source.
- Test implementation notes belong in a separate section, not in acceptance criteria.

This rule exists because repeated HP-style lists drift quickly. If a test stub points to a coverage matrix or helper-layout section instead of the scenario body, the spec looks traceable but is not actually traceable.

---

## 6. Source reference

A trailing line of the form `→ <relative-path>:<line>` after a heading body. Every heading in `specs/layers/**` must have one, or an explicit `[NOT FOUND]` / `[INFERENCE]` marker.

`lint`'s C2 check enforces this rule. A spec with elements missing source refs is not a safety net — it's a guess.

The referenced line must exist and should point to the behavior being claimed, not to a summary table that merely mentions it.

---

## 7. `[INFERENCE]` marker

Use when behavior is derived from a signature/type but not directly read from code (e.g. "this endpoint *probably* returns 401 on missing token — derived from the auth-middleware type, not the handler code").

Format: `[INFERENCE — <one-line justification>]`. Bare `[INFERENCE]` is a lint finding.

`compare` never flags an `[INFERENCE]` element as drift unless the underlying signature actually changed.

---

## 8. Event-driven read model contract

When a codebase uses domain events, CQRS, read models, projections, or event sourcing, the backend spec must name the contract between write side and read side:

- command or handler
- emitted event(s)
- transaction/unit-of-work boundary
- projection(s) updated
- read-model catch-up expectation for tests
- idempotency, ordering, or replay rule if visible in code

If a flow command is verified through a query, the flow spec should say how the test knows the read model has caught up. Marking catch-up as optional is only valid when the source proves synchronous update in the same request.

---

## 9. `<!-- KEEP -->` blocks

Human-edited content preserved across regens. Anything between `<!-- KEEP -->` and `<!-- /KEEP -->` is treated as opaque by every skill — `generate --update` won't overwrite it, `compare` won't diff inside it, `lint` only checks the orphan condition (block exists but its parent heading is gone).

Use for:
- Hand-written nuance the auto-extractor can't infer.
- Cross-references to external documents.
- Caveats / known issues.

Do not use for:
- Anything the spec extractor *could* derive — that becomes a fork that drifts.

---

## 10. Active coverage vs planned coverage

The plugin distinguishes three states:

| State | Meaning |
|---|---|
| `active coverage` | A normal test command collects executable assertions for the spec element. |
| `active todo` | A normal test command collects todo/skip tests. Useful signal, but not coverage. |
| `inactive planning stub` | A file under `tests/spec-mirror/**` or similar that is not collected by default. Useful backlog, not a safety net. |

`coverage` counts only active coverage as covered. `gen-tests` records the collection state so teams do not mistake generated TODO files for protection.

---

## 11. Severity rubric (shared across skills)

| Symbol | Name | Meaning |
|---|---|---|
| 🔴 | Critical | The spec is making a claim that is now broken or contradictory. Safety net is compromised. |
| 🟡 | Warning | New behavior or changed shape that is not yet in the spec. Safety net is partial. |
| 🔵 | Info | Cosmetic or non-behavioral; informational only. |

`compare`, `lint`, `gen-tests`, `coverage`, `scope` all use the same rubric so reports compose.

---

## 12. Skill responsibilities (one paragraph each)

- **`generate`** — derives the spec from code. The only skill that **writes** layered files and flow files. Asks for architecture confirmation before writing.
- **`compare`** — re-derives the spec in memory and diffs against the existing one. Writes only `DRIFT.md`. Non-interactive.
- **`lint`** — checks the spec for internal hygiene. Writes only `LINT.md`. Non-interactive.
- **`gen-tests`** — converts spec elements into test stubs. Writes test files + `tests/spec-mirror/STUBS.md`. Never overwrites existing tests.
- **`coverage`** — cross-references existing tests against spec elements. Writes only `COVERAGE.md`. Non-interactive.
- **`scope`** — walks the spec graph from a target and produces a focused mini-spec. Writes only `specs/scope/<target>.md`.

If a skill ever wants to write outside its stated outputs, that is a bug.
