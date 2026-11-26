// Journey-board layout: stage columns with the primary path on one horizontal spine, then an
// exception band and a decision band below them. Pure: the same flow always gives the same boxes.
// Columns come from columns.mjs, rows from rows.mjs, and bands from bands.mjs.

import { exceptionSources, primaryPath } from '../../../lib/board.mjs';
import { placeBands } from './bands.mjs';
import { estimateCardHeight } from './card-size.mjs';
import { placeColumns } from './columns.mjs';
import { bottomOf, CARD_W, DETOUR_GAP, HEADER_H, MARGIN } from './geometry.mjs';
import { stackColumns } from './rows.mjs';

export { CARD_W, DETOUR_GAP, STAGE_GAP, SUB_GAP } from './geometry.mjs';

/**
 * Lays out a flow as a journey board.
 *
 * - `nodes`: id → `{x, y, w, h, column, band}` in `screens` order, `band` being 'main' or
 *   'exception'. `column` indexes `columns`. For an exception it is the column the card hangs
 *   from, its first source's, and the card may sit to its right after a collision: route by `x`.
 * - `columns`: `{stage, sub, x}` left to right. `stageHeaders`: `{label, x, y, w, h}` per stage.
 * - `mainArea`: `{top, bottom}` of the main cards. `DETOUR_GAP` above and below it is free of
 *   cards, for edges that detour around the main area.
 * - `bands`: `{type: 'exception'|'decision', label, x, y, w, h}`, only those with cards, in that
 *   order. The decision band also has `cards: [{stage, items, x, y, w, h}]`.
 * - `spineY`: the y the primary path runs along. `size`: `{w, h}` of the whole board.
 */
export function layoutBoard(flow) {
  const primary = primaryPath(flow);
  const sources = exceptionSources(flow);
  const heights = cardHeights(flow, sources);
  const { columns, stageHeaders, columnOf } = placeColumns(flow);
  const rowTops = stackColumns(flow, columnOf, heights, primary.nodes);
  const firstRow = MARGIN + HEADER_H + DETOUR_GAP;
  const spineY = firstRow - Math.min(0, ...rowTops.values());

  const main = new Map();
  for (const [id, top] of rowTops) {
    const column = columnOf.get(id);
    const box = { x: columns[column].x, y: spineY + top, w: CARD_W, h: heights.get(id) };
    main.set(id, { ...box, column, band: 'main' });
  }
  const mainBoxes = [...main.values()];
  const mainArea = {
    top: Math.min(firstRow, ...mainBoxes.map((box) => box.y)),
    bottom: Math.max(firstRow, ...mainBoxes.map(bottomOf)),
  };
  const { exceptions, bands } = placeBands(flow, {
    mainBottom: mainArea.bottom,
    pathOrder: primary.order,
    sources,
    main,
    columns,
    stageHeaders,
    heights,
  });

  const right = Math.max(...[...stageHeaders, ...bands].map((box) => box.x + box.w));
  const bottom = bands.length ? bottomOf(bands[bands.length - 1]) : mainArea.bottom + DETOUR_GAP;
  const boxes = new Map([...main, ...exceptions]);
  return {
    nodes: new Map(flow.screens.map((s) => [s.id, boxes.get(s.id)])),
    columns,
    stageHeaders,
    mainArea,
    bands,
    spineY,
    size: { w: right + MARGIN, h: bottom + MARGIN },
  };
}

/** Each node's card height. A node that leads into exceptions shows one code chip per exception. */
function cardHeights(flow, sources) {
  const codeChips = new Map();
  for (const from of [...sources.values()].flat()) {
    codeChips.set(from, (codeChips.get(from) ?? 0) + 1);
  }
  return new Map(flow.screens.map((s) => [s.id, estimateCardHeight(s, codeChips.get(s.id))]));
}
