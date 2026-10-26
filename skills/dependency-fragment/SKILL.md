---
name: dependency-fragment
description: "Guidelines for creating changelog fragments for dependency updates. Use when: updating Ruby gems in Gemfile.lock, npm packages in pnpm-lock.yaml (including a bump of pnpm itself), or mixed dependency bumps. Enforces exact title/bullet format, byte-order sorting, and a separate one-line shape when exactly one package changed. Trigger words: dependency fragment, gem updates fragment, npm updates fragment, pnpm updates fragment, single package bump, changelog dependencies."
---

# Dependency Update Fragment

---

## Goal

Create a changelog fragment under `.changelog/unreleased/` that lists dependency updates in a
consistent, scannable format — the same format `changelog-tools dependabot` writes for
Dependabot pull requests, so hand-written and automated fragments read the same in the released
changelog.

---

## Which packages to list

Build the list from **two sources** per ecosystem:

1. **The manifest diff** — every direct dependency whose version changed: `Gemfile` /
   `Gemfile.lock` for gems, `package.json` for npm. This is the primary source; use its
   old → new versions (drop any `^`/`~` range prefix).

2. **MAJOR bumps in the lockfile** — a transitive (indirect) dependency that crossed a major
   version only shows up in `Gemfile.lock` / `pnpm-lock.yaml`. Add any package whose **major**
   version changed (e.g. `4.x → 5.x`). Ignore lockfile-only minor/patch churn.

Merge both into one sorted list: a package appearing in both is listed once, and transitive
majors sit in that list like any other entry — no separate group header.

---

## Required Format

The shape depends on how many packages changed.

### Several packages

Use one top-level title per ecosystem — `- chore: update gems` or
`- chore: update npm dependencies` — and one sub-bullet per package under it. A package with no
previous version in the diff lists only its new version:

```markdown
- chore: update npm dependencies
  - <package-name> (<old-version> → <new-version>)
  - <package-name> (<new-version>)
```

### A single package

When the bump touches exactly one package, the fragment is **one top-level line** naming that
package — no title bullet, no sub-bullets:

```markdown
- chore: update <package-name> (<old-version> → <new-version>)
```

Only top-level bullets survive into the released changelog, so a generic title plus a lone
sub-bullet would ship as `update npm dependencies` and drop the one fact worth keeping — which
package moved.

---

## Sorting Rules

- Sort the entries under each title by package name, in byte order (`LC_ALL=C sort`), as
  `changelog-tools dependabot` and `changelog-tools validate` do. `@` sorts before letters, so every scoped npm package comes first (`@tanstack/react-query` precedes `dotenv`),
  and `_` sorts after `-`, digits and uppercase letters but before lowercase ones
  (`action_text-trix` precedes `actioncable`).
- If both ecosystems are present in one fragment, keep gems under `- chore: update gems` and npm
  packages under `- chore: update npm dependencies`, and sort each list independently.

---

## Examples

Gems:

```markdown
- chore: update gems
  - faraday (2.14.2 → 2.14.3)
  - nokogiri (1.19.3 → 1.19.4)
  - zeitwerk (2.7.5 → 2.8.2)
```

npm dependencies:

```markdown
- chore: update npm dependencies
  - @tanstack/react-query (5.90.0 → 5.91.0)
  - eslint (10.7.0 → 10.8.0)
  - typescript (5.9.0 → 6.0.3)
```

A single package:

```markdown
- chore: update pnpm (11.13.1 → 11.22.0)
```

---

## Checklist

- Every direct dependency from the manifest diff, plus any transitive package with a MAJOR bump in the lockfile diff.
- Several packages: the ecosystem's title (`gems` or `npm dependencies`), one sub-bullet each.
- Exactly one package: a single top-level line naming it, with no title bullet and no sub-bullets.
- Versions in parentheses: `name (old → new)`, or `name (version)` when there is no old one.
- Entries in byte order; `changelog-tools validate` warns about any that are not.
- No extra prose in dependency lists.
