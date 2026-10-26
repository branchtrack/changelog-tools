import { readFileSync } from 'node:fs';
import path from 'node:path';

import { compareBytes } from './fragments.js';

// Conventional commit types, accepted as the prefix of a top-level bullet.
const VALID_TYPES = [
  'build', // Build system / Gemfile / package.json
  'chore', // Maintenance / Dependencies
  'ci', // CI/CD changes
  'docs', // Documentation
  'feat', // New Features
  'fix', // Bug Fixes
  'perf', // Performance improvements
  'refactor', // Code cleanup
  'revert', // Reverting changes
  'style', // Formatting (Prettier/Linting)
  'test', // Testing
];

const TOP_LEVEL_BULLET = /^- (.+)/;

// "feat: " or "feat(scope): "
const VALID_TYPE_PREFIX = new RegExp(`^(${VALID_TYPES.join('|')})(\\([^)]+\\))?:\\s+\\S`);

// A dependency list sits under a "chore: update …" bullet,
// one "  - name (old → new)" or "  - name (version)" entry per line.
const DEPENDENCY_HEADLINE = /^chore(\([^)]+\))?:\s+update\b/;
const DEPENDENCY_ENTRY = /^ {2}- (\S+) \(\S+(?: → \S+)?\)$/;

function validateFile(filePath, { cwd, stdout, stderr }) {
  let content;

  try {
    content = readFileSync(path.resolve(cwd, filePath), 'utf8');
  } catch (error) {
    stderr(`::error file=${filePath}::Could not read file: ${error.message}`);
    return;
  }

  let hasAnyBullet = false;
  let inDependencyList = false;
  let previousDependency = null;

  content.split('\n').forEach((line, index) => {
    const dependency = inDependencyList && line.match(DEPENDENCY_ENTRY);
    if (dependency) {
      const name = dependency[1];
      if (previousDependency !== null && compareBytes(name, previousDependency) < 0) {
        stdout(
          `::warning file=${filePath},line=${index + 1}::` +
            `Dependency entries are not sorted by name: "${name}" should come before "${previousDependency}".`,
        );
      }
      previousDependency = name;
      return;
    }

    const match = line.match(TOP_LEVEL_BULLET);
    if (!match) return;

    hasAnyBullet = true;
    const body = match[1];
    inDependencyList = DEPENDENCY_HEADLINE.test(body);
    previousDependency = null;

    if (!VALID_TYPE_PREFIX.test(body)) {
      stdout(
        `::warning file=${filePath},line=${index + 1}::` +
          'Bullet does not start with a valid type. ' +
          `Expected one of: ${VALID_TYPES.join(', ')} — followed by ": description". ` +
          `Got: "${body.slice(0, 60)}"`,
      );
    }
  });

  if (!hasAnyBullet) {
    stdout(`::warning file=${filePath}::Fragment contains no top-level bullet points (lines starting with "- ").`);
  }
}

// Always exits 0: format issues are warnings. Failing on a missing fragment is the CI workflow's job.
export default function validate(files, context) {
  if (files.length === 0) {
    context.stderr('Usage: changelog-tools validate <file> [<file> ...]');
    return 1;
  }

  files.forEach((file) => validateFile(file, context));
  return 0;
}
