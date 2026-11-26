// HTML for nodes. Pure string building; app.js owns the DOM.
import { kindOf, nodeStyle } from './geometry.mjs';

// ---------- html`` tag: interpolations are escaped unless they are Html ----------

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

export const KIND_ICONS = {
  screen: '📱',
  message: '💬',
  email: '✉️',
  document: '📄',
  step: '▭',
  decision: '◆',
  system: '⚙︎',
  wait: '⏳',
  end: '■',
};

// ---------- building blocks ----------

function block(b, vars, live) {
  const text = (s) => fillVars(s, vars);
  const disabled = !live;
  switch (b.type) {
    case 'notice':
      return html`<div class="m-notice ${b.tone || ''}">${text(b.label)}</div>`;
    case 'visual':
      return html`<div class="m-visual" style="${b.aspect ? `aspect-ratio:${b.aspect}` : ''}">${b.label}</div>`;
    case 'rows':
      return html`<div class="m-rows">${(b.rows || []).map((r) => html`<div><span>${text(r.label)}</span><b>${text(r.value)}</b></div>`)}</div>`;
    case 'list':
      return html`<div class="m-list">${(b.items || []).map((item) => html`<div>${text(item)}</div>`)}</div>`;
    case 'input':
      return inputBlock(b, vars, disabled);
    case 'toggle':
      return html`<label class="m-toggle"><span>${b.label}</span><input type="checkbox" data-field="${b.field}" ${vars[b.field] ? html`checked` : ''} ${disabled && html`disabled`}></label>`;
    default:
      return html`<div class="m-text">${text(b.label)}</div>`;
  }
}

function inputBlock(b, vars, disabled) {
  const value = b.field ? (vars[b.field] ?? '') : '';
  const control = b.multiline
    ? html`<textarea data-field="${b.field}" placeholder="${b.placeholder}" ${disabled && html`disabled`}>${value}</textarea>`
    : html`<input data-field="${b.field}" value="${value}" placeholder="${b.placeholder}" ${disabled && html`disabled`}>`;
  return html`<label class="m-field"><span>${b.label}${b.required && ' *'}</span>${control}</label>`;
}

/**
 * ctx: { flow, findNode, vars, live, pathSteps, primary }
 *   pathSteps — Map("screen.action" → [step numbers]) for the highlighted scenario
 *   primary   — the action drawn as the primary button when it has no explicit kind
 */
function actionButton(node, a, ctx) {
  const classes = ['act', a.kind || (a === ctx.primary ? 'primary' : 'secondary')];
  if (a.to == null || !ctx.findNode(a.to)) classes.push('missing');
  if (a.proposed) classes.push('proposed');
  if (ctx.live && a.when && !Object.entries(a.when).every(([k, v]) => ctx.vars[k] === v))
    classes.push('guard-off');
  const steps = ctx.pathSteps?.get(`${node.id}.${a.id}`);
  if (steps) classes.push('on-path');
  const label = a.kind === 'back' ? '‹' : fillVars(a.label, ctx.vars);
  return html`<button class="${classes.join(' ')}" data-action="${a.id}" title="${a.label}">${steps && html`<span class="step">${steps.join(',')}</span>`}${label}</button>`;
}

const buttons = (node, actions, ctx) => actions.map((a) => actionButton(node, a, ctx));

// ---------- node bodies ----------

/** A device artboard: header bar, heading, blocks, buttons, optional tab bar. */
function frameBody(node, ctx) {
  const ui = node.ui || {};
  const text = (s) => fillVars(s, ctx.vars);
  const actions = node.actions || [];
  const back = actions.filter((a) => a.kind === 'back');
  const tabs = actions.filter((a) => a.kind === 'tab');
  const main = actions.filter((a) => a.kind !== 'back' && a.kind !== 'tab');
  const c = { ...ctx, primary: main.find((a) => !a.kind || a.kind === 'primary') };

  return html`
    <div class="m-bar">${buttons(node, back, c)}<span>${text(ui.bar || ctx.flow.title)}</span></div>
    <div class="m-body">
      <h4>${text(ui.heading || node.title)}</h4>
      ${node.body && html`<div class="m-text">${text(node.body)}</div>`}
      ${(ui.blocks || []).map((b) => block(b, ctx.vars, ctx.live))}
      ${node.detail && html`<div class="m-text detail">${text(node.detail)}</div>`}
    </div>
    <div class="m-actions">${buttons(node, main, c)}</div>
    ${tabs.length > 0 && html`<div class="m-tabs">${buttons(node, tabs, c)}</div>`}`;
}

/** Message, email, or document: a touchpoint outside the app. */
function cardBody(node, ctx, T) {
  const kind = kindOf(node);
  const ui = node.ui || {};
  const text = (s) => fillVars(s, ctx.vars);
  const channel = text(node.channel || ui.bar || T.kinds[kind]);
  const heading = text(ui.heading || node.title);
  const c = { ...ctx, primary: (node.actions || [])[0] };

  const header = {
    message: html`<div class="c-head">${KIND_ICONS.message} ${channel}</div>`,
    email: html`<div class="c-head">${KIND_ICONS.email} ${channel}</div><div class="c-subject">${heading}</div>`,
    document: html`<div class="c-head">${KIND_ICONS.document} ${channel}</div><h4>${heading}</h4>`,
  }[kind];
  const content =
    kind === 'message'
      ? html`<div class="bubble">${text(node.body || node.title)}</div>`
      : node.body && html`<div class="m-text">${text(node.body)}</div>`;

  return html`
    ${header}
    <div class="c-body">${content}${(ui.blocks || []).map((b) => block(b, ctx.vars, ctx.live))}</div>
    <div class="m-actions">${buttons(node, node.actions || [], c)}</div>`;
}

const DIAMOND = html`<svg class="shape" viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points="50,2 98,50 50,98 2,50"/></svg>`;

/** Flowchart box. Buttons appear only in the walk-through; on the canvas, edges carry the labels. */
function boxBody(node, ctx, T) {
  const kind = kindOf(node);
  const text = (s) => fillVars(s, ctx.vars);
  const showBody = node.body && (kind !== 'decision' || ctx.live);
  const c = { ...ctx, primary: (node.actions || [])[0] };

  return html`
    ${kind === 'decision' && DIAMOND}
    <div class="n-inner">
      <div class="n-kind">${KIND_ICONS[kind]} ${T.kinds[kind]}</div>
      <div class="n-title">${text(node.title)}</div>
      ${showBody && html`<div class="n-body">${text(node.body)}</div>`}
    </div>
    ${ctx.live && html`<div class="m-actions">${buttons(node, node.actions || [], c)}</div>`}`;
}

export function nodeBody(node, view, ctx, T) {
  const style = nodeStyle(node, view);
  if (style === 'frame') return frameBody(node, ctx);
  if (style === 'card') return cardBody(node, ctx, T);
  return boxBody(node, ctx, T);
}

export function nodeClasses(node, view) {
  return [
    'screen',
    `k-${kindOf(node)}`,
    nodeStyle(node, view),
    `tone-${node.tone || 'normal'}`,
    node.origin || 'source',
  ].join(' ');
}
