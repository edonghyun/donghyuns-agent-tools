// Scenario replay: guards, variable updates, and step-by-step walking of a flow.

import { screensById } from './graph.mjs';
import { messages } from './messages.mjs';

const matches = (vars, cond) => Object.entries(cond || {}).every(([k, v]) => vars[k] === v);

export function applyAction(vars, action) {
  const next = { ...vars, ...(action.set || {}) };
  for (const [k, v] of Object.entries(action.inc || {})) {
    next[k] = (Number(next[k]) || 0) + v;
  }
  return next;
}

/** Actions on a screen whose `when` guard currently holds. */
export function enabledActions(screen, vars) {
  return (screen.actions || []).filter((a) => matches(vars, a.when));
}

export function runScenario(flow, scenario) {
  const byId = screensById(flow);
  let screen = scenario.start || flow.start;
  let vars = { ...(flow.vars || {}), ...(scenario.vars || {}) };
  const trail = [{ screen, vars }];
  const M = messages(flow);
  const fail = (i, code, reason) => ({
    id: scenario.id,
    ok: false,
    failedStep: i,
    code,
    reason,
    screen,
    vars,
    trail,
  });
  for (const [i, step] of (scenario.steps || []).entries()) {
    const s = byId.get(screen);
    const action = (s?.actions || []).find((a) => a.id === step.action);
    if (!action) {
      return fail(i, 'not-on-screen', M.notOn(step.action, screen));
    }
    if (!matches(vars, action.when)) {
      return fail(i, 'guard', M.guard(JSON.stringify(action.when), screen, JSON.stringify(vars)));
    }
    if (action.to === null || action.to === undefined) {
      return fail(i, 'missing-link', M.noDest(screen, action.id));
    }
    if (!byId.has(action.to)) {
      return fail(i, 'broken-link', M.unknownDest(screen, action.id, action.to));
    }
    vars = applyAction(vars, action);
    screen = action.to;
    trail.push({ screen, vars, action: action.id });
    if (step.screen && step.screen !== screen) {
      return fail(i, 'wrong-screen', M.wrongScreen(step.screen, screen));
    }
    for (const [k, v] of Object.entries(step.vars || {})) {
      if (vars[k] !== v) {
        return fail(i, 'wrong-vars', M.wrongVar(k, JSON.stringify(v), JSON.stringify(vars[k])));
      }
    }
  }
  return { id: scenario.id, ok: true, screen, vars, trail };
}
