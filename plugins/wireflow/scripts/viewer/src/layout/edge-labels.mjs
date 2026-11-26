// Labels on the edges out of a decision: their text per target, and the box each takes on the
// board. The sizes mirror `.edge-label` in styles/board.css.

import { textWidth } from './text-width.mjs';

export const LABEL_SIZE = 15;
export const LABEL_PADDING = 16; // 7px each side and a 1px border
export const LABEL_H = 24; // a 20px line, 1px padding and a 1px border, top and bottom
/** Space a label keeps clear on each side, from cards and from where its edge turns. */
export const LABEL_MARGIN = 12;
/** A scenario's step badge, `.edge-step` in styles/board.css, sits on top of its edge's label. */
export const STEP_H = 30;

export const labelWidth = (label) => textWidth(label, LABEL_SIZE) + LABEL_PADDING;

/** A decision's branch labels by target id: the labels of its actions into it, joined ' / '. */
export function branchLabels(node, targetIds) {
  const labels = new Map();
  for (const { to, label } of node.actions.filter((a) => targetIds.has(a.to))) {
    labels.set(to, labels.has(to) ? `${labels.get(to)} / ${label}` : label);
  }
  return labels;
}
