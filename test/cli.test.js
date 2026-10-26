import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { makeRepo } from './helpers.js';

const BIN = fileURLToPath(new URL('../bin/changelog-tools.js', import.meta.url));

function cli(args, cwd) {
  return spawnSync(process.execPath, [BIN, ...args], { cwd, encoding: 'utf8' });
}

describe('changelog-tools', () => {
  it('prints its version', () => {
    const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.equal(cli(['--version']).stdout, `${version}\n`);
  });

  it('prints the usage and fails on an unknown command', () => {
    const result = cli(['publish']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^Usage: changelog-tools <command>/);
  });

  it('runs a command in the working directory', () => {
    const cwd = makeRepo({ 'fragment.md': '- nope\n' }, { git: false });
    const result = cli(['validate', 'fragment.md'], cwd);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /^::warning file=fragment\.md,line=1::/);
  });

  it('reports a thrown error and fails', () => {
    const result = cli(['version'], makeRepo({}, { git: false }));
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^Error: ENOENT/);
  });
});
