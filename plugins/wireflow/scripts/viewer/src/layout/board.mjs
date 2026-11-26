// Journey-board layout: stage columns with the primary path on one horizontal spine, then an
// exception band and a decision band below them. Pure: the same flow always gives the same boxes.
// Columns come from columns.mjs, rows from rows.mjs, and bands from bands.mjs.

import { exceptionSources, primaryPath } from '../../../lib/board.mjs';
import { bottomOf, placeBands } from './bands.mjs';
import { estimateCardHeight } from './card-size.mjs';
import { CARD_W, HEADER_H, MARGIN, placeColumns } from './columns.mjs';
import { stackColumns } from './rows.mjs';

export { CARD_W, STAGE_GAP, SUB_GAP } from './columns.mjs';

export function layoutBoard(flow) {
  const primary = primaryPath(flow);
  const sources = exceptionSources(flow);
  const heights = cardHeights(flow, sources);
  const { columns, stageHeaders, columnOf } = placeColumns(flow);
  const rowTops = stackColumns(flow, columnOf, heights, primary.nodes);
  const spineY = MARGIN + HEADER_H - Math.min(0, ...rowTops.values());

  const main = new Map();
  for (const [id, top] of rowTops) {
    const column = columnOf.get(id);
    const box = { x: columns[column].x, y: spineY + top, w: CARD_W, h: heights.get(id) };
    main.set(id, { ...box, column, band: 'main' });
  }
  const mainBottom = Math.max(MARGIN + HEADER_H, ...[...main.values()].map(bottomOf));
  const { exceptions, bands } = placeBands(flow, {
    mainBottom,
    pathOrder: primary.order,
    sources,
    main,
    columns,
    stageHeaders,
    heights,
  });

  const right = Math.max(...[...stageHeaders, ...bands].map((box) => box.x + box.w));
  const boxes = new Map([...main, ...exceptions]);
  return {
    nodes: new Map(flow.screens.map((s) => [s.id, boxes.get(s.id)])),
    columns,
    stageHeaders,
    bands,
    spineY,
    size: { w: right + MARGIN, h: bottomOf(bands.at(-1) ?? { y: mainBottom, h: 0 }) + MARGIN },
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
