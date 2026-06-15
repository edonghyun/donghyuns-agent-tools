# feature-intake

Turn external feature artifacts into product integration analysis packages.

`feature-intake` is for the recurring handoff where another team turns VoC into a PoC, demo, prototype, or experimental feature, and the product engineering team needs to decide how it fits into the existing service.

The default entry point is `start`. Most users should speak naturally instead of memorizing subcommands.

## Why This Exists

Teams often move quickly like this:

1. A customer, operation, business, or product team finds a VoC pattern.
2. Someone builds a fast PoC, demo app, Figma prototype, notebook, script, or artifact.
3. Engineering receives the artifact and must decide whether and how to merge it into the existing product.

The hard part is not just "does the PoC run?" The hard part is product translation:

- Who is the real user?
- Where does the feature enter the current product?
- What screens, buttons, modals, states, and errors exist?
- Where does the output go after generation?
- What is the quality bar?
- Which parts are MVP, later, blocked, or throwaway?
- What data, AI, storage, permission, and review requirements are implied?

`feature-intake` creates the missing bridge: screenshot evidence plus product framing, user flows, journeys, use cases, integration fit, risks, and MVP/backlog.

## Common Scenarios

### VoC -> PoC -> Product Merge

The business team ships a PoC from customer requests. Engineering needs to understand the workflow, capture every important state, decide the MVP boundary, and map it into the existing product.

### Prototype -> Buildable Feature

A Figma prototype or static demo shows a promising workflow. Product and engineering need annotated screens, actor assumptions, output destination, data requirements, and open product questions before implementation.

### Internal Tool -> Product Surface

An operations-only script or internal tool starts becoming valuable. The team needs to decide whether it stays internal, becomes an admin workflow, or becomes a customer-facing product feature.

### AI Experiment -> Governed Workflow

A prompt chain, model demo, or AI-assisted output generator exists. The team needs external calls mocked for analysis, quality bars defined, review/approval boundaries clarified, and hallucination/data risks documented.

## Just Say

- "이 PoC를 feature-intake 해줘. 스크린샷 포함해서 유저플로우, 유저저니, 유즈케이스, 제품 편입 분석까지 정리해줘."
- "비즈니스팀에서 준 데모 앱 분석해줘. 외부 AI/API는 mock 처리하고 모든 버튼/모달 상태를 캡처해줘."
- "이 Figma prototype을 기존 서비스에 붙인다고 가정하고 feature-intake 패키지 만들어줘."
- "VoC 기반 실험물을 받아서 기존 제품에 어디에 붙일지, MVP는 뭔지, 리스크는 뭔지 정리해줘."
- "페이지별 스크린샷과 함께 화면별 기능 해설, 유저저니, use case를 만들어줘."

## Skills

| Skill | Use |
|---|---|
| `/feature-intake:start` | Natural-language entry. Runs the whole intake pipeline and packages the result. |
| `/feature-intake:inspect` | Inspect artifact structure, run path, pages/routes, feature surfaces, state, and external calls. |
| `/feature-intake:capture` | Capture page, interaction, modal/dialog, edge-state, and contact-sheet screenshots. |
| `/feature-intake:frame` | General product framing: actors, placement, output destination, quality bar, MVP boundary, data/AI/storage, operations, risks. |
| `/feature-intake:analyze` | Write user flows, user journeys, use cases, feature inventory, and screen-by-screen annotations. |
| `/feature-intake:map` | Map the artifact into the existing product: information architecture, bounded contexts, data/API/permission/storage needs, migration/backlog. |
| `/feature-intake:package` | Assemble the final handoff README, indexes, contact sheets, reports, and follow-up checklist. |

## Workflow

```text
start
  ├─ inspect   discover artifact structure and evidence targets
  ├─ capture   collect screenshots and contact sheets
  ├─ frame     define product assumptions and unknowns
  ├─ analyze   write flows, journeys, use cases, screen annotations
  ├─ map       map into the existing service and implementation surface
  └─ package   assemble the handoff bundle
```

## Default Output

```text
docs/feature-intake/<slug>/
├── README.md
├── intake-manifest.json
├── screenshots/
│   ├── pages/
│   ├── interactions/
│   ├── dialogs/
│   ├── edge-cases/
│   └── contact-sheets/
├── analysis/
│   ├── product-framing.md
│   ├── user-roles.md
│   ├── user-flow.md
│   ├── user-journeys.md
│   ├── use-cases.md
│   ├── page-inventory.md
│   ├── feature-inventory.md
│   ├── screen-by-screen.md
│   ├── integration-fit.md
│   ├── data-ai-storage.md
│   ├── risks-and-blockers.md
│   └── mvp-backlog.md
├── qa/
│   └── feature-coverage-matrix.md
└── tools/
    └── README.md
```

## Product Framing Slots

Every intake should classify product knowledge as `Known`, `Assumed`, `Unknown`, or `Decision Needed`.

| Slot | Question |
|---|---|
| Actors | Who operates, receives, reviews, approves, or administers this feature? |
| Placement | Where does it enter the existing product or workflow? |
| Output destination | Is the result saved, copied, sent, downloaded, embedded, or only viewed? |
| Quality bar | What makes a good result, and what must be reviewed? |
| MVP boundary | What ships first, later, never, or as manual ops? |
| Data/AI/storage | What inputs, external calls, persistence, history, and approval states are needed? |
| Operational fit | Who handles failures, support, monitoring, and recovery? |
| Risks and unknowns | What product, UX, technical, data, legal, or security questions remain? |

## Status Language

Use product-intake statuses consistently:

| Status | Meaning |
|---|---|
| `verified` | Observed with screenshot, code, runtime, or document evidence. |
| `assumed` | Reasonable product assumption, explicitly marked. |
| `unknown` | Needs product/business/user clarification. |
| `decision-needed` | Must be decided before implementation. |
| `blocked` | Present in code or concept, but not reachable or not verifiable. |
| `out-of-scope` | Deliberately excluded from the proposed product scope. |

## Relationship To Other Plugins

- Use `qa-operator` after `feature-intake` when the feature has implementation requirements that need browser acceptance QA.
- Use `spec-mirror` after product scope is accepted and implementation exists, so the current code behavior becomes a drift-checkable spec.

## Docs

- [CONCEPTS](docs/CONCEPTS.md)
- [WORKFLOW-GUIDE](docs/WORKFLOW-GUIDE.md)
- [EXAMPLES](docs/EXAMPLES.md)
- [TROUBLESHOOTING](docs/TROUBLESHOOTING.md)
