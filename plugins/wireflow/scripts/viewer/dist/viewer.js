(() => {
  // scripts/lib/constants.mjs
  var ID = /^[a-z0-9][a-z0-9-]*$/;
  var DEVICES = {
    mobile: [390, 844],
    tablet: [820, 1180],
    desktop: [1280, 800],
    watch: [198, 242],
    kiosk: [1080, 1920]
  };
  var KINDS = [
    "screen",
    "message",
    "email",
    "document",
    "step",
    "decision",
    "system",
    "wait",
    "end"
  ];
  var VIEWS = ["board", "wireframe", "flowchart"];
  var EVENT_TYPES = ["normal", "drop", "error"];
  var HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
  var ACTOR_PALETTE = ["#8563AA", "#B4791F", "#148A6E", "#2F53C4", "#B3385A", "#5F6B7A"];
  var SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };

  // scripts/lib/graph.mjs
  var screensById = (flow) => new Map((flow.screens || []).map((s) => [s.id, s]));
  var entryIds = (flow) => [flow.start, ...flow.entries || []].filter(Boolean);
  function edgesOf(flow) {
    const byId = screensById(flow);
    const fwd = /* @__PURE__ */ new Map();
    const back = /* @__PURE__ */ new Map();
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
  function reach(starts, edges) {
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
  var isException = (screen) => typeof screen.exception === "string";
  var edgeKey = (from, to) => `${from} ${to}`;
  function depthFirst(flow) {
    const byId = screensById(flow);
    const { fwd } = edgesOf(flow);
    const color = /* @__PURE__ */ new Map();
    const post = [];
    const back = /* @__PURE__ */ new Set();
    const stack = [];
    const enter = (node) => {
      const to = fwd.get(node);
      const targets = [
        ...to.filter((t) => !isException(byId.get(t))),
        ...to.filter((t) => isException(byId.get(t)))
      ];
      color.set(node, "grey");
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
          color.set(top.node, "black");
          post.push(top.node);
          stack.pop();
          continue;
        }
        const to = top.targets[top.next++];
        if (color.get(to) === "grey") {
          back.add(edgeKey(top.node, to));
        } else if (!color.has(to)) {
          enter(to);
        }
      }
    }
    return { byId, fwd, back, order: post.reverse() };
  }
  var backEdges = (flow) => depthFirst(flow).back;
  function rankNodes(flow) {
    const { byId, fwd, back, order } = depthFirst(flow);
    const rank = new Map(
      entryIds(flow).filter((id) => fwd.has(id)).map((id) => [id, 0])
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
    const stageMin = /* @__PURE__ */ new Map();
    for (const [id, r] of rank) {
      const stage = byId.get(id).stage;
      stageMin.set(stage, Math.min(stageMin.get(stage) ?? r, r));
    }
    return new Map(flow.screens.map((s) => [s.id, rank.get(s.id) ?? stageMin.get(s.stage) ?? 0]));
  }

  // scripts/lib/messages.mjs
  var MSG = {
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
      brokenEvent: (id, at) => `event "${id}" points to unknown location "${at}"`,
      unknownPrimary: (id) => `primary path scenario "${id}" does not exist`,
      orphanException: (code, t) => `nothing leads into exception "${code} ${t}"`,
      untracked: (t) => `primary path step "${t}" has no event`
    },
    ko: {
      notOn: (a, s) => `"${s}" \uD654\uBA74\uC5D0 "${a}" \uBC84\uD2BC\uC774 \uC5C6\uC74C`,
      guard: (w, s, v) => `"${s}"\uC5D0\uC11C \uC870\uAC74 ${w} \uBD88\uCDA9\uC871 (\uD604\uC7AC \uC0C1\uD0DC ${v})`,
      noDest: (s, a) => `"${s}.${a}" \uBC84\uD2BC\uC5D0 \uC5F0\uACB0\uB41C \uD654\uBA74\uC774 \uC5C6\uC74C`,
      unknownDest: (s, a, t) => `"${s}.${a}" \uBC84\uD2BC\uC774 \uC5C6\uB294 \uD654\uBA74 "${t}"\uB97C \uAC00\uB9AC\uD0B4`,
      wrongScreen: (e, g) => `"${e}" \uD654\uBA74\uC774\uC5B4\uC57C \uD558\uB294\uB370 "${g}"\uC5D0 \uB3C4\uCC29`,
      wrongVar: (k, e, g) => `${k}=${e} \uC774\uC5B4\uC57C \uD558\uB294\uB370 ${g}`,
      missing: (l) => `"${l}" \uBC84\uD2BC\uC774 \uC544\uC9C1 \uC5B4\uB514\uC5D0\uB3C4 \uC5F0\uACB0\uB418\uC9C0 \uC54A\uC74C`,
      broken: (l, t) => `"${l}" \uBC84\uD2BC\uC774 \uC5C6\uB294 \uD654\uBA74 "${t}"\uB97C \uAC00\uB9AC\uD0B4`,
      unreachable: (t) => `\uC2DC\uC791 \uD654\uBA74\uC5D0\uC11C "${t}"\uB85C \uAC00\uB294 \uACBD\uB85C\uAC00 \uC5C6\uC74C`,
      trapped: (t) => `"${t}"\uC5D0\uC11C \uCC98\uC74C\uC774\uB098 \uC885\uB8CC \uD654\uBA74\uC73C\uB85C \uB3CC\uC544\uAC08 \uBC29\uBC95\uC774 \uC5C6\uC74C`,
      step: (n, r) => `${n}\uB2E8\uACC4: ${r}`,
      uncovered: (t) => `\uC694\uAD6C\uC0AC\uD56D "${t}"\uB97C \uD655\uC778\uD558\uB294 \uC2DC\uB098\uB9AC\uC624\uAC00 \uC5C6\uC74C`,
      branches: (t, n) => `\uBD84\uAE30 "${t}"\uC758 \uAC08\uB798\uAC00 ${n}\uAC1C\uBFD0\uC784 (2\uAC1C \uC774\uC0C1 \uD544\uC694)`,
      brokenEvent: (id, at) => `\uC774\uBCA4\uD2B8 "${id}"\uAC00 \uC5C6\uB294 \uC704\uCE58 "${at}"\uB97C \uAC00\uB9AC\uD0B4`,
      unknownPrimary: (id) => `\uAE30\uBCF8 \uACBD\uB85C \uC2DC\uB098\uB9AC\uC624 "${id}"\uAC00 \uC5C6\uC74C`,
      orphanException: (code, t) => `\uC608\uC678 "${code} ${t}"\uB85C \uB4E4\uC5B4\uC624\uB294 \uC5F0\uACB0\uC774 \uC5C6\uC74C`,
      untracked: (t) => `\uAE30\uBCF8 \uACBD\uB85C "${t}" \uB2E8\uACC4\uC5D0 \uC774\uBCA4\uD2B8\uAC00 \uC5C6\uC74C`
    }
  };
  function messages(flow) {
    return MSG[flow.locale === "en" ? "en" : "ko"];
  }

  // scripts/lib/scenario.mjs
  var matches = (vars, cond) => Object.entries(cond || {}).every(([k, v]) => vars[k] === v);
  function applyAction(vars, action) {
    const next = { ...vars, ...action.set || {} };
    for (const [k, v] of Object.entries(action.inc || {})) {
      next[k] = (Number(next[k]) || 0) + v;
    }
    return next;
  }
  function enabledActions(screen, vars) {
    return (screen.actions || []).filter((a) => matches(vars, a.when));
  }
  function runScenario(flow, scenario) {
    const byId = screensById(flow);
    let screen = scenario.start || flow.start;
    let vars = { ...flow.vars || {}, ...scenario.vars || {} };
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
      trail
    });
    for (const [i, step] of (scenario.steps || []).entries()) {
      const s = byId.get(screen);
      const action = (s?.actions || []).find((a) => a.id === step.action);
      if (!action) {
        return fail(i, "not-on-screen", M.notOn(step.action, screen));
      }
      if (!matches(vars, action.when)) {
        return fail(i, "guard", M.guard(JSON.stringify(action.when), screen, JSON.stringify(vars)));
      }
      if (action.to === null || action.to === void 0) {
        return fail(i, "missing-link", M.noDest(screen, action.id));
      }
      if (!byId.has(action.to)) {
        return fail(i, "broken-link", M.unknownDest(screen, action.id, action.to));
      }
      vars = applyAction(vars, action);
      screen = action.to;
      trail.push({ screen, vars, action: action.id });
      if (step.screen && step.screen !== screen) {
        return fail(i, "wrong-screen", M.wrongScreen(step.screen, screen));
      }
      for (const [k, v] of Object.entries(step.vars || {})) {
        if (vars[k] !== v) {
          return fail(i, "wrong-vars", M.wrongVar(k, JSON.stringify(v), JSON.stringify(vars[k])));
        }
      }
    }
    return { id: scenario.id, ok: true, screen, vars, trail };
  }

  // scripts/lib/board.mjs
  var kindOf = (node) => node.kind || "screen";
  var resolveView = (flow) => flow.view === "board" || flow.view === "flowchart" ? "board" : "wireframe";
  var actorList = (flow) => (flow.actors || []).map((a, i) => ({
    name: typeof a === "string" ? a : a?.name,
    color: a?.color || ACTOR_PALETTE[i % ACTOR_PALETTE.length]
  }));
  function primaryPath(flow) {
    const scenario = (flow.scenarios || []).find((sc) => sc.id === flow.primary);
    const trail = scenario ? runScenario(flow, scenario).trail : [];
    const nodes = new Set(trail.map((t) => t.screen));
    const steps = new Set(trail.slice(1).map((t, i) => `${trail[i].screen}.${t.action}`));
    return { nodes, steps, order: [...nodes] };
  }
  function splitLocation(at) {
    const dot = at.indexOf(".");
    return dot < 0 ? [at, void 0] : [at.slice(0, dot), at.slice(dot + 1)];
  }
  var eventLocations = (event) => [event.at ?? []].flat();
  function exceptionSources(flow) {
    const sources = /* @__PURE__ */ new Map();
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
  function exceptionCodes(flow) {
    const codes = /* @__PURE__ */ new Map();
    for (const [id, sources] of exceptionSources(flow)) {
      const { exception } = flow.screens.find((s) => s.id === id);
      for (const from of sources) {
        codes.set(from, [...codes.get(from) ?? [], exception]);
      }
    }
    return codes;
  }
  var cardChips = (node, codes = []) => [
    ...node.state ? [{ type: "state", text: node.state }] : [],
    ...(node.metrics ?? []).map((text2) => ({ type: "metric", text: text2 })),
    ...(node.experiments ?? []).map((text2) => ({ type: "experiment", text: text2 })),
    ...(node.notify ?? []).map((text2) => ({ type: "notify", text: text2 })),
    ...codes.map((text2) => ({ type: "code", text: text2 }))
  ];

  // scripts/lib/proposals.mjs
  var clone = (x) => JSON.parse(JSON.stringify(x));
  function applyProposals(flow, ids = []) {
    const out = clone(flow);
    const byId = new Map((flow.proposals || []).map((p) => [p.id, p]));
    const touched = /* @__PURE__ */ new Map();
    for (const pid of ids) {
      const p = byId.get(pid);
      if (!p) {
        throw new Error(`unknown proposal "${pid}"`);
      }
      for (const c of p.changes || []) {
        if (c.addScreen) {
          const key2 = `screen:${c.addScreen.id}`;
          if (touched.has(key2) && touched.get(key2) !== pid) {
            throw new Error(
              `proposal conflict: "${touched.get(key2)}" and "${pid}" both add screen "${c.addScreen.id}"`
            );
          }
          touched.set(key2, pid);
          if (!out.screens.some((s2) => s2.id === c.addScreen.id)) {
            out.screens.push({ origin: "proposed", ...clone(c.addScreen) });
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
            `proposal conflict: "${touched.get(key)}" and "${pid}" both change action "${key}"`
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

  // scripts/lib/validate.mjs
  var isLabel = (x) => typeof x === "string" && x !== "";
  var isLabelList = (v) => Array.isArray(v) && v.every(isLabel);
  var isActor = (a) => isLabel(a) || isLabel(a?.name);
  var NODE_LISTS = ["metrics", "experiments", "notify", "notes", "decisions"];
  var isEventProp = (p) => isLabel(p?.name) && (p.use === void 0 || typeof p.use === "string");
  var deviceError = (d) => {
    if (d === void 0 || typeof d === "string" && d in DEVICES) {
      return null;
    }
    const ok = (n) => Number.isInteger(n) && n >= 1 && n <= 8192;
    if (d && typeof d === "object" && ok(d.width) && ok(d.height)) {
      return null;
    }
    return `device ${JSON.stringify(d)} must be one of ${Object.keys(DEVICES).join("/")} or {width, height} in 1..8192`;
  };
  function validate(flow) {
    const errs = [];
    if (!flow || typeof flow !== "object") {
      return ["flow must be a JSON object"];
    }
    for (const k of ["id", "title", "start"]) {
      if (typeof flow[k] !== "string" || !flow[k]) {
        errs.push(`missing string field "${k}"`);
      }
    }
    if (!Array.isArray(flow.stages) || flow.stages.length === 0) {
      errs.push('"stages" must be a nonempty array of labels');
    }
    if (!Array.isArray(flow.screens) || flow.screens.length === 0) {
      return [...errs, '"screens" must be a nonempty array'];
    }
    if (flow.view !== void 0 && !VIEWS.includes(flow.view)) {
      errs.push(`view "${flow.view}" must be one of ${VIEWS.join("/")}`);
    }
    const fd = deviceError(flow.device);
    if (fd) {
      errs.push(`flow ${fd}`);
    }
    if (flow.actors !== void 0 && !Array.isArray(flow.actors)) {
      errs.push('"actors" must be an array of labels or {name, color}');
    }
    const actorNames = Array.isArray(flow.actors) ? actorList(flow).map((a) => a.name) : null;
    for (const a of Array.isArray(flow.actors) ? flow.actors : []) {
      if (!isActor(a)) {
        errs.push(`actor ${JSON.stringify(a)} must be a label or {name, color}`);
      } else if (typeof a === "object" && a.color !== void 0 && !HEX_COLOR.test(a.color)) {
        errs.push(`actor "${a.name}" has color ${JSON.stringify(a.color)}, expected #RRGGBB`);
      }
    }
    if (flow.id && !ID.test(flow.id)) {
      errs.push(`flow id "${flow.id}" must be lowercase letters, digits, hyphens`);
    }
    const seen = /* @__PURE__ */ new Set();
    const codes = /* @__PURE__ */ new Set();
    for (const s of flow.screens) {
      if (!s || typeof s.id !== "string") {
        errs.push('every screen needs a string "id"');
        continue;
      }
      if (seen.has(s.id)) {
        errs.push(`duplicate screen id "${s.id}"`);
      }
      seen.add(s.id);
      if (!ID.test(s.id)) {
        errs.push(`screen id "${s.id}" must be lowercase letters, digits, hyphens`);
      }
      if (!Number.isInteger(s.stage) || s.stage < 0 || s.stage >= (flow.stages || []).length) {
        errs.push(
          `screen "${s.id}" has stage ${s.stage}, outside stages[0..${(flow.stages || []).length - 1}]`
        );
      }
      if (s.kind !== void 0 && !KINDS.includes(s.kind)) {
        errs.push(`screen "${s.id}" has kind "${s.kind}", expected one of ${KINDS.join("/")}`);
      }
      if (actorNames && s.actor !== void 0 && !actorNames.includes(s.actor)) {
        errs.push(`screen "${s.id}" has actor "${s.actor}", not listed in "actors"`);
      }
      if (s.exception !== void 0) {
        if (typeof s.exception !== "string" || !s.exception) {
          errs.push(`screen "${s.id}" has exception ${JSON.stringify(s.exception)}, expected a code`);
        } else if (codes.has(s.exception)) {
          errs.push(`duplicate exception code "${s.exception}"`);
        }
        codes.add(s.exception);
      }
      for (const field of NODE_LISTS) {
        if (s[field] !== void 0 && !isLabelList(s[field])) {
          errs.push(
            `screen "${s.id}" has ${field} ${JSON.stringify(s[field])}, expected a list of labels`
          );
        }
      }
      if (s.state !== void 0 && typeof s.state !== "string") {
        errs.push(`screen "${s.id}" has state ${JSON.stringify(s.state)}, expected a label`);
      }
      const sd = deviceError(s.device);
      if (sd) {
        errs.push(`screen "${s.id}" ${sd}`);
      }
      if (!Array.isArray(s.actions)) {
        errs.push(`screen "${s.id}" must declare "actions" (use [] for none)`);
        continue;
      }
      const aseen = /* @__PURE__ */ new Set();
      for (const a of s.actions) {
        if (!a || typeof a.id !== "string" || typeof a.label !== "string") {
          errs.push(`screen "${s.id}" has an action without string id/label`);
          continue;
        }
        if (aseen.has(a.id)) {
          errs.push(`screen "${s.id}" has duplicate action id "${a.id}"`);
        }
        aseen.add(a.id);
        if (!("to" in a)) {
          errs.push(`action "${s.id}.${a.id}" must set "to" (screen id, or null for a missing link)`);
        }
      }
    }
    for (const e of entryIds(flow)) {
      if (!seen.has(e)) {
        errs.push(`start/entry "${e}" is not a screen id`);
      }
    }
    const sids = /* @__PURE__ */ new Set();
    for (const sc of flow.scenarios || []) {
      if (!sc.id || sids.has(sc.id)) {
        errs.push(`scenario id "${sc.id}" missing or duplicate`);
      }
      sids.add(sc.id);
      if (!Array.isArray(sc.steps)) {
        errs.push(`scenario "${sc.id}" needs "steps"`);
      }
      if (sc.start !== void 0 && !seen.has(sc.start)) {
        errs.push(`scenario "${sc.id}" starts at "${sc.start}", not a screen id`);
      }
    }
    const pids = /* @__PURE__ */ new Set();
    for (const p of flow.proposals || []) {
      if (!p.id || pids.has(p.id)) {
        errs.push(`proposal id "${p.id}" missing or duplicate`);
      }
      pids.add(p.id);
      if (!Array.isArray(p.changes)) {
        errs.push(`proposal "${p.id}" needs "changes"`);
      }
    }
    if (flow.events !== void 0 && !Array.isArray(flow.events)) {
      errs.push('"events" must be an array');
    }
    const eids = /* @__PURE__ */ new Set();
    for (const e of Array.isArray(flow.events) ? flow.events : []) {
      if (typeof e?.id !== "string" || !e.id) {
        errs.push('every event needs a string "id"');
        continue;
      }
      if (eids.has(e.id)) {
        errs.push(`duplicate event id "${e.id}"`);
      }
      eids.add(e.id);
      if (!EVENT_TYPES.includes(e.type)) {
        errs.push(`event "${e.id}" has type "${e.type}", expected one of ${EVENT_TYPES.join("/")}`);
      }
      const at = [e.at].flat();
      if (at.length === 0 || !at.every(isLabel)) {
        errs.push(`event "${e.id}" needs "at": a node id, node.action, or a list of them`);
      }
      if (e.props !== void 0 && !isLabelList(e.props)) {
        errs.push(`event "${e.id}" has props ${JSON.stringify(e.props)}, expected a list of names`);
      }
    }
    if (flow.eventProps !== void 0 && !(Array.isArray(flow.eventProps) && flow.eventProps.every(isEventProp))) {
      errs.push('"eventProps" must be an array of {name, use}');
    }
    return errs;
  }

  // scripts/lib/check.mjs
  function check(input, opts = {}) {
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
      if (to === null || to === void 0) {
        add({
          code: "missing-link",
          severity: "warning",
          screen,
          action: action.id,
          message: M.missing(action.label)
        });
      } else {
        add({
          code: "broken-link",
          severity: "critical",
          screen,
          action: action.id,
          message: M.broken(action.label, to)
        });
      }
    }
    for (const s of flow.screens) {
      if (s.kind === "decision" && s.actions.length < 2) {
        add({
          code: "decision-branches",
          severity: "warning",
          screen: s.id,
          message: M.branches(s.title, s.actions.length)
        });
      }
    }
    const orphans = [...exceptionSources(flow)].filter(([, from]) => !from.length).map(([id]) => id);
    const reachable = reach(entryIds(flow), fwd);
    const exits = [...entryIds(flow), ...flow.screens.filter((s) => s.end).map((s) => s.id)];
    const canExit = reach(exits, back);
    for (const s of flow.screens) {
      if (orphans.includes(s.id)) {
        continue;
      }
      if (!reachable.has(s.id)) {
        add({
          code: "unreachable",
          severity: "warning",
          screen: s.id,
          message: M.unreachable(s.title)
        });
      } else if (!canExit.has(s.id)) {
        add({ code: "trapped", severity: "critical", screen: s.id, message: M.trapped(s.title) });
      }
    }
    const scenarios = (flow.scenarios || []).map((sc) => runScenario(flow, sc));
    for (const r of scenarios) {
      if (!r.ok) {
        add({
          code: "scenario-failed",
          severity: "critical",
          scenario: r.id,
          screen: r.screen,
          step: r.failedStep,
          message: M.step(r.failedStep + 1, r.reason)
        });
      }
    }
    const passed = new Map(scenarios.map((r) => [r.id, r.ok]));
    const requirements = (flow.requirements || []).map((q) => {
      const linked = (flow.scenarios || []).filter((sc) => (sc.requirements || []).includes(q.id)).map((sc) => sc.id);
      const status = linked.length === 0 ? "uncovered" : linked.every((id) => passed.get(id)) ? "passed" : "failed";
      if (status === "uncovered") {
        add({
          code: "uncovered-requirement",
          severity: "info",
          requirement: q.id,
          screen: q.screen,
          message: M.uncovered(q.title)
        });
      }
      return { id: q.id, status, scenarios: linked };
    });
    const byId = screensById(flow);
    findings.push(
      ...brokenEvents(flow, byId, M),
      ...unknownPrimary(flow, M),
      ...orphanExceptions(orphans, byId, M),
      ...untrackedSteps(flow, byId, M)
    );
    findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
    return {
      errors: [],
      findings,
      scenarios: scenarios.map(({ trail, ...r }) => r),
      requirements,
      applied
    };
  }
  function brokenEvents(flow, byId, M) {
    const exists = (at) => {
      const [node, action] = splitLocation(at);
      const s = byId.get(node);
      return Boolean(s) && (action === void 0 || s.actions.some((a) => a.id === action));
    };
    return (flow.events || []).flatMap(
      (e) => eventLocations(e).filter((at) => !exists(at)).map((at) => ({
        code: "broken-event",
        severity: "critical",
        event: e.id,
        message: M.brokenEvent(e.id, at)
      }))
    );
  }
  function unknownPrimary(flow, M) {
    if (flow.primary === void 0 || (flow.scenarios || []).some((sc) => sc.id === flow.primary)) {
      return [];
    }
    return [
      {
        code: "unknown-primary",
        severity: "critical",
        scenario: flow.primary,
        message: M.unknownPrimary(flow.primary)
      }
    ];
  }
  function orphanExceptions(orphans, byId, M) {
    return orphans.map((id) => ({
      code: "orphan-exception",
      severity: "warning",
      screen: id,
      message: M.orphanException(byId.get(id).exception, byId.get(id).title)
    }));
  }
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
    return walk.filter((w) => !tracked.has(w.transition) && !tracked.has(w.landing)).map((w) => ({
      code: "untracked-step",
      severity: "info",
      screen: w.screen,
      action: w.action,
      message: M.untracked(byId.get(w.landing).title)
    }));
  }

  // scripts/viewer/src/layout/geometry.mjs
  var CARD_W = 220;
  var SUB_GAP = 48;
  var STAGE_GAP = 72;
  var MARGIN = 32;
  var HEADER_H = 40;
  var DETOUR_GAP = 56;
  var bottomOf = (box) => box.y + box.h;

  // scripts/viewer/src/layout/text-width.mjs
  var WIDE = /[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uff00-\uffef]/;
  var emOf = (ch) => {
    if (WIDE.test(ch)) return 0.92;
    if (ch === " ") return 0.27;
    return /[A-Z0-9]/.test(ch) ? 0.64 : 0.52;
  };
  function textWidth(text2, size) {
    let em = 0;
    for (const ch of String(text2 ?? "")) {
      em += emOf(ch);
    }
    return Math.ceil(em * size);
  }

  // scripts/viewer/src/layout/card-size.mjs
  var INNER_W = CARD_W - 33;
  var PADDING = 26;
  var GAP = 6;
  var TOP_ROW = 20;
  var TITLE = { size: 22, line: 28, max: 2 };
  var BODY = { size: 14, line: 20, max: 2 };
  var CHIP = { size: 13, line: 18, padding: 14, h: 22, gap: 4 };
  var DECISION = { heading: 24, size: 14, line: 20, indent: 12, gap: 4 };
  var lineCount = (text2, font, width = INNER_W) => Math.max(1, Math.ceil(textWidth(text2, font.size) / width));
  function chipRows(chips) {
    let rows = 0;
    let x = INNER_W;
    for (const { text: text2 } of chips) {
      const w = Math.min(INNER_W, textWidth(text2, CHIP.size) + CHIP.padding);
      if (x + CHIP.gap + w > INNER_W) {
        rows += 1;
        x = w;
      } else {
        x += CHIP.gap + w;
      }
    }
    return rows;
  }
  function estimateCardHeight(node, codes = []) {
    const rows = [TOP_ROW, TITLE.line * Math.min(TITLE.max, lineCount(node.title, TITLE))];
    if (node.body) {
      rows.push(BODY.line * Math.min(BODY.max, lineCount(node.body, BODY)));
    }
    const chips = chipRows(cardChips(node, codes));
    if (chips) {
      rows.push(chips * CHIP.h + (chips - 1) * CHIP.gap);
    }
    return PADDING + rows.reduce((sum, h) => sum + h, 0) + GAP * (rows.length - 1);
  }
  function estimateDecisionCardHeight(items) {
    const itemLines = items.map((item) => lineCount(item, DECISION, INNER_W - DECISION.indent));
    const list = itemLines.reduce((sum, n) => sum + n * DECISION.line, 0) + DECISION.gap * (items.length - 1);
    return PADDING + DECISION.heading + GAP + list;
  }

  // scripts/viewer/src/layout/bands.mjs
  var BAND_GAP = 48;
  var BAND_PAD = 24;
  var BAND_TITLE = 32;
  function placeBands(flow, { mainBottom, detourGap, pathOrder, sources, main, columns, stageHeaders, heights }) {
    const exceptions = placeExceptions(flow, {
      pathOrder,
      sources,
      main,
      columns,
      heights,
      top: mainBottom + detourGap + BAND_TITLE
    });
    const exceptionBand = exceptions.size ? bandAround("exception", [...exceptions.values()]) : null;
    const cards = decisionCards(flow, stageHeaders, {
      top: (exceptionBand ? bottomOf(exceptionBand) + BAND_GAP : mainBottom + detourGap) + BAND_TITLE
    });
    const decisionBand = cards.length ? { ...bandAround("decision", cards), cards } : null;
    return { exceptions, bands: [exceptionBand, decisionBand].filter(Boolean) };
  }
  function placeExceptions(flow, { pathOrder, sources, main, columns, heights, top }) {
    const pathIndex = (id) => pathOrder.includes(id) ? pathOrder.indexOf(id) : pathOrder.length;
    const hangFrom = (s) => {
      const [first] = sources.get(s.id).filter((from) => main.has(from)).sort((a, b) => pathIndex(a) - pathIndex(b));
      return first ? main.get(first).column : columns.findIndex((c) => c.stage === s.stage);
    };
    const wanted = flow.screens.filter(isException).map((s) => ({ id: s.id, column: hangFrom(s) })).sort((a, b) => columns[a.column].x - columns[b.column].x);
    const step = CARD_W + SUB_GAP;
    const placed = /* @__PURE__ */ new Map();
    const blockerAt = (x) => [...placed.values()].find((box) => Math.abs(box.x - x) < step);
    for (const { id, column } of wanted) {
      let x = columns[column].x;
      for (let blocker = blockerAt(x); blocker; blocker = blockerAt(x)) {
        x = blocker.x + step;
      }
      placed.set(id, { x, y: top, w: CARD_W, h: heights.get(id), column, band: "exception" });
    }
    return placed;
  }
  function decisionCards(flow, stageHeaders, { top }) {
    return stageHeaders.map((header, stage) => ({
      stage,
      items: flow.screens.filter((s) => s.stage === stage).flatMap((s) => s.decisions || []),
      x: header.x,
      y: top,
      w: CARD_W
    })).filter((card) => card.items.length).map((card) => ({ ...card, h: estimateDecisionCardHeight(card.items) }));
  }
  function bandAround(type, cards) {
    const x = Math.min(...cards.map((c) => c.x)) - BAND_PAD;
    const y = cards[0].y - BAND_TITLE;
    const right = Math.max(...cards.map((c) => c.x + c.w)) + BAND_PAD;
    const h = Math.max(...cards.map(bottomOf)) + BAND_PAD - y;
    return { type, x, y, w: right - x, h };
  }

  // scripts/viewer/src/layout/edge-labels.mjs
  var LABEL_SIZE = 15;
  var LABEL_PADDING = 16;
  var LABEL_H = 24;
  var LABEL_MARGIN = 12;
  var labelWidth = (label) => textWidth(label, LABEL_SIZE) + LABEL_PADDING;
  function branchLabels(node, targetIds) {
    const labels = /* @__PURE__ */ new Map();
    for (const { to, label } of node.actions.filter((a) => targetIds.has(a.to))) {
      labels.set(to, labels.has(to) ? `${labels.get(to)} / ${label}` : label);
    }
    return labels;
  }

  // scripts/viewer/src/layout/columns.mjs
  function placeColumns(flow) {
    const rank = rankNodes(flow);
    const columns = [];
    const columnOf = /* @__PURE__ */ new Map();
    flow.stages.forEach((_, stage) => {
      const nodes = flow.screens.filter((s) => s.stage === stage && !isException(s));
      const ranks = [...new Set(nodes.map((s) => rank.get(s.id)))].sort((a, b) => a - b);
      const first = columns.length;
      for (let sub = 0; sub < Math.max(1, ranks.length); sub++) {
        columns.push({ stage, sub, x: 0 });
      }
      for (const s of nodes) {
        columnOf.set(s.id, first + ranks.indexOf(rank.get(s.id)));
      }
    });
    const labelRoom = labelRoomAfter(flow, columnOf);
    columns.forEach((column, i) => {
      const prev = columns[i - 1];
      if (!prev) {
        column.x = MARGIN;
        return;
      }
      const gap = prev.stage === column.stage ? SUB_GAP : STAGE_GAP;
      column.x = prev.x + CARD_W + Math.max(gap, labelRoom.get(i - 1) ?? 0);
    });
    const stageHeaders = flow.stages.map((label, stage) => {
      const own = columns.filter((c) => c.stage === stage);
      const x = own[0].x;
      return { label, x, y: MARGIN, w: own[own.length - 1].x + CARD_W - x, h: HEADER_H };
    });
    return { columns, stageHeaders, columnOf };
  }
  function labelRoomAfter(flow, columnOf) {
    const room = /* @__PURE__ */ new Map();
    for (const s of flow.screens.filter((s2) => s2.kind === "decision" && columnOf.has(s2.id))) {
      const column = columnOf.get(s.id);
      const ahead = new Set([...columnOf].filter(([, c]) => c > column).map(([id]) => id));
      const widths = [...branchLabels(s, ahead).values()].map((label) => labelWidth(label));
      room.set(column, Math.max(room.get(column) ?? 0, ...widths.map((w) => w + 2 * LABEL_MARGIN)));
    }
    return room;
  }

  // scripts/viewer/src/layout/rows.mjs
  var ROW_GAP = 24;
  function stackColumns(flow, columnOf, heights, primaryNodes) {
    const byColumn = /* @__PURE__ */ new Map();
    for (const s of flow.screens.filter((s2) => columnOf.has(s2.id))) {
      const column = columnOf.get(s.id);
      byColumn.set(column, [...byColumn.get(column) ?? [], s]);
    }
    const tops = /* @__PURE__ */ new Map();
    for (const nodes of byColumn.values()) {
      for (const [id, top] of stackColumn(nodes, heights, primaryNodes)) {
        tops.set(id, top);
      }
    }
    return tops;
  }
  function stackColumn(nodes, heights, primaryNodes) {
    if (primaryNodes.size === 0) {
      return stackAround(nodes[0], nodes.slice(1), heights);
    }
    const onPath = nodes.filter((s) => primaryNodes.has(s.id));
    if (onPath.length > 1) {
      return stackCentered(nodes, heights);
    }
    const [anchor] = onPath;
    return stackAround(
      anchor,
      nodes.filter((s) => s !== anchor),
      heights
    );
  }
  function stackAround(anchor, others, heights) {
    let above = anchor ? -heights.get(anchor.id) / 2 : 0;
    let below = -above;
    const tops = anchor ? [[anchor.id, above]] : [];
    others.forEach((s, i) => {
      const h = heights.get(s.id);
      if (i % 2 === 0) {
        above -= h + ROW_GAP;
        tops.push([s.id, above]);
      } else {
        tops.push([s.id, below + ROW_GAP]);
        below += ROW_GAP + h;
      }
    });
    return tops;
  }
  function stackCentered(nodes, heights) {
    const total = nodes.reduce((sum, s) => sum + heights.get(s.id), ROW_GAP * (nodes.length - 1));
    let top = -total / 2;
    return nodes.map((s) => {
      const at = top;
      top += heights.get(s.id) + ROW_GAP;
      return [s.id, at];
    });
  }

  // scripts/viewer/src/layout/board.mjs
  function layoutBoard(flow, { detourTop = DETOUR_GAP, detourBottom = DETOUR_GAP } = {}) {
    const primary = primaryPath(flow);
    const sources = exceptionSources(flow);
    const heights = cardHeights(flow);
    const { columns, stageHeaders, columnOf } = placeColumns(flow);
    const rowTops = stackColumns(flow, columnOf, heights, primary.nodes);
    const firstRow = MARGIN + HEADER_H + detourTop;
    const spineY = firstRow - Math.min(0, ...rowTops.values());
    const main = /* @__PURE__ */ new Map();
    for (const [id, top] of rowTops) {
      const column = columnOf.get(id);
      const box = { x: columns[column].x, y: spineY + top, w: CARD_W, h: heights.get(id) };
      main.set(id, { ...box, column, band: "main" });
    }
    const mainBoxes = [...main.values()];
    const mainArea = {
      top: Math.min(firstRow, ...mainBoxes.map((box) => box.y)),
      bottom: Math.max(firstRow, ...mainBoxes.map(bottomOf))
    };
    const { exceptions, bands } = placeBands(flow, {
      mainBottom: mainArea.bottom,
      detourGap: detourBottom,
      pathOrder: primary.order,
      sources,
      main,
      columns,
      stageHeaders,
      heights
    });
    const right = Math.max(...[...stageHeaders, ...bands].map((box) => box.x + box.w));
    const bottom = bands.length ? bottomOf(bands[bands.length - 1]) : mainArea.bottom + detourBottom;
    const boxes = new Map([...main, ...exceptions]);
    return {
      nodes: new Map(flow.screens.map((s) => [s.id, boxes.get(s.id)])),
      columns,
      stageHeaders,
      mainArea,
      bands,
      spineY,
      size: { w: right + MARGIN, h: bottom + MARGIN }
    };
  }
  function cardHeights(flow) {
    const codes = exceptionCodes(flow);
    return new Map(flow.screens.map((s) => [s.id, estimateCardHeight(s, codes.get(s.id))]));
  }

  // scripts/viewer/src/layout/route-space.mjs
  var SLOT_GAP = 6;
  var CLEARANCE = 4;
  var LANE_GAP = 14;
  function channelSlots(columns) {
    const taken = /* @__PURE__ */ new Map();
    const sides = (c) => {
      const left = c < 0 ? columns[0].x - MARGIN : columns[c].x + CARD_W;
      const right = c + 1 < columns.length ? columns[c + 1].x : left + MARGIN;
      return [left, right];
    };
    const center = (c) => {
      const [left, right] = sides(c);
      return (left + right) / 2;
    };
    const fromCenter = (c) => {
      const right = sides(c)[1];
      const xs = [center(c)];
      for (let d = SLOT_GAP; center(c) + d <= right - CLEARANCE; d += SLOT_GAP) {
        xs.push(center(c) + d, center(c) - d);
      }
      return xs;
    };
    const fromLeft = (c) => {
      const xs = [];
      for (let x = sides(c)[0] + SLOT_GAP; x < center(c); x += SLOT_GAP) xs.push(x);
      return xs;
    };
    const firstFree = (c, xs) => {
      const used = taken.get(c) ?? /* @__PURE__ */ new Set();
      taken.set(c, used);
      const x = xs.find((candidate) => !used.has(candidate)) ?? xs[xs.length - 1];
      used.add(x);
      return x;
    };
    const claim = (c) => firstFree(c, fromCenter(c));
    const claimBeside = (c) => firstFree(c, [...fromLeft(c), ...fromCenter(c)]);
    return { center, claim, claimBeside };
  }
  function detourLanes(mainArea) {
    const lanes = { top: [], bottom: [] };
    const yOf = (side, k) => side === "top" ? mainArea.top - LANE_GAP * (k + 1) : mainArea.bottom + LANE_GAP * (k + 1);
    const claim = (side, xa, xb) => {
      const run = [Math.min(xa, xb), Math.max(xa, xb)];
      if (run[0] === run[1]) {
        return yOf(side, 0);
      }
      const stack = lanes[side];
      let k = stack.findIndex((lane) => lane.every((other) => apart(run, other)));
      if (k < 0) {
        k = stack.push([]) - 1;
      }
      stack[k].push(run);
      return yOf(side, k);
    };
    const used = () => ({ top: lanes.top.length, bottom: lanes.bottom.length });
    return { claim, used };
  }
  var apart = ([lo, hi], [otherLo, otherHi]) => hi + SLOT_GAP < otherLo || otherHi + SLOT_GAP < lo;

  // scripts/viewer/src/layout/path-geometry.mjs
  var segmentsOf = (points) => points.slice(1).map((p, i) => [points[i], p]);
  function crossesAny(points, boxes) {
    return segmentsOf(points).some(
      ([[x1, y1], [x2, y2]]) => boxes.some(
        (box) => Math.min(x1, x2) < box.x + box.w && Math.max(x1, x2) > box.x && Math.min(y1, y2) < box.y + box.h && Math.max(y1, y2) > box.y
      )
    );
  }
  function simplify(points) {
    const kept = points.filter(
      (p, i) => i === 0 || p[0] !== points[i - 1][0] || p[1] !== points[i - 1][1]
    );
    return kept.filter((p, i) => {
      const prev = kept[i - 1];
      const next = kept[i + 1];
      const straight = prev && next && (prev[0] === p[0] && p[0] === next[0] || prev[1] === p[1] && p[1] === next[1]);
      return !straight;
    });
  }
  function horizontalRuns(points) {
    return segmentsOf(points).filter(([a, b]) => a[1] === b[1] && a[0] !== b[0]).map(([a, b]) => a[0] < b[0] ? [a, b] : [b, a]).reverse().sort(([a, b], [c, d]) => d[0] - c[0] - (b[0] - a[0]));
  }
  var boxesOverlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  // scripts/viewer/src/layout/routes.mjs
  function routeEdges(flow, layout) {
    const edges = boardEdges(flow, layout);
    const decisionCards2 = layout.bands.flatMap((band) => band.cards || []);
    const lanes = detourLanes(layout.mainArea);
    const space = {
      boxes: [...layout.nodes.values(), ...decisionCards2],
      mainArea: layout.mainArea,
      spineY: layout.spineY,
      channels: channelSlots(layout.columns),
      lanes
    };
    const byReach = [...edges].sort((a, b) => reach2(a) - reach2(b));
    const points = new Map(byReach.map((edge) => [edge.id, routeOf(edge, space)]));
    const taken = [...space.boxes];
    return {
      edges: edges.map(({ source, target, ...edge }) => ({
        ...edge,
        points: points.get(edge.id),
        ...edge.label !== void 0 && labelPlace(edge.label, points.get(edge.id), taken)
      })),
      lanes: lanes.used()
    };
  }
  function labelPlace(label, points, taken) {
    const w = labelWidth(label);
    const half = (w + LABEL_MARGIN) / 2;
    for (const [[left, y], [right]] of horizontalRuns(points)) {
      if (right - left < w + LABEL_MARGIN) continue;
      for (const x of [(left + right) / 2, left + half, right - half]) {
        const box = { x: x - w / 2, y: y - LABEL_H / 2, w, h: LABEL_H };
        if (!taken.some((other) => boxesOverlap(box, other))) {
          taken.push(box);
          return { labelAt: [x, y] };
        }
      }
    }
    return {};
  }
  function toPathD(points) {
    const steps = points.slice(1).map(([x, y], i) => {
      const [px, py] = points[i];
      if (py === y) {
        return `H${x}`;
      }
      return px === x ? `V${y}` : `L${x} ${y}`;
    });
    return [`M${points[0][0]} ${points[0][1]}`, ...steps].join(" ");
  }
  function boardEdges(flow, layout) {
    const byId = screensById(flow);
    const back = backEdges(flow);
    const { steps } = primaryPath(flow);
    const actionsOf = /* @__PURE__ */ new Map();
    for (const from of flow.screens) {
      for (const action of from.actions.filter((a) => byId.has(a.to))) {
        const key = edgeKey(from.id, action.to);
        actionsOf.set(key, [...actionsOf.get(key) ?? [], { from, action }]);
      }
    }
    return [...actionsOf.values()].map((parallel) => {
      const { from } = parallel[0];
      const to = byId.get(parallel[0].action.to);
      const ids = parallel.map(({ action }) => `${from.id}.${action.id}`);
      return {
        id: ids[0],
        ids,
        from: from.id,
        to: to.id,
        kind: edgeKind(from, to, back.has(edgeKey(from.id, to.id))),
        primary: ids.some((id) => steps.has(id)),
        dormant: Boolean(from.dormant || to.dormant),
        ...from.kind === "decision" && { label: branchLabels(from, /* @__PURE__ */ new Set([to.id])).get(to.id) },
        source: layout.nodes.get(from.id),
        target: layout.nodes.get(to.id)
      };
    });
  }
  function edgeKind(from, to, isBack) {
    if (isException(from)) {
      return "from-exception";
    }
    if (isException(to)) {
      return "exception";
    }
    return isBack ? "back" : "forward";
  }
  var centerX = (box) => box.x + box.w / 2;
  var centerY = (box) => box.y + box.h / 2;
  var reach2 = ({ source, target }) => Math.abs(centerX(source) - centerX(target));
  function routeOf(edge, space) {
    const { kind, source, target } = edge;
    if (kind === "forward" && target.column > source.column) {
      const channel = [source.column, target.column - 1].find(
        (c) => !crossesAny(throughChannel(edge, space.channels.center(c)), space.boxes)
      );
      if (channel !== void 0) {
        const turns = centerY(source) !== centerY(target);
        const besideDecision = edge.label !== void 0 && channel === source.column;
        const slot = besideDecision ? space.channels.claimBeside : space.channels.claim;
        const x = turns ? slot(channel) : space.channels.center(channel);
        return throughChannel(edge, x);
      }
    }
    return detour(edge, space);
  }
  function throughChannel({ source, target }, x) {
    return simplify([
      [source.x + source.w, centerY(source)],
      [x, centerY(source)],
      [x, centerY(target)],
      [target.x, centerY(target)]
    ]);
  }
  function detour({ kind, source, target }, space) {
    const nearTop = (centerY(source) + centerY(target)) / 2 <= space.spineY;
    const side = kind === "exception" || kind === "from-exception" || !nearTop ? "bottom" : "top";
    const out = cardToLane(source, "source", side, space);
    const into = cardToLane(target, "target", side, space);
    const outX = out[out.length - 1][0];
    const intoX = into[into.length - 1][0];
    const laneY = space.lanes.claim(side, outX, intoX);
    return simplify([...out, [outX, laneY], [intoX, laneY], ...[...into].reverse()]);
  }
  var sendX = (box) => box.x + box.w * (box.band === "exception" ? 0.75 : 0.5);
  var takeX = (box) => box.x + box.w * (box.band === "exception" ? 0.5 : 0.75);
  function cardToLane(box, end, side, space) {
    const x = end === "source" ? sendX(box) : takeX(box);
    const borderY = side === "top" || box.band === "exception" ? box.y : bottomOf(box);
    const areaEdgeY = side === "top" ? space.mainArea.top : space.mainArea.bottom;
    const straightOut = [
      [x, borderY],
      [x, areaEdgeY]
    ];
    if (!crossesAny(straightOut, space.boxes)) {
      return [[x, borderY]];
    }
    return end === "source" ? [
      [box.x + box.w, centerY(box)],
      [space.channels.claim(box.column), centerY(box)]
    ] : [
      [box.x, centerY(box)],
      [space.channels.claim(box.column - 1), centerY(box)]
    ];
  }

  // scripts/viewer/src/layout/board-scene.mjs
  function layoutAndRoute(flow) {
    const layout = layoutBoard(flow);
    const { edges, lanes } = routeEdges(flow, layout);
    const gaps = { detourTop: gapFor(lanes.top), detourBottom: gapFor(lanes.bottom) };
    if (gaps.detourTop === DETOUR_GAP && gaps.detourBottom === DETOUR_GAP) {
      return { layout, edges };
    }
    const widened = layoutBoard(flow, gaps);
    return { layout: widened, edges: routeEdges(flow, widened).edges };
  }
  var gapFor = (lanes) => Math.max(DETOUR_GAP, (lanes + 2) * LANE_GAP);

  // scripts/viewer/src/layout/wireframe.mjs
  var PAD = 70;
  var GAP2 = { x: 220, y: 200 };
  var BOX_SIZES = {
    step: [260, 140],
    system: [260, 140],
    wait: [260, 140],
    decision: [240, 170],
    end: [200, 100],
    message: [340, 320],
    email: [460, 440],
    document: [420, 594]
  };
  function deviceSize(device) {
    if (device && typeof device === "object") return [device.width, device.height];
    return DEVICES[device] || null;
  }
  function deviceLabel(node, flow) {
    const d = node.device ?? flow.device ?? "mobile";
    return typeof d === "object" ? `${d.width}\xD7${d.height}` : d;
  }
  function nodeStyle(node) {
    const kind = kindOf(node);
    if (kind === "screen") return "frame";
    if (["message", "email", "document"].includes(kind)) return "card";
    return "box";
  }
  function nodeSize(node, flow) {
    if (nodeStyle(node) === "frame") {
      return deviceSize(node.device) || deviceSize(flow.device) || DEVICES.mobile;
    }
    return BOX_SIZES[kindOf(node)];
  }
  function layoutWireframe(flow) {
    const nodes = /* @__PURE__ */ new Map();
    const stages = [];
    let y = PAD + 40;
    let width = 0;
    flow.stages.forEach((label, stage) => {
      const row = flow.screens.filter((s) => s.stage === stage);
      const sizes = row.map((s) => nodeSize(s, flow));
      const rowHeight = Math.max(120, ...sizes.map(([, h]) => h));
      let x = PAD + 40;
      row.forEach((s, i) => {
        const [w, h] = sizes[i];
        nodes.set(s.id, { x, y, w, h });
        x += w + GAP2.x;
      });
      const stageWidth = Math.max(300, x - GAP2.x - PAD + 40);
      stages.push({ label, x: PAD, y: y - 60, w: stageWidth, h: rowHeight + 100 });
      width = Math.max(width, PAD + stageWidth);
      y += rowHeight + GAP2.y + 60;
    });
    return { nodes, stages, size: { w: width + PAD, h: y } };
  }

  // scripts/viewer/src/layout/scene.mjs
  var last = { flow: null, view: null, scene: null };
  function sceneOf({ flow, view }) {
    if (last.flow !== flow || last.view !== view) {
      last = { flow, view, scene: layoutFor(flow, view) };
    }
    return last.scene;
  }
  function layoutFor(flow, view) {
    if (view === "wireframe") return layoutWireframe(flow);
    const { layout, edges } = layoutAndRoute(flow);
    return { nodes: layout.nodes, size: layout.size, layout, edges };
  }

  // scripts/viewer/src/selectors.mjs
  var findNode = (flow, id) => flow.screens.find((s) => s.id === id);
  var findScenario = (flow, id) => (flow.scenarios || []).find((s) => s.id === id);
  var previewVars = (flow, node) => ({ ...flow.vars || {}, ...node.preview || {} });
  function displayNumber(flow, node) {
    if (node.number) return node.number;
    const peers = flow.screens.filter((s) => s.stage === node.stage);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(node.stage + 1)}.${pad(peers.indexOf(node) + 1)}`;
  }
  function scenarioPath(flow, scenarioId) {
    const scenario = findScenario(flow, scenarioId);
    if (!scenario) return null;
    const run = runScenario(flow, scenario);
    const edgeSteps = /* @__PURE__ */ new Map();
    run.trail.slice(1).forEach((t, i) => {
      const key = `${run.trail[i].screen}.${t.action}`;
      edgeSteps.set(key, [...edgeSteps.get(key) || [], i + 1]);
    });
    const steps = new Map(edgeSteps);
    const failedAction = !run.ok && scenario.steps[run.failedStep]?.action;
    if (failedAction) steps.set(`${run.screen}.${failedAction}`, [run.failedStep + 1]);
    return { steps, edgeSteps, nodes: new Set(run.trail.map((t) => t.screen)) };
  }

  // scripts/viewer/src/store.mjs
  function createStore(FLOW2, META2, storage = browserStorage()) {
    const requestKey = `wireflow:${FLOW2.id}:${META2.output}`;
    let state = initialState(FLOW2, META2, loadRequests(storage, requestKey));
    const listeners = [];
    return {
      getState: () => state,
      dispatch(action) {
        const prev = state;
        state = REDUCERS[action.type](state, action);
        if (state.requests !== prev.requests) saveRequests(storage, requestKey, state.requests);
        for (const listener of listeners) listener(state);
      },
      subscribe(listener) {
        listeners.push(listener);
      }
    };
  }
  function watch(store2, pick, fn) {
    let picked = pick(store2.getState());
    fn(store2.getState());
    store2.subscribe((state) => {
      const next = pick(state);
      if (next.some((value, i) => value !== picked[i])) {
        picked = next;
        fn(state);
      }
    });
  }
  function initialState(FLOW2, META2, requests) {
    return {
      authored: FLOW2,
      meta: META2,
      ...withProposals(FLOW2, []),
      view: resolveView(FLOW2),
      tab: "canvas",
      mode: "overview",
      scenario: "",
      selected: null,
      camera: { x: 40, y: 80, k: 0.3 },
      play: null,
      focus: null,
      requests,
      notice: null
    };
  }
  var OVERVIEW = { mode: "overview", play: null };
  var REDUCERS = {
    setView: (s, { view }) => ({ ...s, ...OVERVIEW, view, tab: "canvas" }),
    setTab: (s, { tab }) => ({ ...s, ...OVERVIEW, tab }),
    select: (s, { id }) => ({ ...s, selected: id, tab: id ? "canvas" : s.tab }),
    setScenario: (s, { id }) => {
      const next = { ...s, scenario: id, tab: "canvas" };
      return s.mode === "play" ? { ...next, play: freshPlay(next) } : next;
    },
    toggleProposal: (s, { id }) => {
      const applied = s.applied.includes(id) ? s.applied.filter((x) => x !== id) : [...s.applied, id];
      try {
        return { ...s, ...withProposals(s.authored, applied) };
      } catch (err) {
        return withNotice(s, "conflict", err.message);
      }
    },
    startPlay: (s, { from }) => ({ ...s, mode: "play", play: freshPlay(s, from) }),
    press,
    stopPlay: (s) => ({ ...s, ...OVERVIEW }),
    overview: (s) => ({ ...s, ...OVERVIEW, selected: null }),
    focusStage: (s, { stage }) => ({
      ...s,
      ...OVERVIEW,
      tab: "canvas",
      selected: null,
      focus: { stage }
    }),
    addRequest: (s, { screen, action, text: text2 }) => {
      const number = displayNumber(s.flow, findNode(s.flow, screen));
      const request = { screen, number, action: action || null, text: text2, at: (/* @__PURE__ */ new Date()).toISOString() };
      return withNotice({ ...s, requests: [...s.requests, request] }, "requestAdded");
    },
    removeRequest: (s, { index }) => ({ ...s, requests: s.requests.filter((_, i) => i !== index) }),
    clearRequests: (s) => ({ ...s, requests: [] }),
    camera: (s, { camera }) => ({ ...s, camera }),
    notify: (s, { message }) => withNotice(s, message)
  };
  function withProposals(authored, applied) {
    return {
      applied,
      flow: applied.length ? applyProposals(authored, applied) : authored,
      result: check(authored, { with: applied })
    };
  }
  function withNotice(s, message, detail) {
    return { ...s, notice: { message, detail } };
  }
  function freshPlay(s, from) {
    const scenario = findScenario(s.flow, s.scenario);
    const node = from || scenario?.start || s.flow.start;
    const vars = {
      ...s.flow.vars || {},
      ...scenario?.vars || {},
      ...from ? findNode(s.flow, from)?.preview : {}
    };
    return { node, vars, trail: [{ node }] };
  }
  function press(s, { action: actionId, fields }) {
    const vars = { ...s.play.vars, ...fields };
    const node = findNode(s.flow, s.play.node);
    const action = node.actions.find((a) => a.id === actionId);
    const stay = { ...s, play: { ...s.play, vars } };
    if (!enabledActions(node, vars).includes(action)) return withNotice(stay, "guard");
    if (!findNode(s.flow, action.to)) return withNotice(stay, "noDest", action.id);
    const trail = [...s.play.trail, { node: action.to, action: action.id }];
    return { ...s, play: { node: action.to, vars: applyAction(vars, action), trail } };
  }
  function browserStorage() {
    try {
      return globalThis.localStorage;
    } catch {
      return void 0;
    }
  }
  function loadRequests(storage, key) {
    try {
      return JSON.parse(storage.getItem(key) || "[]");
    } catch {
      return [];
    }
  }
  function saveRequests(storage, key, requests) {
    try {
      storage.setItem(key, JSON.stringify(requests));
    } catch {
    }
  }

  // scripts/viewer/src/components/camera.mjs
  function mount(stage, store2) {
    const canvas = stage.querySelector("#canvas");
    const setCamera = (camera) => store2.dispatch({ type: "camera", camera });
    watch(
      store2,
      (s) => [s.camera],
      ({ camera: { x, y, k } }) => {
        canvas.style.transform = `translate(${x}px,${y}px) scale(${k})`;
      }
    );
    const fit = () => {
      if (stage.offsetWidth) setCamera(fitAll(stage, sceneOf(store2.getState())));
    };
    const frame = () => requestAnimationFrame(() => {
      const state = store2.getState();
      const box = state.selected && sceneOf(state).nodes.get(state.selected);
      if (box) setCamera(focusOn(stage, box));
      else fit();
    });
    watch(store2, (s) => [s.view], frame);
    watch(
      store2,
      (s) => [s.focus],
      ({ focus }) => {
        if (!focus) return;
        requestAnimationFrame(() => {
          const { layout } = sceneOf(store2.getState());
          setCamera(focusStage(stage, layout.stageHeaders[focus.stage], layout.mainArea));
        });
      }
    );
    watch(
      store2,
      (s) => [s.selected],
      ({ selected }) => {
        if (selected) frame();
      }
    );
    const overview = () => {
      store2.dispatch({ type: "overview" });
      fit();
    };
    stage.querySelector("#fit").addEventListener("click", overview);
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !e.target.closest("textarea, input, select")) overview();
    });
    window.addEventListener("resize", () => {
      const { mode, selected } = store2.getState();
      if (mode === "overview" && !selected) fit();
    });
    let drag = null;
    stage.addEventListener("pointerdown", (e) => {
      if (store2.getState().mode !== "overview" || e.target.closest("[data-id], button")) return;
      const { x, y } = store2.getState().camera;
      drag = { dx: e.clientX - x, dy: e.clientY - y };
      stage.classList.add("dragging");
    });
    window.addEventListener("pointermove", (e) => {
      if (drag)
        setCamera({ ...store2.getState().camera, x: e.clientX - drag.dx, y: e.clientY - drag.dy });
    });
    window.addEventListener("pointerup", () => {
      drag = null;
      stage.classList.remove("dragging");
    });
    stage.addEventListener(
      "wheel",
      (e) => {
        if (store2.getState().mode !== "overview") return;
        e.preventDefault();
        const camera = store2.getState().camera;
        setCamera(
          e.ctrlKey || e.metaKey ? zoomAt(camera, e, stage.getBoundingClientRect()) : { ...camera, x: camera.x - e.deltaX, y: camera.y - e.deltaY }
        );
      },
      { passive: false }
    );
  }
  function fitAll(stage, { size }) {
    const { width, height } = stage.getBoundingClientRect();
    const k = Math.min(width / size.w, height / size.h, 1) * 0.95;
    return { k, x: (width - size.w * k) / 2, y: 20 };
  }
  function focusOn(stage, box) {
    const { width, height } = stage.getBoundingClientRect();
    const k = Math.min(height * 0.8 / box.h, width * 0.8 / box.w, 1);
    return {
      k,
      x: width / 2 - (box.x + box.w / 2) * k,
      y: height / 2 - (box.y + box.h / 2) * k
    };
  }
  function focusStage(stage, header, mainArea) {
    const { width, height } = stage.getBoundingClientRect();
    const h = mainArea.bottom - header.y;
    const k = Math.min(width * 0.9 / header.w, height * 0.9 / h, 1);
    return { k, x: width / 2 - (header.x + header.w / 2) * k, y: 24 - header.y * k };
  }
  function zoomAt(camera, e, rect) {
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const k = Math.min(Math.max(camera.k * Math.exp(-e.deltaY * 0.01), 0.05), 2);
    return {
      k,
      x: mx - (mx - camera.x) * k / camera.k,
      y: my - (my - camera.y) * k / camera.k
    };
  }

  // scripts/viewer/src/html.mjs
  var Html = class {
    constructor(text2) {
      this.text = text2;
    }
    toString() {
      return this.text;
    }
  };
  var ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  var escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
  function renderValue(v) {
    if (v === null || v === void 0 || v === false) return "";
    if (v instanceof Html) return v.text;
    if (Array.isArray(v)) return v.map(renderValue).join("");
    return escapeHtml(v);
  }
  function html(strings, ...values) {
    return new Html(
      strings.reduce((out, s, i) => out + s + (i < values.length ? renderValue(values[i]) : ""), "")
    );
  }
  var fillVars = (text2, vars) => String(text2 ?? "").replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
  var classNames = (...names) => names.filter(Boolean).join(" ");
  var onClick = (action) => html`data-dispatch="${JSON.stringify(action)}"`;
  var boxStyle = ({ x, y, w, h }) => `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;

  // scripts/viewer/src/components/bands.mjs
  function render(bands, stages, T2) {
    const decisionCard = (card) => html`<div class="decision-card" style="${boxStyle(card)}">
    <h4>${stages[card.stage]}</h4>
    <ul>${card.items.map((item) => html`<li>${item}</li>`)}</ul>
  </div>`;
    const band = (b) => html`<section class="band ${b.type}" style="${boxStyle(b)}">
    <h3>${T2.bands[b.type]}</h3></section>${(b.cards || []).map(decisionCard)}`;
    return bands.map(band);
  }

  // scripts/viewer/src/i18n.mjs
  var KIND_ICONS = {
    screen: "\u{1F4F1}",
    message: "\u{1F4AC}",
    email: "\u2709\uFE0F",
    document: "\u{1F4C4}",
    step: "\u25AD",
    decision: "\u25C6",
    system: "\u2699\uFE0E",
    wait: "\u23F3",
    end: "\u25A0"
  };
  var KO = {
    path: "\uACBD\uB85C",
    fit: "\uC804\uCCB4 \uBCF4\uAE30",
    review: "\uAC80\uD1A0",
    close: "\uB2EB\uAE30",
    play: "\uC9C1\uC811 \uAC78\uC5B4\uBCF4\uAE30",
    requests: "\uC218\uC815 \uC694\uCCAD",
    allActions: "\uC804\uCCB4 \uC5F0\uACB0 \uBCF4\uAE30",
    summary: "\uAC80\uD1A0 \uC694\uC57D",
    findings: "\uBC1C\uACAC \uC0AC\uD56D",
    none: "\uBC1C\uACAC \uC0AC\uD56D \uC5C6\uC74C",
    scenarios: "\uC2DC\uB098\uB9AC\uC624",
    reqs: "\uC694\uAD6C\uC0AC\uD56D",
    proposals: "\uAC1C\uC120 \uC81C\uC548 (\uD654\uBA74\uC5D0\uB9CC \uC801\uC6A9)",
    decisions: "\uBBF8\uC815 \uACB0\uC815",
    bands: { exception: "\uC774\uD0C8\uD588\uC744 \uB54C \uD655\uC778\uD560 \uC77C", decision: "\uBBF8\uC815 \uACB0\uC815" },
    brief: "\uAE30\uD68D \uADFC\uAC70",
    notes: "\uC870\uAC74\xB7\uBD84\uAE30",
    actions: "\uBC84\uD2BC\xB7\uBD84\uAE30\uC640 \uC5F0\uACB0",
    missing: "\uC5F0\uACB0 \uC5C6\uC74C",
    request: "\uC218\uC815 \uC694\uCCAD \uB2F4\uAE30",
    whole: "\uB178\uB4DC \uC804\uCCB4",
    add: "\uB2F4\uAE30",
    copy: "\uBAA8\uB450 \uBCF5\uC0AC",
    clear: "\uBE44\uC6B0\uAE30",
    copied: "\uBCF5\uC0AC\uD588\uC5B4\uC694",
    empty: "\uC544\uC9C1 \uB2F4\uC740 \uC694\uCCAD\uC774 \uC5C6\uC5B4\uC694",
    reset: "\uCC98\uC74C\uBD80\uD130",
    vars: "\uD604\uC7AC \uC0C1\uD0DC",
    trail: "\uC9C0\uB098\uC628 \uACBD\uB85C",
    noDest: "\uC774 \uBC84\uD2BC\uC740 \uC544\uC9C1 \uC5F0\uACB0\uB41C \uACF3\uC774 \uC5C6\uC5B4\uC694",
    guard: "\uC9C0\uAE08 \uC0C1\uD0DC\uC5D0\uC11C\uB294 \uB3D9\uC791\uD558\uC9C0 \uC54A\uB294 \uBC84\uD2BC\uC774\uC5D0\uC694",
    passed: "\uD1B5\uACFC",
    failed: "\uC2E4\uD328",
    uncovered: "\uBBF8\uAC80\uC99D",
    applied: "\uC801\uC6A9 \uC911\uC778 \uC81C\uC548",
    file: "\uD30C\uC77C",
    placeholder: "\uBB34\uC5C7\uC744 \uC5B4\uB5BB\uAC8C \uBC14\uAFB8\uACE0 \uC2F6\uC740\uC9C0 \uC801\uC5B4\uC8FC\uC138\uC694",
    exitHint: "\uAC1C\uC694\uB85C \uB3CC\uC544\uAC00\uAE30",
    actor: "\uB2F4\uB2F9",
    device: "\uAE30\uAE30",
    requestHeading: "## Wireflow \uC218\uC815 \uC694\uCCAD",
    origin: { source: "\uAE30\uD68D \uC6D0\uBB38", inferred: "AI \uCD94\uC815", observed: "\uD604\uC7AC \uAD6C\uD604", proposed: "\uC81C\uC548" },
    views: { board: "\uBCF4\uB4DC", wireframe: "\uC640\uC774\uC5B4\uD504\uB808\uC784" },
    log: "\uB85C\uADF8 \uB9AC\uC2A4\uD2B8",
    logHeading: "\uB85C\uADF8 \uC2EC\uC744 \uC9C0\uC810 & \uACF5\uD1B5 \uC18D\uC131",
    commonProps: "\uACF5\uD1B5 \uC18D\uC131",
    propColumns: { name: "\uC18D\uC131", use: "\uC6A9\uB3C4" },
    eventColumns: { id: "\uC774\uBCA4\uD2B8", type: "\uC720\uD615", at: "\uBC1C\uC0DD \uC704\uCE58", props: "\uC18D\uC131", note: "\uBA54\uBAA8" },
    eventTypes: { normal: "\uC815\uC0C1", drop: "\uC774\uD0C8", error: "\uC5D0\uB7EC" },
    noEvents: "\uC544\uC9C1 \uC801\uC740 \uC774\uBCA4\uD2B8\uAC00 \uC5C6\uC5B4\uC694",
    unplaced: "\uC704\uCE58\uB97C \uCC3E\uC9C0 \uBABB\uD55C \uC774\uBCA4\uD2B8",
    nodeEvents: "\uC774 \uB178\uB4DC\uC5D0 \uAC78\uB9B0 \uC774\uBCA4\uD2B8",
    chips: "\uC0C1\uD0DC\xB7\uC9C0\uD45C\xB7\uC2E4\uD5D8\xB7\uC54C\uB9BC",
    chipTypes: {
      state: "\uC0C1\uD0DC\uAC12",
      metric: "\uC9C0\uD45C",
      experiment: "\uC2E4\uD5D8 \uBCC0\uC218",
      notify: "\uBC1C\uC1A1 \uC54C\uB9BC",
      code: "\uC608\uC678 \uCF54\uB4DC"
    },
    legend: { primary: "\uAE30\uBCF8 \uACBD\uB85C", exception: "\uC608\uC678", dormant: "\uBB38\uB9CC \uC5F4\uC5B4\uB460" },
    stageJump: "\uB2E8\uACC4\uB85C \uC774\uB3D9",
    kinds: {
      screen: "\uD654\uBA74",
      message: "\uBA54\uC2DC\uC9C0",
      email: "\uC774\uBA54\uC77C",
      document: "\uBB38\uC11C",
      step: "\uB2E8\uACC4",
      decision: "\uBD84\uAE30",
      system: "\uC2DC\uC2A4\uD15C",
      wait: "\uB300\uAE30",
      end: "\uC885\uB8CC"
    }
  };
  var EN = {
    path: "Path",
    fit: "Fit all",
    review: "Review",
    close: "Close",
    play: "Walk through",
    requests: "Change requests",
    allActions: "All connections",
    summary: "Review summary",
    findings: "Findings",
    none: "No findings",
    scenarios: "Scenarios",
    reqs: "Requirements",
    proposals: "Proposed fixes (preview only)",
    decisions: "Open decisions",
    bands: { exception: "What to check after a drop-off", decision: "Open decisions" },
    brief: "Planning intent",
    notes: "Conditions & branches",
    actions: "Buttons, branches & links",
    missing: "not connected",
    request: "Add a change request",
    whole: "Whole node",
    add: "Add",
    copy: "Copy all",
    clear: "Clear",
    copied: "Copied",
    empty: "No requests yet",
    reset: "Restart",
    vars: "State",
    trail: "Trail",
    noDest: "This button has no destination yet",
    guard: "This button does nothing in the current state",
    passed: "passed",
    failed: "failed",
    uncovered: "unchecked",
    applied: "Applied proposals",
    file: "File",
    placeholder: "Describe what to change and why",
    exitHint: "Back to overview",
    actor: "Actor",
    device: "Device",
    requestHeading: "## Wireflow change requests",
    origin: {
      source: "From brief",
      inferred: "AI inferred",
      observed: "Current build",
      proposed: "Proposed"
    },
    views: { board: "Board", wireframe: "Wireframe" },
    log: "Event log",
    logHeading: "Where to log & common properties",
    commonProps: "Common properties",
    propColumns: { name: "Property", use: "Used for" },
    eventColumns: { id: "Event", type: "Type", at: "Fires at", props: "Properties", note: "Note" },
    eventTypes: { normal: "Normal", drop: "Drop-off", error: "Error" },
    noEvents: "No events yet",
    unplaced: "Events with no known location",
    nodeEvents: "Events at this node",
    chips: "State, metrics, experiments, alerts",
    chipTypes: {
      state: "State",
      metric: "Metric",
      experiment: "Experiment",
      notify: "Notification",
      code: "Exception code"
    },
    legend: { primary: "Primary path", exception: "Exception", dormant: "Door left open" },
    stageJump: "Jump to stage",
    kinds: {
      screen: "Screen",
      message: "Message",
      email: "Email",
      document: "Document",
      step: "Step",
      decision: "Decision",
      system: "System",
      wait: "Wait",
      end: "End"
    }
  };
  function texts(locale) {
    return locale === "en" ? EN : KO;
  }

  // scripts/viewer/src/components/chips.mjs
  function renderChips(node, exceptionCodes2, T2) {
    const chips = cardChips(node, exceptionCodes2);
    if (!chips.length) return "";
    const chip = ({ type, text: text2 }) => html`<span class="chip ${type}" title="${T2.chipTypes[type]}">${text2}</span>`;
    return html`<div class="chips">${chips.map(chip)}</div>`;
  }

  // scripts/viewer/src/components/board-card.mjs
  var NO_ACTOR = "#8A92A0";
  function onWhite(hex, share) {
    const channel = (i) => 255 - (255 - Number.parseInt(hex.slice(i, i + 2), 16)) * share;
    return `#${[1, 3, 5].map((i) => Math.round(channel(i)).toString(16).padStart(2, "0")).join("")}`;
  }
  function renderBoardCard(node, ctx, T2) {
    const { flow } = ctx;
    const kind = kindOf(node);
    const origin = node.origin || "source";
    const classes = classNames(
      "card",
      `k-${kind}`,
      origin,
      isException(node) && "exception",
      node.dormant && "dormant",
      ctx.primary && "primary",
      ctx.selected && "sel",
      ctx.dim && "dim"
    );
    const vars = previewVars(flow, node);
    const color = ctx.color || NO_ACTOR;
    const style = [
      ctx.box && boxStyle(ctx.box),
      `--actor:${color};--actor-tint:${onWhite(color, 0.12)};--actor-line:${onWhite(color, 0.3)}`
    ];
    return html`<article class="${classes}" data-id="${node.id}"
    style="${style.filter(Boolean).join(";")}">
    <div class="c-top">
      ${node.actor && html`<span class="c-actor">${node.actor}</span>`}
      <span class="c-num">${KIND_ICONS[kind]} ${displayNumber(flow, node)}</span>
      ${isException(node) && html`<span class="c-code">${node.exception}</span>`}
      ${origin !== "source" && html`<span class="badge ${origin}">${T2.origin[origin] || origin}</span>`}
    </div>
    <h4 class="c-title">${fillVars(node.title, vars)}</h4>
    ${node.body && html`<p class="c-body">${fillVars(node.body, vars)}</p>`}
    ${renderChips(node, ctx.codes, T2)}
  </article>`;
  }

  // scripts/viewer/src/components/board-edges.mjs
  var arrow = (id) => html`<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5"
  markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L10,5 L0,10z"/></marker>`;
  var DEFS = html`<defs>${["b-arrow", "b-arrow-primary", "b-arrow-exception"].map(arrow)}</defs>`;
  function actionLabels(flow, edge) {
    const node = findNode(flow, edge.from);
    return edge.ids.map((id) => node.actions.find((a) => `${node.id}.${a.id}` === id)?.label ?? id).join(" / ");
  }
  function render2(edges, size, path, flow) {
    const onPath = (edge) => Boolean(path) && edge.ids.some((id) => path.edgeSteps.has(id));
    const classesOf = (edge) => classNames(
      edge.kind,
      edge.primary && "primary",
      edge.dormant && "dormant",
      path && (onPath(edge) ? "on" : "dim")
    );
    const markerOf = (edge) => {
      if (onPath(edge) || !path && edge.primary) return "b-arrow-primary";
      return edge.kind === "exception" ? "b-arrow-exception" : "b-arrow";
    };
    const line = (edge) => html`<g class="edge"><title>${actionLabels(flow, edge)}</title>
    <path class="hit" d="${toPathD(edge.points)}"/>
    <path class="${classesOf(edge)}" d="${toPathD(edge.points)}"
      marker-end="url(#${markerOf(edge)})"/></g>`;
    const label = (edge) => edge.labelAt && html`<span class="edge-label ${classesOf(edge)}"
      style="left:${edge.labelAt[0]}px;top:${edge.labelAt[1]}px">${edge.label}</span>`;
    const drawOrder = [...edges].sort((a, b) => Number(a.primary) - Number(b.primary));
    return html`<svg class="edges board-edges" width="${size.w}" height="${size.h}">
    ${DEFS}${drawOrder.map(line)}</svg>${edges.map(label)}`;
  }

  // scripts/viewer/src/components/board-view.mjs
  function render3({ layout, edges }, { flow, scenario, selected }, T2) {
    const primary = primaryPath(flow).nodes;
    const codes = exceptionCodes(flow);
    const colors = new Map(actorList(flow).map((a) => [a.name, a.color]));
    const path = scenarioPath(flow, scenario);
    const card = (node) => renderBoardCard(
      node,
      {
        flow,
        box: layout.nodes.get(node.id),
        color: colors.get(node.actor),
        codes: codes.get(node.id),
        primary: primary.has(node.id),
        selected: selected === node.id,
        dim: path && !path.nodes.has(node.id)
      },
      T2
    );
    const stageHeader = (header, i) => html`<div class="stage-head" style="${boxStyle(header)}"><b>${i + 1}</b>${header.label}</div>`;
    return html`
    ${render(layout.bands, flow.stages, T2)}
    ${layout.stageHeaders.map(stageHeader)}
    ${render2(edges, layout.size, path, flow)}
    ${flow.screens.map(card)}`;
  }

  // scripts/viewer/src/components/edges.mjs
  var ARROW_DEFS = html`<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5"
    orient="auto"><path d="M0,0 L10,5 L0,10z" fill="#a7a196" stroke="none"/></marker>
  <marker id="arrow-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4"
    orient="auto"><path d="M0,0 L10,5 L0,10z" fill="#2b59c3" stroke="none"/></marker>
</defs>`;
  function render4({ flow, nodes, anchors, path }) {
    const curves = [];
    const steps = [];
    for (const node of flow.screens) {
      const box = nodes.get(node.id);
      node.actions.forEach((action, i) => {
        const key = `${node.id}.${action.id}`;
        const start = anchors.get(key) || sideStart(box, i, node.actions.length);
        const onPath = path?.edgeSteps.has(key);
        const dim = path && !onPath && "dim";
        const target = nodes.get(action.to);
        if (!target) {
          curves.push(html`<path class="bad ${dim}" d="M${start.x},${start.y} h90"/>`);
          return;
        }
        const points = curve(start, box, target);
        const classes = classNames(onPath && "on", action.proposed && "prop", dim);
        curves.push(html`<path class="${classes}" d="${pathData(points)}"
        marker-end="url(#${onPath ? "arrow-on" : "arrow"})"/>`);
        if (onPath) steps.push(stepBadge(midpoint(points), path.edgeSteps.get(key)));
      });
    }
    return String(html`${ARROW_DEFS}${curves}${steps}`);
  }
  function sideStart(box, index, count) {
    return { x: box.x + box.w, y: box.y + box.h * (index + 1) / (count + 1) };
  }
  function curve(start, src, dst) {
    const { x: x1, y: y1 } = start;
    const bend = 140;
    if (dst === src) {
      const loop = Math.min(160, src.h / 2);
      return [
        [x1, y1],
        [x1 + 120, y1],
        [x1 + 120, y1 - loop],
        [x1, y1 - loop]
      ];
    }
    if (dst.x >= src.x + src.w - 1) {
      const x22 = dst.x;
      const y2 = dst.y + Math.min(dst.h / 2, 120);
      const dx = Math.max(60, (x22 - x1) / 2);
      return [
        [x1, y1],
        [x1 + dx, y1],
        [x22 - dx, y2],
        [x22, y2]
      ];
    }
    const x2 = dst.x + dst.w / 2;
    if (dst.y + dst.h < src.y) {
      const y2 = dst.y + dst.h;
      return [
        [x1, y1],
        [x1 + bend, y1],
        [x2, y2 + bend],
        [x2, y2]
      ];
    }
    const lift = dst.y > src.y + src.h ? bend : 180;
    return [
      [x1, y1],
      [x1 + bend, y1],
      [x2, dst.y - lift],
      [x2, dst.y]
    ];
  }
  var pathData = ([p0, p1, p2, p3]) => `M${p0} C${p1} ${p2} ${p3}`;
  var midpoint = ([p0, p1, p2, p3]) => [0, 1].map((axis) => (p0[axis] + 3 * p1[axis] + 3 * p2[axis] + p3[axis]) / 8);
  var stepBadge = ([x, y], numbers) => html`<circle cx="${x}" cy="${y}" r="18"/><text x="${x}" y="${y}">${numbers.join(",")}</text>`;

  // scripts/viewer/src/components/frame-node.mjs
  function render5(node, ctx, T2) {
    const style = nodeStyle(node);
    const withText = { ...ctx, text: (s) => fillVars(s, ctx.vars) };
    const body = { frame: frameBody, card: cardBody, box: boxBody }[style](node, withText, T2);
    const classes = classNames(
      "screen",
      `k-${kindOf(node)}`,
      style,
      `tone-${node.tone || "normal"}`,
      node.origin || "source",
      ctx.classes
    );
    return html`<div class="${classes}" data-id="${node.id}"
    style="${ctx.style || ""}">${body}</div>`;
  }
  function frameBody(node, ctx) {
    const ui = node.ui || {};
    const { text: text2 } = ctx;
    const back = node.actions.filter((a) => a.kind === "back");
    const tabs = node.actions.filter((a) => a.kind === "tab");
    const main = node.actions.filter((a) => a.kind !== "back" && a.kind !== "tab");
    const primary = main.find((a) => !a.kind || a.kind === "primary");
    return html`
    <div class="m-bar">
      ${buttons(node, back, primary, ctx)}<span>${text2(ui.bar || ctx.flow.title)}</span>
    </div>
    <div class="m-body">
      <h4>${text2(ui.heading || node.title)}</h4>
      ${node.body && html`<div class="m-text">${text2(node.body)}</div>`}
      ${(ui.blocks || []).map((b) => block(b, ctx))}
      ${node.detail && html`<div class="m-text detail">${text2(node.detail)}</div>`}
    </div>
    <div class="m-actions">${buttons(node, main, primary, ctx)}</div>
    ${tabs.length > 0 && html`<div class="m-tabs">${buttons(node, tabs, primary, ctx)}</div>`}`;
  }
  function cardBody(node, ctx, T2) {
    const kind = kindOf(node);
    const ui = node.ui || {};
    const { text: text2 } = ctx;
    const channel = text2(node.channel || ui.bar || T2.kinds[kind]);
    const heading = text2(ui.heading || node.title);
    const header = {
      message: html`<div class="c-head">${KIND_ICONS.message} ${channel}</div>`,
      email: html`<div class="c-head">${KIND_ICONS.email} ${channel}</div>
      <div class="c-subject">${heading}</div>`,
      document: html`<div class="c-head">${KIND_ICONS.document} ${channel}</div><h4>${heading}</h4>`
    }[kind];
    const content = kind === "message" ? html`<div class="bubble">${text2(node.body || node.title)}</div>` : node.body && html`<div class="m-text">${text2(node.body)}</div>`;
    return html`
    ${header}
    <div class="c-body">${content}${(ui.blocks || []).map((b) => block(b, ctx))}</div>
    <div class="m-actions">${buttons(node, node.actions, node.actions[0], ctx)}</div>`;
  }
  var DIAMOND = html`<svg class="shape" viewBox="0 0 100 100" preserveAspectRatio="none">
  <polygon points="50,2 98,50 50,98 2,50"/></svg>`;
  function boxBody(node, ctx, T2) {
    const kind = kindOf(node);
    const { text: text2 } = ctx;
    const showBody = node.body && (kind !== "decision" || ctx.live);
    return html`
    ${kind === "decision" && DIAMOND}
    <div class="n-inner">
      <div class="n-kind">${KIND_ICONS[kind]} ${T2.kinds[kind]}</div>
      <div class="n-title">${text2(node.title)}</div>
      ${showBody && html`<div class="n-body">${text2(node.body)}</div>`}
    </div>
    ${ctx.live && html`<div class="m-actions">${buttons(node, node.actions, node.actions[0], ctx)}</div>`}`;
  }
  var buttons = (node, actions, primary, ctx) => actions.map((a) => actionButton(node, a, primary, ctx));
  function actionButton(node, a, primary, ctx) {
    const steps = ctx.pathSteps?.get(`${node.id}.${a.id}`);
    const classes = classNames(
      "act",
      a.kind || (a === primary ? "primary" : "secondary"),
      !findNode(ctx.flow, a.to) && "missing",
      a.proposed && "proposed",
      ctx.live && !enabledActions(node, ctx.vars).includes(a) && "guard-off",
      steps && "on-path"
    );
    const label = a.kind === "back" ? "\u2039" : ctx.text(a.label);
    const badge = steps && html`<span class="step">${steps.join(",")}</span>`;
    return html`<button class="${classes}" data-action="${a.id}"
    title="${a.label}">${badge}${label}</button>`;
  }
  function block(b, { vars, live, text: text2 }) {
    const disabled = !live && html`disabled`;
    switch (b.type) {
      case "notice":
        return html`<div class="m-notice ${b.tone || ""}">${text2(b.label)}</div>`;
      case "visual":
        return html`<div class="m-visual"
        style="${b.aspect ? `aspect-ratio:${b.aspect}` : ""}">${b.label}</div>`;
      case "rows":
        return html`<div class="m-rows">${(b.rows || []).map(
          (r) => html`<div><span>${text2(r.label)}</span><b>${text2(r.value)}</b></div>`
        )}</div>`;
      case "list":
        return html`<div class="m-list">${(b.items || []).map(
          (item) => html`<div>${text2(item)}</div>`
        )}</div>`;
      case "input":
        return inputBlock(b, vars, disabled);
      case "toggle":
        return html`<label class="m-toggle"><span>${b.label}</span><input type="checkbox"
        data-field="${b.field}" ${vars[b.field] ? html`checked` : ""} ${disabled}></label>`;
      default:
        return html`<div class="m-text">${text2(b.label)}</div>`;
    }
  }
  function inputBlock(b, vars, disabled) {
    const value = b.field ? vars[b.field] ?? "" : "";
    const field = html`data-field="${b.field}" placeholder="${b.placeholder}" ${disabled}`;
    const control = b.multiline ? html`<textarea ${field}>${value}</textarea>` : html`<input ${field} value="${value}">`;
    return html`<label class="m-field">
    <span>${b.label}${b.required && " *"}</span>${control}</label>`;
  }

  // scripts/viewer/src/components/wireframe-view.mjs
  function draw(canvas, scene, { flow, result, scenario, selected }, T2) {
    const path = scenarioPath(flow, scenario);
    const critical = new Set(
      result.findings.filter((f) => f.severity === "critical").map((f) => f.screen)
    );
    const nodes = flow.screens.map((node) => {
      const box = scene.nodes.get(node.id);
      const ctx = {
        flow,
        vars: previewVars(flow, node),
        live: false,
        pathSteps: path?.steps,
        classes: classNames(
          selected === node.id && "sel",
          path && !path.nodes.has(node.id) && selected !== node.id && "dim",
          critical.has(node.id) && "has-bad"
        ),
        style: boxStyle(box)
      };
      return html`${nodeTag(node, box, flow, T2)}${render5(node, ctx, T2)}`;
    });
    const stageRow = (stage) => html`<div class="group" style="${boxStyle(stage)}"><h3>${stage.label}</h3></div>`;
    canvas.innerHTML = String(html`
    ${scene.stages.map(stageRow)}
    <svg class="edges" width="${scene.size.w}" height="${scene.size.h}"></svg>
    ${nodes}`);
    canvas.querySelector(".edges").innerHTML = render4({
      flow,
      nodes: scene.nodes,
      anchors: buttonAnchors(canvas, scene.nodes),
      path
    });
  }
  function nodeTag(node, box, flow, T2) {
    const origin = node.origin || "source";
    const device = nodeStyle(node) === "frame" && (node.device || flow.device) && html`<span class="badge">${deviceLabel(node, flow)}</span>`;
    return html`<div class="node-tag" style="left:${box.x}px;top:${box.y - 40}px">
    <b>${displayNumber(flow, node)}</b> ${node.title}
    <span class="badge ${origin}">${T2.origin[origin] || origin}</span>${device}</div>`;
  }
  function buttonAnchors(canvas, nodes) {
    const anchors = /* @__PURE__ */ new Map();
    for (const button of canvas.querySelectorAll(".screen [data-action]")) {
      const nodeEl = button.closest("[data-id]");
      const box = nodes.get(nodeEl.dataset.id);
      const frame = nodeEl.getBoundingClientRect();
      const zoom = frame.width / nodeEl.offsetWidth;
      const r = button.getBoundingClientRect();
      anchors.set(`${nodeEl.dataset.id}.${button.dataset.action}`, {
        x: box.x + (r.right - frame.left) / zoom,
        y: box.y + (r.top + r.height / 2 - frame.top) / zoom
      });
    }
    return anchors;
  }

  // scripts/viewer/src/components/canvas.mjs
  function mount2(canvas, store2, T2) {
    const drawn = (s) => [s.tab, s.view, s.flow, s.result, s.scenario, s.selected];
    watch(store2, drawn, (state) => {
      if (state.tab !== "canvas") return;
      const scene = sceneOf(state);
      canvas.style.width = `${scene.size.w}px`;
      canvas.style.height = `${scene.size.h}px`;
      if (state.view === "board") {
        canvas.innerHTML = String(render3(scene, state, T2));
      } else {
        draw(canvas, scene, state, T2);
      }
    });
    canvas.addEventListener("click", (e) => {
      const nodeEl = e.target.closest("[data-id]");
      if (!nodeEl) return;
      const { flow, selected } = store2.getState();
      const id = nodeEl.dataset.id;
      const button = e.target.closest("[data-action]");
      const to = button && selected === id && findNode(flow, id).actions.find((a) => a.id === button.dataset.action)?.to;
      store2.dispatch({ type: "select", id: findNode(flow, to) ? to : id });
    });
  }

  // scripts/viewer/src/components/legend.mjs
  function mount3(el, store2, T2) {
    watch(
      store2,
      (s) => [s.flow],
      ({ flow }) => {
        el.innerHTML = String(renderLegend(flow, T2));
      }
    );
  }
  function renderLegend(flow, T2) {
    const actor = ({ name, color }) => html`<span class="key"><i class="swatch" style="background:${color}"></i>${name}</span>`;
    return html`
    ${actorList(flow).map(actor)}
    <span class="key"><i class="line primary"></i>${T2.legend.primary}</span>
    <span class="key"><i class="line exception"></i>${T2.legend.exception}</span>
    <span class="key"><i class="mini dormant"></i>${T2.legend.dormant}</span>`;
  }

  // scripts/viewer/src/components/log-page.mjs
  function mount4(el, store2, T2) {
    watch(
      store2,
      (s) => [s.flow],
      ({ flow }) => {
        el.innerHTML = String(renderLogPage(flow, T2));
      }
    );
  }
  function renderLogPage(flow, T2) {
    const events = flow.events || [];
    const props = flow.eventProps || [];
    if (!events.length && !props.length) {
      return html`<h2>${T2.logHeading}</h2><div class="sub">${T2.noEvents}</div>`;
    }
    return html`<h2>${T2.logHeading}</h2>
    ${props.length > 0 && propTable(props, T2)}
    ${stageGroups(flow, events, T2).map((group) => eventTable(flow, group, T2))}`;
  }
  function propTable(props, T2) {
    const row = (p) => html`<tr><td><code>${p.name}</code></td><td>${p.use}</td></tr>`;
    return html`<h3>${T2.commonProps}</h3>
    <table class="lt props">
      <thead><tr><th>${T2.propColumns.name}</th><th>${T2.propColumns.use}</th></tr></thead>
      <tbody>${props.map(row)}</tbody>
    </table>`;
  }
  function stageGroups(flow, events, T2) {
    const stageOf = (event) => {
      const [first] = eventLocations(event);
      return first ? findNode(flow, splitLocation(first)[0])?.stage : void 0;
    };
    const groups = flow.stages.map((label, stage) => ({
      label,
      number: stage + 1,
      events: events.filter((e) => stageOf(e) === stage)
    }));
    const placed = new Set(groups.flatMap((g) => g.events));
    groups.push({ label: T2.unplaced, events: events.filter((e) => !placed.has(e)) });
    return groups.filter((g) => g.events.length);
  }
  function eventTable(flow, { label, number, events }, T2) {
    const cols = T2.eventColumns;
    const row = (e) => html`<tr>
    <td><code>${e.id}</code></td>
    <td><span class="ty ${e.type}">${T2.eventTypes[e.type] || e.type}</span></td>
    <td>${eventLocations(e).map((at) => html`<div>${locationLink(flow, at)}</div>`)}</td>
    <td>${(e.props || []).map((p) => html`<code>${p}</code> `)}</td>
    <td>${e.note}</td>
  </tr>`;
    return html`<h3>${number && html`<span class="ph">${number}</span>`} ${label}</h3>
    <table class="lt events">
      <thead><tr>
        <th>${cols.id}</th><th>${cols.type}</th><th>${cols.at}</th>
        <th>${cols.props}</th><th>${cols.note}</th>
      </tr></thead>
      <tbody>${events.map(row)}</tbody>
    </table>`;
  }
  function locationLink(flow, at) {
    const [nodeId, actionId] = splitLocation(at);
    const node = findNode(flow, nodeId);
    if (!node) return html`<code>${at}</code>`;
    const action = actionId && node.actions.find((a) => a.id === actionId);
    const link = html`<a href="#" ${onClick({ type: "select", id: node.id })}>
    ${displayNumber(flow, node)} ${node.title}</a>`;
    return html`${link}${actionId && ` \u203A ${action?.label || actionId}`}`;
  }

  // scripts/viewer/src/components/finding-list.mjs
  function render6(findings, flow, T2) {
    return findings.map((f) => {
      const node = f.screen && findNode(flow, f.screen);
      const where = [
        node && `${displayNumber(flow, node)} ${node.title}`,
        f.action,
        f.scenario && `${T2.scenarios} ${f.scenario}`
      ];
      return html`<button class="f ${f.severity}" ${node && onClick({ type: "select", id: node.id })}>
      <b>${f.code}</b> ${f.message}<small>${where.filter(Boolean).join(" \xB7 ")}</small>
    </button>`;
    });
  }

  // scripts/viewer/src/components/proposal-list.mjs
  function render7({ authored, applied }, T2, nodeId) {
    const touches = (p) => (p.changes || []).some(
      (c) => c.screen === nodeId || c.addScreen?.id === nodeId || c.action?.to === nodeId
    );
    const proposals = (authored.proposals || []).filter((p) => !nodeId || touches(p));
    if (!proposals.length) return "";
    return html`<h3>${T2.proposals}</h3>${proposals.map(
      (p) => html`<label class="prop-row">
      <input type="checkbox" ${applied.includes(p.id) && html`checked`}
        ${onClick({ type: "toggleProposal", id: p.id })}>
      <span><b>${p.title}</b><small>${p.reason}</small></span>
    </label>`
    )}`;
  }

  // scripts/viewer/src/components/node-panel.mjs
  var NO_DRAFT = { target: "", text: "" };
  var readDraft = (el) => ({
    target: el.querySelector("[name=request-target]").value,
    text: el.querySelector("[name=request-text]").value
  });
  function mount5(el, store2, T2) {
    let shown = null;
    watch(
      store2,
      (s) => [s.selected, s.tab, s.mode, s.flow, s.result],
      (state) => {
        const open = state.tab === "canvas" && state.mode === "overview";
        const node = open && state.selected && findNode(state.flow, state.selected);
        const draft = node && node.id === shown ? readDraft(el) : NO_DRAFT;
        el.innerHTML = node ? String(render8(node, state, draft, T2)) : "";
        shown = node ? node.id : null;
      }
    );
    el.addEventListener("click", (e) => {
      if (!e.target.closest("[name=add-request]")) return;
      const { target, text: text2 } = readDraft(el);
      if (!text2.trim()) return;
      const screen = store2.getState().selected;
      store2.dispatch({ type: "addRequest", screen, action: target, text: text2.trim() });
      el.querySelector("[name=request-text]").value = "";
    });
  }
  function render8(node, state, draft, T2) {
    const { flow, result } = state;
    const kind = kindOf(node);
    const origin = node.origin || "source";
    const findings = result.findings.filter((f) => f.screen === node.id);
    const bullets = (items) => html`<ul>${items.map((x) => html`<li>${x}</li>`)}</ul>`;
    const link = (a) => {
      const target = findNode(flow, a.to);
      return target ? html`<a href="#" ${onClick({ type: "select", id: target.id })}>
          ${displayNumber(flow, target)} ${target.title}</a>` : html`<span class="fail">${T2.missing}</span>`;
    };
    const actions = node.actions.map(
      (a) => html`<li><b>${a.label}</b> <code>${a.id}</code> → ${link(a)}
      ${a.when && html`<small class="sub">when ${JSON.stringify(a.when)}</small>`}</li>`
    );
    return html`
    <header>
      <h2>${displayNumber(flow, node)} ${node.title}</h2>
      <button class="close" title="${T2.close}" ${onClick({ type: "select", id: null })}>✕</button>
    </header>
    <div class="sub">
      ${KIND_ICONS[kind]} ${T2.kinds[kind]} · ${flow.stages[node.stage]}
      ${node.actor && ` \xB7 ${T2.actor} ${node.actor}`}
      ${kind === "screen" && ` \xB7 ${T2.device} ${deviceLabel(node, flow)}`}
      · <code>${node.id}</code>
      · <span class="badge ${origin}">${T2.origin[origin] || origin}</span>
    </div>
    ${node.brief && html`<h3>${T2.brief}</h3><div>${node.brief}</div>`}
    ${node.notes?.length > 0 && html`<h3>${T2.notes}</h3>${bullets(node.notes)}`}
    ${node.decisions?.length > 0 && html`<h3>${T2.decisions}</h3>${bullets(node.decisions)}`}
    ${chipSection(node, flow, T2)}
    ${eventSection(node, flow, T2)}
    ${findings.length > 0 && html`<h3>${T2.findings}</h3>${render6(findings, flow, T2)}`}
    <h3>${T2.actions}</h3>
    <ul>${actions.length ? actions : html`<li class="sub">—</li>`}</ul>
    ${render7(state, T2, node.id)}
    <h3>${T2.request}</h3>
    <div class="req-form">
      <select name="request-target">
        <option value="">${T2.whole}</option>
        ${node.actions.map(
      (a) => html`<option value="${a.id}" ${a.id === draft.target && html`selected`}>
            ${a.label} (${a.id})</option>`
    )}
      </select>
      <textarea name="request-text" placeholder="${T2.placeholder}">${draft.text}</textarea>
      <div class="row"><button name="add-request">${T2.add}</button></div>
    </div>`;
  }
  function chipSection(node, flow, T2) {
    const chips = renderChips(node, exceptionCodes(flow).get(node.id), T2);
    return chips && html`<h3>${T2.chips}</h3>${chips}`;
  }
  function eventSection(node, flow, T2) {
    const here = (flow.events || []).map((event) => ({
      event,
      spots: eventLocations(event).map(splitLocation).filter(([id]) => id === node.id)
    })).filter(({ spots }) => spots.length);
    if (!here.length) return "";
    const label = ([, actionId]) => actionId && (node.actions.find((a) => a.id === actionId)?.label || actionId);
    const row = ({ event, spots }) => html`<li>
    <code>${event.id}</code>
    <span class="ty ${event.type}">${T2.eventTypes[event.type] || event.type}</span>
    ${spots.map(label).filter(Boolean).join(", ")}</li>`;
    return html`<h3>${T2.nodeEvents}</h3><ul>${here.map(row)}</ul>`;
  }

  // scripts/viewer/src/components/player.mjs
  function mount6(el, store2, T2) {
    watch(
      store2,
      (s) => [s.mode, s.play, s.flow, s.scenario],
      (state) => {
        el.innerHTML = state.mode === "play" ? String(render9(state, el, T2)) : "";
      }
    );
    el.addEventListener("click", (e) => {
      const button = e.target.closest("[data-action]");
      if (button) {
        store2.dispatch({ type: "press", action: button.dataset.action, fields: changedFields(el) });
      }
    });
  }
  function render9({ flow, play, scenario }, el, T2) {
    const node = findNode(flow, play.node);
    const nextStep = findScenario(flow, scenario)?.steps[play.trail.length - 1];
    const pathSteps = nextStep && /* @__PURE__ */ new Map([[`${node.id}.${nextStep.action}`, [play.trail.length]]]);
    const ctx = { flow, vars: play.vars, live: true, pathSteps, ...sizeIn(el, node, flow) };
    const trail = play.trail.map((t) => {
      const n = findNode(flow, t.node);
      return html`<li>${t.action && html`<code>${t.action}</code> → `}${n ? `${displayNumber(flow, n)} ${n.title}` : t.node}</li>`;
    });
    return html`
    ${render5(node, ctx, T2)}
    <div class="trail">
      <h3>${displayNumber(flow, node)} ${node.title}${node.actor && html` <small class="sub">· ${node.actor}</small>`}</h3>
      <div class="row">
        <button ${onClick({ type: "startPlay" })}>${T2.reset}</button>
        <button ${onClick({ type: "stopPlay" })}>${T2.exitHint}</button>
      </div>
      <h3>${T2.trail}</h3><ol>${trail}</ol>
      <h3>${T2.vars}</h3><div class="vars">${JSON.stringify(play.vars, null, 1)}</div>
    </div>`;
  }
  function sizeIn(el, node, flow) {
    const style = nodeStyle(node);
    if (style !== "frame") {
      const width = style === "card" ? nodeSize(node, flow)[0] : 360;
      return { classes: "live", style: `width:${width}px` };
    }
    const [w, h] = nodeSize(node, flow);
    const zoom = Math.min(1, (el.clientHeight - 56) / h, (el.clientWidth - 340) / w).toFixed(3);
    return { style: `width:${w}px;height:${h}px;zoom:${zoom}` };
  }
  function changedFields(el) {
    const fields = {};
    for (const field of el.querySelectorAll("[data-field]")) {
      const [value, initial] = field.type === "checkbox" ? [field.checked, field.defaultChecked] : [field.value, field.defaultValue];
      if (value !== initial) fields[field.dataset.field] = value;
    }
    return fields;
  }

  // scripts/viewer/src/request-markdown.mjs
  function requestsMarkdown({ authored, meta, applied, requests }, T2) {
    const appliedIds = applied.length ? applied.map((id) => `\`${id}\``).join(", ") : "\u2014";
    const lines = requests.map((q, i) => {
      const target = `${q.number} \`${q.screen}\`${q.action ? ` \u203A action \`${q.action}\`` : ""}`;
      return `${i + 1}. [${target}] ${q.text}`;
    });
    return [
      `${T2.requestHeading} \u2014 ${authored.title}`,
      `- flow: \`${authored.id}\` \xB7 ${T2.file}: \`${meta.source}\` \xB7 viewer: \`${meta.output}\``,
      `- ${T2.applied}: ${appliedIds}`,
      "",
      ...lines
    ].join("\n");
  }

  // scripts/viewer/src/components/requests.mjs
  function mount7(el, store2, T2) {
    watch(
      store2,
      (s) => [s.requests],
      ({ requests }) => {
        el.innerHTML = String(render10(requests, T2));
      }
    );
    el.addEventListener("click", async (e) => {
      if (!e.target.closest("[name=copy-requests]")) return;
      await copyText(requestsMarkdown(store2.getState(), T2));
      store2.dispatch({ type: "notify", message: "copied" });
    });
  }
  function render10(requests, T2) {
    const empty = requests.length === 0;
    const item = (q, i) => html`<div class="req">
    <div><code>${q.number} ${q.screen}${q.action && ` \u203A ${q.action}`}</code><br>${q.text}</div>
    <button ${onClick({ type: "removeRequest", index: i })}>✕</button>
  </div>`;
    return html`
    <h2>${T2.requests} (${requests.length})</h2>
    ${empty ? html`<div class="sub">${T2.empty}</div>` : requests.map(item)}
    <div class="row">
      <button name="copy-requests" ${empty && html`disabled`}>${T2.copy}</button>
      <button ${onClick({ type: "clearRequests" })} ${empty && html`disabled`}>${T2.clear}</button>
    </div>`;
  }
  async function copyText(text2) {
    try {
      await navigator.clipboard.writeText(text2);
    } catch {
      const area = document.createElement("textarea");
      area.value = text2;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
  }

  // scripts/viewer/src/components/review-page.mjs
  var STATUS_CLASS = { passed: "pass", failed: "fail", uncovered: "unc" };
  function mount8(el, store2, T2) {
    watch(
      store2,
      (s) => [s.flow, s.result, s.applied],
      (state) => {
        el.innerHTML = String(render11(state, T2));
      }
    );
  }
  function render11(state, T2) {
    const { authored, flow, meta, result } = state;
    const scenarios = result.scenarios.map(
      (s) => html`<li>
      <a href="#" ${onClick({ type: "setScenario", id: s.id })}>
        ${findScenario(flow, s.id)?.title || s.id}</a>
      — <span class="${s.ok ? "pass" : "fail"}">${s.ok ? T2.passed : T2.failed}</span></li>`
    );
    return html`
    <h2>${T2.summary}</h2>
    <div class="sub">
      ${T2.file}: <code>${meta.source}</code> · flow <code>${authored.id}</code>
    </div>
    ${authored.source && html`<div class="sub">${authored.source}</div>`}
    <h3>${T2.findings} (${result.findings.length})</h3>
    ${result.findings.length ? render6(result.findings, flow, T2) : html`<div class="sub">${T2.none}</div>`}
    <h3>${T2.scenarios}</h3>
    <ul>${scenarios}</ul>
    ${requirementList(state, T2)}
    ${render7(state, T2)}
    ${decisionList(flow, T2)}`;
  }
  function requirementList({ authored, result }, T2) {
    if (!result.requirements.length) return "";
    const row = (r) => {
      const def = authored.requirements.find((q) => q.id === r.id);
      return html`<li>
      <span class="${STATUS_CLASS[r.status]}">${T2[r.status]}</span> ${def.title}
      <span class="badge ${def.origin || ""}">${T2.origin[def.origin] || ""}</span>
      <br><small class="sub">${def.expected}</small>
    </li>`;
    };
    return html`<h3>${T2.reqs}</h3><ul>${result.requirements.map(row)}</ul>`;
  }
  function decisionList(flow, T2) {
    const items = flow.screens.flatMap(
      (node) => (node.decisions || []).map((question) => ({ node, question }))
    );
    if (!items.length) return "";
    return html`<h3>${T2.decisions}</h3><ul>${items.map(
      ({ node, question }) => html`<li><a href="#" ${onClick({ type: "select", id: node.id })}>
        ${displayNumber(flow, node)}</a> ${question}</li>`
    )}</ul>`;
  }

  // scripts/viewer/src/components/tabs.mjs
  function mount9(el, store2, T2) {
    watch(
      store2,
      (s) => [s.tab, s.view, s.result],
      (state) => {
        el.innerHTML = String(render12(state, T2));
      }
    );
  }
  function render12({ tab, view, result }, T2) {
    const tabButton = (label, active, action) => html`<button role="tab" aria-selected="${active}" class="${active && "on"}"
      ${onClick(action)}>${label}</button>`;
    return html`
    ${["board", "wireframe"].map(
      (v) => tabButton(T2.views[v], tab === "canvas" && view === v, { type: "setView", view: v })
    )}
    ${tabButton(T2.log, tab === "log", { type: "setTab", tab: "log" })}
    ${tabButton(
      html`${T2.review} <span class="count">${result.findings.length}</span>`,
      tab === "review",
      { type: "setTab", tab: "review" }
    )}`;
  }

  // scripts/viewer/src/components/toast.mjs
  var SHOWN_MS = 2200;
  function mount10(el, store2, T2) {
    let timer;
    watch(
      store2,
      (s) => [s.notice],
      ({ notice }) => {
        if (!notice) return;
        el.textContent = text(notice, T2);
        el.hidden = false;
        clearTimeout(timer);
        timer = setTimeout(() => {
          el.hidden = true;
        }, SHOWN_MS);
      }
    );
  }
  function text({ message, detail }, T2) {
    switch (message) {
      case "guard":
        return T2.guard;
      case "noDest":
        return `${T2.noDest} (${detail})`;
      case "conflict":
        return detail;
      case "requestAdded":
        return `${T2.requests} +1`;
      case "copied":
        return T2.copied;
      default:
        return message;
    }
  }

  // scripts/viewer/src/components/toolbar.mjs
  function mount11(el, store2, T2) {
    watch(
      store2,
      (s) => [s.flow, s.view, s.tab, s.scenario, s.mode, s.selected, s.requests],
      (state) => {
        el.innerHTML = String(render13(state, T2));
      }
    );
    el.addEventListener("change", (e) => {
      const { name, value } = e.target;
      if (name === "scenario") store2.dispatch({ type: "setScenario", id: value });
      if (name === "stage" && value !== "") {
        store2.dispatch({ type: "focusStage", stage: Number(value) });
        e.target.value = "";
      }
    });
  }
  function render13({ flow, view, tab, scenario, mode, selected, requests }, T2) {
    const playing = mode === "play";
    const option = (s) => html`<option value="${s.id}" ${s.id === scenario && html`selected`}>${s.title}</option>`;
    const stageJump = view === "board" && tab === "canvas" && html`<select name="stage" class="jump" aria-label="${T2.stageJump}">
      <option value="">${T2.stageJump}</option>
      ${flow.stages.map((label, i) => html`<option value="${i}">${i + 1}. ${label}</option>`)}
    </select>`;
    return html`
    ${stageJump}
    <label class="pick"><span>${T2.path}</span><select name="scenario">
      <option value="">${T2.allActions}</option>${(flow.scenarios || []).map(option)}
    </select></label>
    <button class="${playing && "on"}"
      ${onClick(playing ? { type: "stopPlay" } : { type: "startPlay", from: selected })}>
      ${T2.play}</button>
    <button ${onClick({ type: "setTab", tab: "review" })}>
      ${T2.requests} <b>${requests.length}</b></button>`;
  }

  // scripts/viewer/src/main.mjs
  var store = createStore(FLOW, META);
  var T = texts(FLOW.locale);
  var $ = (id) => document.getElementById(id);
  for (const el of document.querySelectorAll("[data-t]")) el.textContent = T[el.dataset.t];
  $("flow-title").textContent = FLOW.title;
  $("flow-goal").textContent = FLOW.goal || "";
  watch(
    store,
    (s) => [s.tab, s.view, s.mode],
    ({ tab, view, mode }) => {
      Object.assign(document.body.dataset, { tab, view, mode });
    }
  );
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-dispatch]");
    if (!target) return;
    e.preventDefault();
    store.dispatch(JSON.parse(target.dataset.dispatch));
  });
  mount9($("tabs"), store, T);
  mount11($("tools"), store, T);
  mount3($("legend"), store, T);
  mount2($("canvas"), store, T);
  mount($("stage"), store);
  mount5($("panel"), store, T);
  mount6($("player"), store, T);
  mount7($("requests"), store, T);
  mount4($("log"), store, T);
  mount8($("review"), store, T);
  mount10($("toast"), store, T);
})();
