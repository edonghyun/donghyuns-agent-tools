// Board spacing shared by the layout modules, and box helpers.

export const CARD_W = 220;
export const SUB_GAP = 48; // between sub-columns of a stage
export const STAGE_GAP = 72; // between stages
export const MARGIN = 32; // around the whole board
export const HEADER_H = 40; // stage headers, above the columns
// Free space above and below the main area, where edges detour around the cards.
export const DETOUR_GAP = 56;

export const bottomOf = (box) => box.y + box.h;
