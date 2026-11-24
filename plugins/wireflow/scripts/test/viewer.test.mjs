import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nodeSize, nodeStyle, layoutFlow, edgePath, edgeStart } from '../viewer/geometry.mjs';
import { html, nodeBody } from '../viewer/render.mjs';
import { texts } from '../viewer/i18n.mjs';

const flow = (screens, extra = {}) => ({ id: 'f', title: 'F', start: screens[0].id, stages: ['a', 'b'], screens, ...extra });

test('screen size follows the node device, then the flow device, then mobile', () => {
  const f = flow([{ id: 'x', stage: 0, actions: [] }], { device: 'tablet' });
  assert.deepEqual(nodeSize({ id: 'x' }, f, 'wireframe'), [820, 1180]);
  assert.deepEqual(nodeSize({ id: 'x', device: 'desktop' }, f, 'wireframe'), [1280, 800]);
  assert.deepEqual(nodeSize({ id: 'x', device: { width: 1440, height: 900 } }, f, 'wireframe'), [1440, 900]);
  assert.deepEqual(nodeSize({ id: 'x' }, flow([{ id: 'x', stage: 0, actions: [] }]), 'wireframe'), [390, 844]);
});

test('flowchart view draws every kind as a box; wireframe keeps frames and cards', () => {
  assert.equal(nodeStyle({ kind: 'screen' }, 'flowchart'), 'box');
  assert.equal(nodeStyle({}, 'wireframe'), 'frame');
  assert.equal(nodeStyle({ kind: 'email' }, 'wireframe'), 'card');
  assert.equal(nodeStyle({ kind: 'decision' }, 'wireframe'), 'box');
});

test('stage-row layout places nodes left to right without overlap', () => {
  const f = flow([
    { id: 'a', stage: 0, actions: [] },
    { id: 'b', stage: 0, kind: 'message', actions: [] },
    { id: 'c', stage: 1, kind: 'step', actions: [] },
  ]);
  const { pos } = layoutFlow(f, 'wireframe');
  const a = pos.get('a'), b = pos.get('b'), c = pos.get('c');
  assert.ok(b.x >= a.x + a.w);
  assert.equal(a.y, b.y);
  assert.ok(c.y > a.y + a.h);
});

test('flowchart with actors lays out lanes (rows) by stage (columns)', () => {
  const f = flow([
    { id: 'ask', stage: 0, actor: '고객', kind: 'step', actions: [] },
    { id: 'assign', stage: 1, actor: '상담사', kind: 'step', actions: [] },
    { id: 'notify', stage: 1, actor: '고객', kind: 'message', actions: [] },
  ], { actors: ['고객', '상담사'] });
  const { pos, groups } = layoutFlow(f, 'flowchart', '미지정');
  assert.deepEqual(groups.filter((g) => g.type === 'lane').map((g) => g.label), ['고객', '상담사']);
  assert.deepEqual(groups.filter((g) => g.type === 'column').map((g) => g.label), ['a', 'b']);
  assert.equal(pos.get('assign').x, pos.get('notify').x, 'same stage → same column');
  assert.ok(pos.get('assign').y > pos.get('notify').y, 'second lane is below the first');
  assert.ok(pos.get('notify').x > pos.get('ask').x, 'later stage → further right');
});

test('edges enter targets from the facing side', () => {
  const src = { x: 0, y: 0, w: 100, h: 100 };
  const start = { x: 100, y: 50 };
  assert.match(edgePath(start, src, { x: 300, y: 0, w: 100, h: 100 }), / 300,50$/, 'right → left-middle');
  assert.match(edgePath(start, src, { x: 0, y: 400, w: 100, h: 100 }), / 50,400$/, 'below → top-center');
  assert.match(edgePath(start, src, { x: 0, y: -400, w: 100, h: 100 }), / 50,-300$/, 'above → bottom-center');
  assert.match(edgePath(start, src, src), /^M100,50 c/, 'self loop');
});

test('decision branches leave from the diamond edge, not the bounding box', () => {
  const box = { x: 0, y: 0, w: 200, h: 100 };
  assert.deepEqual(edgeStart(box, 0, 1, true), { x: 200, y: 50 }, 'single branch at the right tip');
  assert.ok(edgeStart(box, 0, 3, true).x < 200, 'upper branch sits inside the box');
});

test('html`` escapes interpolations, keeps nested html, drops false/null', () => {
  const name = '<script>';
  const out = String(html`<b>${name}</b>${html`<i>ok</i>`}${false}${null}${['<a>', html`<br>`]}`);
  assert.equal(out, '<b>&lt;script&gt;</b><i>ok</i>&lt;a&gt;<br>');
});

test('node bodies: boxes hide buttons on the canvas and show them in the walk-through', () => {
  const T = texts('ko');
  const node = { id: 'q', title: '결제했나?', kind: 'decision', actions: [{ id: 'y', label: '예', to: 'q' }] };
  const ctx = { flow: { title: 'F' }, findNode: () => node, vars: {}, live: false };
  assert.doesNotMatch(String(nodeBody(node, 'flowchart', ctx, T)), /data-action/);
  assert.match(String(nodeBody(node, 'flowchart', { ...ctx, live: true }, T)), /data-action="y"/);
  assert.match(String(nodeBody(node, 'flowchart', ctx, T)), /polygon/);
});
