// Structural validation of a flow file. Returns error strings; an empty list means valid.

import { DEVICES, ID, KINDS, VIEWS } from './constants.mjs';
import { entryIds } from './graph.mjs';

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
    errs.push('"actors" must be an array of labels');
  }
  if (flow.id && !ID.test(flow.id)) {
    errs.push(`flow id "${flow.id}" must be lowercase letters, digits, hyphens`);
  }

  const seen = new Set();
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
    if (Array.isArray(flow.actors) && s.actor !== undefined && !flow.actors.includes(s.actor)) {
      errs.push(`screen "${s.id}" has actor "${s.actor}", not listed in "actors"`);
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
  return errs;
}
