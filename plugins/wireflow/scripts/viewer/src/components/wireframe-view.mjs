// The wireframe view: a row per stage, each node drawn as a frame, card or box with its tag
// above it, and curve edges that start at the buttons. A scenario highlights its steps and fades
// the rest.

import { boxStyle, classNames, html } from '../html.mjs';
import { deviceLabel, nodeStyle } from '../layout/wireframe.mjs';
import { displayNumber, previewVars, scenarioPath } from '../selectors.mjs';
import * as edges from './edges.mjs';
import * as frameNode from './frame-node.mjs';

/** Draws `scene`, the wireframe layout of the state's flow, into the canvas element. */
export function draw(canvas, scene, { flow, result, scenario, selected }, T) {
  const path = scenarioPath(flow, scenario);
  const critical = new Set(
    result.findings.filter((f) => f.severity === 'critical').map((f) => f.screen),
  );
  const nodes = flow.screens.map((node) => {
    const box = scene.nodes.get(node.id);
    const ctx = {
      flow,
      vars: previewVars(flow, node),
      live: false,
      pathSteps: path?.steps,
      failedAction: path?.failed,
      classes: classNames(
        selected === node.id && 'sel',
        path && !path.nodes.has(node.id) && selected !== node.id && 'dim',
        critical.has(node.id) && 'has-bad',
      ),
      style: boxStyle(box),
    };
    return html`${nodeTag(node, box, flow, T)}${frameNode.render(node, ctx, T)}`;
  });

  const stageRow = (stage) =>
    html`<div class="group" style="${boxStyle(stage)}"><h3>${stage.label}</h3></div>`;
  canvas.innerHTML = String(html`
    ${scene.stages.map(stageRow)}
    <svg class="edges" width="${scene.size.w}" height="${scene.size.h}"></svg>
    ${nodes}`);
  // Edges start at the buttons, so they are drawn once the nodes are in place.
  canvas.querySelector('.edges').innerHTML = edges.render({
    flow,
    nodes: scene.nodes,
    anchors: buttonAnchors(canvas, scene.nodes),
    path,
  });
}

/** Number, title, origin and device above a node. */
function nodeTag(node, box, flow, T) {
  const origin = node.origin || 'source';
  const device =
    nodeStyle(node) === 'frame' &&
    (node.device || flow.device) &&
    html`<span class="badge">${deviceLabel(node, flow)}</span>`;
  return html`<div class="node-tag" style="left:${box.x}px;top:${box.y - 40}px">
    <b>${displayNumber(flow, node)}</b> ${node.title}
    <span class="badge ${origin}">${T.origin[origin] || origin}</span>${device}</div>`;
}

/** The right-middle point of each drawn button on the canvas, by 'node.action'. */
function buttonAnchors(canvas, nodes) {
  const anchors = new Map();
  for (const button of canvas.querySelectorAll('.screen [data-action]')) {
    const nodeEl = button.closest('[data-id]');
    const box = nodes.get(nodeEl.dataset.id);
    const frame = nodeEl.getBoundingClientRect();
    const zoom = frame.width / nodeEl.offsetWidth;
    const r = button.getBoundingClientRect();
    anchors.set(`${nodeEl.dataset.id}.${button.dataset.action}`, {
      x: box.x + (r.right - frame.left) / zoom,
      y: box.y + (r.top + r.height / 2 - frame.top) / zoom,
    });
  }
  return anchors;
}
