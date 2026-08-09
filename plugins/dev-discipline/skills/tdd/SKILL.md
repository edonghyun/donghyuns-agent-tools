---
name: tdd
description: Enforce strict test-driven development with co-located executable specifications, an executed RED-GREEN-REFACTOR loop, and auditable command evidence. Use for "TDD", "test-driven development", "RED-GREEN-REFACTOR", "테스트 주도 개발", "테스트 먼저", "테스트는 명세", feature implementation, behavior changes, bug fixes, and tested refactoring. Modify only task-scoped specifications and the minimum production files required by each failing behavior. Do not use for read-only review, research, or documentation-only work.
---

# Strict TDD

Control implementation order. Never claim TDD from tests written after production code or from commands that were not actually run.

## When to use

Use when implementing or changing executable behavior, especially when the user says:

- "TDD로 구현해줘", "테스트 먼저", "RED 확인하고 고쳐줘"
- "write the regression test first", "strict TDD", "red green refactor"
- "버그 재현 테스트부터", "리팩터링하면서 테스트 유지해줘"

Before starting:

- Inspect repository instructions, current worktree changes, test framework, and relevant tests.
- Identify the externally observable behavior, not the desired internal shape.
- Split the request into the smallest independently testable behavior increments.
- Determine the narrowest command that proves each increment.
- Locate each specification beside the production module that owns the behavior: `A.ts` maps to `A.spec.ts` in the same directory.

Co-location is the default contract:

```text
src/application/document-ingestor.ts
src/application/document-ingestor.spec.ts
```

- Do not create or extend a parallel `test/` or `tests/` tree for new unit or component specifications.
- Place a cross-module integration specification beside the primary public boundary or entry point it specifies.
- If no single production owner exists, use the closest shared boundary and report the placement rationale.
- Do not mass-migrate unrelated legacy tests. Move or rewrite only affected tests when doing so is scoped and safe.
- Generated compliance suites or true black-box end-to-end suites may be exceptions only when co-location is technically unsuitable; disclose the reason.

Do not use this skill for documentation-only edits, read-only diagnosis, research, or tasks where no executable behavior changes.

For pure behavior-preserving refactoring, establish a passing characterization baseline first. Do not invent a failing test when no behavior should change.

## Output contract

May modify only:

- co-located specifications that express the current task's requested behavior;
- the minimum production files needed to make the current failing test pass;
- existing fixtures or snapshots only when the requested behavior intentionally changes them;
- task reports only when the repository workflow or user explicitly requires one.

Never modify unrelated production code, unrelated tests, global test configuration, lint rules, generated artifacts, or snapshots merely to obtain GREEN.

Report the TDD evidence in the final response or required task report:

```text
RED
- behavior: concise observable behavior
- command: exact command run
- observed failure: concise failure reason
- why expected: why this proves missing or incorrect behavior

GREEN
- implementation: minimum change made
- command: exact command run
- result: pass

REFACTOR
- structural changes, or "none"
- verification command and result
```

Do not create a standalone evidence file unless the repository or user asks for one.

## Pipeline

### 1. Establish the behavior ledger

Write a short ordered checklist of behavior increments before production edits.

For each increment, record:

- observable input or trigger;
- expected output, state, or side effect;
- relevant boundary and test level;
- narrow test command.

Keep one increment in progress at a time. Do not write a large batch of tests for behavior that will be implemented all at once.

### 2. Pass the executable-specification quality gate

Treat a test as a reader-facing specification of behavior, not as a coverage device or a transcript of the implementation.

For every planned test, verify:

- **Behavioral contract:** the name states the trigger and observable outcome in domain language.
- **Single reason to fail:** multiple assertions are allowed only when they describe one coherent outcome.
- **Refactoring resistance:** assert stable public behavior, not private methods, call choreography, object shape accidents, or intermediate steps.
- **Regression protection:** exercise a meaningful business rule, failure mode, boundary, or collaboration.
- **Fast feedback:** use the lowest test level that can prove the behavior without sacrificing confidence.
- **Maintainability:** keep setup relevant, deterministic, and readable without navigating through opaque helpers.

Use the Four-Phase Test shape when it improves clarity:

```text
setup → exercise → verify → teardown
```

Apply these test-design rules:

