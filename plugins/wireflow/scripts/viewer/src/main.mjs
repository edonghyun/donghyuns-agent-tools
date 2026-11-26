// Boots the viewer: one store for the flow, then each component on its element of viewer.html.
// The build defines the globals FLOW and META before this bundle runs.

import * as camera from './components/camera.mjs';
import * as canvas from './components/canvas.mjs';
import * as legend from './components/legend.mjs';
import * as logPage from './components/log-page.mjs';
import * as nodePanel from './components/node-panel.mjs';
import * as player from './components/player.mjs';
import * as requests from './components/requests.mjs';
import * as reviewPage from './components/review-page.mjs';
import * as tabs from './components/tabs.mjs';
import * as toast from './components/toast.mjs';
import * as toolbar from './components/toolbar.mjs';
import { texts } from './i18n.mjs';
import { createStore, watch } from './store.mjs';

const store = createStore(FLOW, META);
const T = texts(FLOW.locale);
const $ = (id) => document.getElementById(id);

for (const el of document.querySelectorAll('[data-t]')) el.textContent = T[el.dataset.t];
$('flow-title').textContent = FLOW.title;
$('flow-goal').textContent = FLOW.goal || '';

// The body carries the tab, the view and the mode; the styles show the parts that belong to them.
watch(
  store,
  (s) => [s.tab, s.view, s.mode],
  ({ tab, view, mode }) => {
    Object.assign(document.body.dataset, { tab, view, mode });
  },
);

// A click on markup made with onClick(action) dispatches that action. The browser's own effect
// is cancelled: a checkbox, say, shows a new state only once the store renders one.
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-dispatch]');
  if (!target) return;
  e.preventDefault();
  store.dispatch(JSON.parse(target.dataset.dispatch));
});

tabs.mount($('tabs'), store, T);
toolbar.mount($('tools'), store, T);
legend.mount($('legend'), store, T);
canvas.mount($('canvas'), store, T);
camera.mount($('stage'), store);
nodePanel.mount($('panel'), store, T);
player.mount($('player'), store, T);
requests.mount($('requests'), store, T);
logPage.mount($('log'), store, T);
reviewPage.mount($('review'), store, T);
toast.mount($('toast'), store, T);
