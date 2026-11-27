// The viewer's one state. Every change is an action passed to `dispatch`, which runs that
// action's reducer below and tells subscribers. Change requests are saved after each change.
//
// State:
// - `authored`: the flow as written. `applied`: ids of the proposals previewed on it.
//   `flow`: `authored` with them applied. `result`: check() of that.
// - `meta`: `{source, output}` from the build. `view`: 'board' | 'wireframe'.
// - `tab`: 'canvas' | 'log' | 'review'. `mode`: 'overview' | 'play'.
// - `scenario`: highlighted scenario id or ''. `selected`: node id or null.
// - `camera`: `{x, y, k}`. `play`: `{node, vars, trail}` while walking through, else null.
// - `focus`: the latest stage jump, `{stage}`, for the camera to frame; each jump is a new object.
// - `requests`: change requests. `drafts`: node id → `{target, text}`, the request being typed
//   for that node, kept while the visitor looks elsewhere. `notice`: the latest `{message, detail}` for the toast; each
//   notice is a new object, so the same message twice still shows twice.

import {
  applyAction,
  applyProposals,
  check,
  enabledActions,
  resolveView,
} from '../../lib/index.mjs';
import { displayNumber, findNode, findScenario } from './selectors.mjs';

export function createStore(FLOW, META, storage = browserStorage()) {
  const requestKey = `wireflow:${FLOW.id}:${META.output}`;
  let state = initialState(FLOW, META, loadRequests(storage, requestKey));
  const listeners = [];
  return {
    getState: () => state,
    dispatch(action) {
      const prev = state;
      state = REDUCERS[action.type](state, action);
      if (state.requests !== prev.requests) saveRequests(storage, requestKey, state.requests);
      for (const listener of listeners) listener(state);
    },
    subscribe(listener) {
      listeners.push(listener);
    },
  };
}

/** Calls `fn(state)` now, then after each dispatch that changes a value in `pick(state)`. */
export function watch(store, pick, fn) {
  let picked = pick(store.getState());
  fn(store.getState());
  store.subscribe((state) => {
    const next = pick(state);
    if (next.some((value, i) => value !== picked[i])) {
      picked = next;
      fn(state);
    }
  });
}

function initialState(FLOW, META, requests) {
  return {
    authored: FLOW,
    meta: META,
    ...withProposals(FLOW, []),
    view: resolveView(FLOW),
    tab: 'canvas',
    mode: 'overview',
    scenario: resolveView(FLOW) === 'board' ? (findScenario(FLOW, FLOW.primary)?.id ?? '') : '',
    selected: null,
    camera: { x: 40, y: 80, k: 0.3 },
    play: null,
    focus: null,
    requests,
    drafts: {},
    notice: null,
  };
}

const OVERVIEW = { mode: 'overview', play: null };

const REDUCERS = {
  setView: (s, { view }) => ({ ...s, ...OVERVIEW, view, tab: 'canvas' }),
  setTab: (s, { tab }) => ({ ...s, ...OVERVIEW, tab }),
  select: (s, { id }) => ({ ...s, selected: id, tab: id ? 'canvas' : s.tab }),
  setScenario: (s, { id }) => {
    const next = { ...s, scenario: id, tab: 'canvas' };
    return s.mode === 'play' ? { ...next, play: freshPlay(next) } : next;
  },
  toggleProposal: (s, { id }) => {
    const applied = s.applied.includes(id) ? s.applied.filter((x) => x !== id) : [...s.applied, id];
    try {
      return { ...s, ...withProposals(s.authored, applied) };
    } catch (err) {
      return withNotice(s, 'conflict', err.message);
    }
  },
  startPlay: (s, { from }) => ({ ...s, mode: 'play', play: freshPlay(s, from) }),
  press,
  stopPlay: (s) => ({ ...s, ...OVERVIEW }),
  overview: (s) => ({ ...s, ...OVERVIEW, selected: null }),
  focusStage: (s, { stage }) => ({
    ...s,
    ...OVERVIEW,
    tab: 'canvas',
    selected: null,
    focus: { stage },
  }),
  editDraft: (s, { screen, target, text }) => ({
    ...s,
    drafts: { ...s.drafts, [screen]: { target, text } },
  }),
  // The node's form keeps its target and starts the next request empty.
  addRequest: (s, { screen, action, text }) => {
    const number = displayNumber(s.flow, findNode(s.flow, screen));
    const request = { screen, number, action: action || null, text, at: new Date().toISOString() };
    const drafts = { ...s.drafts, [screen]: { target: action || '', text: '' } };
    return withNotice({ ...s, requests: [...s.requests, request], drafts }, 'requestAdded');
  },
  removeRequest: (s, { index }) => ({ ...s, requests: s.requests.filter((_, i) => i !== index) }),
  clearRequests: (s) => ({ ...s, requests: [] }),
  camera: (s, { camera }) => ({ ...s, camera }),
  notify: (s, { message }) => withNotice(s, message),
};

/** Throws when two of the proposals change the same thing. */
function withProposals(authored, applied) {
  return {
    applied,
    flow: applied.length ? applyProposals(authored, applied) : authored,
    result: check(authored, { with: applied }),
  };
}

function withNotice(s, message, detail) {
  return { ...s, notice: { message, detail } };
}

/** A walk-through at `from` with its preview values, else at the scenario's start or the flow's. */
function freshPlay(s, from) {
  const scenario = findScenario(s.flow, s.scenario);
  const node = from || scenario?.start || s.flow.start;
  const vars = {
    ...(s.flow.vars || {}),
    ...(scenario?.vars || {}),
    ...(from ? findNode(s.flow, from)?.preview : {}),
  };
  return { node, vars, trail: [{ node }] };
}

/** Presses a button in the walk-through. `fields` holds form values typed on the screen. */
function press(s, { action: actionId, fields }) {
  const vars = { ...s.play.vars, ...fields };
  const node = findNode(s.flow, s.play.node);
  const action = node.actions.find((a) => a.id === actionId);
  const stay = { ...s, play: { ...s.play, vars } };
  if (!enabledActions(node, vars).includes(action)) return withNotice(stay, 'guard');
  if (!findNode(s.flow, action.to)) return withNotice(stay, 'noDest', action.id);
  const trail = [...s.play.trail, { node: action.to, action: action.id }];
  return { ...s, play: { node: action.to, vars: applyAction(vars, action), trail } };
}

/** localStorage, or undefined where the browser blocks it. */
function browserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function loadRequests(storage, key) {
  try {
    return JSON.parse(storage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function saveRequests(storage, key, requests) {
  try {
    storage.setItem(key, JSON.stringify(requests));
  } catch {
    // Storage disabled: requests last until the page closes.
  }
}
