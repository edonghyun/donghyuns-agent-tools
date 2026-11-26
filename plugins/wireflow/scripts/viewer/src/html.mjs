// The html`` tag: interpolations are escaped unless they are Html. Components build markup
// with it. `onClick` marks an element whose click dispatches a store action (see main.mjs).

class Html {
  constructor(text) {
    this.text = text;
  }
  toString() {
    return this.text;
  }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

function renderValue(v) {
  if (v === null || v === undefined || v === false) return '';
  if (v instanceof Html) return v.text;
  if (Array.isArray(v)) return v.map(renderValue).join('');
  return escapeHtml(v);
}

export function html(strings, ...values) {
  return new Html(
    strings.reduce((out, s, i) => out + s + (i < values.length ? renderValue(values[i]) : ''), ''),
  );
}

/** Replace {{var}} with values from the current state. */
export const fillVars = (text, vars) =>
  String(text ?? '').replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');

/** The truthy names joined into a class attribute value. */
export const classNames = (...names) => names.filter(Boolean).join(' ');

/** Attribute that makes a click on the element dispatch `action`. */
export const onClick = (action) => html`data-dispatch="${JSON.stringify(action)}"`;

/** Inline style placing an element on the box `{x, y, w, h}`. */
export const boxStyle = ({ x, y, w, h }) => `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
