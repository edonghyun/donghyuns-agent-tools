// The log page: the properties every event carries, then each event under the stage of its first
// location, with its type and every place it fires. A location links to its node on the board.

import { eventLocations, splitLocation } from '../../../lib/index.mjs';
import { html, onClick } from '../html.mjs';
import { displayNumber, findNode } from '../selectors.mjs';
import { watch } from '../store.mjs';

export function mount(el, store, T) {
  watch(
    store,
    (s) => [s.flow],
    ({ flow }) => {
      el.innerHTML = String(renderLogPage(flow, T));
    },
  );
}

export function renderLogPage(flow, T) {
  const events = flow.events || [];
  const props = flow.eventProps || [];
  if (!events.length && !props.length) {
    return html`<h2>${T.logHeading}</h2><div class="sub">${T.noEvents}</div>`;
  }
  return html`<h2>${T.logHeading}</h2>
    ${props.length > 0 && propTable(props, T)}
    ${stageGroups(flow, events, T).map((group) => eventTable(flow, group, T))}`;
}

function propTable(props, T) {
  const row = (p) => html`<tr><td><code>${p.name}</code></td><td>${p.use}</td></tr>`;
  return html`<h3>${T.commonProps}</h3>
    <table class="lt props">
      <thead><tr><th>${T.propColumns.name}</th><th>${T.propColumns.use}</th></tr></thead>
      <tbody>${props.map(row)}</tbody>
    </table>`;
}

/**
 * `{label, number, events}` per stage with events, in stage order. An event sits under the stage
 * of its first location's node; events whose node is not in the flow come last, unnumbered.
 */
function stageGroups(flow, events, T) {
  const stageOf = (event) => {
    const [first] = eventLocations(event);
    return first ? findNode(flow, splitLocation(first)[0])?.stage : undefined;
  };
  const groups = flow.stages.map((label, stage) => ({
    label,
    number: stage + 1,
    events: events.filter((e) => stageOf(e) === stage),
  }));
  const placed = new Set(groups.flatMap((g) => g.events));
  groups.push({ label: T.unplaced, events: events.filter((e) => !placed.has(e)) });
  return groups.filter((g) => g.events.length);
}

function eventTable(flow, { label, number, events }, T) {
  const cols = T.eventColumns;
  const row = (e) => html`<tr>
    <td><code>${e.id}</code></td>
    <td><span class="ty ${e.type}">${T.eventTypes[e.type] || e.type}</span></td>
    <td>${eventLocations(e).map((at) => html`<div>${locationLink(flow, at)}</div>`)}</td>
    <td>${(e.props || []).map((p) => html`<code>${p}</code> `)}</td>
    <td>${e.note}</td>
  </tr>`;
  return html`<h3>${number && html`<span class="ph">${number}</span>`} ${label}</h3>
    <table class="lt events">
      <thead><tr>
        <th>${cols.id}</th><th>${cols.type}</th><th>${cols.at}</th>
        <th>${cols.props}</th><th>${cols.note}</th>
      </tr></thead>
      <tbody>${events.map(row)}</tbody>
    </table>`;
}

/** 'number title' of the location's node, then ' › ' and the button label for a `node.action`. */
function locationLink(flow, at) {
  const [nodeId, actionId] = splitLocation(at);
  const node = findNode(flow, nodeId);
  if (!node) return html`<code>${at}</code>`;
  const action = actionId && node.actions.find((a) => a.id === actionId);
  return html`<a href="#" ${onClick({ type: 'select', id: node.id })}>${displayNumber(flow, node)} ${node.title}</a>${actionId && ` › ${action?.label || actionId}`}`;
}
