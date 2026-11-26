// Board reading of a flow: the view alias, actor colors, the primary path, event locations,
// which nodes lead into each exception node, the exception codes each node leads into, and the
// chips a node shows.

import { ACTOR_PALETTE } from './constants.mjs';
import { isException } from './graph.mjs';
import { runScenario } from './scenario.mjs';

/** A node's kind; a node without one is a screen. */
export const kindOf = (node) => node.kind || 'screen';

export const resolveView = (flow) =>
  flow.view === 'board' || flow.view === 'flowchart' ? 'board' : 'wireframe';

/** Actors as {name, color}; an actor without a color takes the palette color at its index. */
export const actorList = (flow) =>
  (flow.actors || []).map((a, i) => ({
    name: typeof a === 'string' ? a : a?.name,
    color: a?.color || ACTOR_PALETTE[i % ACTOR_PALETTE.length],
  }));

/**
 * Nodes and `node.action` steps the `primary` scenario passes through. A failing scenario keeps
 * what it reached before the failure; no or unknown `primary` gives an empty path.
 * `order` lists nodes by first visit.
 */
export function primaryPath(flow) {
  const scenario = (flow.scenarios || []).find((sc) => sc.id === flow.primary);
  const trail = scenario ? runScenario(flow, scenario).trail : [];
  const nodes = new Set(trail.map((t) => t.screen));
  const steps = new Set(trail.slice(1).map((t, i) => `${trail[i].screen}.${t.action}`));
  return { nodes, steps, order: [...nodes] };
}

/** A location `node` or `node.action` as [nodeId, actionId or undefined]. */
export function splitLocation(at) {
  const dot = at.indexOf('.');
  return dot < 0 ? [at, undefined] : [at.slice(0, dot), at.slice(dot + 1)];
}

/** An event's `at` as a list of `node` or `node.action` locations. */
export const eventLocations = (event) => [event.at ?? []].flat();

/** Each exception node id → ids of the other nodes with an action into it, in `screens` order. */
export function exceptionSources(flow) {
  const sources = new Map();
  for (const s of flow.screens) {
    if (isException(s)) {
      sources.set(s.id, []);
    }
  }
  for (const s of flow.screens) {
    for (const to of new Set(s.actions.map((a) => a.to))) {
      if (to !== s.id) {
        sources.get(to)?.push(s.id);
      }
    }
  }
  return sources;
}

/** Each node id → the codes of the exception nodes it leads into, in `screens` order. */
export function exceptionCodes(flow) {
  const codes = new Map();
  for (const [id, sources] of exceptionSources(flow)) {
    const { exception } = flow.screens.find((s) => s.id === id);
    for (const from of sources) {
      codes.set(from, [...(codes.get(from) ?? []), exception]);
    }
  }
  return codes;
}

/** A card's chips in order: its state, metrics, experiments, notifications, then `codes`. */
export const cardChips = (node, codes = []) => [
  ...(node.state ? [{ type: 'state', text: node.state }] : []),
  ...(node.metrics ?? []).map((text) => ({ type: 'metric', text })),
  ...(node.experiments ?? []).map((text) => ({ type: 'experiment', text })),
  ...(node.notify ?? []).map((text) => ({ type: 'notify', text })),
  ...codes.map((text) => ({ type: 'code', text })),
];
