// Shared vocabulary of a flow: id format, devices, node kinds, views, finding severities.

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
export const VIEWS = ['wireframe', 'flowchart'];
export const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };
