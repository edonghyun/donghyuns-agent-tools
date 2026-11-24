# Workflow guide

## 1. 새 기능 기획 검토

1. "이 기획 메모로 와이어플로우 만들어줘" → `wireflow:start`
2. 보고에 있는 **먼저 걸어볼 경로**를 뷰어 **경로**에서 고르고 **직접 걸어보기**.
3. 어색한 단계에서 화면 선택 → **수정 요청 담기** → **수정 요청 → 모두 복사** → 채팅에 붙여넣기 → `wireflow:revise`.
4. 미정 결정(decisions)에 답하면 revise가 흐름에 반영한다.

## 2. 현재 구현의 막힌 흐름

1. "결제 실패하면 갇히는데 와이어플로우로 보여줘" (+ 스크린샷/라우트).
2. start가 **막힌 상태 그대로** baseline을 만들고(`observed`), 고친 안을 proposal로 둔다. baseline `check`는 실패, `--with <제안>`은 통과해야 정상.
3. 뷰어에서 제안을 체크해 같은 입력으로 재시도까지 걸어본다.
4. "retry-to-detail 채택" → revise가 baseline에 반영하고 대안 제안을 정리.

## 3. feature-intake PoC → wireflow

feature-intake의 `analysis/action-graph.md`의 action id를 그대로 wireflow action id로 쓰면, 이후 spec·QA 문서와 같은 이름으로 대화할 수 있다.

## 4. ui-operator 전에 흐름 합의

여러 화면에 걸친 변경은 먼저 wireflow로 의도한 흐름을 합의 → 같은 화면 id로 ui-operator 캡처 계획 → 구현 후 before/after 비교.

→ 다음: [EXAMPLES](EXAMPLES.md)
