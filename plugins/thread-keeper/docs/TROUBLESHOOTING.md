# Troubleshooting

- **Merge says "not closed"** — the branch window has not run `/thread-keeper:merge`. Run it there first.
- **The branch window lost the thread** — it was started without reading the capsule. Start again with the one-line command.
- **Two windows edited the same file** — the skill does not lock files. Keep code-editing branches to one at a time or use a git worktree.
- **Conversation was compacted before branching** — unknown details appear as `[unknown after compaction]`; fill them in the branch.
- **`.threads/` showing up in git** — add it to `.gitignore` if the context is personal.

See also: [CONCEPTS](CONCEPTS.md) · [WORKFLOW-GUIDE](WORKFLOW-GUIDE.md) · [EXAMPLES](EXAMPLES.md)
