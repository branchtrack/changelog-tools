import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import notes from '../src/notes.js';
import { context, makeRepo } from './helpers.js';

const CHANGELOG = `# Changelog

## [Unreleased](../../tree/main)

## [1.1.0](../../releases/tag/1.1.0) - 2026-02-01

- feat: add \`changelog-tools notes\`

- fix: keep the tag message flat

## [1.0.0](../../releases/tag/1.0.0) - 2026-01-01

- feat: first
`;

describe('notes', () => {
  it('prints a section without blank lines or backticks', async () => {
    const ctx = context(makeRepo({ 'CHANGELOG.md': CHANGELOG }, { git: false }));
    assert.equal(await notes(['1.1.0'], ctx), 0);
    assert.deepEqual(ctx.out, ['- feat: add changelog-tools notes\n- fix: keep the tag message flat']);
  });

  it('reads the last section to the end of the file', async () => {
    const ctx = context(makeRepo({ 'CHANGELOG.md': CHANGELOG }, { git: false }));
    await notes(['1.0.0'], ctx);
    assert.deepEqual(ctx.out, ['- feat: first']);
  });

  it('fails on a version it has no section for', async () => {
    const ctx = context(makeRepo({ 'CHANGELOG.md': CHANGELOG }, { git: false }));
    assert.equal(await notes(['9.9.9'], ctx), 1);
    assert.deepEqual(ctx.err, ['Error: CHANGELOG.md has no 9.9.9 section.']);
  });
});
