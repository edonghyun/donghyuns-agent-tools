---
name: contract-tests
description: Use when a test's verdict depends on an in-memory, fake, or stub implementation of a repository, gateway, client, or other port; when adding or changing a port or adapter; when a fake has no tests of its own; or when two services, layers, or processes must agree on request/response behavior. Triggers include "fake", "in-memory repository", "test double", "port and adapter", "계약 테스트", "contract test", "픽스처 검증", "메모리 저장소".
---

# Contract Tests

## Overview

A fake that stands in for a real adapter is part of the test fixture. If the fake behaves differently from the real adapter, every test that relies on it verifies the wrong thing and stays green. **A fake earns trust only by passing the same contract suite as the real adapter.**

- **Interface** = shape (method names, types). The compiler checks it.
- **Contract** = meaning (what each request must return, persist, reject). Only a shared test suite checks it.

## The rule

If the outcome of the test you are writing depends on a fake, the fake's correctness is evidence for **your** behavior. Verifying it is in scope.

Before relying on a fake:

1. Find the contract suite for its port. If none exists, create it beside the port.
2. Run the suite against the fake. Run it against the real adapter wherever that adapter's tests run.
3. If a scenario fails on the fake, fix the fake. That is a RED for the fake's behavior, not unrelated cleanup.
4. Make your use-case test observe the persisted result through the port (reload, list, read back), never through the object you passed in.

If changing the fake makes other tests fail, those tests were passing on behavior production does not have. Report them as found defects. Do not keep the fake wrong to keep them green.

## What the contract covers

Every operation the port declares, each as one scenario. Add an operation to the port only when a caller needs it, and add its scenario in the same change.

- **Round trip:** what is stored is what is read back (compare snapshots/mementos, not object identity).
- **Isolation from the caller:** mutating an object after storing it, without saving, does not change what is stored.
- **Write semantics:** duplicate insert, upsert, delete, missing id — one agreed meaning, enforced on every implementation.
- **Queries:** filters return exactly the matching items; order only if order is part of the contract.

Leave out what the fake does not model (transactions, concurrency, isolation levels). Test those on the real adapter only, and do not trust fake-based tests for them.

## Placement and wiring

- The suite belongs to the **port**, not to an implementation. Each implementation's test file plugs its factory into the suite; scenarios exist once.
- Every class implementing the port must be plugged into the suite. Prefer an automated check (architecture rule or a small listing test) so a new fake cannot skip it.
- Language mechanics: see `references/java.md` (abstract contract class, Gradle `testFixtures`) and `references/typescript.md` (`describe…Contract(name, make)` function in `*.contract.ts`).

## Across processes

The same idea applies between services or a client and a server: the requester's needs define the contract, the requester tests against a stand-in that satisfies it, and the responder runs the contract against its real implementation. A shared schema or DTO module only guarantees shape; add behavioral contract scenarios for meaning.

## Common rationalizations

| Excuse | Reality |
|---|---|
| "The fake is shared test code outside this task." | Your test's verdict depends on it. An unverified fake makes your new test a false positive. |
| "Changing the fake would affect other tests." | Then those tests pass only because of the fake's defect. Surface them; do not hide them. |
| "The existing tests already use this fake, so it must be fine." | Existing usage is not evidence. A contract run is. |
| "I'll note the weakness in my summary." | A noted false positive is still a false positive. Fix the fake or state that the behavior is unverified. |
| "The adapter has integration tests." | Unless the fake runs the same scenarios, they prove nothing about the fake. |

## Red flags

- A use-case test reads back the same object instance it handed to the fake.
- A fake method has no scenario that would fail if it were wrong.
- The real adapter's tests and the fake's tests are different lists.
- A fake setup helper (`given…`) writes through a different path than the port method.
