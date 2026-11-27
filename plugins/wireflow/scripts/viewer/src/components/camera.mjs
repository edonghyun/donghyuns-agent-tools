// Pan, zoom and framing of the canvas. The canvas transform always shows `state.camera`; drags,
// the wheel, the fit button and Escape dispatch new cameras. A new view is framed whole, and a
// newly selected node is brought to the middle of the stage, and a board stage jump shows that
// stage's columns from the top.
//
// Framing waits for the next animation frame. By then every component has rendered the change,
// the drawer that narrows the stage included, and the camera dispatch is not nested inside the
// dispatch that triggered it.

import { sceneOf } from '../layout/scene.mjs';
import { watch } from '../store.mjs';

export function mount(stage, store) {
  const canvas = stage.querySelector('#canvas');
  const setCamera = (camera) => store.dispatch({ type: 'camera', camera });

  watch(
    store,
    (s) => [s.camera],
    ({ camera: { x, y, k } }) => {
      canvas.style.transform = `translate(${x}px,${y}px) scale(${k})`;
    },
  );

  const fit = () => {
    // On another tab the stage is hidden and has no size to fit into.
    if (stage.offsetWidth) setCamera(fitAll(stage, sceneOf(store.getState())));
  };
  /** On the next frame: the selected node if the scene has it, else the whole scene. */
  const frame = () =>
    requestAnimationFrame(() => {
      const state = store.getState();
      const box = state.selected && sceneOf(state).nodes.get(state.selected);
      if (box) setCamera(focusOn(stage, box));
      else fit();
    });
  watch(store, (s) => [s.view], frame);
  watch(
    store,
    (s) => [s.focus],
    ({ focus }) => {
      if (!focus) return;
      requestAnimationFrame(() => {
        const { layout } = sceneOf(store.getState());
        setCamera(focusStage(stage, layout.stageHeaders[focus.stage], layout.mainArea));
      });
    },
  );
  watch(
    store,
    (s) => [s.selected],
    ({ selected }) => {
      if (selected) frame();
    },
  );

  /** Back to the overview: leave the walk-through, close the drawer, show the whole scene. */
  const overview = () => {
    store.dispatch({ type: 'overview' });
    fit();
  };
  stage.querySelector('#fit').addEventListener('click', overview);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !e.target.closest('textarea, input, select')) overview();
  });
  window.addEventListener('resize', () => {
    const { mode, selected } = store.getState();
    if (mode === 'overview' && !selected) fit();
  });

  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    if (store.getState().mode !== 'overview' || e.target.closest('[data-id], button')) return;
    const { x, y } = store.getState().camera;
    drag = { dx: e.clientX - x, dy: e.clientY - y };
    stage.classList.add('dragging');
  });
  window.addEventListener('pointermove', (e) => {
    if (drag)
      setCamera({ ...store.getState().camera, x: e.clientX - drag.dx, y: e.clientY - drag.dy });
  });
  window.addEventListener('pointerup', () => {
    drag = null;
    stage.classList.remove('dragging');
  });
  stage.addEventListener(
    'wheel',
    (e) => {
      if (store.getState().mode !== 'overview') return;
      e.preventDefault();
      const camera = store.getState().camera;
      setCamera(
        e.ctrlKey || e.metaKey
          ? zoomAt(camera, e, stage.getBoundingClientRect())
          : { ...camera, x: camera.x - e.deltaX, y: camera.y - e.deltaY },
      );
    },
    { passive: false },
  );
}

/** The whole scene, centered across and near the top. */
function fitAll(stage, { size, layout }) {
  const { width, height } = stage.getBoundingClientRect();
  const k = Math.min(width / size.w, height / size.h, 1) * 0.95;
  if (layout && k < 0.55) {
    const first = layout.stageHeaders[0];
    return { k: 0.55, x: 20 - first.x * 0.55, y: 20 - first.y * 0.55 };
  }
  return { k, x: (width - size.w * k) / 2, y: 20 };
}

/** The box in the middle, as large as fits in 80% of the stage, never above 100%. */
function focusOn(stage, box) {
  const { width, height } = stage.getBoundingClientRect();
  const k = Math.min((height * 0.8) / box.h, (width * 0.8) / box.w, 1);
  return {
    k,
    x: width / 2 - (box.x + box.w / 2) * k,
    y: height / 2 - (box.y + box.h / 2) * k,
  };
}

/**
 * A board stage across the middle, its header near the top, as large as its columns and the main
 * area under them fit, never above 100%.
 */
function focusStage(stage, header, mainArea) {
  const { width, height } = stage.getBoundingClientRect();
  const h = mainArea.bottom - header.y;
  const k = Math.min((width * 0.9) / header.w, (height * 0.9) / h, 1);
  return { k, x: width / 2 - (header.x + header.w / 2) * k, y: 24 - header.y * k };
}

/** Zoom by the wheel delta, keeping the point under the pointer still. */
function zoomAt(camera, e, rect) {
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const k = Math.min(Math.max(camera.k * Math.exp(-e.deltaY * 0.01), 0.05), 2);
  return {
    k,
    x: mx - ((mx - camera.x) * k) / camera.k,
    y: my - ((my - camera.y) * k) / camera.k,
  };
}
