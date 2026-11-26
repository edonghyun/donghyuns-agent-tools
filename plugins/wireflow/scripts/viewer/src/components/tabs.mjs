// The tabs: the board and wireframe views of the canvas, and the review page with its
// finding count.

import { html, onClick } from '../html.mjs';
import { watch } from '../store.mjs';

export function mount(el, store, T) {
  watch(
    store,
    (s) => [s.tab, s.view, s.result],
    (state) => {
      el.innerHTML = String(render(state, T));
    },
  );
}

function render({ tab, view, result }, T) {
  const tabButton = (label, active, action) =>
    html`<button role="tab" aria-selected="${active}" class="${active && 'on'}"
      ${onClick(action)}>${label}</button>`;
  return html`
    ${['board', 'wireframe'].map((v) =>
      tabButton(T.views[v], tab === 'canvas' && view === v, { type: 'setView', view: v }),
    )}
    ${tabButton(
      html`${T.review} <span class="count">${result.findings.length}</span>`,
      tab === 'review',
      { type: 'setTab', tab: 'review' },
    )}`;
}
