# spec-mirror

Generate a layered + flow-based E2E specification of an application that mirrors the **current implementation** as a safety net against drift.

## Skills

| Command | Purpose |
|---|---|
| `/spec-mirror:generate` | Detect stack → confirm architecture with user → emit layered specs (frontend / backend / domain) + cross-referenced flow specs |
| `/spec-mirror:compare`  | Drift-check current code against existing `specs/`. Writes a single `specs/DRIFT.md` report (🔴 critical / 🟡 warning / 🔵 info). Never modifies existing spec files. Safe in CI. |

## Output

```
specs/
├── README.md
├── layers/
│   ├── frontend.md
│   ├── backend.md
│   └── domain.md
└── flows/
    ├── 01-<flow>.md
    └── ...
```

- **Layered files** describe each element thoroughly-but-briefly with a source-file reference.
- **Flow files** narrate user journeys and link back to the layered sections (mandatory cross-references).
- **No hallucination:** every claim is sourced; unverifiable claims are marked `[INFERENCE]`.

## Triggers

- **generate** — `generate spec`, `mirror the app`, `e2e spec`, `스펙 생성`, `스펙 미러`, `구현 스펙 만들어줘`
- **compare** — `drift check`, `verify spec`, `compare spec`, `스펙 비교`, `스펙 드리프트`, `스펙 검증`
