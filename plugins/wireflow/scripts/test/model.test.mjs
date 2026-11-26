import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyProposals, check, runScenario, validate } from '../lib/index.mjs';

const base = () => ({
  id: 'booking',
  title: '예약',
  goal: '시간을 골라 예약한다',
  start: 'home',
  stages: ['선택', '결과'],
  vars: { booked: 0 },
  screens: [
    {
      id: 'home',
      title: '홈',
      stage: 0,
      actions: [{ id: 'book', label: '예약', to: 'done', inc: { booked: 1 } }],
    },
    { id: 'done', title: '완료', stage: 1, end: true, actions: [] },
  ],
  scenarios: [
    {
      id: 'happy',
      title: '예약 성공',
      steps: [{ action: 'book', screen: 'done', vars: { booked: 1 } }],
    },
  ],
});

const codes = (r) => r.findings.map((f) => f.code).sort();

test('valid flow has no structural errors and no findings', () => {
  assert.deepEqual(validate(base()), []);
  const r = check(base());
  assert.deepEqual(r.findings, []);
});

test('structural errors: duplicate ids, unknown start, bad stage, missing actions array', () => {
  const f = base();
  f.start = 'nope';
  f.screens.push({ id: 'home', title: 'dup', stage: 0, actions: [] });
  f.screens.push({ id: 'x', title: 'x', stage: 9, actions: [] });
  f.screens.push({ id: 'y', title: 'y', stage: 0 });
  const errs = validate(f).join('\n');
  assert.match(errs, /start/);
  assert.match(errs, /duplicate screen id "home"/);
  assert.match(errs, /stage 9/);
  assert.match(errs, /"y".*actions/);
});

test('null target is a missing-link warning; unknown target is a broken-link critical', () => {
  const f = base();
  f.screens[0].actions.push({ id: 'help', label: '도움말', to: null });
  f.screens[0].actions.push({ id: 'faq', label: 'FAQ', to: 'ghost' });
  const r = check(f);
  const byCode = Object.fromEntries(r.findings.map((x) => [x.code, x]));
  assert.equal(byCode['missing-link'].severity, 'warning');
  assert.equal(byCode['missing-link'].action, 'help');
  assert.equal(byCode['broken-link'].severity, 'critical');
});

test('unreachable screen and trapped screen are reported', () => {
  const f = base();
  f.screens[0].actions.push({ id: 'err', label: '오류', to: 'fail' });
  f.screens.push({ id: 'fail', title: '실패', stage: 1, actions: [] }); // no way out, not end
  f.screens.push({
    id: 'orphan',
    title: '고아',
    stage: 1,
    actions: [{ id: 'h', label: '홈', to: 'home' }],
  });
  const r = check(f);
  assert.deepEqual(codes(r), ['trapped', 'unreachable']);
  assert.equal(r.findings.find((x) => x.code === 'trapped').screen, 'fail');
  assert.equal(r.findings.find((x) => x.code === 'unreachable').screen, 'orphan');
});

test('a screen that can return to start is not trapped', () => {
  const f = base();
  f.screens[0].actions.push({ id: 'err', label: '오류', to: 'fail' });
  f.screens.push({
    id: 'fail',
    title: '실패',
    stage: 1,
    actions: [{ id: 'back', label: '돌아가기', to: 'home' }],
  });
  assert.deepEqual(check(f).findings, []);
});

