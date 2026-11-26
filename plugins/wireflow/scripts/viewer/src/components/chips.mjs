// A node's chips: its state, metrics, experiments, notifications, and the codes of the exceptions
// it leads into. Board cards and the node drawer both show them.

import { html } from '../html.mjs';
import { cardChips } from '../layout/card-size.mjs';

/** The chip row, or nothing when the node has no chips. Each chip names its type on hover. */
export function renderChips(node, exceptionCodes, T) {
  const chips = cardChips(node, exceptionCodes);
  if (!chips.length) return '';
  const chip = ({ type, text }) =>
    html`<span class="chip ${type}" title="${T.chipTypes[type]}">${text}</span>`;
  return html`<div class="chips">${chips.map(chip)}</div>`;
}
