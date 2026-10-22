# Concepts

- **Main line** — the task list the user is working through in the main window. Its position lives in `.threads/MAIN.md`.
- **Branch** — one point taken out of the main line to dig into elsewhere. Each branch has a **capsule**: `.threads/<date>-<slug>.md` with Start here (verbatim), Decided so far (user-confirmed only), Open questions, Files, Constraints, Instructions, and Result.
- **Status** — `open` (created) → `closed` (branch wrote Result) → `merged` (main read it and returned).
- **Write ownership** — only main writes `MAIN.md`; a branch writes only its own capsule's Result/status. This is why many windows can run at once without overwriting each other.
- **Nested branch** — a branch opened inside a branch returns to its parent; the parent merges it.
- **Later** — side questions saved without leaving the current step.
- **Breadcrumb** — the last line of every reply after `---`: `📍 지금: … · 다음: … (가지 n개, 나중에 볼 것 n개)` in main, `🌿 지금: 가지 … · 메인 복귀: …` in a branch.

See also: [WORKFLOW-GUIDE](WORKFLOW-GUIDE.md) · [EXAMPLES](EXAMPLES.md) · [TROUBLESHOOTING](TROUBLESHOOTING.md)
