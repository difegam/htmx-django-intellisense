---
name: release-prep
description: Prepare an extension release: version bump, changelog, docs, full verification.
disable-model-invocation: true
argument-hint: [major|minor|patch]
allowed-tools: Bash(git log *) Bash(git diff *) Bash(git tag *) Bash(just verify) Bash(npm audit) Bash(npx vsce ls *)
---

# Release Prep

Prepare a release per `docs/operations/release.md`. An explicit `$ARGUMENTS` bump overrides the table in step 2.

## Steps

1. **Baseline.** Use the latest tag (`git tag --sort=-v:refname | head -1`); if none, the last `chore: release` commit. Read `git log <base>..HEAD`, then the real diff of `src/`, `package.json` `contributes`, `snippets/`, `catalog.py` and `htmx.catalog.json`. Done when every changed path in those areas has been read as a diff, not a commit title.

1. **Bump.** State the reasoning. Done when the user has confirmed the version.

    | Change                                                     | Bump                               |
    | ---------------------------------------------------------- | ---------------------------------- |
    | Removed/renamed setting or command ID, dropped min VS Code | minor (major once at 1.0 or later) |
    | New feature, setting, snippet, or HTMX pin version         | minor                              |
    | Fix, docs-only, HTMX patch pin bump, internal              | patch                              |

1. **Version.** Edit `package.json` `version` only; `tools/pyproject.toml` is tooling and keeps its own version. Run `npm install --package-lock-only`. Done when the `package-lock.json` diff holds only the version lines (revert it if it churns).

1. **Changelog.** Read the existing `[Unreleased]` first and reuse its entries; add what is missing, as user-visible behavior only. Move them under `## [X.Y.Z] - <today>` (Added/Changed/Fixed/Removed). Done when `[Unreleased]` is empty and every entry sits under the new version.

1. **Docs.** Update the pages the changes touch: `docs/reference/settings.md`, `docs/reference/catalog-and-syntax.md`, `docs/explanation/compatibility.md`, README and install pages. Check every external API or behavior claim (VS Code API, HTMX attributes, Django, vsce/ovsx, zensical) with Context7: `resolve-library-id`, then `query-docs`. Produce `htmx.catalog.json`, `snippets/django-htmx.json` and `docs/reference/snippets.md` with `npm run build-data` and `npm run build-snippets`. If `package.json` `contributes` changed, mirror it in `tools/tests/test_extension_contract.py` and `src/test/suite/index.ts`. Done when every changed behavior maps to an updated page, or is recorded as needing none.

1. **Verify.** Run `just verify` and report failures verbatim. **REQUIRED SUB-SKILL:** superpowers:verification-before-completion. Then check what `just verify` misses:

    - **Package contents.** Every path in `npx vsce ls --tree` is something the extension loads at runtime; anything else gets an entry in `.vscodeignore`.
    - **Audit.** `npm audit` reports 0 findings. `ovsx` can keep a nested old `@vscode/vsce`: check `npm ls @vscode/vsce`, keep the `overrides` entry for `ovsx`, and re-resolve with `npm install -D ovsx@<version> --prefer-online`. Report any remainder to the user.
    - **Environment.** Report EBADENGINE warnings and network-only failures (`check-pins`, VS Code download) as environment findings, separate from repo results.

    Done when `just verify` and all three checks are green.

1. **Hand off.** Commit, tag, push and publish only when the user asks. Print the suggested message `chore: release X.Y.Z` and the tag and release commands from `docs/operations/release.md`; the tag version equals the `package.json` version, which the publish workflow checks. Done when those are printed.
