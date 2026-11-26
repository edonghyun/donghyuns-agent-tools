// The journey board as drawn: card boxes and edge routes. When the detours need more lanes than
// the default gaps around the main area hold, the board is laid out again with wider gaps.

import { layoutBoard } from './board.mjs';
import { DETOUR_GAP } from './geometry.mjs';
import { LANE_GAP } from './route-space.mjs';
import { routeEdges } from './routes.mjs';

/** `{layout, edges}`: `layoutBoard`'s output and `routeEdges`' edges for it. */
export function layoutAndRoute(flow) {
  const layout = layoutBoard(flow);
  const { edges, lanes } = routeEdges(flow, layout);
  const gaps = { detourTop: gapFor(lanes.top), detourBottom: gapFor(lanes.bottom) };
  if (gaps.detourTop === DETOUR_GAP && gaps.detourBottom === DETOUR_GAP) {
    return { layout, edges };
  }
  // Only the gaps grow, which moves cards up or down but never changes which lanes edges take.
  const widened = layoutBoard(flow, gaps);
  return { layout: widened, edges: routeEdges(flow, widened).edges };
}

/** The gap one side's lanes need: two lanes' room beyond the outermost. */
const gapFor = (lanes) => Math.max(DETOUR_GAP, (lanes + 2) * LANE_GAP);
