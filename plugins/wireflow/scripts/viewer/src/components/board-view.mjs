// The journey board: stage headers, the bands below, routed edges, and a card per node. The
// primary path's cards are marked; a highlighted scenario fades the cards it does not visit.

import { actorList, exceptionCodes, primaryPath } from '../../../lib/index.mjs';
import { boxStyle, html } from '../html.mjs';
import { scenarioPath } from '../selectors.mjs';
import * as bands from './bands.mjs';
import { renderBoardCard } from './board-card.mjs';
import * as boardEdges from './board-edges.mjs';

/** The board's markup for `scene`, the board layout and routed edges of the state's flow. */
export function render({ layout, edges }, { flow, scenario, selected }, T) {
  const primary = primaryPath(flow).nodes;
  const codes = exceptionCodes(flow);
  const colors = new Map(actorList(flow).map((a) => [a.name, a.color]));
  const path = scenarioPath(flow, scenario);
  const card = (node) =>
    renderBoardCard(
      node,
      {
        flow,
        box: layout.nodes.get(node.id),
        color: colors.get(node.actor),
        codes: codes.get(node.id),
        primary: primary.has(node.id),
        selected: selected === node.id,
        dim: path && !path.nodes.has(node.id),
      },
      T,
    );
  const stageHeader = (header, i) =>
    html`<div class="stage-head" style="${boxStyle(header)}"><b>${i + 1}</b>${header.label}</div>`;
  return html`
    ${bands.render(layout.bands, flow.stages, T)}
    ${layout.stageHeaders.map(stageHeader)}
    ${boardEdges.render(edges, layout.size, path, flow)}
    ${flow.screens.map(card)}`;
}
