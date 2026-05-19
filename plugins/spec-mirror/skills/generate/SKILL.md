---
name: generate
description: Generate end-to-end specification markdown files that mirror the current implementation as a safety net. Use when the user wants to extract, document, or snapshot the app's behavior — across frontend action flows, backend use cases, queries, and domain features. Triggers include "generate spec", "spec mirror", "e2e spec", "document app", "mirror implementation", "스펙 생성", "스펙 미러", "구현 스펙 만들어줘", "전체 스펙 정리". Produces layered specs (frontend / backend / domain) plus flow specs that cross-reference layers. Asks the user for a brief architecture confirmation after its own analysis, before writing files.
---

# Spec Mirror — Generate

Generate a markdown specification suite that mirrors the **current implementation** of an application as a **safety net** against regression and drift. Output is **layered** (per architectural layer) *and* **flow-based** (per user journey), with the flow docs cross-referencing the layered docs.

---

## When to use

Invoke this skill when the user says any of:

- "generate spec", "make a spec", "build the spec"
- "spec mirror", "mirror the app"
- "e2e spec", "end-to-end spec"
- "document the app", "snapshot what we have"
- Korean: "스펙 생성", "스펙 미러", "구현 스펙 만들어줘", "전체 스펙 정리해줘"

**Do not** invoke for: refactoring tasks, bug fixes, or generic "explain this file" questions. This is a **whole-app extraction** workflow.

---

## Output contract

This skill MUST produce the following structure under `specs/` at the project root:

```
specs/
├── README.md                       # Index: layers + flows, last-generated timestamp
├── layers/
│   ├── frontend.md                 # Pages, components, actions, state, API calls
│   ├── backend.md                  # Endpoints, use cases / handlers, services
│   └── domain.md                   # Entities, value objects, invariants, queries
└── flows/
    ├── 01-<flow-slug>.md           # E.g. 01-user-signup.md
    ├── 02-<flow-slug>.md
    └── ...
```

**Style rules:**

- **Thorough but brief.** Each layered file has clear sections per element; each element is described in 1–3 sentences plus a file/line reference. No padding, no rephrasing.
- **Every claim has a source.** Use the format `→ src/path/to/file.ts:42` after each described element. If a claim cannot be sourced, mark it `[INFERENCE]` and explain in one line.
- **Flow docs cross-reference layered docs** using markdown links to the layered section anchors, e.g. `[POST /api/auth/signup](../layers/backend.md#post-apiauthsignup)`.
- **No hallucinated symbols.** If unsure, omit rather than guess.

---

## Pipeline (MUST follow in order)

### Phase 0 — Detect & survey

1. Identify project root (look for `package.json`, `pyproject.toml`, `pom.xml`, `go.mod`, etc.).
2. Detect the stack: frontend framework, backend framework, ORM, language(s).
3. List entry points (frontend routes/pages, backend route definitions, CLI handlers).
4. Note the directory layout (where pages live, where handlers live, where the domain layer lives — if any).

**Output of this phase:** a short internal summary (do not write to disk yet).

### Phase 1 — Architecture confirmation (MANDATORY user check)

Before writing any specs, present your understanding back to the user in this exact format:

```
I detected the following architecture:

- Frontend: <framework + dir>
- Backend:  <framework + dir>
- Domain:   <detected? where? or "no explicit domain layer">
- Persistence: <ORM/DB driver>
- Identified user flows (initial list):
  1. <flow name> — entry: <route or action>
  2. ...

Confirm or correct briefly:
- Anything missing?
- Anything mislabeled?
- Any flow I should skip or prioritize?
```

Then **wait for the user's response.** Do not proceed without confirmation. Incorporate their corrections before Phase 2.

### Phase 2 — Layer extraction (parallelizable)

For each layer, scan the relevant directories and extract elements. Write the three layered files:

**`specs/layers/frontend.md`** — sections:
- Pages / Routes (path → component file)
- Reusable components with user-facing actions
- State stores / contexts (what they hold, who mutates)
- API client calls (method, path, where invoked)

**`specs/layers/backend.md`** — sections:
- Endpoints (method + path → handler file)
- Use cases / handlers (input → output → side effects)
- Services / repositories
- Middlewares / guards

**`specs/layers/domain.md`** — sections:
- Entities & aggregates (with invariants)
- Value objects
- Domain events (if any)
- Queries (read models, projections)
- If no explicit domain layer exists, write a "Domain-by-convention" section that derives the domain model from DB schema + service code.

Each element follows this micro-template:

```
### <element name>
<1-3 sentence description.>
→ <relative/source/path.ext:line>
**Used by:** <list of cross-references>
```

### Phase 3 — Flow extraction

For each user flow confirmed in Phase 1, write `specs/flows/NN-<slug>.md` with sections:

```
# Flow: <name>

**Trigger:** <how a user starts this flow>
**Outcome:** <what the user / system ends with>

## Steps

1. **<step label>** — <what happens>
   - Frontend: [<component or action>](../layers/frontend.md#anchor)
   - Backend:  [<endpoint or handler>](../layers/backend.md#anchor)
   - Domain:   [<entity / invariant>](../layers/domain.md#anchor)
   - Notes: <edge cases, validation, error paths>

2. ...

## Failure modes
- <error condition> → <how the system responds, with source>
```

Cross-link is **mandatory** — flow docs without links to layered docs fail the contract.

### Phase 4 — Index & verification

1. Write `specs/README.md`:
   - Last generated: `<ISO timestamp>`
   - Stack summary (one block)
   - TOC: links to each layered file and each flow file
   - Glossary of any domain terms used

2. **Self-verify before reporting done:**
   - Every flow step has at least one cross-reference.
   - Every layered element has a source file reference.
   - No `[INFERENCE]` markers without a one-line justification.
   - Run a final pass to drop any element that has zero references and zero callers (likely dead code; mention in README under "Possibly unused").

---

## Hallucination guardrails

- Never invent file paths. If you cannot find the file, say `[NOT FOUND]` and describe where you looked.
- Never assert behavior you have not read. If extracted only from naming/types, mark `[INFERENCE — from signature]`.
- Prefer omission over guessing. The spec is a **safety net**; false content is worse than missing content.

---

## Re-runs & drift

On a second invocation in the same project:

- Detect existing `specs/` directory.
- Ask the user: "Regenerate from scratch, or update existing files?"
- On update: keep human-edited sections marked `<!-- KEEP -->` ... `<!-- /KEEP -->` untouched.
- Report a diff summary at the end: "N elements added, M removed, K changed."

---

## Done criteria

You are done when:

- [ ] `specs/README.md` exists and links to every other file.
- [ ] All three layered files exist with at least one element each (or an explicit "none found" note).
- [ ] Each confirmed flow has its own file with cross-references resolved.
- [ ] Every claim is sourced or explicitly marked `[INFERENCE]`.
- [ ] You reported a one-paragraph summary back to the user: stack, # of flows, # of elements per layer, anything suspicious.
