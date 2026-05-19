# spec-mirror — Examples

Concrete output samples. Showing what each skill actually produces so you can decide if its output shape fits your project before running.

---

## Sample: `specs/layers/backend.md` (excerpt)

```markdown
# Backend layer

## Endpoints

### POST /api/auth/signup
Creates a new user account. Validates email + password, hashes password
with bcrypt, persists user, returns 201 with user id.
→ src/routes/auth.ts:42
**Used by:** flow:signup, flow:invite-accept

### POST /api/auth/login
Verifies email + password, issues a session token.
→ src/routes/auth.ts:78
**Used by:** flow:signup, flow:login

## Use cases / handlers

### signupUser(email, password)
Validates, hashes, persists. Throws `EmailAlreadyExists` if conflict.
→ src/services/auth.ts:12
**Used by:** backend:POST /api/auth/signup

<!-- KEEP -->
**Note (human):** the bcrypt cost factor is 12 by design; see refs/decisions/0003-bcrypt-cost.md.
<!-- /KEEP -->
```

---

## Sample: `specs/flows/01-signup.md`

```markdown
# Flow: signup

**Trigger:** user submits the signup form at `/signup`.
**Outcome:** user is logged in and lands on `/dashboard`.

## Steps

1. **Form submission**
   - Frontend: [SignupForm.tsx](../layers/frontend.md#signupform)
   - Backend:  [POST /api/auth/signup](../layers/backend.md#post-apiauthsignup)
   - Domain:   [User entity](../layers/domain.md#user)
   - Notes: email format validated client-side AND server-side.

2. **Auto-login on success**
   - Backend: [POST /api/auth/login](../layers/backend.md#post-apiauthlogin) is called server-side on signup success.
   - Frontend: redirect to `/dashboard`.

## Failure modes
- Duplicate email → backend returns 409, form shows inline error → `src/routes/auth.ts:54`
- Weak password (server reject) → 400 → `src/services/auth.ts:18`
```

---

## Sample: `specs/DRIFT.md` (compare output)

```markdown
# Spec Drift Report

- **Spec generated:** 2026-05-01T09:00:00Z
- **Compared at:**    2026-05-19T14:22:00Z
- **Verdict:** WARN

## Summary
| Layer | Added | Removed | Changed |
|-------|-------|---------|---------|
| backend | 1 | 0 | 1 |
| flows | 0 | 0 | 0 |

## 🟡 Warnings

- **backend:POST /api/auth/oauth** — added in code, not in spec
  - Code: `src/routes/auth.ts:120`
  - Impact: undocumented; flows that may want to reference it are not linked.

- **backend:POST /api/auth/signup** — handler return shape changed
  - Spec said: `→ src/routes/auth.ts:42` returning `{ userId }`
  - Code now: returns `{ userId, sessionToken }` at `src/routes/auth.ts:42`
  - Impact: flow:signup step 2 may now be redundant (token already issued at step 1).
```

---

## Sample: `specs/LINT.md`

```markdown
# Spec Lint Report

- **Linted at:** 2026-05-19T14:25:00Z
- **Files scanned:** 7
- **Verdict:** WARN

## Summary
| Issue | Count |
|---|---|
| Dead cross-references            | 0 |
| Missing source refs              | 2 |
| Stale [INFERENCE] markers        | 1 |
| Orphaned <!-- KEEP --> blocks    | 0 |
| Broken refs/ links               | 0 |
| Heading-anchor collisions        | 0 |

## 🟡 Warnings

- **specs/layers/domain.md#order-aggregate** — heading has no `→ source:line` and no `[INFERENCE]` marker.
- **specs/layers/backend.md#post-apipayments** — bare `[INFERENCE]` with no justification.
```

---

## Sample: `tests/spec-mirror/STUBS.md` (gen-tests output)

```markdown
# Spec-Mirror Test Stubs

Generated: 2026-05-19T14:30:00Z
Framework: vitest + playwright

## Stubs created (3)

| Target | Stub file | Status |
|---|---|---|
| `POST /api/auth/oauth` | `tests/spec-mirror/integration/auth-oauth.spec-stub.ts` | TODO |
| Flow: oauth-link | `tests/spec-mirror/e2e/05-oauth-link.spec-stub.ts` | TODO |
| `User.email uniqueness invariant` | `tests/spec-mirror/unit/user-email.spec-stub.ts` | TODO |

## Already covered (skipped) (12)

| Target | Existing test |
|---|---|
| `POST /api/auth/login` | `tests/auth.test.ts:45` |
| Flow: signup | `tests/e2e/signup.spec.ts:1` |
| … | … |
```

---

## Sample: `specs/COVERAGE.md`

```markdown
# Spec Coverage Report

- **Verdict:** PARTIAL

## Summary
| Layer | Elements | Covered | Coverage % |
|-------|---|---|---|
| backend | 18 | 14 | 78% |
| flows   | 6  | 5  | 83% |
| domain  | 9  | 4  | 44% |
| **Total** | **33** | **23** | **70%** |

## Uncovered (🔴)

### Domain invariants
- `User.email uniqueness` — no unit test
- `Order total >= 0` — no unit test
```

---

## Sample: `specs/scope/auth.md`

```markdown
# Scope: auth

- **Target:** [Auth service](../layers/backend.md#auth) (`src/services/auth.ts:1`)
- **Risk level:** HIGH

## Direct dependents
| Element | How | Source |
|---|---|---|
| Flow: signup | step 1 | `specs/flows/01-signup.md` |
| Flow: login  | step 1 | `specs/flows/02-login.md` |
| Flow: oauth-link | step 2 | `specs/flows/05-oauth-link.md` |

## Related refs/
- `refs/decisions/0003-use-bcrypt.md`
- `refs/lessons/0001-token-expiry-edge-case.md`
```
