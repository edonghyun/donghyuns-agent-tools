import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isBackEdge, rankNodes } from '../lib/index.mjs';

// Nodes as [id, stage, [targets], exception?]; the first node is the start.
const flowOf = (nodes, extra = {}) => ({
  start: nodes[0][0],
  stages: ['s0', 's1', 's2', 's3'],
  screens: nodes.map(([id, stage, to, exception]) => ({
    id,
    stage,
    ...(exception ? { exception } : {}),
    actions: to.map((t, i) => ({ id: `go${i}`, label: t, to: t })),
  })),
  ...extra,
});

const ranks = (flow) => Object.fromEntries(rankNodes(flow));

test('a linear chain ranks 0, 1, 2', () => {
  const flow = flowOf([
    ['a', 0, ['b']],
    ['b', 0, ['c']],
    ['c', 0, []],
  ]);
  assert.deepEqual(ranks(flow), { a: 0, b: 1, c: 2 });
});

test('a diamond puts the join after both branches', () => {
  const flow = flowOf([
    ['a', 0, ['b', 'c']],
    ['b', 1, ['d']],
    ['c', 1, ['d']],
    ['d', 2, []],
  ]);
  assert.deepEqual(ranks(flow), { a: 0, b: 1, c: 1, d: 2 });
});

test('the longest path wins over a shortcut', () => {
  const flow = flowOf([
    ['a', 0, ['c', 'b']],
    ['b', 0, ['c']],
    ['c', 0, []],
  ]);
  assert.deepEqual(ranks(flow), { a: 0, b: 1, c: 2 });
});

test('a cycle terminates and its closing edge is the back edge', () => {
  const flow = flowOf([
    ['a', 0, ['b']],
    ['b', 0, ['c']],
    ['c', 0, ['a', 'c']],
  ]);
  assert.deepEqual(ranks(flow), { a: 0, b: 1, c: 2 });
  assert.equal(isBackEdge(flow, 'c', 'a'), true);
  assert.equal(isBackEdge(flow, 'c', 'c'), true);
  assert.equal(isBackEdge(flow, 'a', 'b'), false);
  assert.equal(isBackEdge(flow, 'b', 'c'), false);
});

test('the DFS visits entries in order, so the edge closing the loop depends on them', () => {
  const nodes = [
    ['a', 0, ['b']],
    ['b', 0, ['a']],
  ];
  const fromA = flowOf(nodes);
  assert.equal(isBackEdge(fromA, 'b', 'a'), true);
  assert.equal(isBackEdge(fromA, 'a', 'b'), false);
  const fromB = flowOf(nodes, { start: 'b' });
  assert.equal(isBackEdge(fromB, 'a', 'b'), true);
  assert.equal(isBackEdge(fromB, 'b', 'a'), false);
  assert.deepEqual(ranks(fromB), { b: 0, a: 1 });
});

test('a node no entry reaches takes the lowest rank in its stage, or 0', () => {
  const flow = flowOf([
    ['a', 0, ['b']],
    ['b', 1, ['c']],
    ['c', 1, []],
    ['lost', 1, ['c']],
    ['far', 3, []],
  ]);
  assert.deepEqual(ranks(flow), { a: 0, b: 1, c: 2, lost: 1, far: 0 });
});

test('extra entries start their own paths at rank 0', () => {
  const flow = flowOf(
    [
      ['a', 0, ['b']],
      ['b', 0, []],
      ['side', 1, ['b']],
    ],
    { entries: ['side'] },
  );
  assert.deepEqual(ranks(flow), { a: 0, b: 1, side: 0 });
});

test('edges into exception nodes do not push their rank or their targets', () => {
  const flow = flowOf([
    ['a', 0, ['b']],
    ['b', 1, ['c']],
    ['c', 1, ['failed']],
    ['failed', 1, ['b', 'help'], 'E01'],
    ['help', 2, []],
  ]);
  assert.deepEqual(ranks(flow), { a: 0, b: 1, c: 2, failed: 1, help: 0 });
  assert.equal(isBackEdge(flow, 'failed', 'b'), true);
  assert.equal(isBackEdge(flow, 'c', 'failed'), false);
});

test('actions to missing screens are skipped', () => {
  const flow = flowOf([
    ['a', 0, ['ghost', 'b']],
    ['b', 0, []],
  ]);
  assert.deepEqual(ranks(flow), { a: 0, b: 1 });
  assert.equal(isBackEdge(flow, 'a', 'ghost'), false);
});
