# Workflow guide

1. Main window: `/thread-keeper:branch toolchain vs JAVA_HOME` → capsule + command.
2. Other window: run `claude "Read .threads/<file> and continue from its Start here section."` (or paste the file into another AI).
3. Other window, when done: `/thread-keeper:merge` → Result written, status closed.
4. Main window: `/thread-keeper:merge` → ≤ 5-line summary, back to the saved step.
5. End of day: `/thread-keeper:where` → MAIN.md refreshed; tomorrow a new session reads it and resumes.

Several windows: open as many question/research branches as needed; keep code-editing branches to one at a time or use a git worktree.

See also: [CONCEPTS](CONCEPTS.md) · [EXAMPLES](EXAMPLES.md) · [TROUBLESHOOTING](TROUBLESHOOTING.md)
