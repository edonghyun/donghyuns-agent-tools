import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { applyProposals, check, exitCode, validate } from '../lib/index.mjs';
import {
  CARD_W,
  DETOUR_GAP,
  layoutBoard,
  STAGE_GAP,
  SUB_GAP,
} from '../viewer/src/layout/board.mjs';
import { estimateCardHeight } from '../viewer/src/layout/card-size.mjs';
import { bottomOf } from '../viewer/src/layout/geometry.mjs';
import { hakwonLikeFlow } from './fixtures/board-fixture.mjs';

// Nodes as [id, stage, [targets], extra?]; the first node is the start. Action ids are the targets.
const flowOf = (nodes, primary) => ({
  id: 'f',
  title: 'f',
  start: nodes[0][0],
  stages: ['s0', 's1', 's2', 's3'],
  screens: nodes.map(([id, stage, to, extra = {}]) => ({
    id,
    title: id,
    stage,
    actions: to.map((t) => ({ id: t, label: t, to: t })),
    ...extra,
  })),
  ...(primary && {
    primary: 'p',
    scenarios: [{ id: 'p', title: 'p', steps: primary.slice(1).map((to) => ({ action: to })) }],
  }),
});

const center = (box) => box.y + box.h / 2;
const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Every node box and decision card, with a name for failure messages. */
const boxesOf = (board) => [
  ...[...board.nodes].map(([id, box]) => ({ id, ...box })),
  ...board.bands
    .flatMap((band) => band.cards || [])
    .map((card) => ({ id: `decisions@${card.stage}`, ...card })),
];

function assertNoOverlap(board) {
  const boxes = boxesOf(board);
  for (const [i, a] of boxes.entries()) {
    for (const b of boxes.slice(i + 1)) {
      assert.ok(!overlaps(a, b), `${a.id} overlaps ${b.id}`);
    }
  }
}

test('card height grows with title lines, body lines and chip rows, each capped', () => {
  assert.equal(estimateCardHeight({ title: '가'.repeat(13) }), 64 + 18);
  assert.equal(estimateCardHeight({ title: '가'.repeat(14) }), 64 + 18 * 2);
  assert.equal(estimateCardHeight({ title: '가'.repeat(60), body: '나'.repeat(60) }), 64 + 36 + 32);
  assert.equal(estimateCardHeight({ title: '가', body: '나'.repeat(13) }), 64 + 18 + 16);
  const chips = { title: '가', state: 'PAID', metrics: ['a', 'b'], notify: ['c'] };
  assert.equal(estimateCardHeight(chips), 64 + 18 + 22 * 2);
  assert.equal(estimateCardHeight(chips, 1), 64 + 18 + 22 * 3);
});

test('primary nodes sit centered on the spine', () => {
  const flow = flowOf(
    [
      ['a', 0, ['b']],
      ['b', 1, ['c'], { body: '본문이 두 줄을 넘도록 충분히 길게 적은 설명' }],
      ['c', 2, [], { metrics: ['m1', 'm2', 'm3'] }],
    ],
    ['a', 'b', 'c'],
  );
  const board = layoutBoard(flow);
  for (const id of ['a', 'b', 'c']) {
    assert.equal(center(board.nodes.get(id)), board.spineY, id);
  }
  assert.notEqual(board.nodes.get('a').h, board.nodes.get('c').h);
});

test('beside one primary node, the others stack above then below the spine', () => {
  const flow = flowOf(
    [
      ['a', 0, ['x', 'b', 'y']],
      ['x', 1, []],
      ['b', 1, []],
      ['y', 1, []],
    ],
    ['a', 'b'],
  );
  const { nodes, spineY } = layoutBoard(flow);
  const [x, b, y] = ['x', 'b', 'y'].map((id) => nodes.get(id));
  assert.equal(x.x, b.x);
  assert.equal(y.x, b.x);
  assert.equal(center(b), spineY);
  assert.ok(bottomOf(x) < b.y, 'x above b');
  assert.ok(y.y > bottomOf(b), 'y below b');
});