test('runScenario applies set/inc, honors when guards, asserts screen and vars', () => {
  const f = base();
  f.screens[0].actions = [
    { id: 'pick', label: '14:30', to: 'home', set: { slot: '14:30' } },
    { id: 'book', label: '예약', to: 'done', when: { slot: '14:30' }, inc: { booked: 1 } },
  ];
  f.vars.slot = '';
  const ok = runScenario(f, {
    id: 's',
    steps: [{ action: 'pick' }, { action: 'book', screen: 'done', vars: { booked: 1 } }],
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.screen, 'done');
  const guarded = runScenario(f, { id: 's', steps: [{ action: 'book' }] });
  assert.equal(guarded.ok, false);
  assert.equal(guarded.failedStep, 0);
  assert.equal(guarded.code, 'guard');
});

test('scenario failures become critical findings', () => {
  const f = base();
  f.scenarios[0].steps[0].vars = { booked: 2 };
  const r = check(f);
  assert.deepEqual(codes(r), ['scenario-failed']);
  assert.equal(r.findings[0].scenario, 'happy');
  assert.equal(r.scenarios[0].ok, false);
});

test('proposal fixes a missing retry and the same scenario passes with it', () => {
  const f = base();
  f.screens[0].actions.push({ id: 'pay', label: '결제', to: 'fail' });
  f.screens.push({
    id: 'fail',
    title: '결제 실패',
    stage: 1,
    actions: [{ id: 'retry', label: '다시 시도', to: null }],
  });
  f.scenarios.push({
    id: 'recover',
    title: '실패 후 재시도',
    steps: [
      { action: 'pay', screen: 'fail' },
      { action: 'retry', screen: 'home' },
      { action: 'book', screen: 'done' },
    ],
  });
  f.proposals = [
    {
      id: 'retry-home',
      title: '재시도는 홈으로',
      changes: [{ screen: 'fail', action: { id: 'retry', label: '다시 시도', to: 'home' } }],
    },
  ];
  const before = check(f);
  assert.ok(codes(before).includes('scenario-failed'));
  const after = check(f, { with: ['retry-home'] });
  assert.deepEqual(after.findings, []);
  assert.deepEqual(after.applied, ['retry-home']);
  // original untouched
  assert.equal(f.screens[2].actions[0].to, null);
});

test('proposal can add a screen and conflicting proposals throw', () => {
  const f = base();
  f.proposals = [
    {
      id: 'a',
      title: 'A',
      changes: [
        {
          addScreen: {
            id: 'help',
            title: '도움말',
            stage: 0,
            actions: [{ id: 'h', label: '홈', to: 'home' }],
          },
        },
        { screen: 'home', action: { id: 'help', label: '도움말', to: 'help' } },
      ],
    },
    {
      id: 'b',
      title: 'B',
      changes: [{ screen: 'home', action: { id: 'help', label: '도움말', to: 'done' } }],
    },
  ];
  const patched = applyProposals(f, ['a']);
  assert.ok(patched.screens.some((s) => s.id === 'help'));
  assert.throws(() => applyProposals(f, ['a', 'b']), /conflict/);
  assert.throws(() => applyProposals(f, ['zzz']), /unknown proposal/);
});

test('requirements not linked from any passing scenario are uncovered (info)', () => {
  const f = base();
  f.requirements = [
    { id: 'r1', title: '예약 가능', expected: '완료 화면', origin: 'source', screen: 'done' },
    { id: 'r2', title: '취소 가능', expected: '취소됨', origin: 'source', screen: 'home' },
  ];
  f.scenarios[0].requirements = ['r1'];
  const r = check(f);
  assert.deepEqual(codes(r), ['uncovered-requirement']);
  assert.equal(r.findings[0].requirement, 'r2');
  assert.equal(r.findings[0].severity, 'info');
  assert.equal(r.requirements.find((q) => q.id === 'r1').status, 'passed');
});

test('messages follow flow.locale (ko default, en opt-in)', () => {
  const f = base();
  f.screens[0].actions.push({ id: 'help', label: '도움말', to: null });
  assert.match(check(f).findings[0].message, /연결되지 않음/);
  f.locale = 'en';
  assert.match(check(f).findings[0].message, /no destination/);
});

test('node kinds, devices, and actors are validated', () => {
  const f = base();
  f.actors = ['고객', '상담사'];
  f.screens[0].kind = 'step';
  f.screens[0].actor = '고객';
  f.screens[1].device = 'desktop';
  assert.deepEqual(validate(f), []);
  f.device = { width: 1440, height: 900 };
  assert.deepEqual(validate(f), []);
  f.screens[0].kind = 'hologram';
  f.screens[0].actor = '외계인';
  f.screens[1].device = { width: 0, height: 900 };
  f.view = 'gallery';
  const errs = validate(f).join('\n');
  assert.match(errs, /kind "hologram"/);
  assert.match(errs, /actor "외계인"/);
  assert.match(errs, /device/);
  assert.match(errs, /view "gallery"/);
});

test('decision node with fewer than two branches is a warning', () => {
  const f = base();
  f.screens[0].kind = 'decision';
  const r = check(f);
  assert.deepEqual(codes(r), ['decision-branches']);
  assert.equal(r.findings[0].severity, 'warning');
  f.screens[0].actions.push({ id: 'no', label: '아니오', to: 'done' });
  assert.deepEqual(check(f).findings, []);
});
