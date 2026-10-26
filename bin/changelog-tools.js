#!/usr/bin/env node

import { readFileSync } from 'node:fs';

import dependabot from '../src/dependabot.js';
import notes from '../src/notes.js';
import release from '../src/release.js';
import validate from '../src/validate.js';
import version from '../src/version.js';

const COMMANDS = { dependabot, notes, release, validate, version };

const USAGE = `Usage: changelog-tools <command> [args]

Commands:
  validate <file>...                      warn about fragments that break the format
  release <version>                       fold the unreleased fragments into CHANGELOG.md
  version [patch|minor|major|<x.y.z>]     bump VERSION, and package.json when it is due
  dependabot <branch> <title> [packages]  write the fragment for a Dependabot pull request
  notes <version>                         print a released section of CHANGELOG.md`;

const [name, ...args] = process.argv.slice(2);

if (name === '--version' || name === '-v') {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  console.log(pkg.version);
  process.exit(0);
}

const command = COMMANDS[name];

if (!command) {
  console.error(USAGE);
  process.exit(name === '--help' || name === '-h' ? 0 : 1);
}

const context = {
  cwd: process.cwd(),
  env: process.env,
  stdout: (text) => console.log(text),
  stderr: (text) => console.error(text),
};

try {
  process.exitCode = (await command(args, context)) ?? 0;
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
}
