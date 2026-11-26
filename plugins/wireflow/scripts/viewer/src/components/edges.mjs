// Wireframe edges: one curve per action, from its button (or the node's right side) into the
// target, entering from the side that faces the source. Only the wireframe view draws these.

import { classNames, html } from '../html.mjs';

const ARROW_DEFS = html`<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5"
    orient="auto"><path d="M0,0 L10,5 L0,10z" fill="#a7a196" stroke="none"/></marker>
  <marker id="arrow-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4"
    orient="auto"><path d="M0,0 L10,5 L0,10z" fill="#2b59c3" stroke="none"/></marker>
</defs>`;

/**
 * SVG content for every action's edge. `nodes`: id → box. `anchors`: 'node.action' → where that
 * action's button sits on the canvas. `path`: the highlighted scenario's scenarioPath() or null;
 * its edges draw bold with their step numbers and the rest fade.
 */
export function render({ flow, nodes, anchors, path }) {
  const curves = [];
  const steps = [];
  for (const node of flow.screens) {
    const box = nodes.get(node.id);
    node.actions.forEach((action, i) => {
      const key = `${node.id}.${action.id}`;
      const start = anchors.get(key) || sideStart(box, i, node.actions.length);
      const onPath = path?.edgeSteps.has(key);
      const dim = path && !onPath && 'dim';
      const target = nodes.get(action.to);
      if (!target) {
        curves.push(html`<path class="bad ${dim}" d="M${start.x},${start.y} h90"/>`);
        return;
      }
      const points = curve(start, box, target);
      const classes = classNames(onPath && 'on', action.proposed && 'prop', dim);
      curves.push(html`<path class="${classes}" d="${pathData(points)}"
        marker-end="url(#${onPath ? 'arrow-on' : 'arrow'})"/>`);
      if (onPath) {
        steps.push(stepBadge(midpoint(points), path.edgeSteps.get(key), path.failed === key));
      }
    });
  }
  return String(html`${ARROW_DEFS}${curves}${steps}`);
}

/** Where an edge leaves a node with no drawn button: spread along its right side. */
function sideStart(box, index, count) {
  return { x: box.x + box.w, y: box.y + (box.h * (index + 1)) / (count + 1) };
}

/** Cubic Bézier points from `start` on `src` into `dst`. */
function curve(start, src, dst) {
  const { x: x1, y: y1 } = start;
  const bend = 140;
  if (dst === src) {
    const loop = Math.min(160, src.h / 2);
    return [
      [x1, y1],
      [x1 + 120, y1],
      [x1 + 120, y1 - loop],
      [x1, y1 - loop],
    ];
  }
  if (dst.x >= src.x + src.w - 1) {
    // Target to the right: enter its left side.
    const x2 = dst.x;
    const y2 = dst.y + Math.min(dst.h / 2, 120);
    const dx = Math.max(60, (x2 - x1) / 2);
    return [
      [x1, y1],
      [x1 + dx, y1],
      [x2 - dx, y2],
      [x2, y2],
    ];
  }
  const x2 = dst.x + dst.w / 2;
  if (dst.y + dst.h < src.y) {
    // Target above: enter its bottom.
    const y2 = dst.y + dst.h;
    return [
      [x1, y1],
      [x1 + bend, y1],
      [x2, y2 + bend],
      [x2, y2],
    ];
  }
  // Target below, or level and to the left: enter its top.
  const lift = dst.y > src.y + src.h ? bend : 180;
  return [
    [x1, y1],
    [x1 + bend, y1],
    [x2, dst.y - lift],
    [x2, dst.y],
  ];
}

const pathData = ([p0, p1, p2, p3]) => `M${p0} C${p1} ${p2} ${p3}`;

/** The curve's point halfway along its parameter. */
const midpoint = ([p0, p1, p2, p3]) =>
  [0, 1].map((axis) => (p0[axis] + 3 * p1[axis] + 3 * p2[axis] + p3[axis]) / 8);

const stepBadge = ([x, y], numbers, failed) =>
  html`<circle class="${failed && 'failed'}" cx="${x}" cy="${y}" r="18"/>
    <text x="${x}" y="${y}">${numbers.join(',')}</text>`;
