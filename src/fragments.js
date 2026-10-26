import { execFileSync } from 'node:child_process';

export const UNRELEASED_DIR = '.changelog/unreleased';
export const RELEASES_DIR = '.changelog/releases';

// A fragment is named after its branch, with every `/` flattened to `-`.
export function fragmentPath(branch) {
  return `${UNRELEASED_DIR}/${branch.replaceAll('/', '-')}.md`;
}

// Byte order, the same as `LC_ALL=C sort`: `@` and `_` land where a locale-aware sort would not.
export function compareBytes(a, b) {
  return Buffer.compare(Buffer.from(a), Buffer.from(b));
}

export function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

export function previousTag(cwd) {
  try {
    return git(cwd, ['describe', '--tags', '--abbrev=0']);
  } catch {
    return null;
  }
}
