# thread-keeper

Keep the main line of a long conversation intact. Branch any point into a small **capsule** file that another pane, session, or agent continues from; merge the result back with one word; see where you are at any time.

## Install

```
/plugin install thread-keeper --marketplace edonghyun/donghyuns-agent-tools
```

CLI: `claude plugin marketplace update donghyuns-agent-tools && claude plugin install thread-keeper@donghyuns-agent-tools`

## Just Say

| 명령 | 말로 해도 됨 | 하는 일 |
|---|---|---|
| `/thread-keeper:branch <주제>` | `가지: <주제>` | 그 지점의 맥락만 담은 캡슐을 만들고, 다른 창에 붙여 넣을 명령 한 줄을 준다 |
| `/thread-keeper:merge [주제\|all]` | `합쳐` | 가지 창: 결론을 캡슐에 기록 / 메인 창: 결론을 읽고 원래 위치로 복귀 |
| `/thread-keeper:where` | `어디야` | 메인 위치·가지·나중에 볼 것을 한눈에, `MAIN.md` 갱신 |
| `/thread-keeper:later <질문>` | `나중에 보자` | 지금 다루지 않을 질문을 "나중에 볼 것"에 한 줄 적재 |

## Flow

```text
[메인 창]  가지: toolchain vs JAVA_HOME
           → .threads/2026-10-21-toolchain.md 생성
           → claude "Read .threads/2026-10-21-toolchain.md and continue from its Start here section."
[가지 창]  (위 명령 실행) … 대화 … 합쳐
           → 캡슐에 Result 기록, status: closed
[메인 창]  합쳐
           → 5줄 요약 + 📍 메인 복귀
```

- 메인 창이 스크롤로 밀리지 않도록 가지를 열 때는 3줄 + 명령, 합칠 때는 5줄 이내만 출력한다. 자세한 내용은 캡슐 파일에 남는다.
- 캡슐은 평범한 마크다운이라 Claude 외에 Codex·ChatGPT 등 다른 AI에도 그대로 붙여 넣어 이어갈 수 있다.
- 내일 이어갈 때는 새 세션에서 `어디야` 또는 "`.threads/MAIN.md` 읽고 이어가자".

## 여러 창

- 메인 창만 `MAIN.md`를, 각 가지 창은 자기 캡슐의 `Result`만 쓴다 → 서로 덮어쓰지 않는다.
- 메인에서 `합쳐`하면 닫힌 가지 목록을 보여 주고, `합쳐 <주제>` 또는 `합쳐 전부`.
- 가지 안의 가지는 부모 가지로 복귀하고 부모가 합친다.
- 같은 코드 파일을 여러 창에서 동시에 고치면 충돌할 수 있다. 코드 수정 가지는 하나씩 또는 git worktree로.

## Skills

| Skill | Writes |
|---|---|
| `/thread-keeper:branch` | new capsule `.threads/<date>-<slug>.md`, branch row in `MAIN.md` |
| `/thread-keeper:merge` | branch side: its capsule's Result/status · main side: capsule status, `MAIN.md` |
| `/thread-keeper:where` | `MAIN.md` (main session only) |
| `/thread-keeper:later` | `MAIN.md` Later list, or the branch capsule |

자세한 개념은 [docs/CONCEPTS.md](docs/CONCEPTS.md), 실제 흐름은 [docs/WORKFLOW-GUIDE.md](docs/WORKFLOW-GUIDE.md).

## Output

```
<project>/.threads/
├── MAIN.md                      # 메인 위치·가지 목록·나중에 볼 것
└── 2026-10-21-toolchain.md      # 가지 캡슐 (open → closed → merged)
```

`.threads/`를 Git에 남길지는 프로젝트마다 정한다. 개인 작업 맥락이면 `.gitignore`에 추가한다.
