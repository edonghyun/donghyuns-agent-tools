import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ACTOR_PALETTE } from '../lib/index.mjs';
import { renderBoardCard } from '../viewer/src/components/board-card.mjs';
import { render as renderBoard } from '../viewer/src/components/board-view.mjs';
import { renderChips } from '../viewer/src/components/chips.mjs';
import { renderLegend } from '../viewer/src/components/legend.mjs';
import { renderLogPage } from '../viewer/src/components/log-page.mjs';
import { texts } from '../viewer/src/i18n.mjs';
import { layoutAndRoute } from '../viewer/src/layout/board-scene.mjs';

const T = texts('ko');

// Nodes as [id, stage, [targets], extra?]; the first node is the start. Action ids are the targets.
const flowOf = (nodes, extra = {}) => ({
  id: 'f',
  title: 'f',
  view: 'board',
  start: nodes[0][0],
  stages: ['광고', '신청', '결제'],
  screens: nodes.map(([id, stage, to, more = {}]) => ({
    id,
    title: id,
    stage,
    actions: to.map((t) => ({ id: t, label: `${t} 누르기`, to: t })),
    ...more,
  })),
  ...extra,
});

/** The board as the canvas draws it, with nothing selected and no scenario. */
const boardHtml = (flow) =>
  String(renderBoard(layoutAndRoute(flow), { flow, scenario: '', selected: null }, T));

/** The markup of the card for `id` on a rendered board. */
function cardOf(board, id) {
  const card = board.match(new RegExp(`<article[^>]*data-id="${id}"[\\s\\S]*?</article>`));
  assert.ok(card, `no card for ${id}`);
  return card[0];
}

const classesOf = (markup) => markup.match(/class="([^"]*)"/)[1].split(/\s+/);
const chipTexts = (markup) =>
  [...markup.matchAll(/class="chip [^"]*"[^>]*>([^<]*)</g)].map((m) => m[1]);

test('a card escapes the title and chips it shows', () => {
  const node = { id: 'x', stage: 0, title: 'a "b"', metrics: ['<x>'], actions: [] };
  const card = String(renderBoardCard(node, { flow: flowOf([['x', 0, []]]) }, T));
  assert.ok(card.includes('a &quot;b&quot;'), card);
  assert.ok(card.includes('&lt;x&gt;'), card);
  assert.ok(!card.includes('<x>'));
});

test('chips come in the order state, metrics, experiments, notifications, exception codes', () => {
  const node = {
    notify: ['알림톡'],
    experiments: ['가격'],
    metrics: ['전환율', '이탈률'],
    state: 'PAID',
  };
  assert.deepEqual(chipTexts(String(renderChips(node, ['E02'], T))), [
    'PAID',
    '전환율',
    '이탈률',
    '가격',
    '알림톡',
    'E02',
  ]);
  assert.equal(String(renderChips({}, [], T)), '');
});

test('a node leading into an exception shows its code without the author writing it', () => {
  const flow = flowOf([
    ['a', 0, ['b', 'gone']],
    ['b', 1, []],
    ['gone', 1, [], { exception: 'E07' }],
  ]);
  const board = boardHtml(flow);
  assert.deepEqual(chipTexts(cardOf(board, 'a')), ['E07']);
  assert.deepEqual(chipTexts(cardOf(board, 'b')), []);
  assert.ok(classesOf(cardOf(board, 'gone')).includes('exception'));
});

test('primary-path cards are marked primary and dormant ones dormant', () => {
  const flow = flowOf(
    [
      ['a', 0, ['b', 'later']],
      ['b', 1, []],
      ['later', 1, [], { dormant: true }],
    ],
    { primary: 'p', scenarios: [{ id: 'p', title: 'p', steps: [{ action: 'b' }] }] },
  );
  const board = boardHtml(flow);
  assert.ok(classesOf(cardOf(board, 'a')).includes('primary'));
  assert.ok(classesOf(cardOf(board, 'b')).includes('primary'));
  assert.ok(classesOf(cardOf(board, 'later')).includes('dormant'));
  assert.ok(!classesOf(cardOf(board, 'later')).includes('primary'));
});

test('the board draws every edge, stage header, and band', () => {
  const flow = flowOf([
    ['a', 0, ['b', 'gone'], { decisions: ['예산은?'] }],
    ['b', 1, []],
    ['gone', 1, [], { exception: 'E01' }],
  ]);
  const board = boardHtml(flow);
  assert.equal([...board.matchAll(/<path class="[^"]*" d="M/g)].length, 2);
  assert.equal([...board.matchAll(/class="stage-head"/g)].length, 3);
  assert.ok(board.includes('이탈했을 때 확인할 일'));
  assert.ok(board.includes('미정 결정'));
  assert.ok(board.includes('예산은?'));
});

/** The rows of each table on a page, as arrays of cell markup, with the heading before it. */
function tablesOf(page) {
  return [
    ...page.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<table[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/g),
  ].map(([, heading, body]) => ({
    heading: heading
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
    rows: [...body.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => m[1]),
  }));
}

test('the log page lists common properties first, then events by the stage they happen in', () => {
  const flow = flowOf(
    [
      ['ad', 0, ['landing']],
      ['ad-b', 0, ['landing']],
      ['landing', 1, ['paid']],
      ['paid', 2, []],
    ],
    {
      eventProps: [{ name: 'household_id', use: '형제자매 묶기' }],
      events: [
        { id: 'paid_ok', type: 'normal', at: 'paid' },
        { id: 'ad_click', type: 'normal', at: ['ad.landing', 'ad-b.landing'], props: ['variant'] },
        { id: 'left', type: 'drop', at: 'landing' },
        { id: 'pay_fail', type: 'error', at: 'landing.paid', note: '카드 거절' },
      ],
    },
  );
  const page = String(renderLogPage(flow, T));
  assert.ok(page.includes('로그 심을 지점 &amp; 공통 속성'));
  const [props, ...stages] = tablesOf(page);
  assert.equal(props.rows.length, 1);
  assert.match(props.rows[0], /household_id[\s\S]*형제자매 묶기/);

  assert.deepEqual(
    stages.map((s) => s.heading),
    ['1 광고', '2 신청', '3 결제'],
  );
  assert.deepEqual(
    stages.map((s) => s.rows.length),
    [1, 2, 1],
  );
  const [adClick] = stages[0].rows;
  const text = adClick.replace(/<[^>]+>/g, '');
  assert.match(text, /01\.01 ad › landing 누르기[\s\S]*01\.02 ad-b › landing 누르기/);
  assert.match(adClick, /variant/);
  const badge = (row) => row.match(/class="ty [^"]*">([^<]*)</)[1];
  assert.deepEqual(stages[1].rows.map(badge), ['이탈', '에러']);
  assert.equal(badge(stages[2].rows[0]), '정상');
  assert.match(stages[1].rows[1], /카드 거절/);
});

test('the legend lists every actor with its color', () => {
  const flow = flowOf([['a', 0, []]], { actors: ['학부모', { name: '학생', color: '#B4791F' }] });
  const legend = String(renderLegend(flow, T));
  assert.match(legend, new RegExp(`background:${ACTOR_PALETTE[0]}[^>]*></i>\\s*학부모`));
  assert.match(legend, /background:#B4791F[^>]*><\/i>\s*학생/);
  for (const label of ['기본 경로', '예외', '문만 열어둠']) {
    assert.ok(legend.includes(label), label);
  }
});
