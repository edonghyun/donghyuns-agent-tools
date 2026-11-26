import assert from 'node:assert/strict';
import { test } from 'node:test';
import { layoutBoard, SUB_GAP } from '../viewer/src/layout/board.mjs';
import { layoutAndRoute } from '../viewer/src/layout/board-scene.mjs';
import { routeEdges, toPathD } from '../viewer/src/layout/routes.mjs';
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
    actions: to.map((t) => ({ id: t, label: `go ${t}`, to: t })),
    ...extra,
  })),
  ...(primary && {
    primary: 'p',
    scenarios: [{ id: 'p', title: 'p', steps: primary.slice(1).map((to) => ({ action: to })) }],
  }),
});

function routed(flow) {
  const board = layoutBoard(flow);
  const { edges } = routeEdges(flow, board);
  return { board, edges, edge: (id) => edges.find((e) => e.id === id) };
}

const segmentsOf = (points) => points.slice(1).map((p, i) => [points[i], p]);
const rightMiddle = (box) => [box.x + box.w, box.y + box.h / 2];
const leftMiddle = (box) => [box.x, box.y + box.h / 2];

/** True when the segment runs through the box's interior; running along or ending on its border doesn't count. */
function passesThrough([[x1, y1], [x2, y2]], box) {
  return (
    Math.min(x1, x2) < box.x + box.w &&
    Math.max(x1, x2) > box.x &&
    Math.min(y1, y2) < box.y + box.h &&
    Math.max(y1, y2) > box.y
  );
}

/** Every node box and decision card on the board. */
const cardsOf = (board) => [
  ...[...board.nodes].map(([id, box]) => ({ id, ...box })),
  ...board.bands.flatMap((band) => band.cards || []).map((card) => ({ id: 'decisions', ...card })),
];

function assertClearOfCards(edge, board) {
  for (const segment of segmentsOf(edge.points)) {
    for (const card of cardsOf(board)) {
      assert.ok(
        !passesThrough(segment, card),
        `${edge.id} passes through ${card.id}: ${JSON.stringify(segment)}`,
      );
    }
  }
}

function assertOrthogonal(edge) {
  for (const [[x1, y1], [x2, y2]] of segmentsOf(edge.points)) {
    assert.ok(x1 === x2 || y1 === y2, `${edge.id} has a diagonal segment`);
  }
}

test('a forward edge leaves the source on its right middle and enters the target on its left middle', () => {
  const { board, edge } = routed(
    flowOf([
      ['a', 0, ['b']],
      ['b', 1, []],
    ]),
  );
  const { points } = edge('a.b');
  assert.deepEqual(points[0], rightMiddle(board.nodes.get('a')));
  assert.deepEqual(points[points.length - 1], leftMiddle(board.nodes.get('b')));
});

test('forward edges sharing a channel turn 6px apart', () => {
  // b sits on the spine level with a; c stacks above it and d below.
  const { board, edge } = routed(
    flowOf([
      ['a', 0, ['c', 'd', 'b']],
      ['b', 1, []],
      ['c', 1, []],
      ['d', 1, []],
    ]),
  );
  const a = board.nodes.get('a');
  const b = board.nodes.get('b');
  const turnX = (id) => edge(id).points[1][0];
  for (const id of ['a.c', 'a.d']) {
    assert.ok(turnX(id) > a.x + a.w && turnX(id) < b.x, `${id} turns between the columns`);
  }
  assert.equal(Math.abs(turnX('a.c') - turnX('a.d')), 6);
});

test('a skip whose straight run would cross a card detours outside the main area', () => {
  const { board, edges, edge } = routed(
    flowOf(
      [
        ['a', 0, ['b', 'c']],
        ['b', 1, ['c']],
        ['c', 2, []],
      ],
      ['a', 'b', 'c'],
    ),
  );
  const { top, bottom } = board.mainArea;
  for (const [, y] of edge('a.c').points.slice(1, -1)) {
    assert.ok(y < top || y > bottom, `turns at y=${y}, inside ${top}..${bottom}`);
  }
  for (const e of edges) {
    assertOrthogonal(e);
    assertClearOfCards(e, board);
  }
});

test('an unobstructed skip stays inside the main area', () => {
  // d holds the spine of the last column, so c sits above b's row and a → c runs clear of b.
  const { board, edge } = routed(
    flowOf([
      ['a', 0, ['b', 'c']],
      ['b', 1, ['d', 'c']],
      ['d', 2, []],
      ['c', 2, []],
    ]),
  );
  const { points } = edge('a.c');
  const { top, bottom } = board.mainArea;
  assert.deepEqual(points[0], rightMiddle(board.nodes.get('a')));
  assert.deepEqual(points[points.length - 1], leftMiddle(board.nodes.get('c')));
  for (const [, y] of points) {
    assert.ok(y >= top && y <= bottom, `y=${y} leaves the main area ${top}..${bottom}`);
  }
  assertClearOfCards(edge('a.c'), board);
});

