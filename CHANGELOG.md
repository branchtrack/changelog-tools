# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](../../tree/main)

_Incoming fragments: see [.changelog/unreleased/](.changelog/unreleased/)_

## [1.1.0](../../releases/tag/v1.1.0) - 2026-10-26

- build: release the package with release-it, tagged `v<version>` with the major tag `v1` moved along
- feat: link a release section to a prefixed tag with `changelogTools.tagPrefix` in `package.json`
- fix: end `CHANGELOG.md` with a single newline after a first release, instead of a trailing blank line

## [1.0.0](../../releases/tag/v1.0.0) - 2026-10-26

- feat: move the changelog and release scripts shared by `branchtrack` and `branchtrack-frontend` into one CLI, with reusable workflows and agent skills
