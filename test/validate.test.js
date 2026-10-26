import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import validate from '../src/validate.js';
import { context, makeRepo } from './helpers.js';

function check(content) {
  const ctx = context(makeRepo({ 'fragment.md': content }, { git: false }));
  assert.equal(validate(['fragment.md'], ctx), 0);
  return ctx.out;
}

describe('validate', () => {
  it('accepts typed headlines with free sub-bullets', () => {
    assert.deepEqual(check('- feat: archive a classroom\n  - in a background job\n- fix(api): skip archived ones\n'), []);
  });

  it('warns about a headline without a valid type', () => {
    assert.deepEqual(check('- feat: fine\n- Added a thing\n'), [
      '::warning file=fragment.md,line=2::Bullet does not start with a valid type. Expected one of: ' +
        'build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test — followed by ": description". ' +
        'Got: "Added a thing"',
    ]);
  });

  it('warns about a file with no top-level bullet', () => {
    assert.deepEqual(check('  - only a sub-bullet\n'), [
      '::warning file=fragment.md::Fragment contains no top-level bullet points (lines starting with "- ").',
    ]);
  });

  it('accepts a dependency list in byte order', () => {
    const fragment = [
      '- chore: update gems',
      '  - action_text-trix (2.1.0 → 2.1.1)',
      '  - actioncable (8.1.0 → 8.1.1)',
      '- chore(npm): update npm dependencies',
      '  - @rails/ujs (8.1.0 → 8.1.1)',
      '  - Zod (4.0.0)',
      '  - dotenv (18.0.8 → 18.0.9)',
      '',
    ].join('\n');
    assert.deepEqual(check(fragment), []);
  });

  it('warns about each dependency entry out of order', () => {
    const fragment = [
      '- chore: update npm dependencies',
      '  - webpack (5.112.0 → 5.112.1)',
      '  - eslint-plugin-perfectionist (5.12.1 → 5.13.0)',
      '  - skills (1.7.2 → 1.7.4)',
      '',
    ].join('\n');
    assert.deepEqual(check(fragment), [
      '::warning file=fragment.md,line=3::Dependency entries are not sorted by name: ' +
        '"eslint-plugin-perfectionist" should come before "webpack".',
    ]);
  });

  it('leaves the sub-bullets of other headlines unsorted', () => {
    assert.deepEqual(check('- feat: add a page\n  - zebra (in prose)\n  - apple (in prose)\n'), []);
  });

  it('reports an unreadable file as an error', () => {
    const ctx = context(makeRepo({}, { git: false }));
    assert.equal(validate(['missing.md'], ctx), 0);
    assert.match(ctx.err[0], /^::error file=missing\.md::Could not read file: /);
  });

  it('needs at least one file', () => {
    const ctx = context(makeRepo({}, { git: false }));
    assert.equal(validate([], ctx), 1);
    assert.deepEqual(ctx.err, ['Usage: changelog-tools validate <file> [<file> ...]']);
  });
});
