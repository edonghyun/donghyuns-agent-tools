# wireflow:revise changelog

## 0.3.0 — 2026-11-26

- A request may target a board chip (`state`, `metrics`, `experiments`, `notify`, `exception`, `dormant`), an event, `eventProps`, or `primary`. Event ids stay stable like screen and action ids.
- New triggers: 로그 이벤트 추가, 지표 칩 바꿔줘, add a log event.

## 0.2.0 — 2026-11-24

- First release. It applies change requests pasted from the viewer or described in chat, and it adopts a proposal into the baseline. Ids and the HTML path stay stable, and it rebuilds and reruns `check`.
