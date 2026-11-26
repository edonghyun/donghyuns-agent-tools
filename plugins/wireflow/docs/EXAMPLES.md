# Examples

예시 저니 보드: [`examples/trial-enrollment.flow.json`](../examples/trial-enrollment.flow.json) — 가상의 온라인 수학 교실. 검색 광고·지인 추천 두 진입 → 체험 신청(중복 가구 분기) → 학생 체험 수업 → 리포트 → 학부모 등록 의향 → 플랜 선택·결제(실패 시 재결제) → 첫 수업 안내. 노드 21개, 예외 4개(E01 중복 신청 · E02 체험 미접속 · E03 수업 중 이탈 · E04 등록 보류), 3개 단계의 미정 결정, 시나리오 6개, 기본 경로의 모든 걸음에 로그 이벤트. 형제 등록 상담은 `dormant`로 문만 열어 둔다. `node $WF example plan.flow.json --board`로 복사한다.

```text
$ node scripts/wireflow.mjs check examples/trial-enrollment.flow.json
OK 체험 수업에서 정규 등록까지 (flow: trial-enrollment)
  screens 21 · scenarios 6/6 pass · requirements 4/4 pass
```

작은 보드 예시: [`examples/consulting-request.flow.json`](../examples/consulting-request.flow.json) — 고객(모바일) 신청 → 시스템 접수 → 상담사(데스크톱) 배정 → 가능 여부 분기 → 대기 또는 카카오톡 알림톡 → 결제(실패는 예외 E01, 재결제) → 영수증 메일 → 상담 → PDF 리포트. 확정 알림의 '일정 변경 요청'은 아직 연결이 없고(🟡 `missing-link`), 개선안 `reschedule-request`가 이를 메운다. 뷰어에서 **와이어프레임** 버튼을 누르면 같은 노드가 기기별 화면·메시지·이메일·문서 카드로 바뀐다.

예시 와이어프레임: [`examples/class-booking.flow.json`](../examples/class-booking.flow.json) — 가상의 도자기 공방 예약 (`view: "wireframe"`). 결제 실패 화면에 재시도 버튼이 없는 현재 구현을 재현하고, 개선안 `retry-to-detail`을 둔다.

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
