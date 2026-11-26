// Board edges along their routed points: the primary path bold and drawn last, edges into an
// exception red and dashed, edges out of one grey and dashed, dormant ones faint. Hovering an
// edge names its actions. An edge out of a decision carries its label where routing placed one.
// A highlighted scenario draws its edges bold blue and fades the rest.

import { classNames, html } from '../html.mjs';
import { toPathD } from '../layout/routes.mjs';
import { findNode } from '../selectors.mjs';

const arrow = (id) => html`<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5"
  markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L10,5 L0,10z"/></marker>`;
const DEFS = html`<defs>${['b-arrow', 'b-arrow-primary', 'b-arrow-exception'].map(arrow)}</defs>`;

/** The labels of the edge's actions, joined ' / '. */
function actionLabels(flow, edge) {
  const node = findNode(flow, edge.from);
  return edge.ids
    .map((id) => node.actions.find((a) => `${node.id}.${a.id}` === id)?.label ?? id)
    .join(' / ');
}

/** `edges` from `routeEdges`, on an svg of `size`. `path`: the scenarioPath() or null. */
export function render(edges, size, path, flow) {
  const onPath = (edge) => Boolean(path) && edge.ids.some((id) => path.edgeSteps.has(id));
  const classesOf = (edge) =>
    classNames(
      edge.kind,
      edge.primary && 'primary',
      edge.dormant && 'dormant',
      path && (onPath(edge) ? 'on' : 'dim'),
    );
  const markerOf = (edge) => {
    if (onPath(edge) || (!path && edge.primary)) return 'b-arrow-primary';
    return edge.kind === 'exception' ? 'b-arrow-exception' : 'b-arrow';
  };
  // A wide invisible stroke under each edge makes its title reachable by the pointer.
  const line = (edge) => html`<g class="edge"><title>${actionLabels(flow, edge)}</title>
    <path class="hit" d="${toPathD(edge.points)}"/>
    <path class="${classesOf(edge)}" d="${toPathD(edge.points)}"
      marker-end="url(#${markerOf(edge)})"/></g>`;
  const label = (edge) =>
    edge.labelAt &&
    html`<span class="edge-label ${classesOf(edge)}"
      style="left:${edge.labelAt[0]}px;top:${edge.labelAt[1]}px">${edge.label}</span>`;
  // Primary edges go last, so no other edge covers them where they share a channel.
  const drawOrder = [...edges].sort((a, b) => Number(a.primary) - Number(b.primary));
  return html`<svg class="edges board-edges" width="${size.w}" height="${size.h}">
    ${DEFS}${drawOrder.map(line)}</svg>${edges.map(label)}`;
}
