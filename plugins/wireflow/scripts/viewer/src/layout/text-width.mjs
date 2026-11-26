// Text widths for the layout, which never measures the DOM.

// Advance widths in em, measured in Chrome with Apple SD Gothic Neo (Hangul 0.86em) and rounded
// up toward Pretendard and Malgun Gothic, so a line estimated to fit never wraps.
const WIDE = /[\u1100-\u11ff\u2e80-\u9fff\uac00-\ud7af\uff00-\uffef]/;
const emOf = (ch) => {
  if (WIDE.test(ch)) return 0.92;
  if (ch === ' ') return 0.27;
  return /[A-Z0-9]/.test(ch) ? 0.64 : 0.52;
};

/** Estimated width of `text` set at `size` px: Hangul, CJK and full-width forms near a full em. */
export function textWidth(text, size) {
  let em = 0;
  for (const ch of String(text ?? '')) {
    em += emOf(ch);
  }
  return Math.ceil(em * size);
}
