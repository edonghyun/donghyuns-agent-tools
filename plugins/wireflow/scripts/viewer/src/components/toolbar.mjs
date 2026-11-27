// The tools on the right of the bar: on the board, a jump to a stage; the scenario to highlight;
// the walk-through toggle; and the change-request count, which opens the review page where the
// requests are listed.

import { html, onClick } from '../html.mjs';
import { watch } from '../store.mjs';

export function mount(el, store, T) {
  watch(
    store,
    (s) => [s.flow, s.view, s.tab, s.scenario, s.mode, s.selected, s.requests],
    (state) => {
      el.innerHTML = String(render(state, T));
    },
  );
  el.addEventListener('change', (e) => {
    const { name, value } = e.target;
    if (name === 'scenario') store.dispatch({ type: 'setScenario', id: value });
  });
}

function render({ flow, scenario, mode, selected, requests }, T) {
  const playing = mode === 'play';
  const option = (s) =>
    html`<option value="${s.id}" ${s.id === scenario && html`selected`}>${s.title}</option>`;
  return html`
    <label class="pick"><span>${T.path}</span><select name="scenario">
      <option value="">${T.allActions}</option>${(flow.scenarios || []).map(option)}
    </select></label>
    <button class="${playing && 'on'}"
      ${onClick(playing ? { type: 'stopPlay' } : { type: 'startPlay', from: selected })}>
      ${T.play}</button>
    <button ${onClick({ type: 'setTab', tab: 'review' })}>
      ${T.requests} <b>${requests.length}</b></button>`;
}