test('with a primary path, a column without a primary node leaves the spine row free', () => {
  // b, y and z are off the path a → c, so their column stacks above, below, then above again.
  const flow = flowOf(
    [
      ['a', 0, ['b', 'c']],
      ['b', 1, ['c']],
      ['y', 1, []],
      ['z', 1, []],
      ['c', 2, []],
    ],
    ['a', 'c'],
  );
  const { nodes, spineY } = layoutBoard(flow);
  const [b, y, z] = ['b', 'y', 'z'].map((id) => nodes.get(id));
  assert.ok(bottomOf(b) < spineY, 'b above the spine');
  assert.ok(y.y > spineY, 'y below the spine');
  assert.ok(bottomOf(z) < b.y, 'z above b');
});

test('a column with two primary nodes centers its stack on the spine, neither node on it', () => {
  // a → b → a → c → d: the primary path visits both b and c, which share a column.
  const flow = flowOf(
    [
      ['a', 0, ['b', 'c']],
      ['b', 1, ['a']],
      ['c', 1, ['d']],
      ['d', 2, []],
    ],
    ['a', 'b', 'a', 'c', 'd'],
  );
  const { nodes, spineY } = layoutBoard(flow);
  const [b, c] = [nodes.get('b'), nodes.get('c')];
  assert.equal(b.x, c.x);
  assert.notEqual(center(b), spineY);
  assert.notEqual(center(c), spineY);
  assert.equal((Math.min(b.y, c.y) + Math.max(bottomOf(b), bottomOf(c))) / 2, spineY);
});

test('without a primary path, the first node of each column sits on the spine', () => {
  const flow = flowOf([
    ['a', 0, ['x', 'b']],
    ['x', 1, []],
    ['b', 1, []],
  ]);
  const { nodes, spineY } = layoutBoard(flow);
  assert.equal(center(nodes.get('a')), spineY);
  assert.equal(center(nodes.get('x')), spineY);
  assert.ok(bottomOf(nodes.get('b')) < nodes.get('x').y, 'b stacks above x');
});

test('sequential nodes in one stage take adjacent sub-columns', () => {
  const flow = flowOf([
    ['a', 0, ['b']],
    ['b', 0, ['c']],
    ['c', 1, []],
  ]);
  const { nodes, columns } = layoutBoard(flow);
  const [a, b] = [nodes.get('a'), nodes.get('b')];
  assert.notEqual(a.column, b.column);
  assert.deepEqual(
    [columns[a.column].sub, columns[b.column].sub, columns[nodes.get('c').column].sub],
    [0, 1, 0],
  );
  assert.equal(b.x, a.x + CARD_W + SUB_GAP);
});

test('sub-columns count distinct ranks, so a stage starting at a high rank has no empty ones', () => {
  // d is rank 3 and e rank 4, yet they are the first two sub-columns of stage 1.
  const flow = flowOf([
    ['a', 0, ['b']],
    ['b', 0, ['c']],
    ['c', 0, ['d']],
    ['d', 1, ['e']],
    ['e', 1, []],
  ]);
  const { nodes, columns } = layoutBoard(flow);
  assert.deepEqual(
    ['d', 'e'].map((id) => columns[nodes.get(id).column]),
    [
      { stage: 1, sub: 0, x: nodes.get('d').x },
      { stage: 1, sub: 1, x: nodes.get('e').x },
    ],
  );
});

test('stages are STAGE_GAP apart, and each stage header spans its sub-columns', () => {
  const flow = flowOf([
    ['a', 0, ['b']],
    ['b', 0, ['c']],
    ['c', 1, []],
  ]);
  const { nodes, stageHeaders } = layoutBoard(flow);
  const [a, b, c] = ['a', 'b', 'c'].map((id) => nodes.get(id));
  assert.equal(c.x - (b.x + CARD_W), STAGE_GAP);
  assert.deepEqual(
    stageHeaders.slice(0, 2).map(({ label, x, w }) => ({ label, x, w })),
    [
      { label: 's0', x: a.x, w: 2 * CARD_W + SUB_GAP },
      { label: 's1', x: c.x, w: CARD_W },
    ],
  );
});

