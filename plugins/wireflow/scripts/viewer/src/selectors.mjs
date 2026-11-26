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
 * What the scenario touches, or null when none is picked. `nodes` it visits. Step numbers by
 * 'node.action': `edgeSteps` for the actions taken, `steps` for those plus the one a failing
 * scenario stopped at. `failed` is the 'node.action' of the step that failed, or null.
 */
export function scenarioPath(flow, scenarioId) {
  const scenario = findScenario(flow, scenarioId);
  if (!scenario) return null;
  const run = runScenario(flow, scenario);
  const taken = run.trail.slice(1).map((t, i) => `${run.trail[i].screen}.${t.action}`);
  const edgeSteps = new Map();
  for (const [i, key] of taken.entries()) {
    edgeSteps.set(key, [...(edgeSteps.get(key) || []), i + 1]);
  }
  const steps = new Map(edgeSteps);
  const failed = failedKey(run, scenario, taken);
  if (failed && !taken[run.failedStep]) {
    steps.set(failed, [...(steps.get(failed) || []), run.failedStep + 1]);
  }
  return { steps, edgeSteps, failed, nodes: new Set(run.trail.map((t) => t.screen)) };
}

/**
 * The failing step's 'node.action', or null. A step whose action ran and then led to the wrong
 * screen or vars is the last action taken; any other failure is the action the scenario could
 * not take where it stopped.
 */
function failedKey(run, scenario, taken) {
  if (run.ok) return null;
  if (taken[run.failedStep]) return taken[run.failedStep];
  const action = scenario.steps[run.failedStep]?.action;
  return action ? `${run.screen}.${action}` : null;
}
