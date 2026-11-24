// Wireflow viewer app. Build concatenates: model.mjs, i18n.mjs, geometry.mjs, render.mjs, then this file.
// Globals from build: FLOW, META.
(() => {
  const T = texts(FLOW.locale);
  const $ = (selector) => document.querySelector(selector);

  const state = {
    flow: FLOW, // FLOW with the selected proposals applied
    result: null, // check() result for `flow`
    applied: [], // proposal ids
    view: FLOW.view === 'flowchart' ? 'flowchart' : 'wireframe',
    mode: 'overview', // or 'play'
    scenario: '', // highlighted scenario id
    selected: null, // selected node id
    panel: 'auto', // 'auto' (summary or selected node) or 'requests'
    camera: { x: 40, y: 80, k: 0.3 },
    play: null, // { node, vars, trail }
    layout: null,
  };

  const findNode = (id) => state.flow.screens.find((s) => s.id === id);
  const findScenario = (id) => (state.flow.scenarios || []).find((s) => s.id === id);
  const previewVars = (node) => ({ ...(state.flow.vars || {}), ...(node.preview || {}) });
  const conditionHolds = (when, vars) => Object.entries(when || {}).every(([k, v]) => vars[k] === v);

  function displayNumber(node) {
    if (node.number) return node.number;
    const peers = state.flow.screens.filter((s) => s.stage === node.stage);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(node.stage + 1)}.${pad(peers.indexOf(node) + 1)}`;
  }

  function toast(message) {
    const el = $('#toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => (el.hidden = true), 2200);
  }

  function recompute() {
    state.flow = state.applied.length ? applyProposals(FLOW, state.applied) : FLOW;
    state.result = check(FLOW, { with: state.applied });
    state.layout = layoutFlow(state.flow, state.view, T.unassigned);
  }

  // ---------- change requests (persisted per flow id + html filename) ----------

  const requestStore = {
    key: `wireflow:${FLOW.id}:${META.output}`,
    items: [],
    load() {
      try { this.items = JSON.parse(localStorage.getItem(this.key) || '[]'); } catch { this.items = []; }
    },
    save() {
      try { localStorage.setItem(this.key, JSON.stringify(this.items)); } catch { /* storage disabled */ }
      $('#req-count').textContent = this.items.length;
    },
    toMarkdown() {
      const applied = state.applied.length ? state.applied.map((id) => `\`${id}\``).join(', ') : '—';
      const lines = this.items.map((q, i) => {
        const target = `${q.number} \`${q.screen}\`${q.action ? ` › action \`${q.action}\`` : ''}`;
        return `${i + 1}. [${target}] ${q.text}`;
      });
      return [
        `${T.requestHeading} — ${FLOW.title}`,
        `- flow: \`${FLOW.id}\` · ${T.file}: \`${META.source}\` · viewer: \`${META.output}\``,
        `- ${T.applied}: ${applied}`,
        '',
        ...lines,
      ].join('\n');
    },
  };

  // ---------- scenario highlight ----------

  /** Which actions and nodes the highlighted scenario touches, with step numbers. */
  function highlightedPath() {
    const scenario = findScenario(state.scenario);
    if (!scenario) return null;
    const run = runScenario(state.flow, scenario);
    const steps = new Map();
    run.trail.slice(1).forEach((t, i) => {
      const key = `${run.trail[i].screen}.${t.action}`;
      steps.set(key, [...(steps.get(key) || []), i + 1]);
    });
    const edgeSteps = new Map(steps);
    if (!run.ok) {
      const failedAction = scenario.steps[run.failedStep]?.action;
      if (failedAction) steps.set(`${run.screen}.${failedAction}`, [run.failedStep + 1]);
    }
    return { steps, edgeSteps, nodes: new Set(run.trail.map((t) => t.screen)) };
  }

  // ---------- canvas ----------

  function renderCanvas() {
    const canvas = $('#canvas');
    const { pos, groups, width, height } = state.layout;
    const path = highlightedPath();
    const critical = new Set(state.result.findings.filter((f) => f.severity === 'critical').map((f) => f.screen));

    canvas.className = `view-${state.view}`;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.querySelectorAll('.group, .screen').forEach((el) => el.remove());

    for (const g of groups) canvas.appendChild(groupElement(g));
    for (const node of state.flow.screens) {
      const dimmed = path && !path.nodes.has(node.id) && state.selected !== node.id;
      canvas.appendChild(nodeElement(node, pos.get(node.id), { path, dimmed, critical: critical.has(node.id) }));
    }
    requestAnimationFrame(() => drawEdges(path));
    applyCamera();
  }

  function groupElement(g) {
    const el = document.createElement('div');
    el.className = `group g-${g.type}`;
    Object.assign(el.style, { left: `${g.x}px`, top: `${g.y}px`, width: `${g.w}px`, height: `${g.h}px` });
    el.innerHTML = html`<h3>${g.label}</h3>`;
    return el;
  }

  function nodeElement(node, box, { path, dimmed, critical }) {
    const el = document.createElement('div');
    el.dataset.id = node.id;
    el.className = nodeClasses(node, state.view);
    el.classList.toggle('sel', state.selected === node.id);
    el.classList.toggle('dim', Boolean(dimmed));
    el.classList.toggle('has-bad', critical);
    Object.assign(el.style, { left: `${box.x}px`, top: `${box.y}px`, width: `${box.w}px`, height: `${box.h}px` });

    const ctx = { flow: state.flow, findNode, vars: previewVars(node), live: false, pathSteps: path?.steps };
    el.innerHTML = `${nodeBody(node, state.view, ctx, T)}${nodeTag(node)}`;
    return el;
  }

  function nodeTag(node) {
    const origin = node.origin || 'source';
    const framed = nodeStyle(node, state.view) === 'frame';
    const showTitle = state.view === 'wireframe';
    const device = framed && (node.device || FLOW.device) && html`<span class="badge">${deviceLabel(node, FLOW)}</span>`;
    return html`<div class="tag"><b>${displayNumber(node)}</b> ${showTitle && node.title}
      <span class="badge ${origin}">${T.origin[origin] || origin}</span>${device}</div>`;
  }

  // ---------- edges ----------

  const ARROW_DEFS = `<defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10z" fill="#a7a196" stroke="none"/></marker>
    <marker id="arrow-on" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L10,5 L0,10z" fill="#2b59c3" stroke="none"/></marker>
  </defs>`;

  /** Start point of an action's edge: its rendered button if any, else the box side. */
  function actionAnchor(node, index) {
    const box = state.layout.pos.get(node.id);
    const action = node.actions[index];
    const button = $(`#canvas .screen[data-id="${CSS.escape(node.id)}"] [data-action="${CSS.escape(action.id)}"]`);
    if (!button) {
      const diamond = state.view === 'flowchart' && kindOf(node) === 'decision';
      return edgeStart(box, index, node.actions.length, diamond);
    }
    const canvasRect = $('#canvas').getBoundingClientRect();
    const r = button.getBoundingClientRect();
    const k = state.camera.k;
    return { x: (r.right - canvasRect.left) / k, y: (r.top + r.height / 2 - canvasRect.top) / k };
  }

  function drawEdges(path) {
    const svg = $('#edges');
    const { pos, width, height } = state.layout;
    const labelBranches = state.view === 'flowchart';
    const paths = [];
    const labels = [];

    for (const node of state.flow.screens) {
      node.actions.forEach((action, i) => {
        const start = actionAnchor(node, i);
        const key = `${node.id}.${action.id}`;
        const onPath = path?.edgeSteps.has(key);
        const dim = path && !onPath ? 'dim' : '';
        const target = action.to && pos.get(action.to);

        if (!target) {
          paths.push(`<path class="bad ${dim}" d="M${start.x},${start.y} h90"/>`);
          if (labelBranches) labels.push({ at: { x: start.x + 45, y: start.y - 14 }, text: action.label, cls: 'lbl bad' });
          return;
        }
        const d = edgePath(start, pos.get(node.id), target);
        const cls = [onPath && 'on', action.proposed && 'prop', dim].filter(Boolean).join(' ');
        paths.push(`<path class="${cls}" d="${d}" marker-end="url(#${onPath ? 'arrow-on' : 'arrow'})"/>`);

        const branching = node.actions.length > 1 || kindOf(node) === 'decision';
        if (onPath) labels.push({ d, step: path.edgeSteps.get(key).join(',') });
        else if (labelBranches && branching) labels.push({ d, text: action.label, cls: `lbl ${dim}` });
      });
    }

    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.innerHTML = ARROW_DEFS + paths.join('');
    for (const label of labels) svg.insertAdjacentHTML('beforeend', edgeLabel(svg, label));
  }

  function edgeLabel(svg, { d, at, step, text, cls }) {
    const point = at || pointAlong(svg, d, step ? 0.5 : 0.35);
    if (step) return html`<circle cx="${point.x}" cy="${point.y}" r="18"/><text x="${point.x}" y="${point.y}">${step}</text>`.text;
    return html`<text class="${cls}" x="${point.x}" y="${point.y}">${text}</text>`.text;
  }

  function pointAlong(svg, d, fraction) {
    const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    probe.setAttribute('d', d);
    svg.appendChild(probe);
    const point = probe.getPointAtLength(probe.getTotalLength() * fraction);
    probe.remove();
    return point;
  }

  // ---------- camera ----------

  function applyCamera() {
    const { x, y, k } = state.camera;
    $('#canvas').style.transform = `translate(${x}px,${y}px) scale(${k})`;
  }

  function fitAll() {
    const wrap = $('#stage-wrap').getBoundingClientRect();
    const { width, height } = state.layout;
    const k = Math.min(wrap.width / width, wrap.height / height, 1) * 0.95;
    state.camera = { k, x: (wrap.width - width * k) / 2, y: 20 };
    applyCamera();
    requestAnimationFrame(() => drawEdges(highlightedPath()));
  }

  function focusNode(id) {
    const box = state.layout.pos.get(id);
    if (!box) return;
    const wrap = $('#stage-wrap').getBoundingClientRect();
    const k = Math.min((wrap.height * 0.8) / box.h, (wrap.width * 0.8) / box.w, 1);
    state.camera = { k, x: wrap.width / 2 - (box.x + box.w / 2) * k, y: wrap.height / 2 - (box.y + box.h / 2) * k };
    applyCamera();
  }

  function bindCameraControls() {
    const wrap = $('#stage-wrap');
    let drag = null;
    wrap.addEventListener('pointerdown', (e) => {
      if (state.mode !== 'overview' || e.target.closest('.screen')) return;
      drag = { x: e.clientX, y: e.clientY, startX: state.camera.x, startY: state.camera.y };
      wrap.classList.add('dragging');
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      state.camera.x = drag.startX + e.clientX - drag.x;
      state.camera.y = drag.startY + e.clientY - drag.y;
      applyCamera();
    });
    window.addEventListener('pointerup', () => {
      drag = null;
      wrap.classList.remove('dragging');
    });
    wrap.addEventListener('wheel', (e) => {
      if (state.mode !== 'overview') return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) zoomAt(e, wrap.getBoundingClientRect());
      else {
        state.camera.x -= e.deltaX;
        state.camera.y -= e.deltaY;
      }
      applyCamera();
    }, { passive: false });
  }

  function zoomAt(e, rect) {
    const c = state.camera;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const k = Math.min(Math.max(c.k * Math.exp(-e.deltaY * 0.01), 0.05), 2);
    c.x = mx - ((mx - c.x) * k) / c.k;
    c.y = my - ((my - c.y) * k) / c.k;
    c.k = k;
  }

  // ---------- side panel ----------

  function findingButton(f) {
    const node = f.screen && findNode(f.screen);
    return html`<button class="f ${f.severity}" data-goto="${f.screen || ''}">
      <b>${f.code}</b> ${f.message}
      <small>${node && `${displayNumber(node)} ${node.title}`}${f.action && ` · ${f.action}`}${f.scenario && ` · ${T.scenarios} ${f.scenario}`}</small>
    </button>`;
  }

  function proposalList(nodeId) {
    const touches = (p) => (p.changes || []).some((c) => c.screen === nodeId || c.addScreen?.id === nodeId || c.action?.to === nodeId);
    const proposals = (FLOW.proposals || []).filter((p) => !nodeId || touches(p));
    if (!proposals.length) return '';
    return html`<h3>${T.proposals}</h3>${proposals.map((p) => html`
      <label class="prop-row">
        <input type="checkbox" data-prop="${p.id}" ${state.applied.includes(p.id) && html`checked`}>
        <span><b>${p.title}</b><small>${p.reason}</small></span>
      </label>`)}`;
  }

  function decisionList() {
    const items = state.flow.screens.flatMap((s) => (s.decisions || []).map((question) => ({ s, question })));
    if (!items.length) return '';
    return html`<h3>${T.decisions}</h3><ul>${items.map(({ s, question }) =>
      html`<li><a href="#" data-goto="${s.id}">${displayNumber(s)}</a> ${question}</li>`)}</ul>`;
  }

  function requirementList() {
    const rows = state.result.requirements;
    if (!rows.length) return '';
    const statusClass = { passed: 'pass', failed: 'fail', uncovered: 'unc' };
    return html`<h3>${T.reqs}</h3><ul>${rows.map((r) => {
      const def = FLOW.requirements.find((q) => q.id === r.id);
      return html`<li>
        <span class="${statusClass[r.status]}">${T[r.status]}</span> ${def.title}
        <span class="badge ${def.origin || ''}">${T.origin[def.origin] || ''}</span>
        <br><small class="sub">${def.expected}</small>
      </li>`;
    })}</ul>`;
  }

  function summaryPanel() {
    const { findings, scenarios } = state.result;
    return html`
      <h2>${T.summary}</h2>
      <div class="sub">${T.file}: <code>${META.source}</code> · flow <code>${FLOW.id}</code></div>
      ${FLOW.source && html`<div class="sub">${FLOW.source}</div>`}
      <h3>${T.findings} (${findings.length})</h3>
      ${findings.length ? findings.map(findingButton) : html`<div class="sub">${T.none}</div>`}
      <h3>${T.scenarios}</h3>
      <ul>${scenarios.map((s) => html`<li>
        <a href="#" data-scenario="${s.id}">${findScenario(s.id)?.title || s.id}</a> —
        <span class="${s.ok ? 'pass' : 'fail'}">${s.ok ? T.passed : T.failed}</span>
      </li>`)}</ul>
      ${requirementList()}
      ${proposalList()}
      ${decisionList()}`;
  }

  function nodePanel(node) {
    const kind = kindOf(node);
    const origin = node.origin || 'source';
    const findings = state.result.findings.filter((f) => f.screen === node.id);
    const bullets = (items) => html`<ul>${items.map((x) => html`<li>${x}</li>`)}</ul>`;
    const link = (a) => {
      const target = a.to && findNode(a.to);
      return target
        ? html`<a href="#" data-goto="${target.id}">${displayNumber(target)} ${target.title}</a>`
        : html`<span class="fail">${T.missing}</span>`;
    };

    return html`
      <a href="#" data-goto="">← ${T.summary}</a>
      <h2>${displayNumber(node)} ${node.title}</h2>
      <div class="sub">
        ${KIND_ICONS[kind]} ${T.kinds[kind]} · ${FLOW.stages[node.stage]}
        ${node.actor && ` · ${T.actor} ${node.actor}`}
        ${kind === 'screen' && ` · ${T.device} ${deviceLabel(node, FLOW)}`}
        · <code>${node.id}</code> · <span class="badge ${origin}">${T.origin[origin] || origin}</span>
      </div>
      ${node.brief && html`<h3>${T.brief}</h3><div>${node.brief}</div>`}
      ${node.notes?.length > 0 && html`<h3>${T.notes}</h3>${bullets(node.notes)}`}
      ${node.decisions?.length > 0 && html`<h3>${T.decisions}</h3>${bullets(node.decisions)}`}
      ${findings.length > 0 && html`<h3>${T.findings}</h3>${findings.map(findingButton)}`}
      <h3>${T.actions}</h3>
      <ul>${node.actions.length ? node.actions.map((a) => html`<li>
        <b>${a.label}</b> <code>${a.id}</code> → ${link(a)}
        ${a.when && html`<small class="sub">when ${JSON.stringify(a.when)}</small>`}
      </li>`) : html`<li class="sub">—</li>`}</ul>
      ${proposalList(node.id)}
      <h3>${T.request}</h3>
      <div class="req-form">
        <select id="req-target">
          <option value="">${T.whole}</option>
          ${node.actions.map((a) => html`<option value="${a.id}">${a.label} (${a.id})</option>`)}
        </select>
        <textarea id="req-text" placeholder="${T.placeholder}"></textarea>
        <div class="row"><button id="req-add">${T.add}</button></div>
      </div>`;
  }

  function requestsPanel() {
    const items = requestStore.items;
    const empty = items.length === 0;
    return html`
      <a href="#" data-goto="">← ${T.summary}</a>
      <h2>${T.requests} (${items.length})</h2>
      ${empty ? html`<div class="sub">${T.empty}</div>` : items.map((q, i) => html`
        <div class="req">
          <div><code>${q.number} ${q.screen}${q.action && ` › ${q.action}`}</code><br>${q.text}</div>
          <button data-del="${i}">✕</button>
        </div>`)}
      <div class="row">
        <button id="req-copy" ${empty && html`disabled`}>${T.copy}</button>
        <button id="req-clear" ${empty && html`disabled`}>${T.clear}</button>
      </div>`;
  }

  function renderPanel() {
    const node = state.selected && findNode(state.selected);
    const content = state.panel === 'requests' ? requestsPanel() : node ? nodePanel(node) : summaryPanel();
    $('#panel').innerHTML = String(content);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  function addRequest() {
    const text = $('#req-text').value.trim();
    if (!text) return;
    const node = findNode(state.selected);
    requestStore.items.push({ screen: node.id, number: displayNumber(node), action: $('#req-target').value || null, text, at: new Date().toISOString() });
    requestStore.save();
    $('#req-text').value = '';
    toast(`${T.requests} +1`);
  }

  function bindPanel() {
    const panel = $('#panel');
    panel.addEventListener('click', async (e) => {
      const goto = e.target.closest('[data-goto]');
      const scenario = e.target.closest('[data-scenario]');
      const del = e.target.closest('[data-del]');
      if (goto) {
        e.preventDefault();
        state.panel = 'auto';
        select(goto.dataset.goto || null, { focus: true });
      } else if (scenario) {
        e.preventDefault();
        setScenario(scenario.dataset.scenario);
      } else if (del) {
        requestStore.items.splice(Number(del.dataset.del), 1);
        requestStore.save();
        renderPanel();
      } else if (e.target.id === 'req-add') {
        addRequest();
      } else if (e.target.id === 'req-copy') {
        await copyText(requestStore.toMarkdown());
        toast(T.copied);
      } else if (e.target.id === 'req-clear') {
        requestStore.items = [];
        requestStore.save();
        renderPanel();
      }
    });
    panel.addEventListener('change', (e) => {
      const box = e.target.closest('[data-prop]');
      if (box) toggleProposal(box);
    });
  }

  function toggleProposal(box) {
    const id = box.dataset.prop;
    const next = box.checked ? [...state.applied, id] : state.applied.filter((x) => x !== id);
    try {
      applyProposals(FLOW, next); // throws on conflicting alternatives
    } catch (err) {
      box.checked = !box.checked;
      toast(err.message);
      return;
    }
    state.applied = next;
    recompute();
    render();
  }

  // ---------- walk-through ----------

  function startPlay(fromNode) {
    const scenario = findScenario(state.scenario);
    const start = fromNode || scenario?.start || FLOW.start;
    const vars = {
      ...(state.flow.vars || {}),
      ...(scenario?.vars || {}),
      ...(fromNode ? findNode(fromNode)?.preview || {} : {}),
    };
    state.play = { node: start, vars, trail: [{ node: start }] };
    renderPlayer();
  }

  function playerFrame(node, ctx) {
    const player = $('#player');
    const body = nodeBody(node, state.view, ctx, T);
    const cls = nodeClasses(node, state.view);
    if (nodeStyle(node, state.view) === 'frame') {
      const [w, h] = nodeSize(node, FLOW, state.view);
      const zoom = Math.min(1, (player.clientHeight - 56) / h, (player.clientWidth - 340) / w).toFixed(3);
      return `<div class="${cls}" style="width:${w}px;height:${h}px;zoom:${zoom}">${body}</div>`;
    }
    const width = nodeStyle(node, state.view) === 'card' ? nodeSize(node, FLOW, state.view)[0] : 360;
    return `<div class="${cls} live" style="width:${width}px">${body}</div>`;
  }

  function renderPlayer() {
    const { node: id, vars, trail } = state.play;
    const node = findNode(id);
    const nextStep = findScenario(state.scenario)?.steps[trail.length - 1];
    const pathSteps = nextStep ? new Map([[`${node.id}.${nextStep.action}`, [trail.length]]]) : null;
    const ctx = { flow: state.flow, findNode, vars, live: true, pathSteps };
    const trailItems = trail.map((t) => {
      const n = findNode(t.node);
      return html`<li>${t.action && html`<code>${t.action}</code> → `}${n ? `${displayNumber(n)} ${n.title}` : t.node}</li>`;
    });

    $('#player').innerHTML = playerFrame(node, ctx) + html`
      <div class="trail">
        <h3>${displayNumber(node)} ${node.title}${node.actor && html` <small class="sub">· ${node.actor}</small>`}</h3>
        <div class="row"><button id="pl-reset">${T.reset}</button><button id="pl-exit">${T.exitHint}</button></div>
        <h3>${T.trail}</h3><ol>${trailItems}</ol>
        <h3>${T.vars}</h3><div class="vars">${JSON.stringify(vars, null, 1)}</div>
      </div>`;
  }

  function pressInPlayer(actionId) {
    const play = state.play;
    const action = findNode(play.node).actions.find((a) => a.id === actionId);
    if (!conditionHolds(action.when, play.vars)) return toast(T.guard);
    if (!action.to || !findNode(action.to)) return toast(`${T.noDest} (${action.id})`);
    play.vars = applyAction(play.vars, action);
    play.node = action.to;
    play.trail.push({ node: action.to, action: action.id });
    renderPlayer();
  }

  function bindPlayer() {
    const player = $('#player');
    player.addEventListener('input', (e) => {
      const field = e.target.dataset.field;
      if (field) state.play.vars[field] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    });
    player.addEventListener('click', (e) => {
      if (e.target.id === 'pl-reset') return startPlay();
      if (e.target.id === 'pl-exit') return setMode('overview');
      const button = e.target.closest('[data-action]');
      if (button) pressInPlayer(button.dataset.action);
    });
  }

  // ---------- top-level state changes ----------

  function select(id, { focus = false } = {}) {
    state.selected = id;
    renderCanvas();
    renderPanel();
    if (id && focus) focusNode(id);
  }

  function setScenario(id) {
    state.scenario = id;
    $('#scenario').value = id;
    renderCanvas();
    if (state.mode === 'play') startPlay();
  }

  function setMode(mode) {
    state.mode = mode;
    $('#player').hidden = mode !== 'play';
    $('#btn-play').classList.toggle('on', mode === 'play');
    if (mode === 'play') startPlay(state.selected || undefined);
    else renderCanvas();
  }

  function setView(view) {
    state.view = view;
    recompute();
    render();
    if (state.selected) focusNode(state.selected);
    else requestAnimationFrame(fitAll);
  }

  function renderToolbar() {
    const other = state.view === 'flowchart' ? 'wireframe' : 'flowchart';
    $('#btn-view').textContent = T.views[other];
    $('#scenario').innerHTML = String(html`<option value="">${T.allActions}</option>${(state.flow.scenarios || []).map((s) => html`<option value="${s.id}">${s.title}</option>`)}`);
    $('#scenario').value = state.scenario;
  }

  function render() {
    renderToolbar();
    renderCanvas();
    renderPanel();
    if (state.mode === 'play') renderPlayer();
  }

  function bindToolbarAndCanvas() {
    $('#canvas').addEventListener('click', (e) => {
      const nodeEl = e.target.closest('.screen');
      if (!nodeEl) return;
      state.panel = 'auto';
      const id = nodeEl.dataset.id;
      const button = e.target.closest('[data-action]');
      const target = button && state.selected === id && findNode(id).actions.find((a) => a.id === button.dataset.action)?.to;
      if (target && findNode(target)) select(target, { focus: true });
      else select(id, { focus: state.selected !== id });
    });
    $('#scenario').addEventListener('change', (e) => setScenario(e.target.value));
    $('#btn-fit').addEventListener('click', () => {
      state.selected = null;
      state.panel = 'auto';
      setMode('overview');
      renderPanel();
      fitAll();
    });
    $('#btn-play').addEventListener('click', () => setMode(state.mode === 'play' ? 'overview' : 'play'));
    $('#btn-view').addEventListener('click', () => setView(state.view === 'flowchart' ? 'wireframe' : 'flowchart'));
    $('#btn-requests').addEventListener('click', () => {
      state.panel = state.panel === 'requests' ? 'auto' : 'requests';
      renderPanel();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !e.target.closest('textarea, input')) $('#btn-fit').click();
    });
    window.addEventListener('resize', () => {
      if (state.mode === 'overview' && !state.selected) fitAll();
    });
  }

  // ---------- boot ----------

  document.querySelectorAll('[data-t]').forEach((el) => (el.textContent = T[el.dataset.t]));
  $('#flow-title').textContent = FLOW.title;
  $('#flow-goal').textContent = FLOW.goal || '';
  requestStore.load();
  requestStore.save();
  recompute();
  bindCameraControls();
  bindPanel();
  bindPlayer();
  bindToolbarAndCanvas();
  render();
  requestAnimationFrame(fitAll);
})();
