# Philosophy

What `donghyuns-agent-tools` is for and the design principles every plugin in it shares.

---

## The mission: safety nets, not assistants

Most AI tooling tries to **add capability** — write more code, generate more docs, do more things. The plugins in this marketplace try to **prevent loss**:

- Loss of shared understanding when code drifts from team belief.
- Loss of "why we did it this way" when the person who decided leaves.
- Loss of regression coverage when tests describe yesterday's product.
- Loss of confidence when a refactor's blast radius is invisible.

A plugin earns its place here by reducing one of those losses. New features that don't fit this mission belong in a different marketplace.

---

## Six principles every plugin follows

### 1. Sourced or marked

Every claim a plugin writes to disk must point to where it came from (`→ file:line`) **or** be explicitly marked as inference / unverified. A document full of unsourced assertions is a fork, not a mirror.

### 2. One output contract per skill

Each skill declares in its `SKILL.md` exactly what files it writes. Writing outside that contract is a bug, not a feature. This makes plugins composable: if `compare` only writes `DRIFT.md`, you can run it in CI without worrying it'll mutate the spec.

### 3. Read-side and write-side are different skills

A skill that **derives** state (generate, gen-tests) and a skill that **audits** state (compare, lint, coverage) must be separate, even when they share extraction logic. Auditors must be safe to run repeatedly; deriers must be safe to run *only when the user wants changes*.

### 4. Human-curated lives next to auto-generated

Every auto-generated tree has a sibling human-curated tree:

| Plugin | Auto | Curated |
|---|---|---|
| spec-mirror | `specs/` | `refs/{designs,plans,decisions,lessons}/` |

The split exists because the *why* and *what's next* can never be derived from code. A safety net needs both halves.

### 5. Severity is a shared vocabulary

🔴 critical / 🟡 warning / 🔵 info means the same thing in every report this marketplace produces:

| Symbol | Meaning |
|---|---|
| 🔴 | Spec/test/state is making a claim that is now broken or contradictory. |
| 🟡 | New behavior or changed shape not yet reflected. Safety net is partial. |
| 🔵 | Cosmetic or non-behavioral; informational only. |

A 🔴 in `DRIFT.md` and a 🔴 in `LINT.md` should both feel equally urgent. Drift the rubric and the trust evaporates.

### 6. Hallucination has a cost

Every plugin's `SKILL.md` includes explicit "hallucination guardrails": when to prefer omission over guessing, what to do when extraction is ambiguous, how to mark inference. The guardrails are part of the contract, not a politeness.

The rule: **a false claim in a safety-net artifact is worse than a missing one.** A missing claim prompts investigation; a false one prompts misplaced confidence.

---

## What this marketplace does **not** try to do

- **Generate features.** No "build me a login form". Better tools exist.
- **Be a general agent framework.** No agent registry, no message bus, no orchestration. Skills are pure, file-output-driven.
- **Replace human judgment.** Decisions ([refs/decisions/](../plugins/spec-mirror/skills/generate/assets/refs/decisions-README.md)) and lessons must be written by humans.
- **Lock you in.** All outputs are plain markdown. If you uninstall the plugin, the safety net stays.

---

## Why "mirror"

The naming pattern across plugins (`spec-mirror`, possibly future `*-mirror`) reflects the mission: the artifact mirrors the implementation. Mirrors don't add — they reveal. When the reflection diverges from the original, **the mirror tells you**, and you decide which side to change.
