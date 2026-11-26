// A node's card on the journey board, top to bottom: actor tag and number, title, up to two body
// lines, and chips. Its box comes from the layout, whose height estimate (layout/card-size.mjs)
// counts on the clamps in styles/board.css.

import { isException, kindOf } from '../../../lib/index.mjs';
import { boxStyle, classNames, fillVars, html } from '../html.mjs';
import { KIND_ICONS } from '../i18n.mjs';
import { displayNumber, previewVars } from '../selectors.mjs';
import { renderChips } from './chips.mjs';

/**
 * ctx: `{flow, box?, color?, codes?, primary?, selected?, dim?}`. `color` is the actor's, `codes`
 * the exception codes the node leads into, `dim` fades a card off the highlighted scenario.
 */
export function renderBoardCard(node, ctx, T) {
  const { flow } = ctx;
  const kind = kindOf(node);
  const origin = node.origin || 'source';
  const classes = classNames(
    'card',
    `k-${kind}`,
    origin,
    isException(node) && 'exception',
    node.dormant && 'dormant',
    ctx.primary && 'primary',
    ctx.selected && 'sel',
    ctx.dim && 'dim',
  );
  const style = [ctx.box && boxStyle(ctx.box), ctx.color && `--actor:${ctx.color}`];
  return html`<article class="${classes}" data-id="${node.id}"
    style="${style.filter(Boolean).join(';')}">
    <div class="c-top">
      ${node.actor && html`<span class="c-actor">${node.actor}</span>`}
      <span class="c-num">${KIND_ICONS[kind]} ${displayNumber(flow, node)}</span>
      ${isException(node) && html`<span class="c-code">${node.exception}</span>`}
      ${origin !== 'source' && html`<span class="badge ${origin}">${T.origin[origin] || origin}</span>`}
    </div>
    <h4 class="c-title">${node.title}</h4>
    ${node.body && html`<p class="c-body">${fillVars(node.body, previewVars(flow, node))}</p>`}
    ${renderChips(node, ctx.codes, T)}
  </article>`;
}
