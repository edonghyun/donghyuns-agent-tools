# qa-operator

Delegate browser QA to an agent. `qa-operator` turns requirement lists, spreadsheets, issues, PRs, or feature ranges into a QA plan, runs the product in a browser, updates a live dashboard, captures screenshots and logs, flags UI/UX risks, triages failures, and can repair obvious local defects when allowed.

The default entry point is `start`. Most users should speak naturally instead of memorizing subcommands.

## Just Say

- "이 시트 31~43번 QA 맡겨줘. monitor 켜고 UI/UX 문제까지 봐줘."
- "현재 PR QA 돌려줘. 실패 항목은 스크린샷과 원인 분석까지 남겨줘."
- "이 기능 완전 검증해줘. 명백한 버그는 고치고 재검증해줘."
- "방금 QA 이어서 FAIL/PARTIAL만 다시 확인해줘."
- "QA 대시보드 열어줘."

## Skills

| Skill | Use |
|---|---|
| `/qa-operator:start` | Default delegated QA entry. Plans, starts monitor, runs QA, triages failures, and optionally repairs. |
| `/qa-operator:plan` | Convert requirements into `qa-plan.json` and initialize the audit folder. |
| `/qa-operator:run` | Execute browser QA and incrementally update `qa-results.json`, screenshots, traces, and logs. |
| `/qa-operator:monitor` | Serve/open the dashboard that polls the latest run results. |
| `/qa-operator:triage` | Analyze FAIL/PARTIAL/BLOCKED items, UX risks, logs, screenshots, and root-cause candidates. |
| `/qa-operator:repair` | Fix verifiable local defects and rerun the affected QA cases, subject to safety gates. |

## Default Output

```text
artifacts/qa-operator/<qa-slug>/
├── index.html
├── manifest.json
├── qa-plan.json
└── runs/
    ├── latest -> <run-id>
    └── <run-id>/
        ├── qa-results.json
        ├── qa-summary.md
        ├── commands.log
        ├── browser-console.log
        ├── network-errors.log
        ├── repair-log.md
        ├── screenshots/<item>/*.png
        ├── traces/<item>/
        └── issues/<item>-failure.md
```

## Example Prompts

### Full delegated QA

```text
qa-operator로 이 Google Sheet의 31번부터 43번까지 QA를 완전 위임 모드로 진행해줘.

- 요구사항을 qa-plan.json으로 정규화
- monitor 대시보드를 먼저 띄움
- run을 병렬로 진행하면서 qa-results.json을 계속 업데이트
- 실제 브라우저로 서버 접근, 로그인, 기능 확인, 검증 수행
- UI/UX 리스크도 별도 색출
- 실패 항목은 스크린샷, 콘솔/네트워크 로그, 원인 분석 리포트까지 작성
- 명백한 버그는 수정 후보를 제안하되, 수정은 승인 전에는 하지 않음
```

### Monitor while running

```text
qa-operator로 QA를 실행해줘. plan을 만든 뒤 monitor 대시보드를 먼저 띄우고,
그 상태에서 run을 병렬로 진행해줘. 나는 dashboard에서 진행 상황을 보고 싶어.

각 항목의 서버 접근/로그인/기능 확인/검증/UX 리스크 단계가 끝날 때마다
qa-results.json을 갱신해줘.
```

### Repair mode

```text
qa-operator로 QA를 돌리고, 명백한 구현 버그는 직접 수정한 뒤 해당 항목만 재검증해줘.
단, 기획 판단이 필요한 UX 변경, 데이터 삭제, 운영 환경 변경은 needs-product-decision으로 멈춰줘.
```

## Workflow

```text
start
  ├─ plan      writes qa-plan.json
  ├─ monitor   reads manifest + qa-plan + runs/latest/qa-results.json
  ├─ run       writes results, screenshots, traces, logs
  ├─ triage    writes issue reports and UX risk analysis
  └─ repair    optional, only for allowed verifiable defects
```

`monitor` and `run` are designed to run in parallel after `plan`. `monitor` observes the files; `run` updates them.

The monitor dashboard renders screenshot evidence as thumbnails. Click any screenshot to open an in-page preview, toggle between fit-to-screen and actual size, or open the original file in a new tab.

`qa-summary.md` and the monitor dashboard keep ticket context visible for each item. They show the plan item's `requirement`, `area`, `actors`, and `acceptance` separately from runtime result notes so the original ticket scope remains readable without rewriting the expected checks used during validation.

During planning, qa-operator also creates a lightweight case controller per item. If the input already includes `testCases`, those cases are preserved. Otherwise the controller splits multi-acceptance tickets into separate planned cases, or keeps a single case when one observable check is enough. For generated-AI/API result tickets, write 3-5 explicit `testCases` so the final report can compare multiple outputs instead of hiding risk behind one pass/fail row.

## Parallel Safety Rules

- **Item claim/lock:** one item can have only one active owner for triage, repair, or retest. Agents claim with `update_qa_result.py --claim <owner>` and release when done.
- **Monitor is read-only:** the dashboard never edits `qa-results.json`; it only reads manifest, plan, results, screenshots, and logs.
- **Run data isolation:** parallel run lanes must not mutate the same account, student, DB row, uploaded file, or external resource. Use item-specific fixtures or lane-specific test accounts.
- **Repair after triage:** repair starts only after the failure is reproduced and triaged with a root-cause candidate.
- **Targeted retest required:** a fix is not accepted until the affected item is rerun and `qa-results.json` has fresh evidence.

Example claim:

```bash
python3 plugins/qa-operator/scripts/update_qa_result.py artifacts/qa-operator/<slug> \
  --item 35 \
  --claim repair-agent-1 \
  --claim-phase repair
```

## Development Checks

```bash
python3 plugins/qa-operator/scripts/test_qa_operator_runtime.py
python3 ~/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/qa-operator
```

## Docs

- [CONCEPTS](docs/CONCEPTS.md)
- [WORKFLOW-GUIDE](docs/WORKFLOW-GUIDE.md)
- [EXAMPLES](docs/EXAMPLES.md)
- [TROUBLESHOOTING](docs/TROUBLESHOOTING.md)
