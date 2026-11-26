// A plain stand-in for the journey board until its cards and chips land: stage headers, each
// node as a numbered box at its board position, and the routed edges as lines.

import { boxStyle, html } from '../html.mjs';
import { displayNumber } from '../selectors.mjs';

export function render({ layout, edges, size }, { flow, selected }) {
  const card = (node) => html`<div class="sketch-card ${selected === node.id && 'sel'}"
    data-id="${node.id}" style="${boxStyle(layout.nodes.get(node.id))}">
    <b>${displayNumber(flow, node)}</b> ${node.title}</div>`;
  const line = (edge) =>
    html`<polyline class="${edge.primary && 'on'}" points="${edge.points.join(' ')}"/>`;
  const stage = (h) => html`<div class="sketch-stage" style="${boxStyle(h)}">${h.label}</div>`;
  return html`
    ${layout.stageHeaders.map(stage)}
    <svg class="edges" width="${size.w}" height="${size.h}">${edges.map(line)}</svg>
    ${flow.screens.map(card)}`;
}
