import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import version from '../src/version.js';
import { commit, context, makeRepo, read, run } from './helpers.js';

function pkg(extra = {}) {
  return `${JSON.stringify({ name: 'app', version: '1.2.3', ...extra }, null, 2)}\n`;
}

describe('version', () => {
  for (const [arg, expected] of [
    [undefined, '1.2.4'],
    ['patch', '1.2.4'],
    ['minor', '1.3.0'],
    ['major', '2.0.0'],
    ['4.5.6', '4.5.6'],
  ]) {
    it(`turns 1.2.3 into ${expected} for ${arg ?? 'no argument'}`, async () => {
      const cwd = makeRepo();
      commit(cwd, { VERSION: '1.2.3\n' });

      const ctx = context(cwd);
      assert.equal(await version(arg ? [arg] : [], ctx), 0);
      assert.deepEqual(ctx.out, [expected]);
      assert.equal(read(cwd, 'VERSION'), `${expected}\n`);
    });
  }

  it('rejects anything else', async () => {
    const cwd = makeRepo();
    commit(cwd, { VERSION: '1.2.3\n' });

    for (const arg of ['huge', '1.2', 'v1.2.3']) {
      const ctx = context(cwd);
      assert.equal(await version([arg], ctx), 1);
      assert.equal(read(cwd, 'VERSION'), '1.2.3\n');
    }
  });

  it('bumps package.json on every release without buildPaths', async () => {
    const cwd = makeRepo();
    commit(cwd, { VERSION: '1.2.3\n', 'package.json': pkg() });
    run(cwd, ['tag', '1.2.3']);

    await version(['patch'], context(cwd));
    assert.equal(JSON.parse(read(cwd, 'package.json')).version, '1.2.4');
  });

  it('leaves package.json alone when no build path changed since the tag', async () => {
    const cwd = makeRepo();
    commit(cwd, { VERSION: '1.2.3\n', 'package.json': pkg({ changelogTools: { buildPaths: ['frontend'] } }) });
    run(cwd, ['tag', '1.2.3']);
    commit(cwd, { 'app/model.rb': 'class Model; end\n' });

    await version(['patch'], context(cwd));
    assert.equal(read(cwd, 'VERSION'), '1.2.4\n');
    assert.equal(JSON.parse(read(cwd, 'package.json')).version, '1.2.3');
  });

  it('bumps package.json when a build path changed since the tag', async () => {
    const cwd = makeRepo();
    commit(cwd, { VERSION: '1.2.3\n', 'package.json': pkg({ changelogTools: { buildPaths: ['frontend'] } }) });
    run(cwd, ['tag', '1.2.3']);
    commit(cwd, { 'frontend/app.js': 'export {};\n' });

    await version(['minor'], context(cwd));
    assert.equal(read(cwd, 'package.json'), pkg({ version: '1.3.0', changelogTools: { buildPaths: ['frontend'] } }));
  });

  it('works without a package.json', async () => {
    const cwd = makeRepo();
    commit(cwd, { VERSION: '1.2.3\n' });

    assert.equal(await version(['patch'], context(cwd)), 0);
    assert.equal(read(cwd, 'VERSION'), '1.2.4\n');
  });
});
