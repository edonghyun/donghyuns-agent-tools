// The free space edges run through: the channels between columns, and the detour lanes above
// and below the main area. Each hands out positions so that two edges never share a line.

import { CARD_W, MARGIN } from './geometry.mjs';

const SLOT_GAP = 6; // between edges turning in one channel
const CLEARANCE = 4; // the least room a channel slot keeps from a card or the board's edge
export const LANE_GAP = 14; // between detour lanes

/**
 * x positions in the channels. Channel `c` is the gap right of column `c`. Channel -1, left of
 * the first column, and the channel right of the last one are the board's margins. Slots
 * alternate around the gap's center (0, +6, -6, +12, …) and stop short of its sides: a crowded
 * channel overlaps its outermost lines rather than run one through a card.
 */
export function channelSlots(columns) {
  const taken = new Map();
  const sides = (c) => {
    const left = c < 0 ? columns[0].x - MARGIN : columns[c].x + CARD_W;
    const right = c + 1 < columns.length ? columns[c + 1].x : left + MARGIN;
    return [left, right];
  };
  const center = (c) => {
    const [left, right] = sides(c);
    return (left + right) / 2;
  };
  const claim = (c) => {
    const i = taken.get(c) ?? 0;
    taken.set(c, i + 1);
    const [left, right] = sides(c);
    const x = center(c) + Math.ceil(i / 2) * SLOT_GAP * (i % 2 ? 1 : -1);
    return Math.min(right - CLEARANCE, Math.max(left + CLEARANCE, x));
  };
  return { center, claim };
}

/**
 * y positions of horizontal runs outside the main area, on the `top` or `bottom` side. Lanes
 * stack outward from the main area 14px apart. A run takes the innermost lane where it stays
 * a slot's width clear of the runs already there. `used()` counts the lanes on each side.
 */
export function detourLanes(mainArea) {
  const lanes = { top: [], bottom: [] };
  const yOf = (side, k) =>
    side === 'top' ? mainArea.top - LANE_GAP * (k + 1) : mainArea.bottom + LANE_GAP * (k + 1);
  const claim = (side, xa, xb) => {
    const run = [Math.min(xa, xb), Math.max(xa, xb)];
    // A straight vertical crosses the lanes without running along one.
    if (run[0] === run[1]) {
      return yOf(side, 0);
    }
    const stack = lanes[side];
    let k = stack.findIndex((lane) => lane.every((other) => apart(run, other)));
    if (k < 0) {
      k = stack.push([]) - 1;
    }
    stack[k].push(run);
    return yOf(side, k);
  };
  const used = () => ({ top: lanes.top.length, bottom: lanes.bottom.length });
  return { claim, used };
}

const apart = ([lo, hi], [otherLo, otherHi]) => hi + SLOT_GAP < otherLo || otherHi + SLOT_GAP < lo;
