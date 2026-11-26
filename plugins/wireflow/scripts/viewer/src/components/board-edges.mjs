// Board edges along their routed points: the primary path bold and drawn last, exception edges
// red and dashed, dormant ones faint. An edge out of a decision carries its label where the label
// fits on the edge's run; a cramped one is left to the drawer. A highlighted scenario draws its
// edges bold and fades the rest.

import { classNames, html } from '../html.mjs';
import { textWidth } from '../layout/card-size.mjs';
import { toPathD } from '../layout/routes.mjs';

// The label's type size and the room its pill needs beyond the text (styles/board.css).
const LABEL_SIZE = 15;
const LABEL_PADDING = 24;
const labelFits = (edge) => textWidth(edge.label, LABEL_SIZE) + LABEL_PADDING <= edge.labelRoom;

const arrow = (id) => html`<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5"
  markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L10,5 L0,10z"/></marker>`;
const DEFS = html`<defs>${['b-arrow', 'b-arrow-primary', 'b-arrow-exception'].map(arrow)}</defs>`;

const isExceptionEdge = (edge) => edge.kind === 'exception' || edge.kind === 'from-exception';

function markerOf(edge) {
  if (isExceptionEdge(edge)) return 'b-arrow-exception';
  return edge.primary ? 'b-arrow-primary' : 'b-arrow';
}

/** `edges` from `routeEdges`, on an svg of `size`. `path`: the scenarioPath() or null. */
export function render(edges, size, path) {
  const onPath = (edge) => edge.ids.some((id) => path.edgeSteps.has(id));
  const classesOf = (edge) =>
    classNames(
      isExceptionEdge(edge) ? 'exception' : edge.kind,
      edge.primary && 'primary',
      edge.dormant && 'dormant',
      path && (onPath(edge) ? 'on' : 'dim'),
    );
  const line = (edge) =>
    html`<path class="${classesOf(edge)}" d="${toPathD(edge.points)}"
      marker-end="url(#${markerOf(edge)})"/>`;
  const label = (edge) =>
    edge.label &&
    labelFits(edge) &&
    html`<span class="edge-label ${classesOf(edge)}"
      style="left:${edge.labelAt[0]}px;top:${edge.labelAt[1]}px">${edge.label}</span>`;
  // Primary edges go last, so no other edge covers them where they share a channel.
  const drawOrder = [...edges].sort((a, b) => Number(a.primary) - Number(b.primary));
  return html`<svg class="edges board-edges" width="${size.w}" height="${size.h}">
    ${DEFS}${drawOrder.map(line)}</svg>${edges.map(label)}`;
}
