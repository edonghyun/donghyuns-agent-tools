// Proposals: named change sets applied to a copy of a flow, with conflict detection.

const clone = (x) => JSON.parse(JSON.stringify(x));

export function applyProposals(flow, ids = []) {
  const out = clone(flow);
  const byId = new Map((flow.proposals || []).map((p) => [p.id, p]));
  const touched = new Map();
  for (const pid of ids) {
    const p = byId.get(pid);
    if (!p) {
      throw new Error(`unknown proposal "${pid}"`);
    }
    for (const c of p.changes || []) {
      if (c.addScreen) {
        const key = `screen:${c.addScreen.id}`;
        if (touched.has(key) && touched.get(key) !== pid) {
          throw new Error(
            `proposal conflict: "${touched.get(key)}" and "${pid}" both add screen "${c.addScreen.id}"`,
          );
        }
        touched.set(key, pid);
        if (!out.screens.some((s) => s.id === c.addScreen.id)) {
          out.screens.push({ origin: 'proposed', ...clone(c.addScreen) });
        }
        continue;
      }
      const s = out.screens.find((x) => x.id === c.screen);
      if (!s) {
        throw new Error(`proposal "${pid}" changes unknown screen "${c.screen}"`);
      }
      const aid = c.action?.id ?? c.removeAction;
      const key = `${c.screen}.${aid}`;
      if (touched.has(key) && touched.get(key) !== pid) {
        throw new Error(
          `proposal conflict: "${touched.get(key)}" and "${pid}" both change action "${key}"`,
        );
      }
      touched.set(key, pid);
      if (c.removeAction) {
        s.actions = s.actions.filter((a) => a.id !== c.removeAction);
        continue;
      }
      const i = s.actions.findIndex((a) => a.id === c.action.id);
      const next = { ...clone(c.action), proposed: pid };
      if (i >= 0) {
        s.actions[i] = next;
      } else {
        s.actions.push(next);
      }
    }
  }
  return out;
}