- Test a unit of observable behavior or work, not one test per production method.
- Prefer state or returned-result assertions. Verify an interaction only when that interaction is itself an externally meaningful contract.
- Prefer real in-process collaborators and small in-memory fakes. Mock unmanaged boundaries such as network, filesystem, clock, randomness, process, or external service calls when control or observation is necessary.
- Outside-in tests may discover roles and interfaces, but do not mock every class or freeze incidental collaboration sequences.
- Never duplicate the production algorithm in the expected value or test setup.
- Avoid shared mutable fixtures, sleeps, ambient clock, nondeterministic randomness, and order-dependent tests.
- Use Test Data Builders, parameterized cases, custom assertions, or focused fixture factories only when they remove incidental noise.
- Give builders safe defaults and explicit overrides. A helper should describe a domain scenario, not hide the exercise or decisive assertion.
- Remove mechanical setup duplication when the shared abstraction makes the specification clearer. Keep small explicit repetition when extracting it would obscure the scenario.

This gate synthesizes the practical guidance of *The Art of Unit Testing*, *Unit Testing Principles, Practices, and Patterns*, *Growing Object-Oriented Software, Guided by Tests*, and *xUnit Test Patterns*. When their techniques pull in different directions, choose the option that preserves observable contracts, diagnostic failures, refactoring freedom, and reader comprehension.

### 3. RED — write one behavioral test

Write the smallest test that proves the next behavior.

Require the test to:

- describe externally observable behavior;
- use repository test conventions;
- be deterministic;
- fail without the intended production change;
- have a single coherent reason to fail.

Do not modify production code during RED.

A missing symbol, import, route, or public API may be a valid RED when that absence is precisely the next required behavior. Syntax errors, broken fixtures, invalid test setup, missing dependencies, and unrelated environment failures are not valid RED.

### 4. VERIFY RED — execute and inspect the failure

Run the narrowest command that executes the new test.

Do not continue until all are true:

- the new test ran;
- it failed;
- the failure came from missing or incorrect requested behavior;
- the failure was not caused by a malformed test or broken environment.

Capture the exact command and concise failure reason.

If the test passes unexpectedly:

1. Check whether the behavior already exists.
2. Check whether the test exercises the intended path.
3. Tighten or correct the test without touching production code.
4. Run it again.

Never manufacture RED by deleting, reverting, or corrupting pre-existing user code. If the behavior already exists, state that RED could not be observed and do not claim strict TDD evidence for that behavior.

### 5. GREEN — make the minimum production change

Implement only what the current failing test requires.

Do not:

- implement future behavior not yet under test;
- add speculative abstractions, flags, or extension points;
- refactor unrelated code;
- solve several ledger items at once;
- weaken, delete, skip, or replace the test to make it pass;
- update broad snapshots without inspecting and justifying every changed expectation.

If the test itself is invalid, correct it, restore a meaningful RED, and only then resume GREEN.

### 6. VERIFY GREEN — execute targeted and surrounding tests

Run in this order:

1. the new or changed test;
2. the nearest relevant test file or package suite;
3. any directly affected integration test.

Confirm the new test passes and existing related behavior has not regressed.

When an existing test fails, fix the implementation unless the requested behavior intentionally changes that expectation. Never relax an assertion solely to make the suite green.

### 7. REFACTOR — improve structure only while green

Refactor production code or test code only after GREEN is verified.

The refactoring entry gate is strict:

1. Finish the current behavioral implementation.
2. Run the narrow targeted specification.
3. Confirm it is GREEN.
4. Only then rename, move, extract, deduplicate, or reorganize production and test code.

Test code follows the same color discipline as production code. During RED or GREEN, do not:

- extract test helpers, builders, fixtures, custom assertions, or shared contract suites;
- rename or move specifications;
- deduplicate setup across tests;
- rewrite an older test for readability while implementing the current behavior;
- mix test-structure cleanup into the minimum production change.

If a test-structure problem becomes visible during RED or GREEN, record it and first restore GREEN.
Perform the cleanup as a separate REFACTOR step. A refactoring commit or diff must remain behavior
preserving and must not introduce the next behavioral requirement.

Allowed refactoring:

- remove duplication;
- improve names;
- simplify control flow;
- improve ownership and boundaries;
- extract reusable logic proven by current duplication or caller needs.

Refactor the test suite with the same care as production code:

