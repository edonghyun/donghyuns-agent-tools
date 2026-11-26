// Board rows: where each card sits in its column, relative to the spine the primary path runs on.

const ROW_GAP = 24; // between cards stacked in one column

/**
 * Each non-exception node's top edge, measured from the spine at 0. A column's only primary node
 * is centered on the spine and the others stack around it, alternating above and below, above
 * first. A column with no primary node stacks the same way around an empty spine row, which
 * stays free for primary edges passing through. A column with several primary nodes centers its
 * whole stack on the spine. Without a primary path, each column's first node takes the spine.
 */
export function stackColumns(flow, columnOf, heights, primaryNodes) {
  const byColumn = new Map();
  for (const s of flow.screens.filter((s) => columnOf.has(s.id))) {
    const column = columnOf.get(s.id);
    byColumn.set(column, [...(byColumn.get(column) ?? []), s]);
  }
  const tops = new Map();
  for (const nodes of byColumn.values()) {
    for (const [id, top] of stackColumn(nodes, heights, primaryNodes)) {
      tops.set(id, top);
    }
  }
  return tops;
}

function stackColumn(nodes, heights, primaryNodes) {
  if (primaryNodes.size === 0) {
    return stackAround(nodes[0], nodes.slice(1), heights);
  }
  const onPath = nodes.filter((s) => primaryNodes.has(s.id));
  if (onPath.length > 1) {
    return stackCentered(nodes, heights);
  }
  const [anchor] = onPath;
  return stackAround(
    anchor,
    nodes.filter((s) => s !== anchor),
    heights,
  );
}

/** `anchor`, if there is one, centered on the spine, and `others` alternating above and below it. */
function stackAround(anchor, others, heights) {
  let above = anchor ? -heights.get(anchor.id) / 2 : 0;
  let below = -above;
  const tops = anchor ? [[anchor.id, above]] : [];
  others.forEach((s, i) => {
    const h = heights.get(s.id);
    if (i % 2 === 0) {
      above -= h + ROW_GAP;
      tops.push([s.id, above]);
    } else {
      tops.push([s.id, below + ROW_GAP]);
      below += ROW_GAP + h;
    }
  });
  return tops;
}

function stackCentered(nodes, heights) {
  const total = nodes.reduce((sum, s) => sum + heights.get(s.id), ROW_GAP * (nodes.length - 1));
  let top = -total / 2;
  return nodes.map((s) => {
    const at = top;
    top += heights.get(s.id) + ROW_GAP;
    return [s.id, at];
  });
}
