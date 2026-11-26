// The laid-out canvas for the state's flow and view. Both views give `nodes` (id → box) and
// `size`; the wireframe adds its `stages`, the board its full `layout` and routed `edges`.

import { layoutAndRoute } from './board-scene.mjs';
import { layoutWireframe } from './wireframe.mjs';

let last = { flow: null, view: null, scene: null };

/** Layouts are pure, so the scene is computed once per flow and view. */
export function sceneOf({ flow, view }) {
  if (last.flow !== flow || last.view !== view) {
    last = { flow, view, scene: layoutFor(flow, view) };
  }
  return last.scene;
}

function layoutFor(flow, view) {
  if (view === 'wireframe') return layoutWireframe(flow);
  const { layout, edges } = layoutAndRoute(flow);
  return { nodes: layout.nodes, size: layout.size, layout, edges };
}
