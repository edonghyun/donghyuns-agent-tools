# wireflow

기획 단계에서 **화면 구조와 사용자 흐름**을 비주얼 디자인 전에 검토한다. 기획 메모·스크린샷·라우트·feature-intake 분석을 편집 가능한 `*.flow.json`과 단일 HTML 뷰어로 바꾼다. 화면은 작업 단위로 묶이고 화살표로 연결되며, 시나리오가 주요 여정과 복구 경로(취소·뒤로·재시도)를 재생해 막다른 화면·빠진 연결·검증 안 된 요구사항을 찾는다.

> 아이디어 출처: [JeongK7998/wireflow-review](https://github.com/JeongK7998/wireflow-review). 코드는 가져오지 않았고 이 저장소의 규칙에 맞춰 새로 구현했다.

## Install

```sh
claude plugin marketplace update donghyuns-agent-tools
claude plugin install wireflow@donghyuns-agent-tools
```

## 두 가지 보기 (같은 파일)

| 보기 | 언제 | 모양 |
|---|---|---|
| **순서도** (`view: "flowchart"`) | 화면 설계 전, 업무 흐름 합의 | 담당자 레인 × 단계 열, 단계(▭)·분기(◆)·시스템(⚙)·대기(⏳)·종료 박스, 화살표에 분기 라벨 |
| **와이어프레임** | 화면 구조 검토 | 노드마다 기기 프레임(모바일·태블릿·데스크톱·워치·키오스크·직접 크기), 메시지·이메일·문서 카드 |

순서도로 시작해서 노드의 `kind`를 `screen`으로 바꾸고 `ui`를 채우면 그대로 와이어프레임이 된다. id·시나리오·수정 요청은 유지된다. 뷰어 상단 버튼으로 언제든 전환.

## Just say

| 명령 | 말로 해도 됨 | 하는 일 |
|---|---|---|
| `/wireflow:start` | "이 기획으로 와이어플로우 만들어줘" | 출처 수집 → flow JSON → `check` → HTML, 걸어볼 경로 하나와 발견 사항 보고 |
| `/wireflow:revise` | 뷰어에서 복사한 `## Wireflow 수정 요청 …` 붙여넣기 | 요청 반영·제안 채택, id 유지, 같은 HTML 재빌드, 검사 재실행 |

## 뷰어에서 하는 일

- **개요** — 단계별로 묶인 전체 화면과 연결. 드래그로 이동, ⌘/Ctrl+휠(핀치)로 확대.
- **경로** — 시나리오를 고르면 해당 버튼과 화살표에 순번이 붙고 나머지는 흐려진다. 실패한 단계는 빨간 표시.
- **직접 걸어보기** — 실제처럼 버튼을 눌러 이동. 입력값·상태가 유지되는지, 조건이 안 맞는 버튼은 무엇인지 확인.
- **개선 제안** — 체크하면 메모리에서만 적용되어 검사 결과가 즉시 갱신된다. 원본(현재 구현 재현)은 그대로.
- **수정 요청** — 화면을 선택하고 요청을 담은 뒤 **모두 복사** → 채팅에 붙여넣기. 요청에는 flow id, 파일 경로, 화면/버튼 id가 들어간다.

## 출력

```text
docs/wireflow/<slug>/<slug>.flow.json   # 원본, 손으로 고쳐도 됨
docs/wireflow/<slug>/<slug>.html        # 재빌드 산출물 (의존성 없는 단일 파일)
```

## CLI

```sh
WF=plugins/wireflow/scripts/wireflow.mjs   # 설치본은 ${CLAUDE_PLUGIN_ROOT}/scripts/wireflow.mjs
node $WF example demo.flow.json            # 화면 예시 복사
node $WF example plan.flow.json --flowchart  # 순서도 예시 복사
node $WF check demo.flow.json              # 0 깨끗함 · 1 발견 사항 · 2 잘못된 입력/제안 충돌
node $WF check demo.flow.json --with retry-to-detail
node $WF build demo.flow.json demo.html
```

Node 18+, 외부 패키지 없음. 테스트: `node --test plugins/wireflow/scripts/test/*.test.mjs`.

## 다른 플러그인과 함께

- **feature-intake** → `analysis/action-graph.md`·`user-flow.md`를 wireflow로 넘겨 PoC 흐름을 클릭하며 검토 (PoC 화면은 `origin: "observed"`).
- **ui-operator** → 여러 화면에 걸친 흐름 변경이면 캡처 전에 wireflow로 의도한 흐름을 먼저 합의하고, 같은 화면 id를 캡처 계획에 재사용.
- **qa-operator** → wireflow의 `requirements`·`scenarios`는 실제 앱 브라우저 QA 항목의 초안이 된다. wireflow `check`는 모델 검사일 뿐 실제 앱 검증이 아니다.

문서: [CONCEPTS](docs/CONCEPTS.md) · [WORKFLOW-GUIDE](docs/WORKFLOW-GUIDE.md) · [EXAMPLES](docs/EXAMPLES.md) · [TROUBLESHOOTING](docs/TROUBLESHOOTING.md) · [flow 모델](skills/start/references/flow-model.md)
