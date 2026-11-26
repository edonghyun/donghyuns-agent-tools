// Findings as buttons that select the node each one is about.

import { html, onClick } from '../html.mjs';
import { displayNumber, findNode } from '../selectors.mjs';

export function render(findings, flow, T) {
  return findings.map((f) => {
    const node = f.screen && findNode(flow, f.screen);
    const where = [
      node && `${displayNumber(flow, node)} ${node.title}`,
      f.action,
      f.scenario && `${T.scenarios} ${f.scenario}`,
    ];
    return html`<button class="f ${f.severity}" ${node && onClick({ type: 'select', id: node.id })}>
      <b>${f.code}</b> ${f.message}<small>${where.filter(Boolean).join(' · ')}</small>
    </button>`;
  });
}
