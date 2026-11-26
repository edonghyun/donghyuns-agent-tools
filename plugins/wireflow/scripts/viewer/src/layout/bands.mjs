// Board bands below the main area: the exception band, then the decision band.

import { isException } from '../../../lib/index.mjs';
import { estimateDecisionCardHeight } from './card-size.mjs';
import { bottomOf, CARD_W, SUB_GAP } from './geometry.mjs';

const BAND_GAP = 48; // between the two bands
const BAND_PAD = 24; // inside a band, around its cards
const BAND_TITLE = 32; // inside a band, above its cards

/**
 * The exception boxes and the bands below `mainBottom`. A band with no cards is left out, so
 * `bands` holds zero, one, or both of the exception band and the decision band, in that order.
 * The first band starts `detourGap` below the main area, leaving room for edges that detour
 * under it.
 */
export function placeBands(
  flow,
  { mainBottom, detourGap, pathOrder, sources, main, columns, stageHeaders, heights },
) {
  const exceptions = placeExceptions(flow, {
    pathOrder,
    sources,
    main,
    columns,
    heights,
    top: mainBottom + detourGap + BAND_TITLE,
  });
  const exceptionBand = exceptions.size ? bandAround('exception', [...exceptions.values()]) : null;
  const cards = decisionCards(flow, stageHeaders, {
    top: (exceptionBand ? bottomOf(exceptionBand) + BAND_GAP : mainBottom + detourGap) + BAND_TITLE,
  });
  const decisionBand = cards.length ? { ...bandAround('decision', cards), cards } : null;
  return { exceptions, bands: [exceptionBand, decisionBand].filter(Boolean) };
}

/**
 * Exception boxes in one row at `top`. Each hangs under the column of its first source, taken in
 * primary-path order and then `screens` order, whatever its own stage. With no source it hangs
 * under its own stage's first sub-column. A card closer than one column to a card already placed
 * moves to that card's right, so cards hanging under the same column line up left to right.
 */
function placeExceptions(flow, { pathOrder, sources, main, columns, heights, top }) {
  const pathIndex = (id) => (pathOrder.includes(id) ? pathOrder.indexOf(id) : pathOrder.length);
  const hangFrom = (s) => {
    const [first] = sources
      .get(s.id)
      .filter((from) => main.has(from))
      .sort((a, b) => pathIndex(a) - pathIndex(b));
    return first ? main.get(first).column : columns.findIndex((c) => c.stage === s.stage);
  };
  const wanted = flow.screens
    .filter(isException)
    .map((s) => ({ id: s.id, column: hangFrom(s) }))
    .sort((a, b) => columns[a.column].x - columns[b.column].x);

  const step = CARD_W + SUB_GAP;
  const placed = new Map();
  const blockerAt = (x) => [...placed.values()].find((box) => Math.abs(box.x - x) < step);
  for (const { id, column } of wanted) {
    let x = columns[column].x;
    for (let blocker = blockerAt(x); blocker; blocker = blockerAt(x)) {
      x = blocker.x + step;
    }
    placed.set(id, { x, y: top, w: CARD_W, h: heights.get(id), column, band: 'exception' });
  }
  return placed;
}

/** One card per stage with open decisions, under the stage's first sub-column. */
function decisionCards(flow, stageHeaders, { top }) {
  return stageHeaders
    .map((header, stage) => ({
      stage,
      items: flow.screens.filter((s) => s.stage === stage).flatMap((s) => s.decisions || []),
      x: header.x,
      y: top,
      w: CARD_W,
    }))
    .filter((card) => card.items.length)
    .map((card) => ({ ...card, h: estimateDecisionCardHeight(card.items) }));
}

/** A band's box: room for its title above the cards and padding around them. */
function bandAround(type, cards) {
  const x = Math.min(...cards.map((c) => c.x)) - BAND_PAD;
  const y = cards[0].y - BAND_TITLE;
  const right = Math.max(...cards.map((c) => c.x + c.w)) + BAND_PAD;
  const h = Math.max(...cards.map(bottomOf)) + BAND_PAD - y;
  return { type, x, y, w: right - x, h };
}
