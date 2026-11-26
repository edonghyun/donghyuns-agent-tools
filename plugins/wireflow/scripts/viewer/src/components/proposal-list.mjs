// The flow's proposals as checkboxes that preview them on the flow. Given a node id, only the
// proposals that touch that node.

import { html, onClick } from '../html.mjs';

export function render({ authored, applied }, T, nodeId) {
  const touches = (p) =>
    (p.changes || []).some(
      (c) => c.screen === nodeId || c.addScreen?.id === nodeId || c.action?.to === nodeId,
    );
  const proposals = (authored.proposals || []).filter((p) => !nodeId || touches(p));
  if (!proposals.length) return '';
  return html`<h3>${T.proposals}</h3>${proposals.map(
    (p) => html`<label class="prop-row">
      <input type="checkbox" ${applied.includes(p.id) && html`checked`}
        ${onClick({ type: 'toggleProposal', id: p.id })}>
      <span><b>${p.title}</b><small>${p.reason}</small></span>
    </label>`,
  )}`;
}
