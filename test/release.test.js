import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import release from '../src/release.js';
import { commit, context, makeRepo, read, run, write } from './helpers.js';

const HEADER = `# Changelog

All notable changes to this project will be documented in this file.

`;

const today = new Date().toISOString().slice(0, 10);

describe('release', () => {
  it('lifts top-level bullets, newest fragment first, and moves the fragments', async () => {
    const cwd = makeRepo();
    commit(cwd, {
      'CHANGELOG.md': `${HEADER}## [Unreleased](../../tree/develop)\n\n_Incoming fragments_\n\n## [1.0.0](../../releases/tag/1.0.0) - 2026-01-01\n\n- feat: first\n`,
    });
    run(cwd, ['tag', '1.0.0']);
    commit(cwd, { '.changelog/unreleased/feat-older.md': '- feat: older\n  - detail that stays behind\n' });
    commit(cwd, { '.changelog/unreleased/fix-newer.md': '- fix: newer\n' });
    write(cwd, { '.changelog/unreleased/.gitkeep': '', '.changelog/unreleased/docs-untracked.md': '- docs: untracked\n' });

    const ctx = context(cwd);
    assert.equal(await release(['1.1.0'], ctx), 0);

    assert.deepEqual(ctx.out, ['- fix: newer\n- feat: older\n- docs: untracked']);
    assert.equal(
      read(cwd, 'CHANGELOG.md'),
      `${HEADER}## [Unreleased](../../tree/develop)\n\n_Incoming fragments_\n\n` +
        `## [1.1.0](../../releases/tag/1.1.0) - ${today}\n\n- fix: newer\n- feat: older\n- docs: untracked\n\n` +
        '## [1.0.0](../../releases/tag/1.0.0) - 2026-01-01\n\n- feat: first\n',
    );
    assert.equal(read(cwd, '.changelog/releases/1.1.0/feat-older.md'), '- feat: older\n  - detail that stays behind\n');
    assert.ok(existsSync(path.join(cwd, '.changelog/releases/1.1.0/docs-untracked.md')));
    assert.ok(existsSync(path.join(cwd, '.changelog/unreleased/.gitkeep')));
  });

  it('starts the first release on its own line when [Unreleased] ends the file', async () => {
    const cwd = makeRepo();
    commit(cwd, {
      'CHANGELOG.md': `${HEADER}## [Unreleased](../../tree/main)\n\n_Incoming fragments_`,
      '.changelog/unreleased/feat-start.md': '- feat: start\n',
    });

    const ctx = context(cwd);
    assert.equal(await release(['0.1.0'], ctx), 0);

    assert.equal(
      read(cwd, 'CHANGELOG.md'),
      `${HEADER}## [Unreleased](../../tree/main)\n\n_Incoming fragments_\n\n` +
        `## [0.1.0](../../releases/tag/0.1.0) - ${today}\n\n- feat: start\n\n`,
    );
  });

  it('records a release with no fragments', async () => {
    const cwd = makeRepo();
    commit(cwd, { 'CHANGELOG.md': `${HEADER}## [Unreleased](../../tree/main)\n` });

    const ctx = context(cwd);
    assert.equal(await release(['0.1.1'], ctx), 0);

    assert.deepEqual(ctx.out, ['- bump version to 0.1.1 only, no changes']);
    assert.match(read(cwd, 'CHANGELOG.md'), /## \[0\.1\.1\]\(\.\.\/\.\.\/releases\/tag\/0\.1\.1\) - .*\n\n- bump version to 0\.1\.1 only/);
  });

  it('skips a fragment added since the tag and deleted again', async () => {
    const cwd = makeRepo();
    commit(cwd, { 'CHANGELOG.md': `${HEADER}## [Unreleased](../../tree/main)\n` });
    commit(cwd, { '.changelog/unreleased/feat-gone.md': '- feat: gone\n', '.changelog/unreleased/feat-kept.md': '- feat: kept\n' });
    run(cwd, ['rm', '--quiet', '.changelog/unreleased/feat-gone.md']);
    run(cwd, ['commit', '--quiet', '--message', 'drop']);

    const ctx = context(cwd);
    assert.equal(await release(['0.2.0'], ctx), 0);
    assert.deepEqual(ctx.out, ['- feat: kept']);
  });

  it('fails without an [Unreleased] section', async () => {
    const cwd = makeRepo();
    commit(cwd, { 'CHANGELOG.md': HEADER });
    await assert.rejects(release(['1.0.0'], context(cwd)), /Could not find the \[Unreleased\] section/);
  });

  it('needs a version', async () => {
    const ctx = context(makeRepo());
    assert.equal(await release([], ctx), 1);
  });
});
