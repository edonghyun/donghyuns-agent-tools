# donghyuns-claude

Donghyun's personal plugin marketplace for Claude Code.

## Installation

```bash
# Add this marketplace (replace URL once pushed)
/plugin marketplace add donghyuns-claude <git-url-or-local-path>

# Install a plugin
/plugin install spec-mirror@donghyuns-claude
```

For local development before publishing, you can add the path directly:

```bash
/plugin marketplace add donghyuns-claude ~/projects/donghyuns-claude
```

## Plugins

### [spec-mirror](plugins/spec-mirror/README.md)

Six-skill safety net: generate, drift-check, lint, test-stub, coverage-audit, and scope-walk E2E specs against the current implementation. Produces layered specs (frontend / backend / domain) plus cross-referenced flow specs; scaffolds a human-curated `refs/{designs,plans,decisions,lessons}/` tree alongside. Every claim sourced; unverifiable claims explicitly marked.

| Command | Description |
|---|---|
| `/spec-mirror:generate` | Detect stack → confirm architecture → write layered + flow specs, scaffold `refs/` |
| `/spec-mirror:compare`  | Drift-check current code vs existing specs. Writes `specs/DRIFT.md`. CI-safe. |
| `/spec-mirror:lint`     | Audit `specs/` for internal hygiene. Writes `specs/LINT.md`. |
| `/spec-mirror:gen-tests`| Emit test stubs in the project's existing framework. Never overwrites. |
| `/spec-mirror:coverage` | Cross-reference tests against spec elements. Writes `specs/COVERAGE.md`. |
| `/spec-mirror:scope`    | Walk the spec graph from a target → focused mini-spec for an upcoming change. |

Docs: [CONCEPTS](plugins/spec-mirror/docs/CONCEPTS.md) · [WORKFLOW-GUIDE](plugins/spec-mirror/docs/WORKFLOW-GUIDE.md) · [EXAMPLES](plugins/spec-mirror/docs/EXAMPLES.md) · [TROUBLESHOOTING](plugins/spec-mirror/docs/TROUBLESHOOTING.md).

## Layout

```
donghyuns-claude/
├── .claude-plugin/
│   └── marketplace.json
├── plugins/
│   └── spec-mirror/
│       ├── .claude-plugin/plugin.json
│       ├── README.md
│       ├── docs/
│       │   ├── CONCEPTS.md
│       │   ├── EXAMPLES.md
│       │   ├── WORKFLOW-GUIDE.md
│       │   └── TROUBLESHOOTING.md
│       └── skills/
│           ├── generate/   (+ assets/refs/* for refs/ scaffold templates)
│           ├── compare/
│           ├── lint/
│           ├── gen-tests/
│           ├── coverage/
│           └── scope/
└── README.md
```

## License

MIT
