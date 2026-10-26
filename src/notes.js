import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Prints a released section without its heading, blank lines or backticks: the shape of an
// annotated tag message.
export default async function notes([version], { cwd, stdout, stderr }) {
  if (!version) {
    stderr('Usage: changelog-tools notes <version>');
    return 1;
  }

  const lines = (await readFile(path.join(cwd, 'CHANGELOG.md'), 'utf8')).split('\n');
  const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));

  if (start === -1) {
    stderr(`Error: CHANGELOG.md has no ${version} section.`);
    return 1;
  }

  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  const section = lines
    .slice(start + 1, end === -1 ? undefined : end)
    .filter((line) => line.trim())
    .map((line) => line.replaceAll('`', ''));

  stdout(section.join('\n'));
  return 0;
}
