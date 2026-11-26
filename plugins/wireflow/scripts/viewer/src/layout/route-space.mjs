// The free space edges run through: the channels between columns, and the detour lanes above
// and below the main area. Each hands out positions so that two edges never share a line.

import { CARD_W, MARGIN } from './geometry.mjs';

const SLOT_GAP = 6; // between edges turning in one channel
const CLEARANCE = 4; // the least room a channel slot keeps from a card or the board's edge
export const LANE_GAP = 14; // between detour lanes

/**
 * x positions in the channels. Channel `c` is the gap right of column `c`. Channel -1, left of
 * the first column, and the channel right of the last one are the board's margins. `claim` hands
 * out slots alternating around the gap's center (0, +6, -6, +12, …), short of its sides.
 * `claimBeside` hands out slots from the gap's left side first (+6, +12, … up to the center), for
 * a decision's branches: turning early leaves the rest of the gap to the label on the run into
 * the target. Both skip every x already handed out in the channel, so two edges never turn on
 * one line until the channel is full; a full channel overlaps its outermost line rather than
 * run one through a card.
 */
export function channelSlots(columns) {
  const taken = new Map(); // channel → the x positions handed out in it
  const sides = (c) => {
    const left = c < 0 ? columns[0].x - MARGIN : columns[c].x + CARD_W;
    const right = c + 1 < columns.length ? columns[c + 1].x : left + MARGIN;
    return [left, right];
  };
  const center = (c) => {
    const [left, right] = sides(c);
    return (left + right) / 2;
  };
  // The center is midway, so a slot d right of it fits exactly when the one d left of it does.
  const fromCenter = (c) => {
    const right = sides(c)[1];
    const xs = [center(c)];
    for (let d = SLOT_GAP; center(c) + d <= right - CLEARANCE; d += SLOT_GAP) {
      xs.push(center(c) + d, center(c) - d);
    }
    return xs;
  };
  const fromLeft = (c) => {
    const xs = [];
    for (let x = sides(c)[0] + SLOT_GAP; x < center(c); x += SLOT_GAP) xs.push(x);
    return xs;
  };
  /** The first of `xs` not yet taken in channel `c`, else the last of them. */
  const firstFree = (c, xs) => {
    const used = taken.get(c) ?? new Set();
    taken.set(c, used);
    const x = xs.find((candidate) => !used.has(candidate)) ?? xs[xs.length - 1];
    used.add(x);
    return x;
  };
  const claim = (c) => firstFree(c, fromCenter(c));
  const claimBeside = (c) => firstFree(c, [...fromLeft(c), ...fromCenter(c)]);
  return { center, claim, claimBeside };
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