test('back edges, self-loops and same-column edges never pass through a card', () => {
  // x stacks above a, so a's top is blocked; c → a loops back along the spine.
  const { board, edges, edge } = routed(
    flowOf(
      [
        ['a', 0, ['b']],
        ['x', 0, ['b']],
        ['b', 1, ['c', 'b']],
        ['y', 1, ['b']],
        ['c', 2, ['a']],
      ],
      ['a', 'b', 'c'],
    ),
  );
  assert.equal(edge('c.a').kind, 'back');
  assert.equal(edge('b.b').kind, 'back');
  for (const e of edges) {
    assertOrthogonal(e);
    assertClearOfCards(e, board);
  }
});

test('an exception edge drops from the source bottom center to the exception top center', () => {
  const { board, edge } = routed(
    flowOf([
      ['a', 0, ['b']],
      ['b', 1, ['e']],
      ['e', 1, [], { exception: 'E01' }],
    ]),
  );
  const b = board.nodes.get('b');
  const e = board.nodes.get('e');
  const { points, kind } = edge('b.e');
  assert.equal(kind, 'exception');
  assert.deepEqual(points[0], [b.x + b.w / 2, b.y + b.h]);
  assert.deepEqual(points[points.length - 1], [e.x + e.w / 2, e.y]);
});

test('an exception edge from a card with another card below it goes via the right channel', () => {
  // c stacks above b, so b sits right under c.
  const { board, edge } = routed(
    flowOf([
      ['a', 0, ['b', 'c']],
      ['b', 1, []],
      ['c', 1, ['e']],
      ['e', 1, [], { exception: 'E01' }],
    ]),
  );
  const c = board.nodes.get('c');
  const e = board.nodes.get('e');
  const { points } = edge('c.e');
  assert.deepEqual(points[0], rightMiddle(c));
  assert.ok(points[1][0] > c.x + c.w && points[1][0] < c.x + c.w + SUB_GAP, 'turns in the channel');
  assert.deepEqual(points[points.length - 1], [e.x + e.w / 2, e.y]);
  assertClearOfCards(edge('c.e'), board);
});

test('an edge out of an exception starts on its top', () => {
  const { board, edge } = routed(
    flowOf([
      ['a', 0, ['b']],
      ['b', 1, ['e']],
      ['e', 1, ['b'], { exception: 'E01' }],
    ]),
  );
  const e = board.nodes.get('e');
  const { points, kind } = edge('e.b');
  assert.equal(kind, 'from-exception');
  assert.equal(points[0][1], e.y);
  assert.ok(points[0][0] > e.x && points[0][0] < e.x + e.w);
  for (const climb of segmentsOf(points)) {
    for (const drop of segmentsOf(edge('b.e').points)) {
      assert.ok(!sharesLine(climb, drop), 'the climb back retraces the drop');
    }
  }
});

/** True when two axis-aligned segments run along the same line for some length. */
function sharesLine([[ax1, ay1], [ax2, ay2]], [[bx1, by1], [bx2, by2]]) {
  const overlap = (a1, a2, b1, b2) =>
    Math.min(Math.max(a1, a2), Math.max(b1, b2)) > Math.max(Math.min(a1, a2), Math.min(b1, b2));
  const vertical = ax1 === ax2 && bx1 === bx2 && ax1 === bx1 && overlap(ay1, ay2, by1, by2);
  const horizontal = ay1 === ay2 && by1 === by2 && ay1 === by1 && overlap(ax1, ax2, bx1, bx2);
  return vertical || horizontal;
}

test('edges carry primary and dormant flags, and only decisions label theirs', () => {
  const { edges, edge } = routed(
    flowOf(
      [
        ['a', 0, ['b', 'z'], { kind: 'decision' }],
        ['b', 1, ['c']],
        ['z', 1, [], { dormant: true }],
        ['c', 2, []],
      ],
      ['a', 'b', 'c'],
    ),
  );
  assert.deepEqual(
    edges.map((e) => [e.id, e.kind, e.primary, e.dormant, e.label ?? null]),
    [
      ['a.b', 'forward', true, false, 'go b'],
      ['a.z', 'forward', false, true, 'go z'],
      ['b.c', 'forward', true, false, null],
    ],
  );
  assert.equal(edge('a.b').labelAt.length, 2);
  assert.equal(edge('b.c').labelAt, undefined);
});

test('no edge on the 20-node board passes through a card', () => {
  const flow = hakwonLikeFlow();
  const { board, edges } = routed(flow);
  const actions = flow.screens.flatMap((s) => s.actions.map((a) => `${s.id}.${a.id}`));
  assert.deepEqual(
    edges.flatMap((e) => e.ids),
    actions,
  );
  for (const e of edges) {
    assertOrthogonal(e);
    assertClearOfCards(e, board);
  }
});

