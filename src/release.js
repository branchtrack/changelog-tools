import { mkdir, readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { RELEASES_DIR, UNRELEASED_DIR, git, previousTag } from './fragments.js';

const SKIP_FILES = new Set(['.gitkeep', '.markdownlint.json']);

const UNRELEASED_SECTION = /(## \[Unreleased\]\((.*?)\)\n)([\s\S]*?)(?=(## \[\d+\.\d+\.\d+\]\(|$))/;

function isFragment(name) {
  return name.endsWith('.md') && !SKIP_FILES.has(name);
}

// Fragments in the order git added them since the last tag, newest first; untracked ones follow alphabetically.
async function fragmentFiles(cwd) {
  const tag = previousTag(cwd);
  let log = '';
  try {
    log = git(cwd, [
      'log',
      ...(tag ? [`${tag}..HEAD`] : []),
      '--diff-filter=A',
      '--format=',
      '--name-only',
      '--',
      `${UNRELEASED_DIR}/*.md`,
    ]);
  } catch {
    // Not a git checkout: every fragment counts as untracked.
  }

  const tracked = [
    ...new Set(
      log
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.startsWith(`${UNRELEASED_DIR}/`))
        .map((line) => path.basename(line))
        .filter(isFragment),
    ),
  ];

  let present;
  try {
    present = await readdir(path.join(cwd, UNRELEASED_DIR));
  } catch {
    return [];
  }

  const untracked = present.filter((name) => isFragment(name) && !tracked.includes(name)).sort();
  return [...tracked.filter((name) => present.includes(name)), ...untracked];
}

function topLevelBullets(content) {
  return (content.match(/^- .*/gm) || []).join('\n');
}

// `changelogTools.tagPrefix` in package.json, for repositories that tag `v1.2.3` rather than `1.2.3`.
async function tagPrefix(cwd) {
  try {
    const pkg = JSON.parse(await readFile(path.join(cwd, 'package.json'), 'utf8'));
    return pkg.changelogTools?.tagPrefix ?? '';
  } catch {
    return '';
  }
}

async function updateChangelog(cwd, newVersion, bullets) {
  const changelogPath = path.join(cwd, 'CHANGELOG.md');
  const content = await readFile(changelogPath, 'utf8');
  const match = content.match(UNRELEASED_SECTION);

  if (!match) {
    throw new Error('Could not find the [Unreleased] section in CHANGELOG.md.');
  }

  const [, unreleasedHeader, unreleasedLink] = match;
  const today = new Date().toISOString().slice(0, 10);

  // A previous release section leaves a blank line on the end of the [Unreleased] body, the end of
  // the file does not. Normalize both to one blank line so the new section starts on its own line.
  const unreleasedBody = match[3].trim();
  const unreleasedBlock = unreleasedBody ? `\n${unreleasedBody}\n\n` : '\n';

  const tag = `${await tagPrefix(cwd)}${newVersion}`;
  const tagLink = unreleasedLink.replace(/tree\/[^/]+$/, `releases/tag/${tag}`);
  const sectionHeader = `## [${newVersion}](${tagLink}) - ${today}`;
  const sectionContent = `${bullets || `- bump version to ${newVersion} only, no changes`}\n\n`;

  const updated = content.replace(
    UNRELEASED_SECTION,
    `${unreleasedHeader}${unreleasedBlock}${sectionHeader}\n\n${sectionContent}`,
  );
  // On a first release the new section ends the file, and its trailing blank line would end it too.
  await writeFile(changelogPath, updated.replace(/\n+$/, '\n'));
}

async function moveFragments(cwd, files, newVersion) {
  const targetDir = path.join(cwd, RELEASES_DIR, newVersion);
  await mkdir(targetDir, { recursive: true });

  for (const name of files) {
    await rename(path.join(cwd, UNRELEASED_DIR, name), path.join(targetDir, name));
  }
}

// Prints the released bullets, so a caller can put them into the release PR body.
export default async function release([newVersion], { cwd, stdout, stderr }) {
  if (!newVersion) {
    stderr('Usage: changelog-tools release <new_version>');
    return 1;
  }

  const files = await fragmentFiles(cwd);
  const contents = await Promise.all(files.map((name) => readFile(path.join(cwd, UNRELEASED_DIR, name), 'utf8')));
  const bullets = contents.map(topLevelBullets).filter(Boolean).join('\n');

  await updateChangelog(cwd, newVersion, bullets);
  await moveFragments(cwd, files, newVersion);

  stdout(bullets || `- bump version to ${newVersion} only, no changes`);
  return 0;
}
