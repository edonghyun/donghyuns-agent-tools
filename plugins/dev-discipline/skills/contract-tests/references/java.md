# Contract tests in Java (JUnit 5, Gradle)

## Shape

- The contract is an `abstract` test class with one abstract factory method. It lives in the port module's Gradle `testFixtures` source set so adapter modules can depend on it (`testImplementation(testFixtures(project(":port-module")))`).
- Each implementation's test extends it. The abstract class never runs alone.

```java
// port-module/src/testFixtures/java/.../UnitStoreContract.java
public abstract class UnitStoreContract {
  protected UnitStore store;

  protected abstract UnitStore newStore();

  @BeforeEach
  void setUpContract() { store = newStore(); }

  @Test
  @DisplayName("getMany returns existing units in request order, once per occurrence")
  void getManyKeepsOrderAndDuplicates() {
    // given
    store.upsert(A, List.of(unit("u1", "d1"), unit("u3", "d2")));

    // when
    List<ContextUnit> got = store.getMany(A, List.of("u3", "missing", "u1", "u3"));

    // then
    assertThat(ids(got)).containsExactly("u3", "u1", "u3");
  }
}
```

```java
// memory-module/src/test/java/.../MemoryUnitStoreTest.java
class MemoryUnitStoreTest extends UnitStoreContract {
  @Override protected UnitStore newStore() { return new MemoryUnitStore(); }
}

// postgres-module/src/test/java/.../PostgresUnitStoreTest.java
@Tag("db")
class PostgresUnitStoreTest extends UnitStoreContract {
  @BeforeEach void clean() { PostgresSupport.truncateAll(); }
  @Override protected UnitStore newStore() { return new PostgresUnitStore(jdbc()); }
  // + adapter-only properties (row locking, transactions) as extra tests here
}
```

## Notes

- State in the contract's Javadoc what is deliberately **not** contract (for example "score values are not compared"). That is implementation freedom, not a gap.
- Co-location in Gradle projects means the same package under `src/test/java`, not a file next to the source.
- Wiring check: an ArchUnit rule can require that every class implementing the port has a test class assignable to the contract.
