// A node as the wireframe draws it: a device frame for screens, a card for messages, emails and
// documents, a box for the rest. The canvas and the walk-through both use it.

import { enabledActions, kindOf } from '../../../lib/index.mjs';
import { classNames, fillVars, html } from '../html.mjs';
import { KIND_ICONS } from '../i18n.mjs';
import { nodeStyle } from '../layout/wireframe.mjs';
import { findNode } from '../selectors.mjs';

/**
 * ctx: `{flow, vars, live, pathSteps?, failedAction?, classes?, style?}`.
 * - `live`: in the walk-through, where buttons work and box nodes show theirs.
 * - `pathSteps`: 'node.action' → step numbers of the highlighted scenario. `failedAction`: the
 *   'node.action' it failed at, whose badge is red.
 * - `classes` and `style` go on the node element as they are.
 * The bodies below also get `ctx.text(s)`: `s` with its {{var}}s filled from `ctx.vars`.
 */
export function render(node, ctx, T) {
  const style = nodeStyle(node);
  const withText = { ...ctx, text: (s) => fillVars(s, ctx.vars) };
  const body = { frame: frameBody, card: cardBody, box: boxBody }[style](node, withText, T);
  const classes = classNames(
    'screen',
    `k-${kindOf(node)}`,
    style,
    `tone-${node.tone || 'normal'}`,
    node.origin || 'source',
    ctx.classes,
  );
  return html`<div class="${classes}" data-id="${node.id}"
    style="${ctx.style || ''}">${body}</div>`;
}

/** A device artboard: header bar, heading, blocks, buttons, optional tab bar. */
function frameBody(node, ctx) {
  const ui = node.ui || {};
  const { text } = ctx;
  const back = node.actions.filter((a) => a.kind === 'back');
  const tabs = node.actions.filter((a) => a.kind === 'tab');
  const main = node.actions.filter((a) => a.kind !== 'back' && a.kind !== 'tab');
  const primary = main.find((a) => !a.kind || a.kind === 'primary');

  return html`
    <div class="m-bar">
      ${buttons(node, back, primary, ctx)}<span>${text(ui.bar || ctx.flow.title)}</span>
    </div>
    <div class="m-body">
      <h4>${text(ui.heading || node.title)}</h4>
      ${node.body && html`<div class="m-text">${text(node.body)}</div>`}
      ${(ui.blocks || []).map((b) => block(b, ctx))}
      ${node.detail && html`<div class="m-text detail">${text(node.detail)}</div>`}
    </div>
    <div class="m-actions">${buttons(node, main, primary, ctx)}</div>
    ${tabs.length > 0 && html`<div class="m-tabs">${buttons(node, tabs, primary, ctx)}</div>`}`;
}

/** Message, email, or document: a touchpoint outside the app. */
function cardBody(node, ctx, T) {
  const kind = kindOf(node);
  const ui = node.ui || {};
  const { text } = ctx;
  const channel = text(node.channel || ui.bar || T.kinds[kind]);
  const heading = text(ui.heading || node.title);

  const header = {
    message: html`<div class="c-head">${KIND_ICONS.message} ${channel}</div>`,
    email: html`<div class="c-head">${KIND_ICONS.email} ${channel}</div>
      <div class="c-subject">${heading}</div>`,
    document: html`<div class="c-head">${KIND_ICONS.document} ${channel}</div><h4>${heading}</h4>`,
  }[kind];
  const content =
    kind === 'message'
      ? html`<div class="bubble">${text(node.body || node.title)}</div>`
      : node.body && html`<div class="m-text">${text(node.body)}</div>`;

  return html`
    ${header}
    <div class="c-body">${content}${(ui.blocks || []).map((b) => block(b, ctx))}</div>
    <div class="m-actions">${buttons(node, node.actions, node.actions[0], ctx)}</div>`;
}

const DIAMOND = html`<svg class="shape" viewBox="0 0 100 100" preserveAspectRatio="none">
  <polygon points="50,2 98,50 50,98 2,50"/></svg>`;

/** A step, decision, system, wait or end box. Its buttons show only in the walk-through. */
function boxBody(node, ctx, T) {
  const kind = kindOf(node);
  const { text } = ctx;
  const showBody = node.body && (kind !== 'decision' || ctx.live);

  return html`
    ${kind === 'decision' && DIAMOND}
    <div class="n-inner">
      <div class="n-kind">${KIND_ICONS[kind]} ${T.kinds[kind]}</div>
      <div class="n-title">${text(node.title)}</div>
      ${showBody && html`<div class="n-body">${text(node.body)}</div>`}
    </div>
    ${
      ctx.live &&
      html`<div class="m-actions">${buttons(node, node.actions, node.actions[0], ctx)}</div>`
    }`;
}

/** A button per action. One without an explicit kind draws filled if `primary`, else outlined. */
const buttons = (node, actions, primary, ctx) =>
  actions.map((a) => actionButton(node, a, primary, ctx));

function actionButton(node, a, primary, ctx) {
  const steps = ctx.pathSteps?.get(`${node.id}.${a.id}`);
  const classes = classNames(
    'act',
    a.kind || (a === primary ? 'primary' : 'secondary'),
    !findNode(ctx.flow, a.to) && 'missing',
    a.proposed && 'proposed',
    ctx.live && !enabledActions(node, ctx.vars).includes(a) && 'guard-off',
    steps && 'on-path',
  );
  const label = a.kind === 'back' ? '‹' : ctx.text(a.label);
  const failed = ctx.failedAction === `${node.id}.${a.id}`;
  const badge =
    steps &&
    html`<span class="${classNames('step', failed && 'failed')}">${steps.join(',')}</span>`;
  return html`<button class="${classes}" data-action="${a.id}"
    title="${a.label}">${badge}${label}</button>`;
}

function block(b, { vars, live, text }) {
  const disabled = !live && html`disabled`;
  switch (b.type) {
    case 'notice':
      return html`<div class="m-notice ${b.tone || ''}">${text(b.label)}</div>`;
    case 'visual':
      return html`<div class="m-visual"
        style="${b.aspect ? `aspect-ratio:${b.aspect}` : ''}">${b.label}</div>`;
    case 'rows':
      return html`<div class="m-rows">${(b.rows || []).map(
        (r) => html`<div><span>${text(r.label)}</span><b>${text(r.value)}</b></div>`,
      )}</div>`;
    case 'list':
      return html`<div class="m-list">${(b.items || []).map(
        (item) => html`<div>${text(item)}</div>`,
      )}</div>`;
    case 'input':
      return inputBlock(b, vars, disabled);
    case 'toggle':
      return html`<label class="m-toggle"><span>${b.label}</span><input type="checkbox"
        data-field="${b.field}" ${vars[b.field] ? html`checked` : ''} ${disabled}></label>`;
    default:
      return html`<div class="m-text">${text(b.label)}</div>`;
  }
}

function inputBlock(b, vars, disabled) {
  const value = b.field ? (vars[b.field] ?? '') : '';
  const field = html`data-field="${b.field}" placeholder="${b.placeholder}" ${disabled}`;
  const control = b.multiline
    ? html`<textarea ${field}>${value}</textarea>`
    : html`<input ${field} value="${value}">`;
  return html`<label class="m-field">
    <span>${b.label}${b.required && ' *'}</span>${control}</label>`;
}
