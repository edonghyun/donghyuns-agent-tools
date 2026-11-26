// Board rows: where each card sits in its column, relative to the spine the primary path runs on.

const ROW_GAP = 24; // between cards stacked in one column

/**
 * Each non-exception node's top edge, measured from the spine at 0. A column's spine node is
 * centered on the spine and the others stack around it, alternating above and below, above first.
 * A column without a spine node centers its whole stack on the spine.
 */
export function stackColumns(flow, columnOf, heights, primaryNodes) {
  const byColumn = new Map();
  for (const s of flow.screens.filter((s) => columnOf.has(s.id))) {
    const column = columnOf.get(s.id);
    byColumn.set(column, [...(byColumn.get(column) ?? []), s]);
  }
  const tops = new Map();
  for (const nodes of byColumn.values()) {
    const anchor = spineNode(nodes, primaryNodes);
    const stacked = anchor
      ? stackAround(
          anchor,
          nodes.filter((s) => s !== anchor),
          heights,
        )
      : stackCentered(nodes, heights);
    for (const [id, top] of stacked) {
      tops.set(id, top);
    }
  }
  return tops;
}

/** The node a column centers on the spine: its only primary node, or with no primary path, its first. */
function spineNode(nodes, primaryNodes) {
  if (primaryNodes.size === 0) {
    return nodes[0];
  }
  const onPath = nodes.filter((s) => primaryNodes.has(s.id));
  return onPath.length === 1 ? onPath[0] : undefined;
}

function stackAround(anchor, others, heights) {
  let above = -heights.get(anchor.id) / 2;
  let below = -above;
  const tops = [[anchor.id, above]];
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
