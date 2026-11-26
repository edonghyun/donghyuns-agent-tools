// How screens connect: lookups by id, entry points, action edges, and reachability.

export const screensById = (flow) => new Map((flow.screens || []).map((s) => [s.id, s]));
export const entryIds = (flow) => [flow.start, ...(flow.entries || [])].filter(Boolean);

/** Edges between existing screens, plus the actions whose `to` is missing or unknown. */
export function edgesOf(flow) {
  const byId = screensById(flow);
  const fwd = new Map();
  const back = new Map();
  const dangling = [];
  for (const s of flow.screens) {
    fwd.set(s.id, []);
    for (const a of s.actions) {
      if (!byId.has(a.to)) {
        dangling.push({ screen: s.id, action: a, to: a.to });
        continue;
      }
      fwd.get(s.id).push(a.to);
      if (!back.has(a.to)) {
        back.set(a.to, []);
      }
      back.get(a.to).push(s.id);
    }
  }
  return { fwd, back, dangling };
}

/** Every node reachable from `starts` by following `edges`, starts included. */
export function reach(starts, edges) {
  const seen = new Set(starts);
  const stack = [...starts];
  while (stack.length) {
    for (const n of edges.get(stack.pop()) || []) {
      if (!seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return seen;
}

/** True for an exception node: one whose `exception` holds its code. */
export const isException = (screen) => typeof screen.exception === 'string';

/** Key of the edge from → to in a `backEdges` set. */
export const edgeKey = (from, to) => `${from} ${to}`;

/**
 * Depth-first walk over action edges: entries in order, then unvisited screens in `screens`
 * order. Each node follows its actions in order, but non-exception targets before exception
 * targets, so a retry edge out of an exception is the one that closes the loop.
 * A back edge leads into a node still on the walk's path.
 * `order` lists the nodes topologically once back edges are removed.
 */
function depthFirst(flow) {
  const byId = screensById(flow);
  const { fwd } = edgesOf(flow);
  const color = new Map();
  const post = [];
  const back = new Set();
  const stack = [];
  const enter = (node) => {
    const to = fwd.get(node);
    const targets = [
      ...to.filter((t) => !isException(byId.get(t))),
      ...to.filter((t) => isException(byId.get(t))),
    ];
    color.set(node, 'grey');
    stack.push({ node, targets, next: 0 });
  };
  for (const root of [...entryIds(flow), ...fwd.keys()]) {
    if (color.has(root) || !fwd.has(root)) {
      continue;
    }
    enter(root);
    while (stack.length) {
      const top = stack[stack.length - 1];
      if (top.next === top.targets.length) {
        color.set(top.node, 'black');
        post.push(top.node);
        stack.pop();
        continue;
      }
      const to = top.targets[top.next++];
      if (color.get(to) === 'grey') {
        back.add(edgeKey(top.node, to));
      } else if (!color.has(to)) {
        enter(to);
      }
    }
  }
  return { byId, fwd, back, order: post.reverse() };
}

/** The `edgeKey`s of the edges that close a loop in the walk `rankNodes` ranks by. */
export const backEdges = (flow) => depthFirst(flow).back;

export const isBackEdge = (flow, from, to) => backEdges(flow).has(edgeKey(from, to));

/**
 * Each node's column rank, in `screens` order: the longest path from the entries once back edges
 * and edges into exception nodes are dropped. A node no entry reaches takes the lowest rank
 * among reached nodes of its stage, or 0.
 */
export function rankNodes(flow) {
  const { byId, fwd, back, order } = depthFirst(flow);
  const rank = new Map(
    entryIds(flow)
      .filter((id) => fwd.has(id))
      .map((id) => [id, 0]),
  );
  for (const from of order) {
    if (!rank.has(from)) {
      continue;
    }
    for (const to of fwd.get(from)) {
      if (!back.has(edgeKey(from, to)) && !isException(byId.get(to))) {
        rank.set(to, Math.max(rank.get(to) ?? 0, rank.get(from) + 1));
      }
    }
  }
  const stageMin = new Map();
  for (const [id, r] of rank) {
    const stage = byId.get(id).stage;
    stageMin.set(stage, Math.min(stageMin.get(stage) ?? r, r));
  }
  return new Map(flow.screens.map((s) => [s.id, rank.get(s.id) ?? stageMin.get(s.stage) ?? 0]));
}
