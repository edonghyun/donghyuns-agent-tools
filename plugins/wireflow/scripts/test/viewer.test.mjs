import assert from 'node:assert/strict';
import { test } from 'node:test';
import { render as renderEdges } from '../viewer/src/components/edges.mjs';
import { render as renderNode } from '../viewer/src/components/frame-node.mjs';
import { html } from '../viewer/src/html.mjs';
import { texts } from '../viewer/src/i18n.mjs';
import { layoutWireframe, nodeSize, nodeStyle } from '../viewer/src/layout/wireframe.mjs';

const flow = (screens, extra = {}) => ({
  id: 'f',
  title: 'F',
  start: screens[0].id,
  stages: ['a', 'b'],
  screens,
  ...extra,
});

test('screen size follows the node device, then the flow device, then mobile', () => {
  const f = flow([{ id: 'x', stage: 0, actions: [] }], { device: 'tablet' });
  assert.deepEqual(nodeSize({ id: 'x' }, f), [820, 1180]);
  assert.deepEqual(nodeSize({ id: 'x', device: 'desktop' }, f), [1280, 800]);
  assert.deepEqual(nodeSize({ id: 'x', device: { width: 1440, height: 900 } }, f), [1440, 900]);
  assert.deepEqual(nodeSize({ id: 'x' }, flow([{ id: 'x', stage: 0, actions: [] }])), [390, 844]);
});

test('screens draw as device frames, touchpoints as cards, the rest as boxes', () => {
  assert.equal(nodeStyle({}), 'frame');
  assert.equal(nodeStyle({ kind: 'email' }), 'card');
  assert.equal(nodeStyle({ kind: 'decision' }), 'box');
});

test('the wireframe puts each stage on its own row, left to right without overlap', () => {
  const f = flow([
    { id: 'a', stage: 0, actions: [] },
    { id: 'b', stage: 0, kind: 'message', actions: [] },
    { id: 'c', stage: 1, kind: 'step', actions: [] },
  ]);
  const { nodes, stages, size } = layoutWireframe(f);
  const [a, b, c] = ['a', 'b', 'c'].map((id) => nodes.get(id));
  assert.ok(b.x >= a.x + a.w);
  assert.equal(a.y, b.y);
  assert.ok(c.y > a.y + a.h);
  assert.deepEqual(
    stages.map((s) => s.label),
    ['a', 'b'],
  );
  assert.ok(size.w >= b.x + b.w && size.h >= c.y + c.h);
});

/** The `d` of each edge path `renderEdges` draws between boxes, by target. */
function edgePaths(boxes, anchor) {
  const screens = Object.keys(boxes).map((id) => ({
    id,
    actions: id === 'src' ? Object.keys(boxes).map((to) => ({ id: `to-${to}`, to })) : [],
  }));
  const anchors = new Map(screens[0].actions.map((a) => [`src.${a.id}`, anchor]));
  const svg = renderEdges({
    flow: { screens },
    nodes: new Map(Object.entries(boxes)),
    anchors,
    path: null,
  });
  return [...svg.matchAll(/<path class="[^"]*" d="([^"]+)"/g)].map((m) => m[1]);
}

test('wireframe edges enter their target from the side facing the source', () => {
  const src = { x: 0, y: 0, w: 100, h: 100 };
  const [self, right, below, above] = edgePaths(
    {
      src,
      right: { x: 300, y: 0, w: 100, h: 100 },
      below: { x: 0, y: 400, w: 100, h: 100 },
      above: { x: 0, y: -400, w: 100, h: 100 },
    },
    { x: 100, y: 50 },
  );
  assert.match(self, /^M100,50 C/, 'self loop starts at the button');
  assert.match(right, / 300,50$/, 'right → left-middle');
  assert.match(below, / 50,400$/, 'below → top-center');
  assert.match(above, / 50,-300$/, 'above → bottom-center');
});

test('html`` escapes interpolations, keeps nested html, drops false/null', () => {
  const name = '<script>';
  const out = String(html`<b>${name}</b>${html`<i>ok</i>`}${false}${null}${['<a>', html`<br>`]}`);
  assert.equal(out, '<b>&lt;script&gt;</b><i>ok</i>&lt;a&gt;<br>');
});

test('box nodes hide their buttons on the canvas and show them in the walk-through', () => {
  const T = texts('ko');
  const node = {
    id: 'q',
    title: '결제했나?',
    kind: 'decision',
    actions: [{ id: 'y', label: '예', to: 'q' }],
  };
  const ctx = { flow: { title: 'F', screens: [node] }, vars: {}, live: false };
  assert.doesNotMatch(String(renderNode(node, ctx, T)), /data-action/);
  assert.match(String(renderNode(node, { ...ctx, live: true }, T)), /data-action="y"/);
  assert.match(String(renderNode(node, ctx, T)), /polygon/);
});

test('frame buttons mark missing links, guards, and scenario steps', () => {
  const T = texts('ko');
  const node = {
    id: 'pay',
    title: '결제',
    actions: [
      { id: 'go', label: '결제', to: 'pay', when: { ready: true } },
      { id: 'nowhere', label: '?', to: null },
    ],
  };
  const out = String(
    renderNode(
      node,
      {
        flow: { title: 'F', screens: [node] },
        vars: { ready: false },
        live: true,
        pathSteps: new Map([['pay.go', [2]]]),
      },
      T,
    ),
  );
  assert.match(out, /class="act primary guard-off on-path" data-action="go"/);
  assert.match(out, /<span class="step">2<\/span>/);
  assert.match(out, /class="act secondary missing" data-action="nowhere"/);
});
