// Axis-aligned paths as point lists: card crossing, cleanup, and label anchors.

const segmentsOf = (points) => points.slice(1).map((p, i) => [points[i], p]);

/** True when a segment of the path runs through a box's interior. Its border doesn't count. */
export function crossesAny(points, boxes) {
  return segmentsOf(points).some(([[x1, y1], [x2, y2]]) =>
    boxes.some(
      (box) =>
        Math.min(x1, x2) < box.x + box.w &&
        Math.max(x1, x2) > box.x &&
        Math.min(y1, y2) < box.y + box.h &&
        Math.max(y1, y2) > box.y,
    ),
  );
}

/** The path without repeated points or points in the middle of a straight run. */
export function simplify(points) {
  const kept = points.filter(
    (p, i) => i === 0 || p[0] !== points[i - 1][0] || p[1] !== points[i - 1][1],
  );
  return kept.filter((p, i) => {
    const prev = kept[i - 1];
    const next = kept[i + 1];
    const straight =
      prev &&
      next &&
      ((prev[0] === p[0] && p[0] === next[0]) || (prev[1] === p[1] && p[1] === next[1]));
    return !straight;
  });
}

/** The middle of the path's longest horizontal segment, the later one on a tie, or else of its first segment. */
export function labelAnchor(points) {
  const segments = segmentsOf(points);
  const runs = segments.filter(([a, b]) => a[1] === b[1]);
  const length = ([a, b]) => Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
  const [[x1, y1], [x2, y2]] = (runs.length ? runs : segments).reduce((best, s) =>
    length(s) >= length(best) ? s : best,
  );
  return [(x1 + x2) / 2, (y1 + y2) / 2];
}