test('toPathD draws points with M, H, V and L only', () => {
  assert.equal(
    toPathD([
      [0, 0],
      [10, 0],
      [10, 5.5],
      [20, 6],
    ]),
    'M0 0 H10 V5.5 L20 6',
  );
});

test('on the 20-node board the primary path through the payment stage runs inside the main area', () => {
  const { board, edge } = routed(hakwonLikeFlow());
  const { top, bottom } = board.mainArea;
  for (const id of ['parent.parent_yes', 'reserve.payment_settled']) {
    assert.ok(edge(id).primary, id);
    for (const [, y] of edge(id).points) {
      assert.ok(y >= top && y <= bottom, `${id} leaves the main area at y=${y}`);
    }
  }
});

test('a straight forward edge leaves the channel center to an edge that turns', () => {
  // b takes the spine level with a; c stacks above it.
  const { board, edge } = routed(
    flowOf([
      ['a', 0, ['b', 'c']],
      ['b', 1, []],
      ['c', 1, []],
    ]),
  );
  const a = board.nodes.get('a');
  const b = board.nodes.get('b');
  assert.equal(edge('a.b').points.length, 2);
  assert.equal(edge('a.c').points[1][0], (a.x + a.w + b.x) / 2);
});

test('edges into a blocked card in the first column stay inside the board margin', () => {
  // x and w stack above and below a, so edges into a come in at its left, from the margin.
  const chain = ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'];
  const flow = flowOf(
    [
      ['a', 0, ['n1']],
      ['x', 0, []],
      ['w', 0, []],
      ...chain.map((id, i) => [id, 1, [chain[i + 1], 'a'].filter(Boolean)]),
    ],
    ['a', ...chain],
  );
  const { board, edges } = routed(flow);
  const a = board.nodes.get('a');
  for (const e of edges) {
    assertClearOfCards(e, board);
    for (const [x] of e.points) {
      assert.ok(x >= 4, `${e.id} reaches x=${x}, outside the board margin`);
    }
  }
  assert.ok(
    edges.some((e) => e.points.some(([x]) => x < a.x)),
    'some edge uses the margin',
  );
});

test('when detours need more lanes, the board widens its gaps so no lane meets a card or header', () => {
  // Eight back edges into n0 over the top, and eight exception edges under the main area.
  const chain = ['n0', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'];
  const flow = flowOf(
    [
      ...chain.map((id, i) => [
        id,
        i % 3,
        [chain[i + 1], ...(i ? ['n0', 'e'] : [])].filter(Boolean),
      ]),
      ['e', 0, [], { exception: 'E01', decisions: ['재안내 기준은?'] }],
    ],
    chain,
  );
  const { layout, edges } = layoutAndRoute(flow);
  const headerBottom = Math.max(...layout.stageHeaders.map((h) => h.y + h.h));
  const bandTop = layout.bands[0].y;
  const { top, bottom } = layout.mainArea;
  assert.equal(edges.filter((e) => e.kind === 'back').length, 8);
  for (const e of edges) {
    assertClearOfCards(e, layout);
    for (const [[, y1], [, y2]] of segmentsOf(e.points).filter(([p, q]) => p[1] === q[1])) {
      assert.ok(y1 === y2 && y1 > headerBottom, `${e.id} runs at y=${y1}, in the stage headers`);
      if (y1 > bottom) {
        assert.ok(y1 < bandTop, `${e.id} runs at y=${y1}, inside the first band`);
      }
    }
  }
  assert.ok(top - headerBottom > 56 && bandTop - bottom > 56, 'both gaps grew');
});

test('parallel actions between the same two cards merge into one edge', () => {
  const flow = flowOf([
    ['a', 0, ['b'], { kind: 'decision' }],
    ['b', 1, []],
  ]);
  flow.screens[0].actions = [
    { id: 'yes', label: '예', to: 'b' },
    { id: 'no', label: '아니오', to: 'b' },
  ];
  flow.primary = 'p';
  flow.scenarios = [{ id: 'p', title: 'p', steps: [{ action: 'no' }] }];
  const { edges } = routed(flow);
  assert.deepEqual(
    edges.map(({ id, ids, label, primary, dormant }) => ({ id, ids, label, primary, dormant })),
    [{ id: 'a.yes', ids: ['a.yes', 'a.no'], label: '예 / 아니오', primary: true, dormant: false }],
  );
});

test('an action pointing to no screen is not routed', () => {
  const { edges } = routed(
    flowOf([
      ['a', 0, ['b', 'nowhere']],
      ['b', 1, []],
    ]),
  );
  assert.deepEqual(
    edges.map((e) => e.id),
    ['a.b'],
  );
});
