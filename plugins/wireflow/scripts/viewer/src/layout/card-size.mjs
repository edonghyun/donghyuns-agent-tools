// Card contents and heights. The layout never measures the DOM, so heights come from estimated
// text widths, and the same flow always gives the same boxes. The sizes below mirror
// styles/board.css: change the two together.

import { CARD_W } from './geometry.mjs';

// Inside a card: 14px padding each side, a 1px border right and the 4px actor stripe left.
const INNER_W = CARD_W - 33;
const PADDING = 26; // 12px padding top and bottom, 1px border each
const GAP = 6; // between the rows of a card
const TOP_ROW = 20; // actor tag and number
const TITLE = { size: 22, line: 28, max: 2 };
const BODY = { size: 14, line: 20, max: 2 };
const CHIP = { size: 13, padding: 14, h: 22, gap: 4 };
const DECISION = { heading: 24, size: 14, line: 20, indent: 12, gap: 4 };

// Advance widths in em, measured in Chrome with Apple SD Gothic Neo (Hangul 0.86em) and rounded
// up toward Pretendard and Malgun Gothic, so a line estimated to fit never wraps.
const WIDE = /[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uff00-\uffef]/;
const emOf = (ch) => {
  if (WIDE.test(ch)) return 0.92;
  if (ch === ' ') return 0.27;
  return /[A-Z0-9]/.test(ch) ? 0.64 : 0.52;
};

/** Estimated width of `text` set at `size` px: Hangul, CJK and full-width forms near a full em. */
export function textWidth(text, size) {
  let em = 0;
  for (const ch of String(text ?? '')) {
    em += emOf(ch);
  }
  return Math.ceil(em * size);
}

const lineCount = (text, font, width = INNER_W) =>
  Math.max(1, Math.ceil(textWidth(text, font.size) / width));

/** A card's chips in order: its state, metrics, experiments, notifications, then `codes`. */
export const cardChips = (node, codes = []) => [
  ...(node.state ? [{ type: 'state', text: node.state }] : []),
  ...(node.metrics ?? []).map((text) => ({ type: 'metric', text })),
  ...(node.experiments ?? []).map((text) => ({ type: 'experiment', text })),
  ...(node.notify ?? []).map((text) => ({ type: 'notify', text })),
  ...codes.map((text) => ({ type: 'code', text })),
];

/** Rows the chips wrap into, filled left to right; a chip wider than the card is cut to fit. */
function chipRows(chips) {
  let rows = 0;
  let x = INNER_W;
  for (const { text } of chips) {
    const w = Math.min(INNER_W, textWidth(text, CHIP.size) + CHIP.padding);
    if (x + CHIP.gap + w > INNER_W) {
      rows += 1;
      x = w;
    } else {
      x += CHIP.gap + w;
    }
  }
  return rows;
}

/**
 * Height of a node card: the top row, up to two title lines, up to two body lines, and the rows
 * its chips wrap into. `codes` are the exception codes the board adds as chips on its own.
 */
export function estimateCardHeight(node, codes = []) {
  const rows = [TOP_ROW, TITLE.line * Math.min(TITLE.max, lineCount(node.title, TITLE))];
  if (node.body) {
    rows.push(BODY.line * Math.min(BODY.max, lineCount(node.body, BODY)));
  }
  const chips = chipRows(cardChips(node, codes));
  if (chips) {
    rows.push(chips * CHIP.h + (chips - 1) * CHIP.gap);
  }
  return PADDING + rows.reduce((sum, h) => sum + h, 0) + GAP * (rows.length - 1);
}

/** Height of a decision-band card: the stage heading, then every question in full. */
export function estimateDecisionCardHeight(items) {
  const itemLines = items.map((item) => lineCount(item, DECISION, INNER_W - DECISION.indent));
  const list =
    itemLines.reduce((sum, n) => sum + n * DECISION.line, 0) + DECISION.gap * (items.length - 1);
  return PADDING + DECISION.heading + GAP + list;
}
