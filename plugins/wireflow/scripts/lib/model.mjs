// Wireflow model: validation, static graph checks, scenario replay, proposals.
// Browser-safe: no Node imports. build.mjs inlines this file into the viewer.

const ID = /^[a-z0-9][a-z0-9-]*$/;
export const DEVICES = { mobile: [390, 844], tablet: [820, 1180], desktop: [1280, 800], watch: [198, 242], kiosk: [1080, 1920] };
export const KINDS = ['screen', 'message', 'email', 'document', 'step', 'decision', 'system', 'wait', 'end'];
const VIEWS = ['wireframe', 'flowchart'];
const deviceError = (d) => {
  if (d === undefined || (typeof d === 'string' && d in DEVICES)) return null;
  const ok = (n) => Number.isInteger(n) && n >= 1 && n <= 8192;
  if (d && typeof d === 'object' && ok(d.width) && ok(d.height)) return null;
  return `device ${JSON.stringify(d)} must be one of ${Object.keys(DEVICES).join('/')} or {width, height} in 1..8192`;
};
const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

const MSG = {
  en: {
    notOn: (a, s) => `action "${a}" is not on screen "${s}"`,
    guard: (w, s, v) => `condition ${w} not met on "${s}" (vars ${v})`,
    noDest: (s, a) => `action "${s}.${a}" has no destination (missing link)`,
    unknownDest: (s, a, t) => `action "${s}.${a}" points to unknown screen "${t}"`,
    wrongScreen: (e, g) => `expected screen "${e}", got "${g}"`,
    wrongVar: (k, e, g) => `expected ${k}=${e}, got ${g}`,
    missing: (l) => `"${l}" has no destination yet`,
    broken: (l, t) => `"${l}" points to unknown screen "${t}"`,
    unreachable: (t) => `no path from the start leads to "${t}"`,
    trapped: (t) => `"${t}" has no way back to the start or to an end screen`,
    step: (n, r) => `step ${n}: ${r}`,
    uncovered: (t) => `requirement "${t}" is not checked by any scenario`,
    branches: (t, n) => `decision "${t}" has ${n} branch(es); a decision needs at least two`,
  },
  ko: {
    notOn: (a, s) => `"${s}" 화면에 "${a}" 버튼이 없음`,
    guard: (w, s, v) => `"${s}"에서 조건 ${w} 불충족 (현재 상태 ${v})`,
    noDest: (s, a) => `"${s}.${a}" 버튼에 연결된 화면이 없음`,
    unknownDest: (s, a, t) => `"${s}.${a}" 버튼이 없는 화면 "${t}"를 가리킴`,
    wrongScreen: (e, g) => `"${e}" 화면이어야 하는데 "${g}"에 도착`,
    wrongVar: (k, e, g) => `${k}=${e} 이어야 하는데 ${g}`,
    missing: (l) => `"${l}" 버튼이 아직 어디에도 연결되지 않음`,
    broken: (l, t) => `"${l}" 버튼이 없는 화면 "${t}"를 가리킴`,
    unreachable: (t) => `시작 화면에서 "${t}"로 가는 경로가 없음`,
    trapped: (t) => `"${t}"에서 처음이나 종료 화면으로 돌아갈 방법이 없음`,
    step: (n, r) => `${n}단계: ${r}`,
    uncovered: (t) => `요구사항 "${t}"를 확인하는 시나리오가 없음`,
    branches: (t, n) => `분기 "${t}"의 갈래가 ${n}개뿐임 (2개 이상 필요)`,
  },
};
const msgs = (flow) => MSG[flow.locale === 'en' ? 'en' : 'ko'];

const clone = (x) => JSON.parse(JSON.stringify(x));
const screensById = (flow) => new Map((flow.screens || []).map((s) => [s.id, s]));
const entryIds = (flow) => [flow.start, ...(flow.entries || [])].filter(Boolean);

