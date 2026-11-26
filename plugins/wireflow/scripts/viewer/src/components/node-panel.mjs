// The drawer for the selected node: planning notes, links, findings, proposals, and a form to
// add a change request. It is empty, and so hidden, unless a node is selected on the canvas.

import { kindOf } from '../../../lib/index.mjs';
import { html, onClick } from '../html.mjs';
import { KIND_ICONS } from '../i18n.mjs';
import { deviceLabel } from '../layout/wireframe.mjs';
import { displayNumber, findNode } from '../selectors.mjs';
import { watch } from '../store.mjs';
import * as findingList from './finding-list.mjs';
import * as proposalList from './proposal-list.mjs';

// What the visitor has typed into the request form. The store does not hold it, so a re-render
// of the same node carries it over.
const NO_DRAFT = { target: '', text: '' };
const readDraft = (el) => ({
  target: el.querySelector('[name=request-target]').value,
  text: el.querySelector('[name=request-text]').value,
});

export function mount(el, store, T) {
  let shown = null;
  watch(
    store,
    (s) => [s.selected, s.tab, s.mode, s.flow, s.result],
    (state) => {
      const open = state.tab === 'canvas' && state.mode === 'overview';
      const node = open && state.selected && findNode(state.flow, state.selected);
      const draft = node && node.id === shown ? readDraft(el) : NO_DRAFT;
      el.innerHTML = node ? String(render(node, state, draft, T)) : '';
      shown = node ? node.id : null;
    },
  );
  el.addEventListener('click', (e) => {
    if (!e.target.closest('[name=add-request]')) return;
    const { target, text } = readDraft(el);
    if (!text.trim()) return;
    const screen = store.getState().selected;
    store.dispatch({ type: 'addRequest', screen, action: target, text: text.trim() });
    // The request is in the store now; the form starts the next one empty.
    el.querySelector('[name=request-text]').value = '';
  });
}

function render(node, state, draft, T) {
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
        ${node.actions.map(
          (a) => html`<option value="${a.id}" ${a.id === draft.target && html`selected`}>
            ${a.label} (${a.id})</option>`,
        )}
      </select>
      <textarea name="request-text" placeholder="${T.placeholder}">${draft.text}</textarea>
      <div class="row"><button name="add-request">${T.add}</button></div>
    </div>`;
}
