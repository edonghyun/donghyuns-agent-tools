import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const cli = new URL('../wireflow.mjs', import.meta.url).pathname;
const example = new URL('../../examples/class-booking.flow.json', import.meta.url);

/** Builds `flow` with the CLI and returns the HTML it wrote. */
function build(flow) {
  const dir = mkdtempSync(join(tmpdir(), 'wireflow-build-'));
  writeFileSync(join(dir, 'f.flow.json'), JSON.stringify(flow));
  execFileSync(process.execPath, [cli, 'build', 'f.flow.json', 'f.html'], { cwd: dir });
  return readFileSync(join(dir, 'f.html'), 'utf8');
}

test('build fills every marker of the viewer template', () => {
  const html = build(JSON.parse(readFileSync(example, 'utf8')));
  assert.match(html, /^<!doctype html>\n<html lang="ko">/);
  assert.match(html, /<title>도자기 클래스 예약 · wireflow<\/title>/);
  assert.match(html, /const META = \{"source":"f\.flow\.json","output":"f\.html"/);
  for (const marker of ['/*TITLE*/', '/*CSS*/', '/*DATA*/', '/*APP*/']) {
    assert.ok(!html.includes(marker), marker);
  }
});

test('an English flow builds an English page', () => {
  const flow = { ...JSON.parse(readFileSync(example, 'utf8')), locale: 'en' };
  assert.match(build(flow), /^<!doctype html>\n<html lang="en">/);
});
