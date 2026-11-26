// Style rules the viewer relies on: the sizes the board layout assumes without measuring the
// DOM, and badges that stay whole.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CARD_SIZES } from '../viewer/src/layout/card-size.mjs';
import { LABEL_H, LABEL_PADDING, LABEL_SIZE } from '../viewer/src/layout/edge-labels.mjs';

const sheet = (name) =>
  readFileSync(new URL(`../viewer/src/styles/${name}`, import.meta.url), 'utf8');
const board = sheet('board.css');

/** The declarations of the rule whose selector is exactly `selector`, as {property: value}. */
function rule(selector, css = board) {
  const start = css.indexOf(`\n${selector} {`);
  assert.ok(start >= 0, `no "${selector}" rule`);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  return Object.fromEntries(
    body
      .split(';')
      .map((d) => d.split(':').map((part) => part.trim()))
      .filter(([property]) => property),
  );
}

test('board.css card sizes match the card height estimate', () => {
  const { GAP, TOP_ROW, TITLE, BODY, CHIP, DECISION } = CARD_SIZES;
  assert.equal(rule('.card').gap, `${GAP}px`);
  assert.equal(rule('.card').padding, '12px 14px');
  assert.equal(rule('.c-top').height, `${TOP_ROW}px`);
  for (const [selector, font] of [
    ['.c-title', TITLE],
    ['.c-body', BODY],
    ['.chip', CHIP],
    ['.decision-card li', DECISION],
  ]) {
    assert.equal(rule(selector)['font-size'], `${font.size}px`, selector);
    assert.equal(rule(selector)['line-height'], `${font.line}px`, selector);
  }
  assert.equal(rule('.chip').padding, '1px 6px');
  assert.equal(CHIP.h, CHIP.line + 2 + 2, 'a chip is its line, 1px padding and 1px border');
  assert.equal(CHIP.padding, 6 + 6 + 2);
  assert.equal(rule('.chips').gap, `${CHIP.gap}px`);
  assert.equal(rule('.decision-card h4')['line-height'], `${DECISION.heading}px`);
  assert.equal(rule('.decision-card li')['padding-left'], `${DECISION.indent}px`);
  assert.equal(rule('.decision-card ul').gap, `${DECISION.gap}px`);
});

test('board.css edge labels match the label box routing places', () => {
  const label = rule('.edge-label');
  assert.equal(label['font-size'], `${LABEL_SIZE}px`);
  assert.equal(label.padding, '1px 7px');
  assert.equal(LABEL_PADDING, 7 + 7 + 2);
  assert.equal(LABEL_H, Number.parseFloat(label['line-height']) + 2 + 2);
});

test('an origin badge never breaks across lines', () => {
  // In the drawer the badge ends a long meta line; split, its pill border drew as two halves.
  assert.equal(rule('.badge', sheet('base.css'))['white-space'], 'nowrap');
});
