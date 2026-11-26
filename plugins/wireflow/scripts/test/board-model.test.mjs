import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  actorList,
  check,
  eventLocations,
  exceptionSources,
  exitCode,
  primaryPath,
  resolveView,
  validate,
} from '../lib/index.mjs';

// home --pay--> pay --ok--> done, pay --fail--> failed (exception E01), lost (exception E02, orphan).
const base = () => ({
  id: 'pay',
  title: '결제',
  start: 'home',
  stages: ['선택', '결제', '결과'],
  actors: ['A', { name: 'B', color: '#123ABC' }],
  primary: 'happy',
  screens: [
    {
      id: 'home',
      title: '홈',
      stage: 0,
      actor: 'A',
      actions: [{ id: 'pay', label: '결제', to: 'pay' }],
    },
    {
      id: 'pay',
      title: '결제창',
      stage: 1,
      actor: 'B',
      actions: [
        { id: 'ok', label: '승인', to: 'done' },
        { id: 'fail', label: '실패', to: 'failed' },
      ],
    },
    { id: 'done', title: '완료', stage: 2, end: true, actions: [] },
    { id: 'failed', title: '결제 실패', stage: 2, exception: 'E01', end: true, actions: [] },
  ],
  scenarios: [
    {
      id: 'happy',
      title: '결제 성공',
      steps: [
        { action: 'pay', screen: 'pay' },
        { action: 'ok', screen: 'done' },
      ],
    },
  ],
});

const codes = (r) => r.findings.map((f) => f.code).sort();

test('resolveView reads the 0.2 "flowchart" as board and defaults to wireframe', () => {
  assert.equal(resolveView({ view: 'flowchart' }), 'board');
  assert.equal(resolveView({ view: 'board' }), 'board');
  assert.equal(resolveView({ view: 'wireframe' }), 'wireframe');
  assert.equal(resolveView({}), 'wireframe');
  const f = base();
  f.view = 'board';
  assert.deepEqual(validate(f), []);
});

test('actors accept strings and {name, color}; colors default from the palette in order', () => {
  assert.deepEqual(validate(base()), []);
  assert.deepEqual(actorList(base()), [
    { name: 'A', color: '#8563AA' },
    { name: 'B', color: '#123ABC' },
  ]);
  assert.deepEqual(
    actorList({ actors: ['x', 'y', 'z'] }).map((a) => a.color),
    ['#8563AA', '#B4791F', '#148A6E'],
  );
  assert.deepEqual(actorList({}), []);
});

test('validate rejects bad event types, duplicate ids and codes, and non-hex actor colors', () => {
  const f = base();
  f.actors[1].color = 'red';
  f.screens[2].exception = 'E01';
  f.events = [
    { id: 'seen', type: 'bogus', at: 'home' },
    { id: 'seen', type: 'normal', at: 'done' },
  ];
  const errs = validate(f).join('\n');
  assert.match(errs, /"bogus"/);
  assert.match(errs, /duplicate event id "seen"/);
  assert.match(errs, /duplicate exception code "E01"/);
  assert.match(errs, /"red"/);
});

test('a screen actor must name a listed actor, string or object', () => {
  const f = base();
  f.screens[0].actor = 'C';
  assert.match(validate(f).join('\n'), /actor "C"/);
});

test('a scenario must start at a screen, so the primary path never names a missing node', () => {
  const f = base();
  f.scenarios[0].start = 'zz';
  f.events = [{ id: 'seen', type: 'normal', at: 'home' }];
  assert.match(validate(f).join('\n'), /scenario "happy" starts at "zz"/);
  assert.deepEqual(check(f).errors.length > 0, true);
});

test('broken-event is critical for an unknown node and for an unknown action', () => {
  const f = base();
  f.events = [
    { id: 'a', type: 'normal', at: 'nope' },
    { id: 'b', type: 'drop', at: ['home', 'home.nope'] },
  ];
  const r = check(f);
  const broken = r.findings.filter((f) => f.code === 'broken-event');
  assert.deepEqual(
    broken.map((f) => [f.event, f.severity]),
    [
      ['a', 'critical'],
      ['b', 'critical'],
    ],
  );
  assert.match(broken[1].message, /"home\.nope"/);
  assert.equal(exitCode(r), 1);
});

test('unknown-primary is critical', () => {
  const f = base();
  f.primary = 'zzz';
  const r = check(f);
  assert.deepEqual(codes(r), ['unknown-primary']);
  assert.equal(r.findings[0].severity, 'critical');
  assert.match(r.findings[0].message, /"zzz"/);
});

test('orphan-exception warns when nothing leads into an exception node', () => {
  const f = base();
  f.screens.push({ id: 'lost', title: '분실', stage: 2, exception: 'E02', end: true, actions: [] });
  const r = check(f);
  const orphan = r.findings.filter((x) => x.code === 'orphan-exception');
  assert.deepEqual(
    orphan.map((x) => [x.screen, x.severity]),
    [['lost', 'warning']],
  );
  assert.match(orphan[0].message, /E02 분실/);
});

test('exceptionSources maps each exception node to the nodes that lead into it', () => {
  const f = base();
  f.screens[0].actions.push({ id: 'oops', label: '오류', to: 'failed' });
  f.screens.push({ id: 'lost', title: '분실', stage: 2, exception: 'E02', end: true, actions: [] });
  assert.deepEqual(
    [...exceptionSources(f)],
    [
      ['failed', ['home', 'pay']],
      ['lost', []],
    ],
  );
});

test('untracked-step is info, only appears with events, and counts the entry node as a step', () => {
  const f = base();
  assert.deepEqual(codes(check(f)), []);
  // Entry "home" and the step pay.ok -> done are untracked; home.pay is tracked via its landing node.
  f.events = [{ id: 'pay_view', type: 'normal', at: 'pay' }];
  let r = check(f);
  assert.deepEqual(
    r.findings.map((x) => [x.code, x.severity, x.screen, x.action]),
    [
      ['untracked-step', 'info', 'home', undefined],
      ['untracked-step', 'info', 'pay', 'ok'],
    ],
  );
  assert.match(r.findings[1].message, /"완료"/);
  assert.equal(exitCode(r), 0);
  // An event on the transition itself also tracks the step.
  f.events.push(
    { id: 'paid', type: 'normal', at: 'pay.ok' },
    { id: 'open', type: 'normal', at: 'home' },
  );
  r = check(f);
  assert.deepEqual(codes(r), []);
});

test('primaryPath lists every visited node and node.action step', () => {
  const p = primaryPath(base());
  assert.deepEqual(p.order, ['home', 'pay', 'done']);
  assert.deepEqual([...p.nodes].sort(), ['done', 'home', 'pay']);
  assert.deepEqual([...p.steps].sort(), ['home.pay', 'pay.ok']);
});

test('primaryPath keeps the steps reached before a failure and is empty without a primary', () => {
  const f = base();
  f.scenarios[0].steps[1].action = 'nope';
  const p = primaryPath(f);
  assert.deepEqual(p.order, ['home', 'pay']);
  assert.deepEqual([...p.steps], ['home.pay']);
  delete f.primary;
  const none = primaryPath(f);
  assert.deepEqual([none.nodes.size, none.steps.size, none.order], [0, 0, []]);
});

test('eventLocations normalizes a single location and a list', () => {
  assert.deepEqual(eventLocations({ at: 'home' }), ['home']);
  assert.deepEqual(eventLocations({ at: ['a', 'b.c'] }), ['a', 'b.c']);
});
