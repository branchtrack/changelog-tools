import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after } from 'node:test';

const dirs = [];

after(() => dirs.forEach((dir) => rmSync(dir, { force: true, recursive: true })));

// A throwaway repository; `files` maps relative paths to contents.
export function makeRepo(files = {}, { git = true } = {}) {
  const cwd = mkdtempSync(path.join(tmpdir(), 'changelog-tools-'));
  dirs.push(cwd);

  if (git) {
    run(cwd, ['init', '--quiet', '--initial-branch=main']);
    run(cwd, ['config', 'user.email', 'test@example.com']);
    run(cwd, ['config', 'user.name', 'Test']);
    run(cwd, ['config', 'commit.gpgsign', 'false']);
    run(cwd, ['config', 'tag.gpgsign', 'false']);
  }

  write(cwd, files);
  return cwd;
}

export function write(cwd, files) {
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    writeFileSync(path.join(cwd, file), content);
  }
}

export function read(cwd, file) {
  return readFileSync(path.join(cwd, file), 'utf8');
}

export function run(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' });
}

export function commit(cwd, files, message = 'commit') {
  write(cwd, files);
  run(cwd, ['add', '--all']);
  run(cwd, ['commit', '--quiet', '--message', message]);
}

// The context a command receives, with its output captured line by line.
export function context(cwd, env = {}) {
  const out = [];
  const err = [];
  return {
    cwd,
    env,
    err,
    out,
    stderr: (text) => err.push(text),
    stdout: (text) => out.push(text),
  };
}
