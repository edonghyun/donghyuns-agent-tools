// Wireframe layout: one row per stage, each node at the size it is drawn, left to right. Pure.

import { kindOf } from '../../../lib/board.mjs';
import { DEVICES } from '../../../lib/constants.mjs';

const PAD = 70;
const GAP = { x: 220, y: 200 };

/** Fixed sizes of nodes that are not device frames. */
const BOX_SIZES = {
  step: [260, 140],
  system: [260, 140],
  wait: [260, 140],
  decision: [240, 170],
  end: [200, 100],
  message: [340, 320],
  email: [460, 440],
  document: [420, 594],
};

function deviceSize(device) {
  if (device && typeof device === 'object') return [device.width, device.height];
  return DEVICES[device] || null;
}

export function deviceLabel(node, flow) {
  const d = node.device ?? flow.device ?? 'mobile';
  return typeof d === 'object' ? `${d.width}×${d.height}` : d;
}

/** 'frame' (device artboard) for screens, 'card' for message/email/document, else 'box'. */
export function nodeStyle(node) {
  const kind = kindOf(node);
  if (kind === 'screen') return 'frame';
  if (['message', 'email', 'document'].includes(kind)) return 'card';
  return 'box';
}

export function nodeSize(node, flow) {
  if (nodeStyle(node) === 'frame') {
    return deviceSize(node.device) || deviceSize(flow.device) || DEVICES.mobile;
  }
  return BOX_SIZES[kindOf(node)];
}

/**
 * `nodes`: id → `{x, y, w, h}`. `stages`: the box `{label, x, y, w, h}` drawn around each
 * stage's row. `size`: `{w, h}` of the whole canvas.
 */
export function layoutWireframe(flow) {
  const nodes = new Map();
  const stages = [];
  let y = PAD + 40;
  let width = 0;

  flow.stages.forEach((label, stage) => {
    const row = flow.screens.filter((s) => s.stage === stage);
    const sizes = row.map((s) => nodeSize(s, flow));
    const rowHeight = Math.max(120, ...sizes.map(([, h]) => h));

    let x = PAD + 40;
    row.forEach((s, i) => {
      const [w, h] = sizes[i];
      nodes.set(s.id, { x, y, w, h });
      x += w + GAP.x;
    });

    const stageWidth = Math.max(300, x - GAP.x - PAD + 40);
    stages.push({ label, x: PAD, y: y - 60, w: stageWidth, h: rowHeight + 100 });
    width = Math.max(width, PAD + stageWidth);
    y += rowHeight + GAP.y + 60;
  });

  return { nodes, stages, size: { w: width + PAD, h: y } };
}
