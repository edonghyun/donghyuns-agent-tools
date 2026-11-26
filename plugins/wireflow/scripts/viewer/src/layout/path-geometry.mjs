// Axis-aligned paths as point lists: card crossing, cleanup, and horizontal runs for labels.

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

/** The path's horizontal runs as `[[left, y], [right, y]]`, longest first, the later on a tie. */
export function horizontalRuns(points) {
  return segmentsOf(points)
    .filter(([a, b]) => a[1] === b[1] && a[0] !== b[0])
    .map(([a, b]) => (a[0] < b[0] ? [a, b] : [b, a]))
    .reverse()
    .sort(([a, b], [c, d]) => d[0] - c[0] - (b[0] - a[0]));
}

/** True when two boxes share interior. */
export const boxesOverlap = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
