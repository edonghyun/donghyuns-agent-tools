---
name: merge
description: Closes or merges a conversation branch. In a branch session it writes the branch's conclusion into its capsule; in the main session it reads closed capsules, reports a short summary, and returns to the saved main position. Triggers include "/thread-keeper:merge", "merge", "merge back", "close this branch", "합쳐", "합쳐줘", "가지 합쳐", "합쳐 <주제>", "합쳐 전부". Writes only `.threads/` files (the capsule's Result/status, and MAIN.md in the main session) and never modifies other files. Do not use when no `.threads/` capsule exists.
---

# merge — close a branch, or bring it back to main

## When to use
- **In a branch session** (the conversation started from a capsule, or the user says this window is a branch): close it.
- **In the main session**: merge closed branches back. Argument optional: `/thread-keeper:merge <topic>` or `all`.
- Detect which side you are on: if this session was started by reading `.threads/<file>.md`, you are in that branch; otherwise you are main. If unsure, ask one short question.

## Output contract
- Branch side: appends to `## Result` and sets `status: closed` in **its own capsule only**. Never writes MAIN.md or other capsules.
- Main side: sets merged capsules to `status: merged`; updates `.threads/MAIN.md` (branch rows, Later list). Parent branch merging a nested child: updates the child capsule and the parent capsule's notes, not MAIN.md.
- Chat reply: branch side ≤ 2 lines; main side ≤ 5 lines per merged branch. Details stay in the capsule.
- Never deletes capsules. Never modifies files outside `.threads/`.

## Pipeline
### Branch side
1. Write under `## Result`:
   - `Conclusion:` one or two sentences.
   - `Decisions:` bullets the user confirmed.
   - `Still open:` bullets.
   - `Changed files:` paths actually created or edited in this branch, or `none`.
   - `Later:` side questions that came up.
2. Set `status: closed`.
3. Reply: "기록했어요. 메인 창에서 /thread-keeper:merge 하세요." then `---` and `🌿 지금: 가지 <topic> 기록 완료 · 다음: 메인에서 merge`.

### Main side
1. List capsules in `.threads/` with `status: closed` (and their nested children already merged into them). If several and no topic given, show one line each and ask which, or accept `all`.
2. For each chosen capsule: read `## Result`; if empty or status still `open`, say the branch is not closed and stop for that one.
3. Report (≤ 5 lines): conclusion · decisions · still open · changed files (if any) · "메인 복귀: <return-to>". Do not silently redo work the branch reported.
4. Set `status: merged`; in MAIN.md mark the row merged and append the capsule's `Later:` items to `## Later`.
5. Breadcrumb: `---` then `📍 지금: <main step> · 다음: <next action> (가지 <n>개, 나중에 볼 것 <n>개)`, omitting zero counts.

## Hallucination guardrails
- Never invent a Result. If the branch did not write one, say so.
- Report decisions exactly as recorded; do not upgrade "considered" into "decided".
- If a capsule's `project` differs from the current project, tell the user before merging.
- If changed files overlap with files edited in main since the branch opened, warn about a possible conflict.

## Done criteria
- [ ] Branch side: Result filled, `status: closed`, user told to merge in main.
- [ ] Main side: capsule `status: merged`, MAIN.md updated, summary ≤ 5 lines with return point and breadcrumb.
- [ ] No file outside `.threads/` modified.
