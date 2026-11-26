// The walk-through over the canvas: the current node drawn live, with the trail so far and the
// state. Pressing a button on the node presses it in the store, with any fields typed into it.

import { html, onClick } from '../html.mjs';
import { nodeSize, nodeStyle } from '../layout/wireframe.mjs';
import { displayNumber, findNode, findScenario } from '../selectors.mjs';
import { watch } from '../store.mjs';
import * as frameNode from './frame-node.mjs';

export function mount(el, store, T) {
  watch(
    store,
    (s) => [s.mode, s.play, s.flow, s.scenario],
    (state) => {
      el.innerHTML = state.mode === 'play' ? String(render(state, el, T)) : '';
    },
  );
  el.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (button) {
      store.dispatch({ type: 'press', action: button.dataset.action, fields: changedFields(el) });
    }
  });
}

function render({ flow, play, scenario }, el, T) {
  const node = findNode(flow, play.node);
  const nextStep = findScenario(flow, scenario)?.steps[play.trail.length - 1];
  const pathSteps = nextStep && new Map([[`${node.id}.${nextStep.action}`, [play.trail.length]]]);
  const ctx = { flow, vars: play.vars, live: true, pathSteps, ...sizeIn(el, node, flow) };
  const trail = play.trail.map((t) => {
    const n = findNode(flow, t.node);
    return html`<li>${t.action && html`<code>${t.action}</code> → `}${
      n ? `${displayNumber(flow, n)} ${n.title}` : t.node
    }</li>`;
  });
  return html`
    ${frameNode.render(node, ctx, T)}
    <div class="trail">
      <h3>${displayNumber(flow, node)} ${node.title}${
        node.actor && html` <small class="sub">· ${node.actor}</small>`
      }</h3>
      <div class="row">
        <button ${onClick({ type: 'startPlay' })}>${T.reset}</button>
        <button ${onClick({ type: 'stopPlay' })}>${T.exitHint}</button>
      </div>
      <h3>${T.trail}</h3><ol>${trail}</ol>
      <h3>${T.vars}</h3><div class="vars">${JSON.stringify(play.vars, null, 1)}</div>
    </div>`;
}

/** A frame keeps its device size, zoomed down to fit; cards and boxes grow with their content. */
function sizeIn(el, node, flow) {
  const style = nodeStyle(node);
  if (style !== 'frame') {
    const width = style === 'card' ? nodeSize(node, flow)[0] : 360;
    return { classes: 'live', style: `width:${width}px` };
  }
  const [w, h] = nodeSize(node, flow);
  const zoom = Math.min(1, (el.clientHeight - 56) / h, (el.clientWidth - 340) / w).toFixed(3);
  return { style: `width:${w}px;height:${h}px;zoom:${zoom}` };
}

/** Values of the fields the visitor changed on the node, by field name. */
function changedFields(el) {
  const fields = {};
  for (const field of el.querySelectorAll('[data-field]')) {
    const [value, initial] =
      field.type === 'checkbox'
        ? [field.checked, field.defaultChecked]
        : [field.value, field.defaultValue];
    if (value !== initial) fields[field.dataset.field] = value;
  }
  return fields;
}
