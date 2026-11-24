# Concepts

| 용어 | 뜻 |
|---|---|
| **wireflow** | 와이어프레임(단순 목업 화면) + 플로우(화면 간 연결). 시각 디자인이 아니라 구조·흐름 검토용. |
| **flow JSON** | 유일한 원본. HTML은 언제든 재빌드되는 산출물. |
| **stage** | 작업 단위 묶음. 와이어프레임에서는 한 줄, 순서도에서는 한 열. |
| **kind** | 노드 종류. `screen`(기기 화면) · `message` · `email` · `document` · `step` · `decision`(◆) · `system` · `wait` · `end`. |
| **actor** | 노드를 수행하는 주체. 순서도에서 레인(가로줄)이 된다. |
| **view** | `flowchart`(화면 설계 전) / `wireframe`(화면 검토). 같은 파일을 두 방식으로 그린다. |
| **origin** | 화면의 출처. `source`(기획 원문) · `observed`(현재 구현 재현) · `inferred`(AI 추정, 점선) · `proposed`(제안으로 추가). |
| **action** | 버튼. `to: null`은 알려진 빈 연결, 없는 id는 깨진 연결. `when`/`set`/`inc`로 상태를 다룬다. |
| **scenario** | 버튼 순서 + 각 단계의 기대 화면·상태. `check`가 재생한다. |
| **requirement** | 기획에서 관찰 가능한 요구. 연결된 시나리오가 모두 통과해야 `passed`. |
| **decision** | 기획이 정하지 않은 정책 질문. AI가 대신 답하지 않는다. |
| **proposal** | 원본을 건드리지 않는 개선안. `check --with`·뷰어 체크박스로 미리 적용. 같은 버튼을 바꾸는 제안끼리는 대안 관계(동시 적용 불가). |
| **baseline** | 현재 구현에서 막힌 흐름을 그대로 재현한 원본. 고친 버전은 proposal로만. |

## 발견 사항

🔴 `broken-link` · `trapped`(처음/종료로 돌아갈 길 없음) · `scenario-failed` — 🟡 `missing-link` · `unreachable` — 🔵 `uncovered-requirement`.
정적 도달성은 `when` 조건을 무시한다. 조건과 상태는 시나리오에서만 검증된다.

→ 다음: [WORKFLOW-GUIDE](WORKFLOW-GUIDE.md)
