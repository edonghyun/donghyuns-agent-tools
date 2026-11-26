// The drawer for the selected node: planning notes, links, findings, proposals, and a form to
// add a change request. It is empty, and so hidden, unless a node is selected on the canvas.

import { html, onClick } from '../html.mjs';
import { KIND_ICONS } from '../i18n.mjs';
import { deviceLabel, kindOf } from '../layout/wireframe.mjs';
import { displayNumber, findNode } from '../selectors.mjs';
import { watch } from '../store.mjs';
import * as findingList from './finding-list.mjs';
import * as proposalList from './proposal-list.mjs';

export function mount(el, store, T) {
  watch(
    store,
    (s) => [s.selected, s.tab, s.mode, s.flow, s.result, s.requests],
    (state) => {
      const open = state.tab === 'canvas' && state.mode === 'overview';
      const node = open && state.selected && findNode(state.flow, state.selected);
      el.innerHTML = node ? String(render(node, state, T)) : '';
    },
  );
  el.addEventListener('click', (e) => {
    if (!e.target.closest('[name=add-request]')) return;
    const text = el.querySelector('[name=request-text]').value.trim();
    const action = el.querySelector('[name=request-target]').value;
    const screen = store.getState().selected;
    if (text) store.dispatch({ type: 'addRequest', screen, action, text });
  });
}

function render(node, state, T) {
  const { flow, result } = state;
  const kind = kindOf(node);
  const origin = node.origin || 'source';
  const findings = result.findings.filter((f) => f.screen === node.id);
  const bullets = (items) => html`<ul>${items.map((x) => html`<li>${x}</li>`)}</ul>`;
  const link = (a) => {
    const target = findNode(flow, a.to);
    return target
      ? html`<a href="#" ${onClick({ type: 'select', id: target.id })}>
          ${displayNumber(flow, target)} ${target.title}</a>`
      : html`<span class="fail">${T.missing}</span>`;
  };
  const actions = node.actions.map(
    (a) => html`<li><b>${a.label}</b> <code>${a.id}</code> → ${link(a)}
      ${a.when && html`<small class="sub">when ${JSON.stringify(a.when)}</small>`}</li>`,
  );

  return html`
    <header>
      <h2>${displayNumber(flow, node)} ${node.title}</h2>
      <button class="close" title="${T.close}" ${onClick({ type: 'select', id: null })}>✕</button>
    </header>
    <div class="sub">
      ${KIND_ICONS[kind]} ${T.kinds[kind]} · ${flow.stages[node.stage]}
      ${node.actor && ` · ${T.actor} ${node.actor}`}
      ${kind === 'screen' && ` · ${T.device} ${deviceLabel(node, flow)}`}
      · <code>${node.id}</code>
      · <span class="badge ${origin}">${T.origin[origin] || origin}</span>
    </div>
    ${node.brief && html`<h3>${T.brief}</h3><div>${node.brief}</div>`}
    ${node.notes?.length > 0 && html`<h3>${T.notes}</h3>${bullets(node.notes)}`}
    ${node.decisions?.length > 0 && html`<h3>${T.decisions}</h3>${bullets(node.decisions)}`}
    ${findings.length > 0 && html`<h3>${T.findings}</h3>${findingList.render(findings, flow, T)}`}
    <h3>${T.actions}</h3>
    <ul>${actions.length ? actions : html`<li class="sub">—</li>`}</ul>
    ${proposalList.render(state, T, node.id)}
    <h3>${T.request}</h3>
    <div class="req-form">
      <select name="request-target">
        <option value="">${T.whole}</option>
        ${node.actions.map((a) => html`<option value="${a.id}">${a.label} (${a.id})</option>`)}
      </select>
      <textarea name="request-text" placeholder="${T.placeholder}"></textarea>
      <div class="row"><button name="add-request">${T.add}</button></div>
    </div>`;
}