test('an exception sits in the band below every main card, under its source, whatever its stage', () => {
  const flow = flowOf(
    [
      ['a', 0, ['b']],
      ['b', 1, ['c', 'e1', 'e2']],
      ['c', 2, []],
      ['e1', 2, [], { exception: 'E01', end: true }],
      ['e2', 0, [], { exception: 'E02', end: true }],
    ],
    ['a', 'b', 'c'],
  );
  const { nodes } = layoutBoard(flow);
  const mainBottom = Math.max(...['a', 'b', 'c'].map((id) => bottomOf(nodes.get(id))));
  for (const id of ['e1', 'e2']) {
    assert.equal(nodes.get(id).band, 'exception', id);
    assert.ok(nodes.get(id).y > mainBottom, `${id} below the main cards`);
  }
  assert.equal(nodes.get('a').band, 'main');
  assert.equal(nodes.get('e1').x, nodes.get('b').x);
  assert.equal(nodes.get('e2').x, nodes.get('b').x + CARD_W + SUB_GAP);
});

test('an exception pushed right into the next stage pushes that stage’s exception further', () => {
  // e2 shifts right of e1 and lands just short of c's column, where e3 wants to hang.
  const flow = flowOf(
    [
      ['a', 0, ['b']],
      ['b', 1, ['c', 'e1', 'e2']],
      ['c', 2, ['e3']],
      ['e1', 1, [], { exception: 'E01', end: true }],
      ['e2', 1, [], { exception: 'E02', end: true }],
      ['e3', 2, [], { exception: 'E03', end: true }],
    ],
    ['a', 'b', 'c'],
  );
  const board = layoutBoard(flow);
  const [e2, e3] = [board.nodes.get('e2'), board.nodes.get('e3')];
  assertNoOverlap(board);
  assert.ok(e3.x >= e2.x + CARD_W + SUB_GAP, 'e3 keeps a sub-column gap right of e2');
});

test('an exception with several sources hangs under the one first on the primary path', () => {
  // c comes before b in `screens`, but b comes first on the primary path.
  const flow = flowOf(
    [
      ['a', 0, ['b']],
      ['c', 2, ['e']],
      ['b', 1, ['c', 'e']],
      ['e', 2, [], { exception: 'E01', end: true }],
    ],
    ['a', 'b', 'c'],
  );
  const { nodes } = layoutBoard(flow);
  assert.equal(nodes.get('e').x, nodes.get('b').x);
});

test('an exception with no source sits under the first sub-column of its own stage', () => {
  const flow = flowOf([
    ['a', 0, ['b']],
    ['b', 1, ['c']],
    ['c', 1, []],
    ['lost', 1, [], { exception: 'E01', end: true }],
  ]);
  const { nodes } = layoutBoard(flow);
  assert.equal(nodes.get('lost').x, nodes.get('b').x);
  assert.equal(nodes.get('lost').band, 'exception');
});

test('bands carry titles; the decision band gathers each stage’s decisions in one card', () => {
  const flow = flowOf([
    ['a', 0, ['b', 'e'], { decisions: ['예산은?'] }],
    ['b', 1, ['c'], { decisions: ['정원은?'] }],
    ['c', 1, [], { decisions: ['가격은?'] }],
    ['e', 0, [], { exception: 'E01', end: true, decisions: ['재안내 횟수는?'] }],
  ]);
  const { nodes, bands } = layoutBoard(flow);
  assert.deepEqual(
    bands.map((band) => [band.type, band.label]),
    [
      ['exception', '이탈했을 때 확인할 일'],
      ['decision', '미정 결정'],
    ],
  );
  const [exceptions, decisions] = bands;
  assert.ok(decisions.y >= exceptions.y + exceptions.h, 'decision band below exception band');
  assert.deepEqual(
    decisions.cards.map(({ stage, items, x }) => ({ stage, items, x })),
    [
      { stage: 0, items: ['예산은?', '재안내 횟수는?'], x: nodes.get('a').x },
      { stage: 1, items: ['정원은?', '가격은?'], x: nodes.get('b').x },
    ],
  );
  const e = nodes.get('e');
  assert.ok(exceptions.x <= e.x && e.x + e.w <= exceptions.x + exceptions.w);
  assert.ok(exceptions.y < e.y && bottomOf(e) <= exceptions.y + exceptions.h);
});

