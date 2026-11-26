// Static checks of a flow: dangling links, dead ends, scenario replay, requirement coverage.

import { SEVERITY_ORDER } from './constants.mjs';
import { edgesOf, entryIds, reach } from './graph.mjs';
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

  const reachable = reach(entryIds(flow), fwd);
  const exits = [...entryIds(flow), ...flow.screens.filter((s) => s.end).map((s) => s.id)];
  const canExit = reach(exits, back);
  for (const s of flow.screens) {
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
