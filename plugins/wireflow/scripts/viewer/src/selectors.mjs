// Values components read off the state: node lookup, display numbers, and the highlighted
// scenario. Pure.

import { runScenario } from '../../lib/index.mjs';

export const findNode = (flow, id) => flow.screens.find((s) => s.id === id);
export const findScenario = (flow, id) => (flow.scenarios || []).find((s) => s.id === id);

/** The values a node shows outside the walk-through: the flow's vars under its `preview`. */
export const previewVars = (flow, node) => ({ ...(flow.vars || {}), ...(node.preview || {}) });

/** `node.number`, else 'stage.position' within the stage, two digits each. */
export function displayNumber(flow, node) {
  if (node.number) return node.number;
  const peers = flow.screens.filter((s) => s.stage === node.stage);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(node.stage + 1)}.${pad(peers.indexOf(node) + 1)}`;
}

/**
 * What the scenario touches, or null when none is picked. `nodes` it visits; step numbers by
 * 'node.action' in `edgeSteps` for the actions taken, and in `steps` for those plus the action
 * a failing scenario stopped at.
 */
export function scenarioPath(flow, scenarioId) {
  const scenario = findScenario(flow, scenarioId);
  if (!scenario) return null;
  const run = runScenario(flow, scenario);
  const edgeSteps = new Map();
  run.trail.slice(1).forEach((t, i) => {
    const key = `${run.trail[i].screen}.${t.action}`;
    edgeSteps.set(key, [...(edgeSteps.get(key) || []), i + 1]);
  });
  const steps = new Map(edgeSteps);
  const failedAction = !run.ok && scenario.steps[run.failedStep]?.action;
  if (failedAction) steps.set(`${run.screen}.${failedAction}`, [run.failedStep + 1]);
  return { steps, edgeSteps, nodes: new Set(run.trail.map((t) => t.screen)) };
}
