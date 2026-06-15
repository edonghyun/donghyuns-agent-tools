# QA Operator Examples

## Spreadsheet Range QA

```text
qa-operator로 이 Google Sheet의 31번부터 43번까지 QA를 완전 위임 모드로 진행해줘.

목표:
- 요구사항을 qa-plan.json으로 정규화
- monitor 대시보드를 먼저 띄움
- run을 병렬로 진행하면서 qa-results.json을 계속 업데이트
- 실제 브라우저로 서버 접근, 로그인, 기능 확인, 검증 수행
- UI/UX 리스크도 별도 색출
- 실패 항목은 스크린샷, 콘솔/네트워크 로그, 원인 분석 리포트까지 작성
- 명백한 버그는 수정 후보를 제안하되, 수정은 승인 전에는 하지 않음

입력:
- 요구사항 소스: <시트 URL>
- 범위: 번호 컬럼 31~43
- 대상 프로젝트: 현재 레포
- 산출물 경로: artifacts/qa-operator/profilepro-a31-a43/
```

## Parallel Delegated QA

```text
qa-operator로 이 범위 QA를 병렬로 돌려줘.

- monitor는 읽기 전용으로 켜줘
- run lane은 항목별 fixture/test account를 분리해줘
- triage/repair/retest는 item claim을 잡고 진행해줘
- 같은 계정, 학생, DB row, 업로드 파일, queue job을 동시에 건드리는 항목은 직렬화해줘
- repair는 triage 이후에만 진행하고, 수정 후 targeted retest로 qa-results.json을 갱신해줘
```

## Current PR QA

```text
현재 PR QA 맡겨줘. 변경된 기능을 기준으로 QA plan을 만들고,
monitor 대시보드를 켠 다음 브라우저로 직접 검증해줘.
실패 항목은 스크린샷, trace, 네트워크/콘솔 로그, 원인 분석까지 남겨줘.
수정은 승인 전에는 하지 마.
```

## Current Diff QA

```text
현재 working tree 변경분 기준으로 QA 돌려줘.
영향받는 사용자 흐름을 plan으로 정리하고,
FAIL/PARTIAL/BLOCKED만 자세히 triage해줘.
```

## Staging URL QA

```text
이 staging URL에서 QA 맡겨줘: <URL>
운영 데이터 수정이나 삭제는 하지 말고, 읽기/테스트 계정 범위에서만 확인해줘.
monitor 켜고 모바일/태블릿/데스크톱 화면을 모두 봐줘.
```

## Mobile and Tablet QA

```text
이 기능 모바일/태블릿 QA만 집중해서 봐줘.
뷰포트는 iPhone, iPad, desktop을 쓰고,
버튼 겹침, 메뉴 접근성, 긴 텍스트, 모달 잘림, 저장 피드백을 UX 리스크로 따로 기록해줘.
```

## UX Only Audit

```text
구현 여부보다 UI/UX 문제 색출이 목적이야.
브라우저로 실제 흐름을 타면서 발견성, 클릭 수, 저장 확신, 오류 회복, 모바일 레이아웃 문제를 찾아줘.
결과는 qa-results.json의 uxRisks와 별도 summary에 정리해줘.
```

## Retry Failed Items

```text
방금 QA run에서 FAIL/PARTIAL/BLOCKED만 다시 확인해줘.
이전 스크린샷과 로그를 보고 재현한 뒤, 상태가 바뀌면 qa-results.json을 갱신해줘.
```

## Repair With Approval

```text
QA 돌리고 실패 항목을 triage해줘.
수정 가능한 버그는 파일/라인/수정 방향까지 제안하되,
내가 승인하기 전에는 코드는 바꾸지 마.
```

## Auto Repair Local Bugs

```text
QA 돌린 뒤 명백한 로컬 구현 버그는 직접 고치고 해당 항목만 재검증해줘.
기획 판단, 운영 데이터 변경, 삭제/초기화는 needs-product-decision으로 멈춰줘.
```
