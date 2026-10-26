# changelog-tools

Changelog fragments, release notes and version bumps for [Keep a Changelog](https://keepachangelog.com/) repositories: a zero-dependency CLI, reusable GitHub workflows, and agent skills for writing fragments.

Every pull request adds a fragment, `.changelog/unreleased/<branch>.md`, holding one or more conventional-commit bullets. A release lifts each fragment's top-level bullets into `CHANGELOG.md` and moves the fragments to `.changelog/releases/<version>/`, so pull requests never conflict over the changelog.

## Install

```bash
pnpm add --save-dev --save-exact @branchtrack/changelog-tools
```

Pin an exact version: the reusable workflows read it from `package.json` and run that version through `npx`, without installing the repository's dependencies.

The repository needs a `VERSION` file holding the current version, and a `CHANGELOG.md` with an `[Unreleased]` section linking to the default branch:

```markdown
## [Unreleased](../../tree/main)
```

## CLI

| Command                                                  | Does                                                                                                                                                                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `changelog-tools validate <file>...`                     | Warns, as GitHub annotations, about a top-level bullet without a conventional type, a fragment with no top-level bullet, and an unsorted dependency list. Always exits 0.                         |
| `changelog-tools release <version>`                      | Adds a `<version>` section under `[Unreleased]` with every fragment's top-level bullets, newest first, moves the fragments to `.changelog/releases/<version>/`, and prints the bullets.           |
| `changelog-tools version [patch\|minor\|major\|<x.y.z>]` | Writes the new version to `VERSION` and `package.json`, and prints it.                                                                                                                            |
| `changelog-tools dependabot <branch> <title> [packages]` | Writes the fragment for a Dependabot pull request, from its metadata (`name (old → new)` entries joined by commas) or, failing that, its title. Reports `created` and `path` to `$GITHUB_OUTPUT`. |
| `changelog-tools notes <version>`                        | Prints a released section without blank lines or backticks, as an annotated tag message.                                                                                                          |

### Configuration

`version` bumps `package.json` on every release. To bump it only when the release touches what the package builds, list those paths in `package.json`:

```json
{
  "changelogTools": {
    "buildPaths": ["package.json", "pnpm-lock.yaml", "frontend"]
  }
}
```

## Reusable workflows

Fail a pull request that adds no fragment, and annotate the ones it adds. A draft, a `release/` branch and a pull request labelled `no-changelog` are skipped:

```yaml
on:
  pull_request:
    types: [labeled, opened, ready_for_review, reopened, synchronize, unlabeled]

jobs:
  changelog:
    uses: branchtrack/changelog-tools/.github/workflows/changelog.yml@v1
```

Write and commit the fragment for each Dependabot pull request:

```yaml
on:
  pull_request_target:
    branches: [main]
    types: [opened, reopened, synchronize]

jobs:
  changelog:
    uses: branchtrack/changelog-tools/.github/workflows/dependabot.yml@v1
    permissions:
      contents: write
      pull-requests: read
```

## Agent skills

`skills/` holds two [agent skills](https://agentskills.io): `changelog-fragment` for writing a fragment, and `dependency-fragment` for a dependency bump. Install them from the package with the [`skills`](https://www.npmjs.com/package/skills) CLI, which pins them in `skills-lock.json`:

```bash
pnpm skills add ./node_modules/@branchtrack/changelog-tools/skills/changelog-fragment
pnpm skills add ./node_modules/@branchtrack/changelog-tools/skills/dependency-fragment
```

## License

[MIT](LICENSE)
