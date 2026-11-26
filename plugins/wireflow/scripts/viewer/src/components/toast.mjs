// A short message at the bottom of the window for the latest notice in the state.

import { watch } from '../store.mjs';

const SHOWN_MS = 2200;

export function mount(el, store, T) {
  let timer;
  watch(
    store,
    (s) => [s.notice],
    ({ notice }) => {
      if (!notice) return;
      el.textContent = text(notice, T);
      el.hidden = false;
      clearTimeout(timer);
      timer = setTimeout(() => {
        el.hidden = true;
      }, SHOWN_MS);
    },
  );
}

function text({ message, detail }, T) {
  switch (message) {
    case 'guard':
      return T.guard;
    case 'noDest':
      return `${T.noDest} (${detail})`;
    case 'conflict':
      return detail;
    case 'requestAdded':
      return `${T.requests} +1`;
    case 'copied':
      return T.copied;
  }
}
