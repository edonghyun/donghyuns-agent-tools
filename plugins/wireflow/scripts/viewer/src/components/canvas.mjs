// The canvas: draws the current view's scene (the wireframe, or the board) and routes clicks on
// it. Clicking a node selects it; clicking a button on the selected node follows its link.

import { sceneOf } from '../layout/scene.mjs';
import { findNode } from '../selectors.mjs';
import { watch } from '../store.mjs';
import * as boardSketch from './board-sketch.mjs';
import * as wireframeView from './wireframe-view.mjs';

export function mount(canvas, store, T) {
  const drawn = (s) => [s.tab, s.view, s.flow, s.result, s.scenario, s.selected];
  watch(store, drawn, (state) => {
    // A hidden canvas has nothing to measure; it is drawn again when its tab opens.
    if (state.tab !== 'canvas') return;
    const scene = sceneOf(state);
    canvas.style.width = `${scene.size.w}px`;
    canvas.style.height = `${scene.size.h}px`;
    if (state.view === 'board') {
      canvas.innerHTML = String(boardSketch.render(scene, state));
    } else {
      wireframeView.draw(canvas, scene, state, T);
    }
  });

  canvas.addEventListener('click', (e) => {
    const nodeEl = e.target.closest('[data-id]');
    if (!nodeEl) return;
    const { flow, selected } = store.getState();
    const id = nodeEl.dataset.id;
    const button = e.target.closest('[data-action]');
    const to =
      button &&
      selected === id &&
      findNode(flow, id).actions.find((a) => a.id === button.dataset.action)?.to;
    store.dispatch({ type: 'select', id: findNode(flow, to) ? to : id });
  });
}
