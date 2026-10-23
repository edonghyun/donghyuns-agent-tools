# Contract tests in TypeScript (vitest / jest)

## Shape

- `src/domain/group-repository.contract.ts` — a function that registers the scenarios. Not named `*.test.ts`, so the runner never executes it alone.
- Each implementation's test file calls it with a factory.

```ts
// src/domain/group-repository.contract.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { Group, type GroupRepository } from '.'

export function describeGroupRepositoryContract(
  name: string,
  make: () => Promise<GroupRepository> | GroupRepository,
) {
  describe(`${name} satisfies the GroupRepository contract`, () => {
    let repository: GroupRepository
    beforeEach(async () => { repository = await make() })

    it('returns an added group with the same state', async () => {
      const group = Group.create({ name: 'Math A', institutionId: 'inst-1' })
      await repository.add(group)
      expect((await repository.findById(group.getId()))?.toMemento()).toEqual(group.toMemento())
    })

    it('does not reflect changes to a stored group until it is saved', async () => {
      const group = Group.create({ name: 'Before', institutionId: 'inst-1' })
      await repository.add(group)
      group.rename('After')
      expect((await repository.findById(group.getId()))?.toMemento().name).toBe('Before')
    })

    it('rejects adding a group whose id already exists', async () => {
      const group = Group.create({ name: 'Math A', institutionId: 'inst-1' })
      await repository.add(group)
      await expect(repository.add(group)).rejects.toThrow()
    })
  })
}
```

```ts
// src/infra/testing/in-memory-group-repository.test.ts
describeGroupRepositoryContract('InMemoryGroupRepository', () => new InMemoryGroupRepository())

// src/infra/postgres-group-repository.integration.test.ts
describeGroupRepositoryContract('PostgresGroupRepository', async () => {
  await truncateAll()
  return new PostgresGroupRepository(testPool)
})
```

## Typical fake fix

A `Map<string, Entity>` that stores the live object fails the isolation scenario. Store snapshots instead:

```ts
private rows = new Map<string, GroupMemento>()
async add(g: Group) {
  const key = g.getId().getValue()
  if (this.rows.has(key)) throw new Error(`Group ${key} already exists`)
  this.rows.set(key, structuredClone(g.toMemento()))
}
async findById(id: GroupId) {
  const row = this.rows.get(id.getValue())
  return row ? Group.fromMemento(structuredClone(row)) : null
}
```

`given…` setup helpers must write through the same snapshot path.

## Wiring check

A small test can list classes that `implements GroupRepository` (or a registry of implementations) and assert each has a `describeGroupRepositoryContract(` call. Keep it optional when the repository has few implementations; the required part is that every fake runs the suite.
