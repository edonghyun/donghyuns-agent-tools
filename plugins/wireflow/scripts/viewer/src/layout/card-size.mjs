// Card heights estimated from text length and chip count. The layout never measures the DOM,
// so the same flow always gives the same boxes.

/** Korean characters that fit on one line of a 220px card. */
const CHARS_PER_LINE = 13;
const CHIPS_PER_ROW = 2;

const lineCount = (text = '', max = Number.POSITIVE_INFINITY) =>
  Math.min(max, Math.ceil(text.length / CHARS_PER_LINE));

/** Chips a node shows from its own fields: its state, metrics, experiments, and notifications. */
const chipCount = (node) =>
  (node.state ? 1 : 0) +
  (node.metrics?.length ?? 0) +
  (node.experiments?.length ?? 0) +
  (node.notify?.length ?? 0);

/**
 * Height of a node card: up to two title lines, up to two body lines, and its chip rows.
 * `autoChips` counts chips the board adds on its own, such as the code of each exception the
 * node leads into.
 */
export function estimateCardHeight(node, autoChips = 0) {
  const chipRows = Math.ceil((chipCount(node) + autoChips) / CHIPS_PER_ROW);
  return 64 + 18 * lineCount(node.title, 2) + 16 * lineCount(node.body, 2) + 22 * chipRows;
}

/** Height of a decision-band card: a heading, then every question in full. */
export const estimateDecisionCardHeight = (items) =>
  44 + items.reduce((sum, item) => sum + 18 * lineCount(item) + 6, 0);
