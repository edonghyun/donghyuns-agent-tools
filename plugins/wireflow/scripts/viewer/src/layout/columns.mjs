// Board columns: each stage splits into sub-columns by graph depth, left to right.

import { isException, rankNodes } from '../../../lib/graph.mjs';
import { branchLabels, LABEL_MARGIN, labelWidth } from './edge-labels.mjs';
import { CARD_W, HEADER_H, MARGIN, STAGE_GAP, SUB_GAP } from './geometry.mjs';

/**
 * Columns left to right, one header per stage, and the column index of each non-exception node.
 * A stage has one sub-column per distinct rank of its non-exception nodes, dense from 0, so a
 * stage that starts deep in the graph leaves no empty sub-columns. A stage with no such nodes
 * still gets one sub-column, for its header and its exceptions.
 *
 * Sub-columns are SUB_GAP apart and stages STAGE_GAP apart, except that the gap after a column
 * holding a decision widens to fit the decision's widest branch label with LABEL_MARGIN on both
 * sides, so the label can sit on the branch between the two columns.
 */
export function placeColumns(flow) {
  const rank = rankNodes(flow);
  const columns = [];
  const columnOf = new Map();
  flow.stages.forEach((_, stage) => {
    const nodes = flow.screens.filter((s) => s.stage === stage && !isException(s));
    const ranks = [...new Set(nodes.map((s) => rank.get(s.id)))].sort((a, b) => a - b);
    const first = columns.length;
    for (let sub = 0; sub < Math.max(1, ranks.length); sub++) {
      columns.push({ stage, sub, x: 0 });
    }
    for (const s of nodes) {
      columnOf.set(s.id, first + ranks.indexOf(rank.get(s.id)));
    }
  });

  const labelRoom = labelRoomAfter(flow, columnOf);
  columns.forEach((column, i) => {
    const prev = columns[i - 1];
    if (!prev) {
      column.x = MARGIN;
      return;
    }
    const gap = prev.stage === column.stage ? SUB_GAP : STAGE_GAP;
    column.x = prev.x + CARD_W + Math.max(gap, labelRoom.get(i - 1) ?? 0);
  });

  const stageHeaders = flow.stages.map((label, stage) => {
    const own = columns.filter((c) => c.stage === stage);
    const x = own[0].x;
    return { label, x, y: MARGIN, w: own[own.length - 1].x + CARD_W - x, h: HEADER_H };
  });
  return { columns, stageHeaders, columnOf };
}

/**
 * Column index → the gap after it that its decisions' forward branches need for their labels.
 * Branches into exceptions or back to earlier columns run along the detour lanes instead.
 */
function labelRoomAfter(flow, columnOf) {
  const room = new Map();
  for (const s of flow.screens.filter((s) => s.kind === 'decision' && columnOf.has(s.id))) {
    const column = columnOf.get(s.id);
    const ahead = new Set([...columnOf].filter(([, c]) => c > column).map(([id]) => id));
    const widths = [...branchLabels(s, ahead).values()].map((label) => labelWidth(label));
    room.set(column, Math.max(room.get(column) ?? 0, ...widths.map((w) => w + 2 * LABEL_MARGIN)));
  }
  return room;
}
