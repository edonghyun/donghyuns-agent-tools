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
