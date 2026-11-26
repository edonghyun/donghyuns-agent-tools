// The review page: findings, scenario results, requirements, proposals and open decisions of
// the flow, read like a document. It replaces 0.2's summary sidebar.

import { html, onClick } from '../html.mjs';
import { displayNumber, findScenario } from '../selectors.mjs';
import { watch } from '../store.mjs';
import * as findingList from './finding-list.mjs';
import * as proposalList from './proposal-list.mjs';

const STATUS_CLASS = { passed: 'pass', failed: 'fail', uncovered: 'unc' };

export function mount(el, store, T) {
  watch(
    store,
    (s) => [s.flow, s.result, s.applied],
    (state) => {
      el.innerHTML = String(render(state, T));
    },
  );
}

function render(state, T) {
  const { authored, flow, meta, result } = state;
  const scenarios = result.scenarios.map(
    (s) => html`<li>
      <a href="#" ${onClick({ type: 'setScenario', id: s.id })}>
        ${findScenario(flow, s.id)?.title || s.id}</a>
      — <span class="${s.ok ? 'pass' : 'fail'}">${s.ok ? T.passed : T.failed}</span></li>`,
  );
  return html`
    <h2>${T.summary}</h2>
    <div class="sub">
      ${T.file}: <code>${meta.source}</code> · flow <code>${authored.id}</code>
    </div>
    ${authored.source && html`<div class="sub">${authored.source}</div>`}
    <h3>${T.findings} (${result.findings.length})</h3>
    ${
      result.findings.length
        ? findingList.render(result.findings, flow, T)
        : html`<div class="sub">${T.none}</div>`
    }
    <h3>${T.scenarios}</h3>
    <ul>${scenarios}</ul>
    ${requirementList(state, T)}
    ${proposalList.render(state, T)}
    ${decisionList(flow, T)}`;
}

function requirementList({ authored, result }, T) {
  if (!result.requirements.length) return '';
  const row = (r) => {
    const def = authored.requirements.find((q) => q.id === r.id);
    return html`<li>
      <span class="${STATUS_CLASS[r.status]}">${T[r.status]}</span> ${def.title}
      <span class="badge ${def.origin || ''}">${T.origin[def.origin] || ''}</span>
      <br><small class="sub">${def.expected}</small>
    </li>`;
  };
  return html`<h3>${T.reqs}</h3><ul>${result.requirements.map(row)}</ul>`;
}

function decisionList(flow, T) {
  const items = flow.screens.flatMap((node) =>
    (node.decisions || []).map((question) => ({ node, question })),
  );
  if (!items.length) return '';
  return html`<h3>${T.decisions}</h3><ul>${items.map(
    ({ node, question }) =>
      html`<li><a href="#" ${onClick({ type: 'select', id: node.id })}>
        ${displayNumber(flow, node)}</a> ${question}</li>`,
  )}</ul>`;
}
