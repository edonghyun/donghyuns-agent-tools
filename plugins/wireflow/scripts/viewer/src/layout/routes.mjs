// Orthogonal edge routes for the journey board. A forward edge turns in the channel between two
// columns. A back edge, a self-loop, an edge within one column, and a skip that a card blocks
// detour around the main area through a lane above or below it. Edges into exceptions drop to
// the exception band and edges out of them climb back, both through the lanes below. No segment
// passes through a card. Channel slots come from route-space.mjs, path helpers from path-geometry.mjs.

import { primaryPath } from '../../../lib/board.mjs';
import { backEdges, edgeKey, isException, screensById } from '../../../lib/graph.mjs';
import { branchLabels, LABEL_H, LABEL_MARGIN, labelWidth } from './edge-labels.mjs';
import { bottomOf } from './geometry.mjs';
import { boxesOverlap, crossesAny, horizontalRuns, simplify } from './path-geometry.mjs';
import { channelSlots, detourLanes } from './route-space.mjs';

/**
 * Routes every edge between two screens: `{edges, lanes}`. Actions sharing a source and a target
 * make one edge, so `edges` follows `screens` and then `actions` order by each edge's first
 * action. An edge is
 * `{id, ids, from, to, points: [[x, y], …], kind, primary, dormant, label?, labelAt?}`:
 * - `id` is its first action's 'node.action' and `ids` lists all of them.
 * - `kind` is 'forward', 'back' (self-loops included), 'exception' (into an exception), or
 *   'from-exception' (out of one).
 * - `primary`: one of its actions is a primary-path step. `dormant`: either end is dormant.
 * - `label` (its actions' labels joined by ' / ') only on edges out of a decision. `labelAt` is
 *   where the label centers, on a horizontal run of the edge, clear of every card and of the
 *   labels placed before it; an edge whose route has no such spot has no `labelAt`. The columns
 *   leave room for every forward branch's.
 * `lanes` counts the detour lanes used above (`top`) and below (`bottom`) the main area.
 */
export function routeEdges(flow, layout) {
  const edges = boardEdges(flow, layout);
  const decisionCards = layout.bands.flatMap((band) => band.cards || []);
  const lanes = detourLanes(layout.mainArea);
  const space = {
    boxes: [...layout.nodes.values(), ...decisionCards],
    mainArea: layout.mainArea,
    spineY: layout.spineY,
    channels: channelSlots(layout.columns),
    lanes,
  };
  // Short edges claim first, so they take the inner lanes and longer detours wrap around them.
  const byReach = [...edges].sort((a, b) => reach(a) - reach(b));
  const points = new Map(byReach.map((edge) => [edge.id, routeOf(edge, space)]));
  // Each placed label joins the boxes the later labels keep clear of.
  const taken = [...space.boxes];
  return {
    edges: edges.map(({ source, target, ...edge }) => ({
      ...edge,
      points: points.get(edge.id),
      ...(edge.label !== undefined && labelPlace(edge.label, points.get(edge.id), taken)),
    })),
    lanes: lanes.used(),
  };
}

/**
 * `{labelAt}` for the first spot clear of every box in `taken`, else {}, adding the label's box to
 * `taken`. Runs are tried longest first, each at its middle and then beside either end,
 * LABEL_MARGIN/2 in from it.
 */
function labelPlace(label, points, taken) {
  const w = labelWidth(label);
  const half = (w + LABEL_MARGIN) / 2;
  for (const [[left, y], [right]] of horizontalRuns(points)) {
    if (right - left < w + LABEL_MARGIN) continue;
    for (const x of [(left + right) / 2, left + half, right - half]) {
      const box = { x: x - w / 2, y: y - LABEL_H / 2, w, h: LABEL_H };
      if (!taken.some((other) => boxesOverlap(box, other))) {
        taken.push(box);
        return { labelAt: [x, y] };
      }
    }
  }
  return {};
}

/** Points as an SVG path of M, H, V and L commands. */
export function toPathD(points) {
  const steps = points.slice(1).map(([x, y], i) => {
    const [px, py] = points[i];
    if (py === y) {
      return `H${x}`;
    }
    return px === x ? `V${y}` : `L${x} ${y}`;
  });
  return [`M${points[0][0]} ${points[0][1]}`, ...steps].join(' ');
}

