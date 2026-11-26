// The change requests gathered so far, with buttons to remove one, clear them all, or copy
// them as the markdown `wireflow:revise` reads.

import { html, onClick } from '../html.mjs';
import { requestsMarkdown } from '../selectors.mjs';
import { watch } from '../store.mjs';

export function mount(el, store, T) {
  watch(
    store,
    (s) => [s.requests],
    ({ requests }) => {
      el.innerHTML = String(render(requests, T));
    },
  );
  el.addEventListener('click', async (e) => {
    if (!e.target.closest('[name=copy-requests]')) return;
    await copyText(requestsMarkdown(store.getState(), T));
    store.dispatch({ type: 'notify', message: 'copied' });
  });
}

function render(requests, T) {
  const empty = requests.length === 0;
  const item = (q, i) => html`<div class="req">
    <div><code>${q.number} ${q.screen}${q.action && ` › ${q.action}`}</code><br>${q.text}</div>
    <button ${onClick({ type: 'removeRequest', index: i })}>✕</button>
  </div>`;
  return html`
    <h2>${T.requests} (${requests.length})</h2>
    ${empty ? html`<div class="sub">${T.empty}</div>` : requests.map(item)}
    <div class="row">
      <button name="copy-requests" ${empty && html`disabled`}>${T.copy}</button>
      <button ${onClick({ type: 'clearRequests' })} ${empty && html`disabled`}>${T.clear}</button>
    </div>`;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // No clipboard API (file:// in some browsers): copy through a selected textarea.
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}
