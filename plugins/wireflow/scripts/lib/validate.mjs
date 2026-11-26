// Structural validation of a flow file. Returns error strings; an empty list means valid.

import { actorList } from './board.mjs';
import { DEVICES, EVENT_TYPES, HEX_COLOR, ID, KINDS, VIEWS } from './constants.mjs';
import { entryIds } from './graph.mjs';

/** An actor is a nonempty label or an object with a nonempty string `name`. */
const isActor = (a) =>
  typeof a === 'string' ? a !== '' : typeof a?.name === 'string' && a.name !== '';

const deviceError = (d) => {
  if (d === undefined || (typeof d === 'string' && d in DEVICES)) {
    return null;
  }
  const ok = (n) => Number.isInteger(n) && n >= 1 && n <= 8192;
  if (d && typeof d === 'object' && ok(d.width) && ok(d.height)) {
    return null;
  }
  return `device ${JSON.stringify(d)} must be one of ${Object.keys(DEVICES).join('/')} or {width, height} in 1..8192`;
};

export function validate(flow) {
  const errs = [];
  if (!flow || typeof flow !== 'object') {
    return ['flow must be a JSON object'];
  }
  for (const k of ['id', 'title', 'start']) {
    if (typeof flow[k] !== 'string' || !flow[k]) {
      errs.push(`missing string field "${k}"`);
    }
  }
  if (!Array.isArray(flow.stages) || flow.stages.length === 0) {
    errs.push('"stages" must be a nonempty array of labels');
  }
  if (!Array.isArray(flow.screens) || flow.screens.length === 0) {
    return [...errs, '"screens" must be a nonempty array'];
  }
  if (flow.view !== undefined && !VIEWS.includes(flow.view)) {
    errs.push(`view "${flow.view}" must be one of ${VIEWS.join('/')}`);
  }
  const fd = deviceError(flow.device);
  if (fd) {
    errs.push(`flow ${fd}`);
  }
  if (flow.actors !== undefined && !Array.isArray(flow.actors)) {
    errs.push('"actors" must be an array of labels or {name, color}');
  }
  const actorNames = Array.isArray(flow.actors) ? actorList(flow).map((a) => a.name) : null;
  for (const a of Array.isArray(flow.actors) ? flow.actors : []) {
    if (!isActor(a)) {
      errs.push(`actor ${JSON.stringify(a)} must be a label or {name, color}`);
    } else if (typeof a === 'object' && a.color !== undefined && !HEX_COLOR.test(a.color)) {
      errs.push(`actor "${a.name}" has color ${JSON.stringify(a.color)}, expected #RRGGBB`);
    }
  }
  if (flow.id && !ID.test(flow.id)) {
    errs.push(`flow id "${flow.id}" must be lowercase letters, digits, hyphens`);
  }

  const seen = new Set();
  const codes = new Set();
  for (const s of flow.screens) {
    if (!s || typeof s.id !== 'string') {
      errs.push('every screen needs a string "id"');
      continue;
    }
    if (seen.has(s.id)) {
      errs.push(`duplicate screen id "${s.id}"`);
    }
    seen.add(s.id);
    if (!ID.test(s.id)) {
      errs.push(`screen id "${s.id}" must be lowercase letters, digits, hyphens`);
    }
    if (!Number.isInteger(s.stage) || s.stage < 0 || s.stage >= (flow.stages || []).length) {
      errs.push(
        `screen "${s.id}" has stage ${s.stage}, outside stages[0..${(flow.stages || []).length - 1}]`,
      );
    }
    if (s.kind !== undefined && !KINDS.includes(s.kind)) {
      errs.push(`screen "${s.id}" has kind "${s.kind}", expected one of ${KINDS.join('/')}`);
    }
    if (actorNames && s.actor !== undefined && !actorNames.includes(s.actor)) {
      errs.push(`screen "${s.id}" has actor "${s.actor}", not listed in "actors"`);
    }
    if (s.exception !== undefined) {
      if (typeof s.exception !== 'string' || !s.exception) {
        errs.push(`screen "${s.id}" has exception ${JSON.stringify(s.exception)}, expected a code`);
      } else if (codes.has(s.exception)) {
        errs.push(`duplicate exception code "${s.exception}"`);
      }
      codes.add(s.exception);
    }
    const sd = deviceError(s.device);
    if (sd) {
      errs.push(`screen "${s.id}" ${sd}`);
    }
    if (!Array.isArray(s.actions)) {
      errs.push(`screen "${s.id}" must declare "actions" (use [] for none)`);
      continue;
    }
    const aseen = new Set();
    for (const a of s.actions) {
      if (!a || typeof a.id !== 'string' || typeof a.label !== 'string') {
        errs.push(`screen "${s.id}" has an action without string id/label`);
        continue;
      }
      if (aseen.has(a.id)) {
        errs.push(`screen "${s.id}" has duplicate action id "${a.id}"`);
      }
      aseen.add(a.id);
      if (!('to' in a)) {
        errs.push(`action "${s.id}.${a.id}" must set "to" (screen id, or null for a missing link)`);
      }
    }
  }
  for (const e of entryIds(flow)) {
    if (!seen.has(e)) {
      errs.push(`start/entry "${e}" is not a screen id`);
    }
  }
  const sids = new Set();
  for (const sc of flow.scenarios || []) {
    if (!sc.id || sids.has(sc.id)) {
      errs.push(`scenario id "${sc.id}" missing or duplicate`);
    }
    sids.add(sc.id);
    if (!Array.isArray(sc.steps)) {
      errs.push(`scenario "${sc.id}" needs "steps"`);
    }
    if (sc.start !== undefined && !seen.has(sc.start)) {
      errs.push(`scenario "${sc.id}" starts at "${sc.start}", not a screen id`);
    }
  }
  const pids = new Set();
  for (const p of flow.proposals || []) {
    if (!p.id || pids.has(p.id)) {
      errs.push(`proposal id "${p.id}" missing or duplicate`);
    }
    pids.add(p.id);
    if (!Array.isArray(p.changes)) {
      errs.push(`proposal "${p.id}" needs "changes"`);
    }
  }
  if (flow.events !== undefined && !Array.isArray(flow.events)) {
    errs.push('"events" must be an array');
  }
  const eids = new Set();
  for (const e of Array.isArray(flow.events) ? flow.events : []) {
    if (typeof e?.id !== 'string' || !e.id) {
      errs.push('every event needs a string "id"');
      continue;
    }
    if (eids.has(e.id)) {
      errs.push(`duplicate event id "${e.id}"`);
    }
    eids.add(e.id);
    if (!EVENT_TYPES.includes(e.type)) {
      errs.push(`event "${e.id}" has type "${e.type}", expected one of ${EVENT_TYPES.join('/')}`);
    }
    const at = [e.at].flat();
    if (at.length === 0 || !at.every((l) => typeof l === 'string' && l)) {
      errs.push(`event "${e.id}" needs "at": a node id, node.action, or a list of them`);
    }
  }
  return errs;
}
