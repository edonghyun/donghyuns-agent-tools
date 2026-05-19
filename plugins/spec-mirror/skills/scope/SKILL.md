---
name: scope
description: Generate a focused mini-spec for an upcoming change — "everything that touches X" — by walking the spec graph forward and backward from a target element. Use when the user is about to modify code and wants to know the blast radius before changing anything. Triggers include "spec scope", "blast radius", "what touches", "scope of change", "what's affected by", "스펙 스코프", "영향 범위", "이거 바꾸면 뭐 깨져". Produces specs/scope/<target>.md and never modifies existing specs.
---

# Spec Mirror — Scope

Walk the spec graph from a target element and produce a focused mini-spec containing **everything you need to read before changing X**. The other skills (`generate`, `compare`, `coverage`) operate over the whole app; `scope` is the opposite — narrow and deep, for planning a specific change.

This flips the spec from descriptive to prescriptive: instead of "here's the snapshot", it answers "here's what to study and what to test before you touch this."

---

## When to use

- "spec scope <X>", "blast radius of <X>", "what touches <X>", "what's affected by <X>"
- Before non-trivial refactors, API changes, schema migrations.
- When pairing with `/sprint:plan-backlog` (from `dannys-claude`) to attach a scope doc to a plan.
- Korean: "스펙 스코프", "영향 범위", "이거 바꾸면 뭐 깨져"

**Pre-condition:** `specs/` directory must exist. Target argument required (see below).

---

## Target identifier

The user passes one of:

- A spec **element id**, e.g. `backend:POST /api/auth/signup`.
- A **heading text**, e.g. `User entity` — the skill resolves it by case-insensitive substring match across all layered files. If ambiguous, ask which one.
- A **flow name**, e.g. `signup` — resolves to `specs/flows/NN-signup.md`.
- A **source file path**, e.g. `src/routes/auth.ts` — resolves to every spec element that references it.

---

## Output contract

Writes **exactly one file**: `specs/scope/<target-slug>.md`. Creates `specs/scope/` if missing. Never modifies other spec files.

```markdown
# Scope: <target name>

- **Target:** <spec source link> (`<source-file:line>`)
- **Generated:** <ISO timestamp>
- **Risk level:** [LOW | MEDIUM | HIGH] — based on # of dependents and criticality of dependent flows

## What this is
<1-3 sentences pulled verbatim from the layered spec.>

## Direct dependencies (it uses these)
| Element | Why | Source |
|---|---|---|
| User entity | persisted on signup | `specs/layers/domain.md#user-entity` |
| ... | ... | ... |

## Direct dependents (these use it)
| Element | How | Source |
|---|---|---|
| Flow: signup | step 3 | `specs/flows/01-signup.md` |
| Flow: oauth-link | step 2 | `specs/flows/05-oauth-link.md` |
| ... | ... | ... |

## Transitive blast radius (depth ≤ 2)
A graph view of what's two hops away. Brief — names only.

## Related refs/
*Decisions, lessons, designs that mention this target.*

- `refs/decisions/0003-use-bcrypt.md`
- `refs/lessons/0001-double-write-on-retry.md`

## Test surface to update
| Test file | Likely needs update | Why |
|---|---|---|
| `tests/auth-signup.test.ts` | yes | covers target directly |
| `tests/e2e/01-signup.spec.ts` | yes | flow-level |
| `tests/oauth.test.ts` | maybe | indirect dependent |

## Change-safety checklist
- [ ] All direct dependents reviewed.
- [ ] Decisions in `refs/decisions/` that mention this target still apply.
- [ ] Tests in "Test surface" above will be updated before merge.
- [ ] If signature/shape changes, plan to run `/spec-mirror:generate` (update mode) and `/spec-mirror:compare`.
```

---

## Pipeline

### Phase 0 — Validate & resolve target

1. Confirm `specs/` exists.
2. Resolve the user's target argument to a canonical element id. Ambiguous → ask.
3. If no `specs/scope/` directory exists, create it.

### Phase 1 — Build dependency graph

Parse `specs/` into a graph:

- Nodes: every layered element + every flow.
- Edges: every cross-reference link (flow → layered, layered → layered via "Used by:" lines).

Edges are directed: `A → B` means "A uses/references B".

### Phase 2 — Forward & backward walk

From the target:
- **Direct dependencies** = direct out-edges.
- **Direct dependents** = direct in-edges.
- **Transitive blast radius (depth ≤ 2)** = 2-hop in-edges (the people who use the people who use the target).

Depth-2 is the default because depth-3+ rapidly becomes "everything" in interconnected apps and stops being actionable.

### Phase 3 — Cross-reference refs/

Grep `refs/{designs,plans,decisions,lessons}/**/*.md` for mentions of the target's name, source file path, or element id. Each match becomes a "Related refs" entry.

### Phase 4 — Test surface inference

For each dependent + the target itself, identify the conventionally-located test file (using the same conventions as `/spec-mirror:coverage`). Label "yes" if direct, "maybe" if transitive, with a one-line rationale.

### Phase 5 — Risk level

- `HIGH` — target has ≥1 critical-flow dependent OR ≥10 total dependents.
- `MEDIUM` — 3–9 dependents.
- `LOW` — ≤2 dependents.

### Phase 6 — Write & report

Render `specs/scope/<target-slug>.md`. Post a chat summary: target, risk level, top 3 dependents to be aware of, path to the scope doc.

---

## Hallucination guardrails

- Never invent a dependent. If you can't trace the edge to a markdown link or "Used by:" line, omit it.
- Risk level must be derivable from the counts — don't override based on vibes.
- Refs/ mentions: cite the file:line of the match so the user can verify.

---

## Non-interactive (mostly)

The only interactive moment is target disambiguation in Phase 0. After that, no prompts.

## Done criteria

- [ ] `specs/scope/<target-slug>.md` exists.
- [ ] Every entry has a spec source link or a refs/ file path.
- [ ] Risk level + counts agree.
- [ ] Chat summary posted.
