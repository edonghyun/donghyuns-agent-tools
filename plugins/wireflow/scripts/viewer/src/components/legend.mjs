// The board legend under the bar: each actor's color, then the line and card styles.

import { actorList } from '../../../lib/index.mjs';
import { html, onClick } from '../html.mjs';
import { watch } from '../store.mjs';

export function mount(el, store, T) {
  watch(
    store,
    (s) => [s.flow],
    ({ flow }) => {
      el.innerHTML = String(renderLegend(flow, T));
    },
  );
}

export function renderLegend(flow, T) {
  const actor = ({ name, color }) =>
    html`<span class="key"><i class="swatch" style="background:${color}"></i>${name}</span>`;
  return html`<nav class="stage-nav" aria-label="${T.stageJump}">
    ${flow.stages.map(
      (label, stage) => html`<button ${onClick({ type: 'focusStage', stage })}>
      <b>${stage + 1}</b> ${label}</button>`,
    )}
    </nav><details class="board-key"><summary>${T.legendTitle}</summary><div>
    ${actorList(flow).map(actor)}
    <span class="key"><i class="line primary"></i>${T.legend.primary}</span>
    <span class="key"><i class="line exception"></i>${T.legend.exception}</span>
    <span class="key"><i class="mini dormant"></i>${T.legend.dormant}</span></div></details>`;
}
