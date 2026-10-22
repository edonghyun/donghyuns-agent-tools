---
name: where
description: Shows where the conversation is — main position and next action, open or closed branches, and questions saved for later — and refreshes `.threads/MAIN.md` so another session can resume. Triggers include "/thread-keeper:where", "where are we", "what's next", "어디야", "지금 어디까지", "어디까지 했지". Writes only `.threads/MAIN.md` (main session) and never modifies other files. In a branch session it only reports and writes nothing.
---

# where — current position at a glance

## When to use
- The user asks where things stand, before switching windows, at the end of a day, or when starting a new session that should resume.
- Pre-condition: none. If `.threads/MAIN.md` does not exist, create it from the current conversation (main session only).

## Output contract
- Main session: refreshes `.threads/MAIN.md` (`updated`, `position`, `next`, branch statuses read from capsule headers, Later list).
- Branch session: writes nothing; reports the branch topic and its return-to.
- Chat reply: at most 4 lines + breadcrumb. Never modifies files outside `.threads/`.

## Pipeline
1. Read `.threads/MAIN.md` and the header lines (`status`, `return-to`) of each capsule.
2. Determine the current main step and next action from the conversation; if they differ from MAIN.md, prefer the conversation and update the file.
3. Reply:
   ```
   메인: <step> · 다음: <action>
   가지: <topic> (진행 중|기록 완료), …
   나중에 볼 것: <n>개 — <first 3 titles>
   ```
4. Breadcrumb: `---` then the 📍 line (main) or 🌿 line (branch).
5. If this is a new session resuming work, add one line: "MAIN.md 기준으로 이어갑니다: <next>".

## Hallucination guardrails
- Report statuses exactly as written in capsule headers.
- If MAIN.md and the conversation disagree and you cannot tell which is newer, show both and ask.

## Done criteria
- [ ] Summary printed (≤ 4 lines + breadcrumb).
- [ ] MAIN.md refreshed in the main session; nothing written in a branch session.
