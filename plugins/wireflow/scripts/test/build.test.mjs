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

test('example copies the board sample for --board and its 0.2 alias, and never overwrites', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wireflow-example-'));
  const idOf = (args) => {
    execFileSync(process.execPath, [cli, 'example', ...args], { cwd: dir, stdio: 'pipe' });
    return JSON.parse(readFileSync(join(dir, args[0]), 'utf8')).id;
  };
  assert.equal(idOf(['plain.flow.json']), 'class-booking');
  assert.equal(idOf(['board.flow.json', '--board']), 'trial-enrollment');
  assert.equal(idOf(['alias.flow.json', '--flowchart']), 'trial-enrollment');
  assert.throws(
    () =>
      execFileSync(process.execPath, [cli, 'example', 'board.flow.json'], {
        cwd: dir,
        stdio: 'pipe',
      }),
    (e) => e.status === 2,
  );
  assert.equal(
    JSON.parse(readFileSync(join(dir, 'board.flow.json'), 'utf8')).id,
    'trial-enrollment',
  );
});
