import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';

import dependabot from '../src/dependabot.js';
import { context, makeRepo, read, write } from './helpers.js';

async function generate(args) {
  const cwd = makeRepo({}, { git: false });
  write(cwd, { 'github-output': '' });
  const ctx = context(cwd, { GITHUB_OUTPUT: path.join(cwd, 'github-output') });
  assert.equal(await dependabot(args, ctx), 0);
  return { cwd, ctx, output: read(cwd, 'github-output') };
}

describe('dependabot', () => {
  it('collapses a single package into one line', async () => {
    const { cwd, ctx, output } = await generate([
      'dependabot/npm_and_yarn/chartist-2.2.0',
      'chore(npm): bump chartist from 1.5.0 to 2.2.0',
      'chartist (1.5.0 → 2.2.0)',
    ]);

    const fragment = '.changelog/unreleased/dependabot-npm_and_yarn-chartist-2.2.0.md';
    assert.equal(read(cwd, fragment), '- chore: update chartist (1.5.0 → 2.2.0)\n');
    assert.deepEqual(ctx.out, [`Created fragment at ${fragment}: - chore: update chartist (1.5.0 → 2.2.0)`]);
    assert.equal(output, `path=${fragment}\ncreated=true\n`);
  });

  it('lists a group in byte order under its name', async () => {
    const { cwd } = await generate([
      'dependabot/npm_and_yarn/all-npm-104fa10117',
      'chore(npm): bump the all-npm group with 4 updates',
      'webpack (5.112.0 → 5.112.1), eslint-plugin-perfectionist (5.12.1 → 5.13.0), @mapbox/mapbox-gl-geocoder (5.1.2 → 5.1.3), new-thing (1.0.0)',
    ]);

    assert.equal(
      read(cwd, '.changelog/unreleased/dependabot-npm_and_yarn-all-npm-104fa10117.md'),
      [
        '- chore: update all-npm group (4 packages)',
        '  - @mapbox/mapbox-gl-geocoder (5.1.2 → 5.1.3)',
        '  - eslint-plugin-perfectionist (5.12.1 → 5.13.0)',
        '  - new-thing (1.0.0)',
        '  - webpack (5.112.0 → 5.112.1)',
        '',
      ].join('\n'),
    );
  });

  it('calls an unnamed group dependencies', async () => {
    const { cwd } = await generate(['dependabot/multi', 'Bump a few things', 'b (2), a (1)']);
    assert.equal(read(cwd, '.changelog/unreleased/dependabot-multi.md'), '- chore: update dependencies group (2 packages)\n  - a (1)\n  - b (2)\n');
  });

  for (const [title, expected] of [
    ['Bump the all-gems group with 26 updates', '- chore: update all-gems group (26 packages)'],
    ['chore(ruby): bump the all-gems group across 2 directories with 3 updates', '- chore: update dependencies'],
    ['Bump lodash from 4.17.20 to 4.17.21 in /frontend', '- chore: update lodash (4.17.20 → 4.17.21)'],
    ['chore(npm): bump msw from 2.15.0 to 3.0.3', '- chore: update msw (2.15.0 → 3.0.3)'],
    ['Update something', '- chore: update dependencies'],
  ]) {
    it(`falls back to the title "${title}"`, async () => {
      const { cwd } = await generate(['dependabot/x', title]);
      assert.equal(read(cwd, '.changelog/unreleased/dependabot-x.md'), `${expected}\n`);
    });
  }

  it('leaves an existing fragment alone', async () => {
    const cwd = makeRepo({ '.changelog/unreleased/dependabot-x.md': '- chore: by hand\n', 'github-output': '' }, { git: false });
    const ctx = context(cwd, { GITHUB_OUTPUT: path.join(cwd, 'github-output') });

    assert.equal(await dependabot(['dependabot/x', 'Bump y from 1 to 2', 'y (1 → 2)'], ctx), 0);
    assert.equal(read(cwd, '.changelog/unreleased/dependabot-x.md'), '- chore: by hand\n');
    assert.deepEqual(ctx.out, ['Fragment already exists at .changelog/unreleased/dependabot-x.md, skipping.']);
    assert.equal(read(cwd, 'github-output'), 'created=false\n');
  });

  it('needs a branch and a title', async () => {
    const ctx = context(makeRepo({}, { git: false }));
    assert.equal(await dependabot(['dependabot/x'], ctx), 1);
  });
});
