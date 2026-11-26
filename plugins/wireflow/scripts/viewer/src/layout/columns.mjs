// Board columns: each stage splits into sub-columns by graph depth, left to right.

import { isException, rankNodes } from '../../../lib/graph.mjs';
import { CARD_W, HEADER_H, MARGIN, STAGE_GAP, SUB_GAP } from './geometry.mjs';

/**
 * Columns left to right, one header per stage, and the column index of each non-exception node.
 * A stage has one sub-column per distinct rank of its non-exception nodes, dense from 0, so a
 * stage that starts deep in the graph leaves no empty sub-columns. A stage with no such nodes
 * still gets one sub-column, for its header and its exceptions.
 */
export function placeColumns(flow) {
  const rank = rankNodes(flow);
  const columns = [];
  const stageHeaders = [];
  const columnOf = new Map();
  let x = MARGIN;
  flow.stages.forEach((label, stage) => {
    const nodes = flow.screens.filter((s) => s.stage === stage && !isException(s));
    const ranks = [...new Set(nodes.map((s) => rank.get(s.id)))].sort((a, b) => a - b);
    const first = columns.length;
    for (let sub = 0; sub < Math.max(1, ranks.length); sub++) {
      columns.push({ stage, sub, x: x + sub * (CARD_W + SUB_GAP) });
    }
    for (const s of nodes) {
      columnOf.set(s.id, first + ranks.indexOf(rank.get(s.id)));
    }
    const w = (columns.length - first) * (CARD_W + SUB_GAP) - SUB_GAP;
    stageHeaders.push({ label, x, y: MARGIN, w, h: HEADER_H });
    x += w + STAGE_GAP;
  });
  return { columns, stageHeaders, columnOf };
}
