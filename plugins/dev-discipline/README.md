# dev-discipline

Evidence-driven development discipline for coding agents. The plugin controls implementation workflow so agents cannot call test-after development "TDD" or finish from an unverified assumption. Tests are co-located executable specifications: `A.ts` maps to `A.spec.ts` in the same directory.

## Just Say

- "TDD로 구현해줘. RED 실패부터 실제로 확인해."
- "이 버그를 회귀 테스트 먼저 작성해서 고쳐줘."
- "strict RED-GREEN-REFACTOR로 진행하고 실행 명령을 남겨줘."
- "테스트를 통과시키려고 assertion을 약하게 만들지 마."
- "테스트를 프로덕션 코드 옆에 명세처럼 읽히게 작성해줘."

## Skills

| Skill | Use |
|---|---|
| `/dev-discipline:tdd` | Enforce co-located executable specifications and one-behavior-at-a-time RED-GREEN-REFACTOR with executed evidence, regression tests, minimal implementation, and green-only refactoring. |

## Workflow

```text
behavior ledger
    ↓
RED test
    ↓ run and verify expected failure
minimum GREEN implementation
    ↓ run targeted and related tests
REFACTOR while green
    ↓
next behavior
```

## Evidence Contract

The skill reports, for every behavior:

- exact RED command and observed failure reason;
- minimum implementation made for GREEN;
- exact GREEN command and result;
- refactoring and post-refactor verification;
- any behavior for which RED could not honestly be observed.

It forbids weakening assertions, skipping tests, manufacturing RED by reverting user code, and batching many behaviors into one large implementation.

## Test Design Basis

The workflow turns guidance from these books into enforceable checks instead of generic advice:

- Roy Osherove and Vladimir Khorikov, *The Art of Unit Testing*;
- Vladimir Khorikov, *Unit Testing Principles, Practices, and Patterns*;
- Steve Freeman and Nat Pryce, *Growing Object-Oriented Software, Guided by Tests*;
- Gerard Meszaros, *xUnit Test Patterns*.

The resulting policy favors observable behavior, refactoring-resistant assertions, meaningful boundaries, deterministic fixtures, restrained test doubles, Four-Phase Tests, and helpers that reduce incidental noise without hiding the specification.

## Installation

```bash
claude plugin install dev-discipline@donghyuns-agent-tools
```

For Codex:

```bash
codex plugin add dev-discipline@donghyuns-agent-tools
```

## Development Checks

```bash
python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py plugins/dev-discipline/skills/tdd
python3 ~/.codex/skills/.system/plugin-creator/scripts/validate_plugin.py plugins/dev-discipline
```