function boardEdges(flow, layout) {
  const byId = screensById(flow);
  const back = backEdges(flow);
  const { steps } = primaryPath(flow);
  const actionsOf = new Map(); // edgeKey → the actions from one screen to another
  for (const from of flow.screens) {
    for (const action of from.actions.filter((a) => byId.has(a.to))) {
      const key = edgeKey(from.id, action.to);
      actionsOf.set(key, [...(actionsOf.get(key) ?? []), { from, action }]);
    }
  }
  return [...actionsOf.values()].map((parallel) => {
    const { from } = parallel[0];
    const to = byId.get(parallel[0].action.to);
    const ids = parallel.map(({ action }) => `${from.id}.${action.id}`);
    return {
      id: ids[0],
      ids,
      from: from.id,
      to: to.id,
      kind: kindOf(from, to, back.has(edgeKey(from.id, to.id))),
      primary: ids.some((id) => steps.has(id)),
      dormant: Boolean(from.dormant || to.dormant),
      ...(from.kind === 'decision' && { label: branchLabels(from, new Set([to.id])).get(to.id) }),
      source: layout.nodes.get(from.id),
      target: layout.nodes.get(to.id),
    };
  });
}

function kindOf(from, to, isBack) {
  if (isException(from)) {
    return 'from-exception';
  }
  if (isException(to)) {
    return 'exception';
  }
  return isBack ? 'back' : 'forward';
}

const centerX = (box) => box.x + box.w / 2;
const centerY = (box) => box.y + box.h / 2;
const reach = ({ source, target }) => Math.abs(centerX(source) - centerX(target));

function routeOf(edge, space) {
  const { kind, source, target } = edge;
  if (kind === 'forward' && target.column > source.column) {
    // Turn right after the source, or else right before the target, whichever runs clear.
    const channel = [source.column, target.column - 1].find(
      (c) => !crossesAny(throughChannel(edge, space.channels.center(c)), space.boxes),
    );
    if (channel !== undefined) {
      // A straight edge never turns, so it leaves the channel's slots to the edges that do.
      const turns = centerY(source) !== centerY(target);
      const besideDecision = edge.label !== undefined && channel === source.column;
      const slot = besideDecision ? space.channels.claimBeside : space.channels.claim;
      const x = turns ? slot(channel) : space.channels.center(channel);
      return throughChannel(edge, x);
    }
  }
  return detour(edge, space);
}

/** Right middle of the source → the channel at `x` → left middle of the target. */
function throughChannel({ source, target }, x) {
  return simplify([
    [source.x + source.w, centerY(source)],
    [x, centerY(source)],
    [x, centerY(target)],
    [target.x, centerY(target)],
  ]);
}

/**
 * Out of the source's top or bottom, along a lane outside the main area, into the target's top
 * or bottom. Edges into and out of exceptions use the lanes below, next to the exception band.
 * The others go round the side nearer to their two cards.
 */
function detour({ kind, source, target }, space) {
  const nearTop = (centerY(source) + centerY(target)) / 2 <= space.spineY;
  const side = kind === 'exception' || kind === 'from-exception' || !nearTop ? 'bottom' : 'top';
  const out = cardToLane(source, 'source', side, space);
  const into = cardToLane(target, 'target', side, space);
  const outX = out[out.length - 1][0];
  const intoX = into[into.length - 1][0];
  const laneY = space.lanes.claim(side, outX, intoX);
  return simplify([...out, [outX, laneY], [intoX, laneY], ...[...into].reverse()]);
}

// Where a detour meets a card's top or bottom. A main card sends from its center and takes edges
// in three quarters across, so the two never share a line. An exception card is the other way
// round: an edge dropping into it ends on its top center.
const sendX = (box) => box.x + box.w * (box.band === 'exception' ? 0.75 : 0.5);
const takeX = (box) => box.x + box.w * (box.band === 'exception' ? 0.5 : 0.75);

/**
 * The path from the edge's `end` of a card to where it can run straight out of the main area
 * toward the lanes on `side`: a point on the card's top or bottom when no other card is in the
 * way. A main card faces the lanes with its top or bottom; an exception card, below the main
 * area, always with its top. When a card is in the way, the edge uses the card's sides the way
 * forward edges do: out of its right middle into the channel right of its column, or in at its
 * left middle from the channel left of it.
 */
function cardToLane(box, end, side, space) {
  const x = end === 'source' ? sendX(box) : takeX(box);
  const borderY = side === 'top' || box.band === 'exception' ? box.y : bottomOf(box);
  const areaEdgeY = side === 'top' ? space.mainArea.top : space.mainArea.bottom;
  const straightOut = [
    [x, borderY],
    [x, areaEdgeY],
  ];
  if (!crossesAny(straightOut, space.boxes)) {
    return [[x, borderY]];
  }
  return end === 'source'
    ? [
        [box.x + box.w, centerY(box)],
        [space.channels.claim(box.column), centerY(box)],
      ]
    : [
        [box.x, centerY(box)],
        [space.channels.claim(box.column - 1), centerY(box)],
      ];
}
