# Concepts

| 용어 | 뜻 |
|---|---|
| **wireflow** | 와이어프레임(단순 목업 화면) + 플로우(화면 간 연결). 시각 디자인이 아니라 구조·흐름 검토용. |
| **flow JSON** | 유일한 원본. HTML은 언제든 재빌드되는 산출물. |
| **stage** | 작업 단위 묶음. 와이어프레임에서는 한 줄, 보드에서는 한 열 묶음. |
| **kind** | 노드 종류. `screen`(기기 화면) · `message` · `email` · `document` · `step` · `decision`(◆) · `system` · `wait` · `end`. |
| **actor** | 노드를 수행하는 주체. 보드에서는 카드의 담당 태그 색이 된다. |
| **view** | `board`(화면 설계 전) / `wireframe`(화면 검토). 같은 파일을 두 방식으로 그린다. 0.2의 `flowchart`는 `board`로 읽는다. |
| **primary** | 기본 경로로 삼을 시나리오 id. 보드의 가운데 척추선에 놓인다. |
| **exception** | 이탈·막힘 노드의 코드(`E01`…). 예외 띠에 놓이고, 그 노드로 가는 출발 노드에 코드 칩이 자동으로 붙는다. |
| **chip** | 카드 아래 꼬리표. 상태값(`state`)·지표(`metrics`)·실험 변수(`experiments`)·발송 알림(`notify`)·예외 코드. |
| **event** | 로그를 심을 지점. `normal`·`drop`·`error`, 위치는 노드 id 또는 `노드.액션`. 로그 리스트 탭에 모인다. |
| **origin** | 화면의 출처. `source`(기획 원문) · `observed`(현재 구현 재현) · `inferred`(AI 추정, 점선) · `proposed`(제안으로 추가). |
| **action** | 버튼. `to: null`은 알려진 빈 연결, 없는 id는 깨진 연결. `when`/`set`/`inc`로 상태를 다룬다. |
| **scenario** | 버튼 순서 + 각 단계의 기대 화면·상태. `check`가 재생한다. |
| **requirement** | 기획에서 관찰 가능한 요구. 연결된 시나리오가 모두 통과해야 `passed`. |
| **decision** | 기획이 정하지 않은 정책 질문. AI가 대신 답하지 않는다. |
| **proposal** | 원본을 건드리지 않는 개선안. `check --with`·뷰어 체크박스로 미리 적용. 같은 버튼을 바꾸는 제안끼리는 대안 관계(동시 적용 불가). |
| **baseline** | 현재 구현에서 막힌 흐름을 그대로 재현한 원본. 고친 버전은 proposal로만. |

## 발견 사항

🔴 `broken-link` · `trapped`(처음/종료로 돌아갈 길 없음) · `scenario-failed` · `broken-event` · `unknown-primary` — 🟡 `missing-link` · `unreachable` · `decision-branches` · `orphan-exception` — 🔵 `uncovered-requirement` · `untracked-step`(이벤트 없는 기본 경로 걸음).
정적 도달성은 `when` 조건을 무시한다. 조건과 상태는 시나리오에서만 검증된다.

→ 다음: [WORKFLOW-GUIDE](WORKFLOW-GUIDE.md)