export function validate(flow) {
  const errs = [];
  if (!flow || typeof flow !== 'object') return ['flow must be a JSON object'];
  for (const k of ['id', 'title', 'start']) if (typeof flow[k] !== 'string' || !flow[k]) errs.push(`missing string field "${k}"`);
  if (!Array.isArray(flow.stages) || flow.stages.length === 0) errs.push('"stages" must be a nonempty array of labels');
  if (!Array.isArray(flow.screens) || flow.screens.length === 0) return [...errs, '"screens" must be a nonempty array'];
  if (flow.view !== undefined && !VIEWS.includes(flow.view)) errs.push(`view "${flow.view}" must be one of ${VIEWS.join('/')}`);
  const fd = deviceError(flow.device);
  if (fd) errs.push(`flow ${fd}`);
  if (flow.actors !== undefined && !Array.isArray(flow.actors)) errs.push('"actors" must be an array of labels');
  if (flow.id && !ID.test(flow.id)) errs.push(`flow id "${flow.id}" must be lowercase letters, digits, hyphens`);

  const seen = new Set();
  for (const s of flow.screens) {
    if (!s || typeof s.id !== 'string') { errs.push('every screen needs a string "id"'); continue; }
    if (seen.has(s.id)) errs.push(`duplicate screen id "${s.id}"`);
    seen.add(s.id);
    if (!ID.test(s.id)) errs.push(`screen id "${s.id}" must be lowercase letters, digits, hyphens`);
    if (!Number.isInteger(s.stage) || s.stage < 0 || s.stage >= (flow.stages || []).length) errs.push(`screen "${s.id}" has stage ${s.stage}, outside stages[0..${(flow.stages || []).length - 1}]`);
    if (s.kind !== undefined && !KINDS.includes(s.kind)) errs.push(`screen "${s.id}" has kind "${s.kind}", expected one of ${KINDS.join('/')}`);
    if (Array.isArray(flow.actors) && s.actor !== undefined && !flow.actors.includes(s.actor)) errs.push(`screen "${s.id}" has actor "${s.actor}", not listed in "actors"`);
    const sd = deviceError(s.device);
    if (sd) errs.push(`screen "${s.id}" ${sd}`);
    if (!Array.isArray(s.actions)) { errs.push(`screen "${s.id}" must declare "actions" (use [] for none)`); continue; }
    const aseen = new Set();
    for (const a of s.actions) {
      if (!a || typeof a.id !== 'string' || typeof a.label !== 'string') { errs.push(`screen "${s.id}" has an action without string id/label`); continue; }
      if (aseen.has(a.id)) errs.push(`screen "${s.id}" has duplicate action id "${a.id}"`);
      aseen.add(a.id);
      if (!('to' in a)) errs.push(`action "${s.id}.${a.id}" must set "to" (screen id, or null for a missing link)`);
    }
  }
  for (const e of entryIds(flow)) if (!seen.has(e)) errs.push(`start/entry "${e}" is not a screen id`);
  const sids = new Set();
  for (const sc of flow.scenarios || []) {
    if (!sc.id || sids.has(sc.id)) errs.push(`scenario id "${sc.id}" missing or duplicate`);
    sids.add(sc.id);
    if (!Array.isArray(sc.steps)) errs.push(`scenario "${sc.id}" needs "steps"`);
  }
  const pids = new Set();
  for (const p of flow.proposals || []) {
    if (!p.id || pids.has(p.id)) errs.push(`proposal id "${p.id}" missing or duplicate`);
    pids.add(p.id);
    if (!Array.isArray(p.changes)) errs.push(`proposal "${p.id}" needs "changes"`);
  }
  return errs;
}

const matches = (vars, cond) => Object.entries(cond || {}).every(([k, v]) => vars[k] === v);

export function applyAction(vars, action) {
  const next = { ...vars, ...(action.set || {}) };
  for (const [k, v] of Object.entries(action.inc || {})) next[k] = (Number(next[k]) || 0) + v;
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
  const M = msgs(flow);
  const fail = (i, code, reason) => ({ id: scenario.id, ok: false, failedStep: i, code, reason, screen, vars, trail });
  for (const [i, step] of (scenario.steps || []).entries()) {
    const s = byId.get(screen);
    const action = (s?.actions || []).find((a) => a.id === step.action);
    if (!action) return fail(i, 'not-on-screen', M.notOn(step.action, screen));
    if (!matches(vars, action.when)) return fail(i, 'guard', M.guard(JSON.stringify(action.when), screen, JSON.stringify(vars)));
    if (action.to === null || action.to === undefined) return fail(i, 'missing-link', M.noDest(screen, action.id));
    if (!byId.has(action.to)) return fail(i, 'broken-link', M.unknownDest(screen, action.id, action.to));
    vars = applyAction(vars, action);
    screen = action.to;
    trail.push({ screen, vars, action: action.id });
    if (step.screen && step.screen !== screen) return fail(i, 'wrong-screen', M.wrongScreen(step.screen, screen));
    for (const [k, v] of Object.entries(step.vars || {})) {
      if (vars[k] !== v) return fail(i, 'wrong-vars', M.wrongVar(k, JSON.stringify(v), JSON.stringify(vars[k])));
    }
  }
  return { id: scenario.id, ok: true, screen, vars, trail };
}

