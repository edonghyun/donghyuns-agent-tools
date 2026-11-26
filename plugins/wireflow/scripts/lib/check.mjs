// Static checks of a flow: dangling links, dead ends, scenario replay, requirement coverage,
// and the board fields (events, primary path, exceptions).

import { eventLocations, exceptionSources, primaryPath, splitLocation } from './board.mjs';
import { SEVERITY_ORDER } from './constants.mjs';
import { edgesOf, entryIds, reach, screensById } from './graph.mjs';
import { messages } from './messages.mjs';
import { applyProposals } from './proposals.mjs';
import { runScenario } from './scenario.mjs';
import { validate } from './validate.mjs';

export function check(input, opts = {}) {
  const errors = validate(input);
  if (errors.length) {
    return { errors, findings: [], scenarios: [], requirements: [], applied: [] };
  }
  const applied = opts.with || [];
  const flow = applied.length ? applyProposals(input, applied) : input;
  const findings = [];
  const M = messages(flow);
  const add = (f) => findings.push(f);

  const { fwd, back, dangling } = edgesOf(flow);
  for (const { screen, action, to } of dangling) {
    if (to === null || to === undefined) {
      add({
        code: 'missing-link',
        severity: 'warning',
        screen,
        action: action.id,
        message: M.missing(action.label),
      });
    } else {
      add({
        code: 'broken-link',
        severity: 'critical',
        screen,
        action: action.id,
        message: M.broken(action.label, to),
      });
    }
  }

  for (const s of flow.screens) {
    if (s.kind === 'decision' && s.actions.length < 2) {
      add({
        code: 'decision-branches',
        severity: 'warning',
        screen: s.id,
        message: M.branches(s.title, s.actions.length),
      });
    }
  }

  const orphans = [...exceptionSources(flow)].filter(([, from]) => !from.length).map(([id]) => id);
  const reachable = reach(entryIds(flow), fwd);
  const exits = [...entryIds(flow), ...flow.screens.filter((s) => s.end).map((s) => s.id)];
  const canExit = reach(exits, back);
  for (const s of flow.screens) {
    // An orphan exception is unreachable by definition; orphan-exception reports it once.
    if (orphans.includes(s.id)) {
      continue;
    }
    if (!reachable.has(s.id)) {
      add({
        code: 'unreachable',
        severity: 'warning',
        screen: s.id,
        message: M.unreachable(s.title),
      });
    } else if (!canExit.has(s.id)) {
      add({ code: 'trapped', severity: 'critical', screen: s.id, message: M.trapped(s.title) });
    }
  }

  const scenarios = (flow.scenarios || []).map((sc) => runScenario(flow, sc));
  for (const r of scenarios) {
    if (!r.ok) {
      add({
        code: 'scenario-failed',
        severity: 'critical',
        scenario: r.id,
        screen: r.screen,
        step: r.failedStep,
        message: M.step(r.failedStep + 1, r.reason),
      });
    }
  }

  const passed = new Map(scenarios.map((r) => [r.id, r.ok]));
  const requirements = (flow.requirements || []).map((q) => {
    const linked = (flow.scenarios || [])
      .filter((sc) => (sc.requirements || []).includes(q.id))
      .map((sc) => sc.id);
    const status =
      linked.length === 0
        ? 'uncovered'
        : linked.every((id) => passed.get(id))
          ? 'passed'
          : 'failed';
    if (status === 'uncovered') {
      add({
        code: 'uncovered-requirement',
        severity: 'info',
        requirement: q.id,
        screen: q.screen,
        message: M.uncovered(q.title),
      });
    }
    return { id: q.id, status, scenarios: linked };
  });

  const byId = screensById(flow);
  findings.push(
    ...brokenEvents(flow, byId, M),
    ...unknownPrimary(flow, M),
    ...orphanExceptions(orphans, byId, M),
    ...untrackedSteps(flow, byId, M),
  );

  findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return {
    errors: [],
    findings,
    scenarios: scenarios.map(({ trail, ...r }) => r),
    requirements,
    applied,
  };
}

export function exitCode(result) {
  if (result.errors.length) {
    return 2;
  }
  return result.findings.some((f) => f.severity !== 'info') ? 1 : 0;
}

function brokenEvents(flow, byId, M) {
  const exists = (at) => {
    const [node, action] = splitLocation(at);
    const s = byId.get(node);
    return Boolean(s) && (action === undefined || s.actions.some((a) => a.id === action));
  };
  return (flow.events || []).flatMap((e) =>
    eventLocations(e)
      .filter((at) => !exists(at))
      .map((at) => ({
        code: 'broken-event',
        severity: 'critical',
        event: e.id,
        message: M.brokenEvent(e.id, at),
      })),
  );
}

function unknownPrimary(flow, M) {
  if (flow.primary === undefined || (flow.scenarios || []).some((sc) => sc.id === flow.primary)) {
    return [];
  }
  return [
    {
      code: 'unknown-primary',
      severity: 'critical',
      scenario: flow.primary,
      message: M.unknownPrimary(flow.primary),
    },
  ];
}

function orphanExceptions(orphans, byId, M) {
  return orphans.map((id) => ({
    code: 'orphan-exception',
    severity: 'warning',
    screen: id,
    message: M.orphanException(byId.get(id).exception, byId.get(id).title),
  }));
}

/**
 * Primary-path steps with no event. A step is the entry node, or a `node.action` transition plus
 * the node it lands on; an event on either the transition or the landing node tracks it.
 */
function untrackedSteps(flow, byId, M) {
  const events = flow.events || [];
  if (events.length === 0) {
    return [];
  }
  const tracked = new Set(events.flatMap(eventLocations));
  const { steps, order } = primaryPath(flow);
  const walk = [...steps].map((transition) => {
    const [node, action] = splitLocation(transition);
    const landing = byId.get(node).actions.find((a) => a.id === action).to;
    return { screen: node, action, transition, landing };
  });
  if (order.length) {
    walk.unshift({ screen: order[0], landing: order[0] });
  }
  return walk
    .filter((w) => !tracked.has(w.transition) && !tracked.has(w.landing))
    .map((w) => ({
      code: 'untracked-step',
      severity: 'info',
      screen: w.screen,
      action: w.action,
      message: M.untracked(byId.get(w.landing).title),
    }));
}
