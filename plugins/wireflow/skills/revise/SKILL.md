---
name: revise
description: Applies change requests copied from a wireflow viewer (the "수정 요청" list) or described in chat to an existing *.flow.json — screens, actions, board chips, and log events — then rebuilds the same HTML and reruns checks. Also adopts a proposal into the baseline when the user chooses it. Triggers include pasted text starting with "## Wireflow 수정 요청" or "## Wireflow change requests", "와이어플로우 수정", "이 요청 반영해줘", "제안 채택", "플로우 다시 빌드", "로그 이벤트 추가", "지표 칩 바꿔줘", "apply wireflow requests", "adopt proposal", "rebuild wireflow", "add a log event". Writes only the referenced *.flow.json and its HTML (same paths) and never modifies application code. Do not use when no flow file exists yet (use wireflow:start).
---

# wireflow — revise from change requests

## When to use

- The user pasted a block copied from the viewer:
  ```text
  ## Wireflow 수정 요청 — 도자기 클래스 예약
  - flow: `class-booking` · 파일: `docs/wireflow/class-booking/class-booking.flow.json` · viewer: `class-booking.html`
  - 적용 중인 제안: `retry-to-detail`
  1. [03.02 `failed` › action `retry`] 상세 말고 결제 화면으로 바로 재시도
  ```
- The user describes a flow change in chat for an existing wireflow, or says which proposal to adopt.

Pre-condition: the referenced `*.flow.json` exists. If the path in the header does not resolve from the project root, search `docs/wireflow/**/<flow-id>*.flow.json`; if none or several match, ask.

## Output contract

- Rewrites only the referenced `*.flow.json` and rebuilds the HTML at the **same path and filename** (the browser keys saved requests on flow id + filename).
- Never changes the flow `id`, existing screen/action/event ids, or display numbers unless the request explicitly asks for a rename.
- Never modifies application code, even when a request describes a product bug — say it is a mockup change and point to the relevant tool if the user wants implementation.

## Pipeline

1. **Identify.** Read the flow JSON. Confirm its `id` matches the header's `flow:`. If not, stop and report the mismatch.
2. **Locate.** For each numbered request, find the target by stable ids (`screen` id, `action` id). Use the display number only to double-check. A request on a board may target a chip (`state`, `metrics`, `experiments`, `notify`, `exception`, `dormant` on that node) or an event (an `events[]` entry whose `at` names that node or `node.action`, or one the request names by event id). If the header lists applied proposals, interpret the request against the flow *with* those proposals.
3. **Classify each request** before editing:
   - *Mockup edit* — label, block, target, new state screen, a chip, an event, `eventProps`, or `primary`. Apply it. Moving a node's `exception` code keeps codes unique; an exception chip on the source node comes from the edge, so edit the edge or the exception node, not the chip.
   - *Adopt proposal* — move the proposal's `changes` into the baseline (`origin` of added screens becomes `source` if the user chose it), then delete that proposal and any alternatives that conflicted with it.
   - *Open question* — the request asks something undecided. Add or update a `decisions` entry instead of guessing.
   - *Out of scope* — application code, visual styling beyond wireframe blocks. Report, do not apply.
4. **Edit.** Preserve ids and unrelated behavior. New screens get new ids, a `number` that does not collide, and `origin` (`source` if the user asked for it, `inferred` if you added it to complete the change). Update affected scenarios and requirements so they still assert the observable result; add a scenario if a request introduces a new path.
5. **Check and rebuild** (same commands as `wireflow:start` step 4), including `--with` for each remaining proposal.
6. **Report** per request: applied / turned into decision / skipped (why), affected screen numbers, and check result before → after. Remind the user to reload the HTML; requests stored in the browser stay attached because the path is unchanged — they can clear handled ones with **비우기**.

## Hallucination guardrails

- Apply exactly what the request says; when it is ambiguous, apply nothing for that item and ask a one-line question.
- Do not mark a request resolved unless the linked scenario now passes `check`.
- Do not delete screens or actions a request did not mention, even if they look unused — report them as findings instead.

## Done criteria

- [ ] Flow `id` and the HTML path are unchanged.
- [ ] Each request is reported as applied, converted to a decision, or skipped with a reason.
- [ ] `check` rerun (baseline and each `--with`); scenario results before → after reported.
- [ ] HTML rebuilt from the edited JSON.
