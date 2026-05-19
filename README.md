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

Generate end-to-end specification markdown that mirrors the current implementation as a safety net against drift. Produces layered specs (frontend / backend / domain) plus cross-referenced flow specs. Asks the user to confirm the detected architecture before writing files. Every claim is sourced; unverifiable claims are explicitly marked `[INFERENCE]`.

| Command | Description |
|---|---|
| `/spec-mirror:generate` | Full pipeline: detect stack → confirm architecture → write layered + flow specs |
| `/spec-mirror:compare`  | Drift-check current code against existing `specs/`. Writes `specs/DRIFT.md` only (never modifies existing specs). Safe in CI. |

## Layout

```
donghyuns-claude/
├── .claude-plugin/
│   └── marketplace.json
├── plugins/
│   └── spec-mirror/
│       ├── .claude-plugin/
│       │   └── plugin.json
│       ├── README.md
│       └── skills/
│           └── generate/
│               └── SKILL.md
└── README.md
```

## License

MIT
