---
name: changelog-fragment
description: "Guidelines for writing a changelog fragment for a PR (features, fixes, refactors — anything that isn't a plain dependency bump). Use when: adding the required .changelog/unreleased/ fragment for a branch, or restructuring an existing one. Covers file naming, valid conventional types, and the one-headline-per-idea rule (fold in-service fixes/refactors into sub-bullets; merge same-topic headlines under the higher-priority type). Trigger words: changelog fragment, changelog entry, unreleased fragment, add a changelog, write a fragment."
---

# Changelog Fragment

Guidance for the per-PR fragment. For dependency bumps use the `dependency-fragment` skill
instead; this covers everything else (feat / fix / refactor / …). The repository's `AGENTS.md`
may add its own rules on top — wording checks, for one — so read it too.

---

## Goal

Every PR adds one file under `.changelog/unreleased/` describing what the PR changes, so a
release can aggregate the fragments into `CHANGELOG.md`. **At release, only the _top-level_
bullets are lifted into `CHANGELOG.md` — sub-bullets are dropped** (the full fragment is kept
under `.changelog/releases/<version>/`). That single fact drives every rule below.

---

## File

- Path: `.changelog/unreleased/<branch-name>.md`, where `<branch-name>` is the branch with its
  `/` flattened to `-` — branch `feat/my-feature` → `feat-my-feature.md`.
- One fragment per PR. To skip the check entirely, add the `no-changelog` label on the PR.

---

## Format

Every fragment has **at least one top-level bullet** (a line starting with `- `, no indent)
whose text starts with a conventional type and `: `:

```markdown
- feat: add support for bulk classroom archival
```

Valid types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`,
`style`, `test`. A scope is allowed (`feat(api): …`). Sub-bullets are indented two spaces and
need no type prefix — they are free detail.

---

## The one rule that matters: one headline per idea

A top-level bullet is a promise that the line stands on its own as a distinct,
release-worthy change. Since sub-bullets are dropped at release, **push specifics down and
keep each headline about the outcome.** Concretely:

1. **A fix/refactor done in service of a feature is not its own headline.** When one piece of
   work delivers a feature and in passing fixes or refactors sibling parts, that is _one_
   change: one top-level headline, with the incidental fixes/refactors nested under it.

2. **Merge same-topic headlines under the higher-priority type.** When two candidate headlines
   are really about the same thing, combine them under the higher-priority type — `feat` over
   `fix` over `perf` over `refactor` over everything else. The absorbed items become
   sub-bullets, and the surviving headline leads with the promoting change.

3. **Multiple top-level headlines are fine — but only for genuinely independent changes** that
   happened to ship together, not one change described from several angles. A large PR that
   spans two real areas may keep one headline per area. When in doubt, prefer fewer headlines.

### Before → after

```markdown
- feat: let an instructor archive a whole classroom at once
- feat: run the archival in a background job so the request returns immediately
- fix: skip already-archived projects while archiving
```

becomes

```markdown
- feat: let an instructor archive a whole classroom at once
  - run the archival in a background job so the request returns immediately
  - skip already-archived projects while archiving
```

---

## Writing style

- Write for a human reading release notes: say the outcome and, where it isn't obvious, the
  _why_. Follow the same voice as the repository's pull request descriptions.
- Unlike PR prose, a fragment **may** name code identifiers in backticks (a class, a job, a
  config key) — the changelog audience is technical. Keep it readable, not a diff summary.
- One idea per bullet; if a bullet joins several changes with `—` / `;`, that is a sign the
  extras want to be sub-bullets.

---

## Validate

```bash
pnpm exec changelog-tools validate .changelog/unreleased/<file>.md
pnpm prettier --check ".changelog/unreleased/<file>.md"
```

Repositories usually alias the first as `pnpm changelog:validate`. The validator only **warns**
(it always exits 0) — it flags a top-level bullet with no valid type prefix, a file with no
top-level bullet at all, or a dependency list under a `chore: update …` headline that is out of
order. It does _not_ judge consolidation; the one-headline-per-idea rule is on you. The hard "a
fragment must exist" gate lives in the CI `changelog` workflow, not this command. Fix any
Prettier issue with `--write`.

---

## Checklist

- File named for the branch, under `.changelog/unreleased/`.
- At least one top-level bullet, each starting with a valid conventional type.
- One headline per idea: in-service fixes/refactors folded into sub-bullets; same-topic
  headlines merged under the higher-priority type.
- Multiple top-level headlines only for genuinely independent changes.
- Validator warns nothing; the repository's own checks pass; Prettier clean.
- Dependency-only bump? Use the `dependency-fragment` skill instead.
