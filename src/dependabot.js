import { appendFileSync, existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { UNRELEASED_DIR, compareBytes, fragmentPath } from './fragments.js';

// An optional conventional-commit prefix is ignored, and "bump" may be lowercased by it.
const GROUP_TITLE = /(^|:\s)[Bb]ump\sthe\s(.+)\sgroup\swith/;
const GROUP_TITLE_WITH_COUNT = /(^|:\s)[Bb]ump\sthe\s(.+)\sgroup\swith\s(\d+)\supdate/;
const SINGLE_TITLE = /(^|:\s)[Bb]ump\s(.+)\sfrom\s(\S+)\sto\s(\S+)/;

function fragmentContent(title, packages) {
  if (packages.length === 1) {
    return `- chore: update ${packages[0]}`;
  }

  if (packages.length > 1) {
    const group = title.match(GROUP_TITLE)?.[2] ?? 'dependencies';
    const entries = [...packages].sort(compareBytes).map((entry) => `  - ${entry}`);
    return [`- chore: update ${group} group (${packages.length} packages)`, ...entries].join('\n');
  }

  // No metadata: fall back to the pull request title.
  const group = title.match(GROUP_TITLE_WITH_COUNT);
  if (group) {
    return `- chore: update ${group[2]} group (${group[3]} packages)`;
  }

  const single = title.match(SINGLE_TITLE);
  if (single) {
    const name = single[2].split(' in /')[0];
    return `- chore: update ${name} (${single[3]} → ${single[4]})`;
  }

  return '- chore: update dependencies';
}

// `packages` is Dependabot's metadata as "name (old → new)" entries joined by commas. Reports
// `created` and `path` through $GITHUB_OUTPUT when it is set.
export default async function dependabot([branch, title, packages = ''], { cwd, env, stdout, stderr }) {
  if (!branch || !title) {
    stderr('Usage: changelog-tools dependabot <branch> <pr-title> [packages]');
    return 1;
  }

  const output = (lines) => {
    if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, lines.map((line) => `${line}\n`).join(''));
  };

  const fragment = fragmentPath(branch);

  if (existsSync(path.join(cwd, fragment))) {
    stdout(`Fragment already exists at ${fragment}, skipping.`);
    output(['created=false']);
    return 0;
  }

  const entries = packages
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const content = fragmentContent(title, entries);

  await mkdir(path.join(cwd, UNRELEASED_DIR), { recursive: true });
  await writeFile(path.join(cwd, fragment), `${content}\n`);
  stdout(`Created fragment at ${fragment}: ${content}`);
  output([`path=${fragment}`, 'created=true']);
  return 0;
}
