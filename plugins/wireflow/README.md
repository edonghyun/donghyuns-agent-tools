# wireflow

기획 단계에서 **사용자 흐름과 화면 구조**를 비주얼 디자인 전에 검토한다. 기획 메모·스크린샷·라우트·feature-intake 분석을 편집 가능한 `*.flow.json`과 단일 HTML 뷰어로 바꾼다. 화면 설계 전에는 **저니 보드**로 기본 경로·이탈 지점·미정 결정·지표·로그 이벤트를 한눈에 보고, 화면이 정해지면 같은 파일을 **와이어프레임**으로 본다. 시나리오가 주요 여정과 복구 경로(취소·뒤로·재시도)를 재생해 막다른 화면·빠진 연결·검증 안 된 요구사항을 찾는다.

> 아이디어 출처: [JeongK7998/wireflow-review](https://github.com/JeongK7998/wireflow-review). 코드는 가져오지 않았고 이 저장소의 규칙에 맞춰 새로 구현했다.

## Install

```sh
claude plugin marketplace update donghyuns-agent-tools
claude plugin install wireflow@donghyuns-agent-tools
```

## 두 가지 보기 (같은 파일)

| 보기 | 언제 | 모양 |
|---|---|---|
| **저니 보드** (`view: "board"`) | 화면 설계 전, 흐름·지표·로그 합의 | 단계 열 위에 자동 배치. 기본 경로(`primary`)는 가운데 척추선, 아래에 빨간 **예외 띠**와 **미정 결정 띠**. 카드마다 담당자 색과 상태값·지표·실험 변수·발송 알림·예외 코드 칩. 선은 직각으로 꺾이고 분기에만 라벨. **로그 리스트** 탭에 이벤트와 공통 속성 표 |
| **와이어프레임** (`view: "wireframe"`) | 화면 구조 검토 | 노드마다 기기 프레임(모바일·태블릿·데스크톱·워치·키오스크·직접 크기), 메시지·이메일·문서 카드 |

보드로 시작해서 노드의 `kind`를 `screen`으로 바꾸고 `ui`를 채우면 그대로 와이어프레임이 된다. id·시나리오·수정 요청은 유지된다. 뷰어 상단 버튼으로 언제든 전환. 0.2의 `view: "flowchart"` 파일은 보드로 열린다.

## Just say

| 명령 | 말로 해도 됨 | 하는 일 |
|---|---|---|
| `/wireflow:start` | "이 기획으로 와이어플로우 만들어줘", "유저 저니 보드로 정리해줘", "서비스 블루프린트" | 출처 수집 → flow JSON → `check` → HTML, 걸어볼 경로 하나와 발견 사항 보고 |
| `/wireflow:revise` | 뷰어에서 복사한 `## Wireflow 수정 요청 …` 붙여넣기 | 요청 반영·제안 채택, id 유지, 같은 HTML 재빌드, 검사 재실행 |

## 뷰어에서 하는 일

- **보드 / 와이어프레임** — 단계별로 묶인 전체 노드와 연결. 드래그로 이동, ⌘/Ctrl+휠(핀치)로 확대, **전체 보기**로 맞춤, **단계로 이동**으로 점프.
- **로그 리스트** — 이벤트 하나가 한 행(유형·발생 위치·속성·메모)이고, 위에 모든 이벤트의 공통 속성 표가 있다.
- **경로** — 시나리오를 고르면 지나는 화살표(와이어프레임에서는 버튼에도)에 순번이 붙고 나머지는 흐려진다. 실패한 단계는 순번이 빨갛고, 보드에서는 그 화살표도 빨갛다.
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
node $WF example plan.flow.json --board   # 저니 보드 예시 복사 (0.2의 --flowchart도 같음)
node $WF check demo.flow.json              # 0 깨끗함 · 1 발견 사항 · 2 잘못된 입력/제안 충돌
node $WF check demo.flow.json --with retry-to-detail
node $WF build demo.flow.json demo.html
```

실행은 Node 18+, 외부 패키지 없음 (뷰어는 커밋된 `scripts/viewer/dist`를 쓴다).

개발 (`plugins/wireflow`에서):

```sh
npm ci
npm run lint && npm test
npm run bundle   # scripts/viewer/src를 고쳤으면 dist를 다시 만들어 함께 커밋
```

## 다른 플러그인과 함께

- **feature-intake** → `analysis/action-graph.md`·`user-flow.md`를 wireflow로 넘겨 PoC 흐름을 클릭하며 검토 (PoC 화면은 `origin: "observed"`).
- **ui-operator** → 여러 화면에 걸친 흐름 변경이면 캡처 전에 wireflow로 의도한 흐름을 먼저 합의하고, 같은 화면 id를 캡처 계획에 재사용.
- **qa-operator** → wireflow의 `requirements`·`scenarios`는 실제 앱 브라우저 QA 항목의 초안이 된다. wireflow `check`는 모델 검사일 뿐 실제 앱 검증이 아니다.

문서: [CONCEPTS](docs/CONCEPTS.md) · [WORKFLOW-GUIDE](docs/WORKFLOW-GUIDE.md) · [EXAMPLES](docs/EXAMPLES.md) · [TROUBLESHOOTING](docs/TROUBLESHOOTING.md) · [flow 모델](skills/start/references/flow-model.md)
