// Pure layout math: node sizes, canvas positions, edge paths. No DOM.
import { DEVICES } from '../lib/constants.mjs';

const PAD = 70;
const LANE_LABEL_WIDTH = 200;

/** Fixed sizes for nodes that are not device frames. */
const BOX_SIZES = {
  wireframe: {
    step: [260, 140],
    system: [260, 140],
    wait: [260, 140],
    decision: [240, 170],
    end: [200, 100],
    message: [340, 320],
    email: [460, 440],
    document: [420, 594],
  },
  flowchart: {
    step: [240, 120],
    system: [240, 120],
    wait: [240, 120],
    decision: [220, 150],
    end: [180, 90],
    screen: [240, 120],
    message: [240, 120],
    email: [240, 120],
    document: [240, 120],
  },
};

const GAPS = {
  wireframe: { x: 220, y: 200 },
  flowchart: { x: 110, y: 90 },
};

export const kindOf = (node) => node.kind || 'screen';

export function deviceSize(device) {
  if (device && typeof device === 'object') return [device.width, device.height];
  return DEVICES[device] || null;
}

export function deviceLabel(node, flow) {
  const d = node.device ?? flow.device ?? 'mobile';
  return typeof d === 'object' ? `${d.width}×${d.height}` : d;
}

/** How a node is drawn in a view: 'frame' (device artboard), 'card' (message/email/document), or 'box'. */
export function nodeStyle(node, view) {
  if (view === 'flowchart') return 'box';
  const kind = kindOf(node);
  if (kind === 'screen') return 'frame';
  if (['message', 'email', 'document'].includes(kind)) return 'card';
  return 'box';
}

export function nodeSize(node, flow, view) {
  if (nodeStyle(node, view) === 'frame') {
    return deviceSize(node.device) || deviceSize(flow.device) || DEVICES.mobile;
  }
  return BOX_SIZES[view][kindOf(node)];
}

/** Lanes are used only in the flowchart view and only when some node names an actor. */
export function usesLanes(flow, view) {
  return view === 'flowchart' && flow.screens.some((s) => s.actor);
}

/**
 * Positions every node and returns the background groups to draw.
 * Rows-by-stage layout, or (flowchart with actors) a lane grid: rows = actors, columns = stages.
 */
export function layoutFlow(flow, view, unassignedLabel = '') {
  return usesLanes(flow, view)
    ? laneLayout(flow, view, unassignedLabel)
    : stageRowLayout(flow, view);
}

function stageRowLayout(flow, view) {
  const gap = GAPS[view];
  const pos = new Map();
  const groups = [];
  let y = PAD + 40;
  let width = 0;

  flow.stages.forEach((label, stage) => {
    const row = flow.screens.filter((s) => s.stage === stage);
    const sizes = row.map((s) => nodeSize(s, flow, view));
    const rowHeight = Math.max(120, ...sizes.map(([, h]) => h));

    let x = PAD + 40;
    row.forEach((s, i) => {
      const [w, h] = sizes[i];
      pos.set(s.id, { x, y, w, h });
      x += w + gap.x;
    });

    const groupWidth = Math.max(300, x - gap.x - PAD + 40);
    groups.push({ type: 'stage', label, x: PAD, y: y - 60, w: groupWidth, h: rowHeight + 100 });
    width = Math.max(width, PAD + groupWidth);
    y += rowHeight + gap.y + 60;
  });

  return { pos, groups, width: width + PAD, height: y };
}

function laneLayout(flow, view, unassignedLabel) {
  const gap = GAPS[view];
  const lanes = laneNames(flow);
  const inCell = (lane, stage) =>
    flow.screens.filter((s) => (s.actor || '') === lane && s.stage === stage);
  const sizeOf = (s) => nodeSize(s, flow, view);
  const minColumn = BOX_SIZES.flowchart.step[0] + gap.x;

  const columnWidths = flow.stages.map((_, stage) =>
    Math.max(
      minColumn,
      ...lanes.map((lane) => inCell(lane, stage).reduce((w, s) => w + sizeOf(s)[0] + gap.x, 0)),
    ),
  );
  const laneHeights = lanes.map((lane) => {
    const heights = flow.screens.filter((s) => (s.actor || '') === lane).map((s) => sizeOf(s)[1]);
    return Math.max(100, ...heights) + 80;
  });
  const gridLeft = PAD + LANE_LABEL_WIDTH;
  const gridWidth = columnWidths.reduce((a, b) => a + b, 0);
  const top = PAD + 60;

  const pos = new Map();
  const groups = [];
  let y = top;
  lanes.forEach((lane, li) => {
    let columnX = gridLeft;
    flow.stages.forEach((_, stage) => {
      let x = columnX + gap.x / 2;
      for (const s of inCell(lane, stage)) {
        const [w, h] = sizeOf(s);
        pos.set(s.id, { x, y: y + (laneHeights[li] - h) / 2, w, h });
        x += w + gap.x;
      }
      columnX += columnWidths[stage];
    });
    groups.push({
      type: 'lane',
      label: lane || unassignedLabel,
      x: PAD,
      y,
      w: LANE_LABEL_WIDTH + gridWidth,
      h: laneHeights[li],
    });
    y += laneHeights[li];
  });

  let columnX = gridLeft;
  flow.stages.forEach((label, stage) => {
    groups.push({
      type: 'column',
      label,
      x: columnX,
      y: top - 50,
      w: columnWidths[stage],
      h: y - top + 50,
    });
    columnX += columnWidths[stage];
  });

  return { pos, groups, width: gridLeft + gridWidth + PAD, height: y + PAD };
}

function laneNames(flow) {
  const lanes = [...(flow.actors || [])];
  for (const s of flow.screens) if (s.actor && !lanes.includes(s.actor)) lanes.push(s.actor);
  if (flow.screens.some((s) => !s.actor)) lanes.push('');
  return lanes;
}

/**
 * Where an edge leaves a box that has no rendered button: spread along the right side,
 * or along the right half of a diamond for decisions.
 */
export function edgeStart(box, index, count, diamond = false) {
  const y = box.y + (box.h * (index + 1)) / (count + 1);
  if (!diamond) return { x: box.x + box.w, y };
  const offsetFromMiddle = Math.abs(box.h / 2 - (y - box.y));
  return { x: box.x + box.w - offsetFromMiddle * (box.w / box.h), y };
}

/** SVG path from a start point on `src` into `dst`, entering from the side facing the source. */
export function edgePath(start, src, dst) {
  const { x: x1, y: y1 } = start;
  const bend = 140;

  if (dst === src) {
    const loop = Math.min(160, src.h / 2);
    return `M${x1},${y1} c120,0 120,-${loop} 0,-${loop}`;
  }
  if (dst.x >= src.x + src.w - 1) {
    // Target to the right: enter its left side.
    const x2 = dst.x;
    const y2 = dst.y + Math.min(dst.h / 2, 120);
    const dx = Math.max(60, (x2 - x1) / 2);
    return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
  }
  const x2 = dst.x + dst.w / 2;
  if (dst.y + dst.h < src.y) {
    // Target above: enter its bottom.
    const y2 = dst.y + dst.h;
    return `M${x1},${y1} C${x1 + bend},${y1} ${x2},${y2 + bend} ${x2},${y2}`;
  }
  // Target below, or level and to the left: enter its top.
  const y2 = dst.y;
  const lift = dst.y > src.y + src.h ? bend : 180;
  return `M${x1},${y1} C${x1 + bend},${y1} ${x2},${y2 - lift} ${x2},${y2}`;
}
