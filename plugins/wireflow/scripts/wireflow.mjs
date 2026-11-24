#!/usr/bin/env node
// wireflow CLI — zero dependencies, Node 18+.
//   node wireflow.mjs check FLOW.json [--with p1,p2] [--json]
//   node wireflow.mjs build FLOW.json OUT.html
//   node wireflow.mjs example OUT.flow.json [--flowchart]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, exitCode, validate } from './lib/model.mjs';

const here = dirname(fileURLToPath(import.meta.url));
// Browser-safe ES modules inlined into the viewer, in dependency order.
const VIEWER_MODULES = ['lib/model.mjs', 'viewer/i18n.mjs', 'viewer/geometry.mjs', 'viewer/render.mjs'];

/** Turn an ES module into plain script text: drop imports, strip `export`. */
function inlineModule(path) {
  const source = readFileSync(join(here, path), 'utf8');
  return `// --- ${path} ---\n${source.replace(/^import .*;\n/gm, '').replace(/^export /gm, '')}`;
}

const ICON = { critical: '🔴', warning: '🟡', info: '🔵' };

function usage(code = 2) {
  console.error('usage:\n  wireflow check FLOW.json [--with p1,p2] [--json]\n  wireflow build FLOW.json OUT.html\n  wireflow example OUT.flow.json [--flowchart]');
  process.exit(code);
}

function load(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    console.error(`cannot read ${path}: ${e.message}`);
    process.exit(2);
  }
}

function printCheck(flow, r, path) {
  if (r.errors.length) {
    console.log(`INVALID ${path}`);
    for (const e of r.errors) console.log(`  ✖ ${e}`);
    return;
  }
  const verdict = r.findings.some((f) => f.severity === 'critical') ? 'BROKEN' : r.findings.some((f) => f.severity === 'warning') ? 'WARN' : 'OK';
  console.log(`${verdict} ${flow.title} (flow: ${flow.id})${r.applied.length ? ` with ${r.applied.join(', ')}` : ''}`);
  console.log(`  screens ${flow.screens.length} · scenarios ${r.scenarios.filter((s) => s.ok).length}/${r.scenarios.length} pass · requirements ${r.requirements.filter((q) => q.status === 'passed').length}/${r.requirements.length} pass`);
  for (const f of r.findings) {
    const where = [f.screen, f.action].filter(Boolean).join('.') || f.requirement || '';
    console.log(`  ${ICON[f.severity]} ${f.code}${where ? ` [${where}]` : ''}${f.scenario ? ` (scenario ${f.scenario})` : ''}: ${f.message}`);
  }
}

const [cmd, ...rest] = process.argv.slice(2);
const flags = rest.filter((a) => a.startsWith('--'));
const args = rest.filter((a, i) => !a.startsWith('--') && !(rest[i - 1] === '--with'));
const withIdx = rest.indexOf('--with');
const withIds = withIdx >= 0 ? (rest[withIdx + 1] || '').split(',').filter(Boolean) : [];

if (cmd === 'check') {
  if (!args[0]) usage();
  const flow = load(args[0]);
  let r;
  try {
    r = check(flow, { with: withIds });
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
  if (flags.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else printCheck(flow, r, args[0]);
  process.exit(exitCode(r));
} else if (cmd === 'build') {
  if (args.length < 2) usage();
  const [src, out] = args;
  const flow = load(src);
  const errors = validate(flow);
  if (errors.length) {
    printCheck(flow, { errors }, src);
    process.exit(2);
  }
  const css = readFileSync(join(here, 'viewer/viewer.css'), 'utf8');
  const app = readFileSync(join(here, 'viewer/app.js'), 'utf8');
  const modules = VIEWER_MODULES.map(inlineModule).join('\n');
  const tpl = readFileSync(join(here, 'viewer/viewer.html'), 'utf8');
  const meta = { source: relative(process.cwd(), resolve(src)) || basename(src), output: basename(out), builtAt: new Date().toISOString() };
  const safe = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const html = tpl
    .replace('/*TITLE*/', () => String(flow.title).replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;')))
    .replace('/*LANG*/', () => (flow.locale === 'en' ? 'en' : 'ko'))
    .replace('/*CSS*/', () => css)
    .replace('/*DATA*/', () => `const FLOW = ${safe(flow)};\nconst META = ${safe(meta)};`)
    .replace('/*MODULES*/', () => modules)
    .replace('/*APP*/', () => app);
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(out, html);
  const r = check(flow);
  console.log(`built ${out} (${Math.round(html.length / 1024)} KB)`);
  printCheck(flow, r, src);
  process.exit(0);
} else if (cmd === 'example') {
  if (!args[0]) usage();
  if (existsSync(args[0])) {
    console.error(`${args[0]} already exists; refusing to overwrite`);
    process.exit(2);
  }
  mkdirSync(dirname(resolve(args[0])), { recursive: true });
  writeFileSync(args[0], readFileSync(join(here, '../examples', flags.includes('--flowchart') ? 'consulting-request.flow.json' : 'class-booking.flow.json'), 'utf8'));
  console.log(`wrote ${args[0]}`);
} else {
  usage(cmd ? 2 : 0);
}
