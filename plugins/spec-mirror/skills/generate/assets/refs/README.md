# refs/

Human-curated knowledge that complements the auto-generated `specs/`. The spec answers **what is** — `refs/` answers **why and what's next**.

| Folder | Purpose | Owner |
|---|---|---|
| `designs/` | Design docs for features that will change the spec. Written **before** implementation. | Humans |
| `plans/` | Execution plans for tasks/changes, cross-referencing the spec sections they touch. | Humans (or `/sprint:plan-backlog`) |
| `decisions/` | Architecture decision records — **why** the implementation looks the way it does. | Humans |
| `lessons/` | Failure modes, non-obvious patterns, safety-net rationale captured after the fact. | Humans |

These folders are scaffolded by `/spec-mirror:generate` but their contents are not auto-managed. `/spec-mirror:lint` checks for dead cross-references between `specs/` and `refs/`.
