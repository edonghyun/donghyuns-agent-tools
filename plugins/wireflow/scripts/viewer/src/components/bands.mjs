// The bands under the board's main area: the exception band behind the exception cards, and the
// decision band with one card of open questions per stage.

import { boxStyle, html } from '../html.mjs';

/** `bands` from the board layout. `stages`: the flow's stage labels, for the decision cards. */
export function render(bands, stages, T) {
  const decisionCard = (card) => html`<div class="decision-card" style="${boxStyle(card)}">
    <h4>${stages[card.stage]}</h4>
    <ul>${card.items.map((item) => html`<li>${item}</li>`)}</ul>
  </div>`;
  const band = (b) => html`<section class="band ${b.type}" style="${boxStyle(b)}">
    <h3>${T.bands[b.type]}</h3></section>${(b.cards || []).map(decisionCard)}`;
  return bands.map(band);
}
