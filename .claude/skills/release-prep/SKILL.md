---
name: release-prep
description: Use when preparing a new release of the extension: reviewing changes since the last release, choosing a version bump, updating the changelog and docs, and running full verification.
disable-model-invocation: true
argument-hint: [major|minor|patch]
allowed-tools: Bash(git log *) Bash(git diff *) Bash(git tag *) Bash(just verify)
---

# Release Prep

Prepare a release per `docs/operations/release.md`. An explicit `$ARGUMENTS` bump overrides the table in step 2.

## Steps

1. **Baseline.** Use the latest tag (`git tag --sort=-v:refname | head -1`); if none, the last `chore: release` commit. Read `git log <base>..HEAD` and the real diff of `src/`, `package.json` `contributes`, `snippets/`, `catalog.py` and `htmx.catalog.json`.

1. **Bump.** State the reasoning and confirm the version with the user before editing.

    | Change                                                     | Bump                               |
    | ---------------------------------------------------------- | ---------------------------------- |
    | Removed/renamed setting or command ID, dropped min VS Code | minor (major once at 1.0 or later) |
    | New feature, setting, snippet, or HTMX pin version         | minor                              |
    | Fix, docs-only, HTMX patch pin bump, internal              | patch                              |

1. **Version.** Edit `package.json` `version` only; `tools/pyproject.toml` is tooling and stays. Run `npm install --package-lock-only`, then confirm the `package-lock.json` diff is only the version lines; revert it if it churns.

1. **Changelog.** Move `[Unreleased]` entries under `## [X.Y.Z] - <today>` (Added/Changed/Fixed/Removed) and leave an empty `[Unreleased]`. Record user-visible behavior only.

1. **Docs.** Update the pages the changes touch: `docs/reference/settings.md`, `docs/reference/catalog-and-syntax.md`, `docs/explanation/compatibility.md`, README and install pages. Check every external API or behavior claim (VS Code API, HTMX attributes, Django, vsce/ovsx, zensical) with Context7: `resolve-library-id`, then `query-docs`. Regenerate generated files with `npm run build-data` and `npm run build-snippets`; never hand-edit `htmx.catalog.json`, `snippets/django-htmx.json` or `docs/reference/snippets.md`. If `package.json` `contributes` changed, mirror it in `tools/tests/test_extension_contract.py` and `src/test/suite/index.ts`.

1. **Verify.** Run `just verify` and report failures verbatim. **REQUIRED SUB-SKILL:** superpowers:verification-before-completion.

1. **Hand off.** Do not commit, tag, push, or publish unless asked. Print the suggested message `chore: release X.Y.Z` and the tag and release commands from `docs/operations/release.md`.

## Common mistakes

- Bumping `tools/pyproject.toml`.
- Hand-editing generated files instead of regenerating.
- Tag not matching `package.json` (the publish workflow rejects it).