test('the hakwon-like fixture is valid, passes check, and lays out without overlaps', () => {
  const flow = hakwonLikeFlow();
  assert.deepEqual(validate(flow), []);
  assert.equal(exitCode(check(flow)), 0);
  const board = layoutBoard(flow);
  assert.equal(board.nodes.size, 20);
  assertNoOverlap(board);
  const { nodes, spineY } = board;
  for (const id of ['exam', 'landing', 'apply', 'notice', 'study', 'survey', 'paid']) {
    assert.equal(center(nodes.get(id)), spineY, id);
  }
  // subject, project and both share a column and are all on the primary path.
  assert.ok(['subject', 'project', 'both'].every((id) => center(nodes.get(id)) !== spineY));
  // skip is off the primary path, alone in its column, so it stays off the spine.
  assert.ok(bottomOf(nodes.get('skip')) < spineY, 'skip above the spine');
  assert.equal(nodes.get('stage-stop').x, nodes.get('unit-stop').x + CARD_W + SUB_GAP);
  assert.equal(nodes.get('hold').x, nodes.get('parent').x);
  assert.deepEqual(
    board.bands.find((band) => band.type === 'decision').cards.map((card) => card.stage),
    [0, 2, 4],
  );
  for (const box of boxesOf(board)) {
    assert.ok(box.x >= 0 && box.y >= 0, `${box.id} inside the board`);
    assert.ok(box.x + box.w <= board.size.w && bottomOf(box) <= board.size.h, `${box.id} fits`);
  }
});

test('0.2 flows with no primary path or exceptions lay out every screen without overlaps', () => {
  for (const name of ['class-booking', 'consulting-request']) {
    const url = new URL(`../../examples/${name}.flow.json`, import.meta.url);
    const flow = JSON.parse(readFileSync(url, 'utf8'));
    const board = layoutBoard(flow);
    assert.deepEqual(
      [...board.nodes.keys()],
      flow.screens.map((s) => s.id),
      name,
    );
    assertNoOverlap(board);
  }
});

test('a screen added by a proposal gets a box', () => {
  const flow = flowOf([
    ['a', 0, ['b']],
    ['b', 1, []],
  ]);
  flow.proposals = [
    {
      id: 'p1',
      title: 'p1',
      changes: [
        { addScreen: { id: 'n', title: 'n', stage: 2, actions: [] } },
        { screen: 'b', action: { id: 'next', label: 'next', to: 'n' } },
      ],
    },
  ];
  const { nodes } = layoutBoard(applyProposals(flow, ['p1']));
  assert.equal(nodes.get('n').band, 'main');
  assert.ok(nodes.get('n').x > nodes.get('b').x);
});

test('the main area keeps DETOUR_GAP free above it and above the first band', () => {
  const board = layoutBoard(hakwonLikeFlow());
  const mainBoxes = [...board.nodes.values()].filter((box) => box.band === 'main');
  const headerBottom = Math.max(...board.stageHeaders.map(bottomOf));
  assert.deepEqual(board.mainArea, {
    top: Math.min(...mainBoxes.map((box) => box.y)),
    bottom: Math.max(...mainBoxes.map(bottomOf)),
  });
  assert.ok(board.mainArea.top >= headerBottom + DETOUR_GAP, 'room above the main area');
  const exceptions = board.bands.find((band) => band.type === 'exception');
  assert.ok(exceptions.y >= board.mainArea.bottom + DETOUR_GAP, 'room below the main area');
});

test('without exceptions, the decision band keeps DETOUR_GAP below the main area', () => {
  const flow = flowOf([
    ['a', 0, ['b'], { decisions: ['예산은?'] }],
    ['b', 1, []],
  ]);
  const { mainArea, bands } = layoutBoard(flow);
  assert.deepEqual(
    bands.map((band) => band.type),
    ['decision'],
  );
  assert.ok(bands[0].y >= mainArea.bottom + DETOUR_GAP);
});

test('detour gaps can grow on either side of the main area', () => {
  const flow = hakwonLikeFlow();
  const board = layoutBoard(flow, { detourTop: 120, detourBottom: 90 });
  const headerBottom = Math.max(...board.stageHeaders.map(bottomOf));
  assert.equal(board.mainArea.top, headerBottom + 120);
  assert.equal(board.bands[0].y, board.mainArea.bottom + 90);
  assert.deepEqual(layoutBoard(flow, {}), layoutBoard(flow), 'both default to DETOUR_GAP');
});