export function applyProposals(flow, ids = []) {
  const out = clone(flow);
  const byId = new Map((flow.proposals || []).map((p) => [p.id, p]));
  const touched = new Map();
  for (const pid of ids) {
    const p = byId.get(pid);
    if (!p) throw new Error(`unknown proposal "${pid}"`);
    for (const c of p.changes || []) {
      if (c.addScreen) {
        const key = `screen:${c.addScreen.id}`;
        if (touched.has(key) && touched.get(key) !== pid) throw new Error(`proposal conflict: "${touched.get(key)}" and "${pid}" both add screen "${c.addScreen.id}"`);
        touched.set(key, pid);
        if (!out.screens.some((s) => s.id === c.addScreen.id)) out.screens.push({ origin: 'proposed', ...clone(c.addScreen) });
        continue;
      }
      const s = out.screens.find((x) => x.id === c.screen);
      if (!s) throw new Error(`proposal "${pid}" changes unknown screen "${c.screen}"`);
      const aid = c.action?.id ?? c.removeAction;
      const key = `${c.screen}.${aid}`;
      if (touched.has(key) && touched.get(key) !== pid) throw new Error(`proposal conflict: "${touched.get(key)}" and "${pid}" both change action "${key}"`);
      touched.set(key, pid);
      if (c.removeAction) { s.actions = s.actions.filter((a) => a.id !== c.removeAction); continue; }
      const i = s.actions.findIndex((a) => a.id === c.action.id);
      const next = { ...clone(c.action), proposed: pid };
      if (i >= 0) s.actions[i] = next; else s.actions.push(next);
    }
  }
  return out;
}

function reach(starts, edges) {
  const seen = new Set(starts);
  const stack = [...starts];
  while (stack.length) for (const n of edges.get(stack.pop()) || []) if (!seen.has(n)) { seen.add(n); stack.push(n); }
  return seen;
}

export function check(input, opts = {}) {
  const errors = validate(input);
  if (errors.length) return { errors, findings: [], scenarios: [], requirements: [], applied: [] };
  const applied = opts.with || [];
  const flow = applied.length ? applyProposals(input, applied) : input;
  const byId = screensById(flow);
  const findings = [];
  const M = msgs(flow);
  const add = (f) => findings.push(f);

  const fwd = new Map();
  const back = new Map();
  for (const s of flow.screens) {
    fwd.set(s.id, []);
    for (const a of s.actions) {
      if (a.to === null || a.to === undefined) {
        add({ code: 'missing-link', severity: 'warning', screen: s.id, action: a.id, message: M.missing(a.label) });
      } else if (!byId.has(a.to)) {
        add({ code: 'broken-link', severity: 'critical', screen: s.id, action: a.id, message: M.broken(a.label, a.to) });
      } else {
        fwd.get(s.id).push(a.to);
        if (!back.has(a.to)) back.set(a.to, []);
        back.get(a.to).push(s.id);
      }
    }
  }

  for (const s of flow.screens) {
    if (s.kind === 'decision' && s.actions.length < 2) add({ code: 'decision-branches', severity: 'warning', screen: s.id, message: M.branches(s.title, s.actions.length) });
  }

  const reachable = reach(entryIds(flow), fwd);
  const exits = [...entryIds(flow), ...flow.screens.filter((s) => s.end).map((s) => s.id)];
  const canExit = reach(exits, back);
  for (const s of flow.screens) {
    if (!reachable.has(s.id)) add({ code: 'unreachable', severity: 'warning', screen: s.id, message: M.unreachable(s.title) });
    else if (!canExit.has(s.id)) add({ code: 'trapped', severity: 'critical', screen: s.id, message: M.trapped(s.title) });
  }

  const scenarios = (flow.scenarios || []).map((sc) => runScenario(flow, sc));
  for (const r of scenarios) {
    if (!r.ok) add({ code: 'scenario-failed', severity: 'critical', scenario: r.id, screen: r.screen, step: r.failedStep, message: M.step(r.failedStep + 1, r.reason) });
  }

  const passed = new Map(scenarios.map((r) => [r.id, r.ok]));
  const requirements = (flow.requirements || []).map((q) => {
    const linked = (flow.scenarios || []).filter((sc) => (sc.requirements || []).includes(q.id)).map((sc) => sc.id);
    const status = linked.length === 0 ? 'uncovered' : linked.every((id) => passed.get(id)) ? 'passed' : 'failed';
    if (status === 'uncovered') add({ code: 'uncovered-requirement', severity: 'info', requirement: q.id, screen: q.screen, message: M.uncovered(q.title) });
    return { id: q.id, status, scenarios: linked };
  });

  findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  return { errors: [], findings, scenarios: scenarios.map(({ trail, ...r }) => r), requirements, applied };
}

export function exitCode(result) {
  if (result.errors.length) return 2;
  return result.findings.some((f) => f.severity !== 'info') ? 1 : 0;
}
