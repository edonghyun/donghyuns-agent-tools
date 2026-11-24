# Examples

예시 순서도: [`examples/consulting-request.flow.json`](../examples/consulting-request.flow.json) — 고객(모바일) 신청 → 시스템 접수 → 상담사(데스크톱) 배정 → 가능 여부 분기 → 대기 또는 카카오톡 알림톡 → 결제(실패 시 재결제) → 영수증 메일 → 상담 → PDF 리포트. `view: "flowchart"`, `actors` 3개 레인. 뷰어에서 **와이어프레임** 버튼을 누르면 같은 노드가 기기별 화면·메시지·이메일·문서 카드로 바뀐다.

예시 화면 flow: [`examples/class-booking.flow.json`](../examples/class-booking.flow.json) — 가상의 도자기 공방 예약. 결제 실패 화면에 재시도 버튼이 없는 현재 구현을 재현하고, 개선안 `retry-to-detail`을 둔다.

```text
$ node scripts/wireflow.mjs check examples/class-booking.flow.json
BROKEN 도자기 클래스 예약 (flow: class-booking)
  screens 6 · scenarios 1/2 pass · requirements 1/3 pass
  🔴 trapped [failed]: "결제 실패"에서 처음이나 종료 화면으로 돌아갈 방법이 없음
  🔴 scenario-failed [failed] (scenario retry): 5단계: "failed" 화면에 "retry" 버튼이 없음
  🔵 uncovered-requirement [my]: 요구사항 "예약 취소"를 확인하는 시나리오가 없음

$ node scripts/wireflow.mjs check examples/class-booking.flow.json --with retry-to-detail
OK 도자기 클래스 예약 (flow: class-booking) with retry-to-detail
  screens 6 · scenarios 2/2 pass · requirements 2/3 pass
  🔵 uncovered-requirement [my]: 요구사항 "예약 취소"를 확인하는 시나리오가 없음
```

뷰어에서 복사한 수정 요청 예:

```text
## Wireflow 수정 요청 — 도자기 클래스 예약
- flow: `class-booking` · 파일: `docs/wireflow/class-booking/class-booking.flow.json` · viewer: `class-booking.html`
- 적용 중인 제안: `retry-to-detail`

1. [03.02 `failed` › action `retry`] 상세 말고 결제 화면으로 바로 재시도하게
2. [01.02 `my`] 예약 취소 버튼과 취소 확인 화면 추가
```

→ 다음: [TROUBLESHOOTING](TROUBLESHOOTING.md)
