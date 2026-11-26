import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { texts } from '../viewer/src/i18n.mjs';
import { requestsMarkdown } from '../viewer/src/request-markdown.mjs';
import { createStore } from '../viewer/src/store.mjs';

const classBooking = JSON.parse(
  readFileSync(new URL('../../examples/class-booking.flow.json', import.meta.url), 'utf8'),
);
const META = { source: 'examples/class-booking.flow.json', output: 'cb.html' };

function memoryStorage() {
  const items = new Map();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
  };
}

const storeFor = (flow = classBooking, storage = memoryStorage()) =>
  createStore(flow, META, storage);

test('toggling a proposal applies it to the flow and rechecks', () => {
  const store = storeFor();
  const codes = () => store.getState().result.findings.map((f) => f.code);
  assert.ok(codes().includes('trapped'));

  store.dispatch({ type: 'toggleProposal', id: 'retry-to-detail' });
  assert.ok(!codes().includes('trapped'));
  assert.deepEqual(store.getState().applied, ['retry-to-detail']);
  const failed = store.getState().flow.screens.find((s) => s.id === 'failed');
  assert.ok(failed.actions.some((a) => a.id === 'retry'));

  store.dispatch({ type: 'toggleProposal', id: 'retry-to-detail' });
  assert.ok(codes().includes('trapped'));
  assert.equal(store.getState().flow, classBooking);
});

test('a conflicting proposal is refused with a notice', () => {
  const conflicting = {
    id: 'retry-to-home',
    title: 'retry goes home',
    changes: [{ screen: 'failed', action: { id: 'retry', label: '다시', to: 'home' } }],
  };
  const flow = { ...classBooking, proposals: [...classBooking.proposals, conflicting] };
  const store = storeFor(flow);
  store.dispatch({ type: 'toggleProposal', id: 'retry-to-detail' });
  store.dispatch({ type: 'toggleProposal', id: 'retry-to-home' });
  assert.deepEqual(store.getState().applied, ['retry-to-detail']);
  assert.equal(store.getState().notice.message, 'conflict');
});

test('change requests are kept under the flow id and viewer file', () => {
  const storage = memoryStorage();
  const store = storeFor(classBooking, storage);
  store.dispatch({ type: 'addRequest', screen: 'failed', action: 'retry', text: '다시 시도' });
  store.dispatch({ type: 'addRequest', screen: 'home', action: null, text: '배너' });
  assert.deepEqual(
    store.getState().requests.map((r) => [r.number, r.screen, r.action, r.text]),
    [
      ['03.02', 'failed', 'retry', '다시 시도'],
      ['01.01', 'home', null, '배너'],
    ],
  );
  assert.equal(JSON.parse(storage.getItem('wireflow:class-booking:cb.html')).length, 2);
  assert.equal(storeFor(classBooking, storage).getState().requests.length, 2, 'reopened');

  store.dispatch({ type: 'removeRequest', index: 0 });
  assert.deepEqual(
    store.getState().requests.map((r) => r.text),
    ['배너'],
  );
  store.dispatch({ type: 'clearRequests' });
  assert.deepEqual(JSON.parse(storage.getItem('wireflow:class-booking:cb.html')), []);
});

test('the view starts from the flow and setView switches it', () => {
  const store = storeFor();
  assert.equal(store.getState().view, 'wireframe');
  store.dispatch({ type: 'setTab', tab: 'review' });
  store.dispatch({ type: 'setView', view: 'board' });
  assert.equal(store.getState().view, 'board');
  assert.equal(store.getState().tab, 'canvas');
  assert.equal(storeFor({ ...classBooking, view: 'flowchart' }).getState().view, 'board');
});

test('the walk-through follows buttons, stops at guards, and keeps typed fields', () => {
  const store = storeFor();
  const play = () => store.getState().play;
  store.dispatch({ type: 'startPlay' });
  assert.equal(store.getState().mode, 'play');
  assert.equal(play().node, 'home');

  store.dispatch({ type: 'press', action: 'open-wheel' });
  store.dispatch({ type: 'press', action: 'pay', fields: { name: '도예가' } });
  assert.equal(play().node, 'detail', 'pay needs a slot first');
  assert.equal(store.getState().notice.message, 'guard');
  assert.equal(play().vars.name, '도예가');

  for (const action of ['pick-sat', 'pay', 'sim-ok']) store.dispatch({ type: 'press', action });
  assert.equal(play().node, 'done');
  assert.deepEqual(
    play().trail.map((t) => t.action ?? t.node),
    ['home', 'open-wheel', 'pick-sat', 'pay', 'sim-ok'],
  );

  store.dispatch({ type: 'stopPlay' });
  assert.equal(store.getState().mode, 'overview');
  assert.equal(store.getState().play, null);
});

test('the walk-through starts at the selected node with its preview values', () => {
  const store = storeFor();
  store.dispatch({ type: 'select', id: 'failed' });
  store.dispatch({ type: 'startPlay', from: 'failed' });
  assert.equal(store.getState().play.node, 'failed');
});

test('copied requests read as the markdown wireflow:revise parses', () => {
  const store = storeFor();
  store.dispatch({ type: 'toggleProposal', id: 'retry-to-detail' });
  store.dispatch({ type: 'addRequest', screen: 'failed', action: 'retry', text: '입력 유지' });
  store.dispatch({ type: 'addRequest', screen: 'home', action: '', text: '배너 추가' });
  assert.equal(
    requestsMarkdown(store.getState(), texts('ko')),
    [
      '## Wireflow 수정 요청 — 도자기 클래스 예약',
      '- flow: `class-booking` · 파일: `examples/class-booking.flow.json` · viewer: `cb.html`',
      '- 적용 중인 제안: `retry-to-detail`',
      '',
      '1. [03.02 `failed` › action `retry`] 입력 유지',
      '2. [01.01 `home`] 배너 추가',
    ].join('\n'),
  );
  const english = storeFor({ ...classBooking, locale: 'en' });
  const [heading, source, applied] = requestsMarkdown(english.getState(), texts('en')).split('\n');
  assert.equal(heading, '## Wireflow change requests — 도자기 클래스 예약');
  assert.match(source, /^- flow: `class-booking` · File: /);
  assert.equal(applied, '- Applied proposals: —');
});

test('overview leaves the walk-through and closes the selection', () => {
  const store = storeFor();
  store.dispatch({ type: 'select', id: 'detail' });
  store.dispatch({ type: 'startPlay', from: 'detail' });
  store.dispatch({ type: 'overview' });
  const { mode, play, selected } = store.getState();
  assert.deepEqual({ mode, play, selected }, { mode: 'overview', play: null, selected: null });
});

test('jumping to a stage closes the drawer and asks the camera for that stage, each time', () => {
  const store = storeFor();
  store.dispatch({ type: 'select', id: 'detail' });
  store.dispatch({ type: 'focusStage', stage: 1 });
  const first = store.getState().focus;
  assert.deepEqual(first, { stage: 1 });
  assert.equal(store.getState().selected, null);
  store.dispatch({ type: 'focusStage', stage: 1 });
  assert.notEqual(store.getState().focus, first, 'the same stage again is a new request');
});
