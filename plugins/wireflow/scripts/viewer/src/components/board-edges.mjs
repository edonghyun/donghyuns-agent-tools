// Board edges along their routed points: the primary path bold and drawn last, edges into an
// exception red and dashed, edges out of one grey and dashed, dormant ones faint. Hovering an
// edge names its actions. An edge out of a decision carries its label where routing placed one.
// A highlighted scenario draws its edges bold blue with their step numbers, the step it failed
// at red, and fades the rest.

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

/** The edge's part in the highlighted scenario: 'failed', 'on' or 'dim'; null with none. */
function scenarioRole(edge, path) {
  if (!path) return null;
  if (edge.ids.includes(path.failed)) return 'failed';
  return edge.ids.some((id) => path.edgeSteps.has(id)) ? 'on' : 'dim';
}

/**
 * The arrowhead in the color of the edge's stroke. board.css colors strokes in this order, the
 * first that applies winning: a scenario's failed step, its other steps, an edge into an
 * exception, the primary path. Fading leaves the color as it is.
 */
function markerOf(edge, role) {
  if (role === 'failed') return 'b-arrow-exception';
  if (role === 'on') return 'b-arrow-primary';
  if (edge.kind === 'exception') return 'b-arrow-exception';
  return edge.primary ? 'b-arrow-primary' : 'b-arrow';
}

/** `edges` from `routeEdges`, on an svg of `size`. `path`: the scenarioPath() or null. */
export function render(edges, size, path, flow) {
  const classesOf = (edge) =>
    classNames(
      edge.kind,
      edge.primary && 'primary',
      edge.dormant && 'dormant',
      scenarioRole(edge, path),
    );
  // A wide invisible stroke under each edge makes its title reachable by the pointer.
  const line = (edge) => html`<g class="edge"><title>${actionLabels(flow, edge)}</title>
    <path class="hit" d="${toPathD(edge.points)}"/>
    <path class="${classesOf(edge)}" d="${toPathD(edge.points)}"
      marker-end="url(#${markerOf(edge, scenarioRole(edge, path))})"/></g>`;
  const label = (edge) =>
    edge.labelAt &&
    html`<span class="edge-label ${classesOf(edge)}"
      style="left:${edge.labelAt[0]}px;top:${edge.labelAt[1]}px">${edge.label}</span>`;
  const stepBadge = (edge) => {
    const numbers = edge.ids.flatMap((id) => path.steps.get(id) || []).sort((a, b) => a - b);
    return (
      numbers.length > 0 &&
      html`<span class="edge-step ${scenarioRole(edge, path)}"
        style="left:${edge.stepAt[0]}px;top:${edge.stepAt[1]}px">${numbers.join(',')}</span>`
    );
  };
  // Primary edges go last, so no other edge covers them where they share a channel.
  const drawOrder = [...edges].sort((a, b) => Number(a.primary) - Number(b.primary));
  return html`<svg class="edges board-edges" width="${size.w}" height="${size.h}">
    ${DEFS}${drawOrder.map(line)}</svg>${edges.map(label)}${path && edges.map(stepBadge)}`;
}
