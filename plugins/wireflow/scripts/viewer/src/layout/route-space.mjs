// The free space edges run through: the channels between columns, and the detour lanes above
// and below the main area. Each hands out positions so that two edges never share a line.

import { CARD_W, SUB_GAP } from './geometry.mjs';

const SLOT_GAP = 6; // between edges turning in one channel
const LANE_GAP = 14; // between detour lanes

/**
 * x positions in the channels. Channel `c` is the gap right of column `c`, and channel -1 the
 * one left of the first column. Its slots alternate around the gap's center: 0, +6, -6, +12, …
 */
export function channelSlots(columns) {
  const taken = new Map();
  const center = (c) => {
    const left = c < 0 ? columns[0].x - SUB_GAP : columns[c].x + CARD_W;
    const right = c + 1 < columns.length ? columns[c + 1].x : left + SUB_GAP;
    return (left + right) / 2;
  };
  const claim = (c) => {
    const i = taken.get(c) ?? 0;
    taken.set(c, i + 1);
    return center(c) + Math.ceil(i / 2) * SLOT_GAP * (i % 2 ? 1 : -1);
  };
  return { center, claim };
}

/**
 * y positions of horizontal runs outside the main area, on the `top` or `bottom` side. Lanes
 * stack outward from the main area 14px apart. A run takes the innermost lane where it stays
 * a slot's width clear of the runs already there.
 */
export function detourLanes(mainArea) {
  const lanes = { top: [], bottom: [] };
  const claim = (side, xa, xb) => {
    const run = [Math.min(xa, xb), Math.max(xa, xb)];
    const stack = lanes[side];
    let k = stack.findIndex((lane) => lane.every((other) => apart(run, other)));
    if (k < 0) {
      k = stack.push([]) - 1;
    }
    // A straight vertical crosses the lane without running along it, so it leaves it free.
    if (run[0] < run[1]) {
      stack[k].push(run);
    }
    const out = LANE_GAP * (k + 1);
    return side === 'top' ? mainArea.top - out : mainArea.bottom + out;
  };
  return { claim };
}

const apart = ([lo, hi], [otherLo, otherHi]) => hi + SLOT_GAP < otherLo || otherHi + SLOT_GAP < lo;