- keep the behavior and expected outcome visible in the test;
- extract only stable vocabulary or genuinely repeated setup;
- replace mystery literals with domain-relevant names where meaning matters;
- keep failure messages local and diagnostic;
- reject helpers that require the reader to mentally execute another mini-program.

Do not introduce new observable behavior during REFACTOR. After every meaningful production or
test refactor, rerun the narrow specification first and then the nearest affected suite. If behavior
must change, finish the refactor GREEN and start a new RED cycle.

### 8. Repeat one behavior at a time

Complete the current RED-GREEN-REFACTOR loop before starting the next ledger item.

Prefer:

```text
test A → verify RED → implementation A → verify GREEN
test B → verify RED → implementation B → verify GREEN
```

Do not use:

```text
many tests → one large implementation → one test run
```

### 9. Apply the bug-fix rule

For every bug fix:

1. Reproduce the bug with a regression test.
2. Run it and verify the expected RED.
3. Make the smallest fix.
4. Verify the regression test is GREEN.
5. Run related tests.

Do not call a bug fixed without a regression test unless testing is technically impossible. If it is impossible, explain the exact constraint and obtain explicit user acceptance before changing production code.

### 10. Apply the existing-code and refactoring rule

When changing existing behavior:

1. Locate existing tests and current contract evidence.
2. Add or modify the test for the desired behavior.
3. Verify RED for the behavioral difference.
4. Change production code.
5. Verify related tests.

For pure refactoring:

1. Identify the behavior that must remain stable.
2. Add characterization coverage if needed.
3. Verify the characterization suite is GREEN before refactoring.
4. Refactor in small steps and remain GREEN throughout.

Passing characterization tests are valid for refactoring; do not falsely report them as RED evidence.

### 11. Complete with an evidence audit

Before declaring completion:

- run all task-relevant tests;
- run the repository's required broader test command when practical;
- inspect the final diff for untested behavior and unrelated changes;
- map every requested behavior to a test;
- confirm each new specification is co-located with its production owner or has a disclosed exception;
- reread each specification as documentation without consulting production internals;
- report RED and GREEN commands honestly.

TDD controls development order. Do not claim lint, typecheck, build, deployment, or runtime QA unless those checks were separately executed.

## Hallucination guardrails

- Never say a test failed or passed without running it in the current worktree.
- Never present a compile error, fixture error, or environment failure as behavioral RED.
- Never claim test-first evidence when production code was written first.
- Never fabricate the failure output that would have occurred before an existing implementation.
- Never delete, skip, loosen, or broadly rewrite assertions to obtain GREEN.
- Never overwrite user changes to recreate RED.
- Never treat coverage percentage alone as evidence of behavioral correctness.
- Never mock the unit's internals merely to reproduce its implementation; mock system boundaries when needed.
- Never assert private methods, incidental call order, or implementation-only collaboration unless that interaction is the requested contract.
- Never introduce an abstraction solely to remove a few repeated lines when it hides the scenario or expected result.
- Never refactor, relocate, deduplicate, or extract test code while the current behavior is RED.
- Never combine the minimum GREEN implementation with unrelated production or test cleanup.
- Never place a new unit specification in a distant test tree merely because the repository has legacy examples there.
- Never expand scope because an unrelated issue was discovered. Record it separately unless it blocks the active cycle.
- Never hide a TDD exception. State which behavior lacks observed RED and why.

## Done criteria

- Every requested executable behavior maps to a test.
- Every new unit or component specification is co-located with its production owner; every exception is justified.
- Every new behavior or bug fix has observed, meaningful RED evidence.
- Every RED includes the exact command and expected failure reason.
- Every GREEN includes the exact command and passing result.
- Production changes are directly connected to the current failing test.
- No test was weakened, skipped, or removed merely to pass.
- Refactoring occurred only while relevant tests were green.
- Test refactoring occurred only after an explicitly executed GREEN and was reverified afterward.
- Relevant existing tests pass.
- Specifications describe observable outcomes and can be read without reconstructing production internals.
- Tests contain no mirrored production algorithm, excessive internal mocking, shared mutable fixture, hidden decisive assertion, or unnecessary duplication abstraction.
- The final diff contains no unrelated or speculative implementation.
- Any impossible-to-test behavior or pre-existing implementation is disclosed without fabricated TDD claims.
