// Shared vocabulary of a flow: id format, devices, node kinds, views, events, actor colors, severities.

export const ID = /^[a-z0-9][a-z0-9-]*$/;
export const DEVICES = {
  mobile: [390, 844],
  tablet: [820, 1180],
  desktop: [1280, 800],
  watch: [198, 242],
  kiosk: [1080, 1920],
};
export const KINDS = [
  'screen',
  'message',
  'email',
  'document',
  'step',
  'decision',
  'system',
  'wait',
  'end',
];
// "flowchart" is the 0.2 name of "board"; it stays valid and reads as "board".
export const VIEWS = ['board', 'wireframe', 'flowchart'];
export const EVENT_TYPES = ['normal', 'drop', 'error'];
export const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
// Default actor colors, in order. The first four come from the hand-drawn journey board.
export const ACTOR_PALETTE = ['#8563AA', '#B4791F', '#148A6E', '#2F53C4', '#B3385A', '#5F6B7A'];
export const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };
