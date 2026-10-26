import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { previousTag } from './fragments.js';

const BUMPS = ['major', 'minor', 'patch'];

function bump(version, level) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  if (level === 'major') return `${parts[0] + 1}.0.0`;
  if (level === 'minor') return `${parts[0]}.${parts[1] + 1}.0`;
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

// With no `changelogTools.buildPaths` every release bumps package.json; with them, only a release
// that touched one of those paths since the last tag does.
function buildPathsChanged(cwd, buildPaths) {
  if (!buildPaths) return true;

  const tag = previousTag(cwd);
  if (!tag) return true;

  try {
    execFileSync('git', ['diff', '--quiet', tag, 'HEAD', '--', ...buildPaths], { cwd, stdio: 'pipe' });
    return false;
  } catch (error) {
    if (error.status === 1) return true;
    throw error;
  }
}

// Prints the new version as the last line, so a caller can capture it.
export default async function version([arg = 'patch'], { cwd, stdout, stderr }) {
  const currentVersion = (await readFile(path.join(cwd, 'VERSION'), 'utf8')).trim();
  let newVersion;

  if (BUMPS.includes(arg)) {
    newVersion = bump(currentVersion, arg);
    if (!newVersion) {
      stderr(`Error: VERSION holds "${currentVersion}", which is not a valid semver string.`);
      return 1;
    }
  } else if (/^\d+\.\d+\.\d+$/.test(arg)) {
    newVersion = arg;
  } else {
    stderr(`Error: "${arg}" is neither a bump level (patch, minor, major) nor a semver string.`);
    return 1;
  }

  await writeFile(path.join(cwd, 'VERSION'), `${newVersion}\n`);

  const pkgPath = path.join(cwd, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
    if (buildPathsChanged(cwd, pkg.changelogTools?.buildPaths)) {
      pkg.version = newVersion;
      await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
    }
  }

  stdout(newVersion);
  return 0;
}
