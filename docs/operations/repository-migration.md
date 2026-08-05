# `htmx-django-intellisense` Repository Migration

This document describes how to move the complete project into the new
`htmx-django-intellisense` repository while giving the Python generator a clean boundary.

## Decision

Keep the VS Code extension at the repository root and move only the Python toolchain into
`tools/`.

- The root already follows the standard VS Code extension shape: `package.json`,
    `src/extension.ts`, `tsconfig.json`, `.vscode/`, and `.vscodeignore`.
- The extension is bundled with esbuild into `dist/extension.js`; `out/` remains test-only.
- The Python code is a **packaged application**, not a library. Its primary interface is the
    `htmx-tools` command, and packaging supplies that command entry point.
- Target Python 3.14 only for development and CI. Declare `requires-python = ">=3.14"` and pin
    `tools/.python-version` to `3.14`.
- Replace `ty` with Pyrefly. Do not retain both type checkers.

Do not add an `extension/` wrapper, a uv workspace, or an npm workspace. There is one Node
project and one Python project; another orchestration layer would only add path and packaging
work.

> **Caveat — extension identity change.** The extension is already published as
> `htmx-tags-django` (package `name`), giving the Marketplace/Open VSX identity
> `difegam.htmx-tags-django`. This migration renames it to `htmx-django-intellisense`, producing a
> **new** listing and orphaning the old one — installs, ratings, Q&A, and the listing URL do not
> transfer. Before switching, either publish a final `htmx-tags-django` release whose README points
> at the new listing, or deprecate the old entry. This migration unifies every identity under a
> single project name, `htmx-django-intellisense`: the Git repository, the Python distribution
> (currently `htmx-tags-tools`), the import package (`htmx_tools` → `htmx_django_intellisense`), and
> the extension `name` all adopt it. The `htmx-tools` CLI executable keeps its current name for
> compatibility, and the HTTP client is already `httpx2`, so those two are not changes this migration
> introduces.

## Target layout

```text
htmx-django-intellisense/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── docs.yml
│       └── publish.yml
├── .vscode/
│   ├── extensions.json
│   └── launch.json
├── docs/
├── examples/
├── images/
├── scripts/
├── snippets/
│   ├── django-htmx.source.json  # canonical, hand-edited input
│   └── django-htmx.json         # generated VS Code asset
├── src/                         # VS Code extension TypeScript
│   ├── extension.ts
│   └── test/
├── tools/
│   ├── src/
│   │   └── htmx_django_intellisense/     # packaged Python application
│   │       ├── __init__.py
│   │       ├── __main__.py
│   │       ├── catalog.py
│   │       ├── cli.py
│   │       ├── http.py
│   │       ├── models.py
│   │       ├── pins.py
│   │       └── snippets.py
│   ├── tests/
│   ├── .python-version
│   ├── pyproject.toml
│   ├── README.md                 # Python CLI package readme
│   └── uv.lock
├── .gitignore
├── .vscodeignore
├── AGENTS.md
├── CHANGELOG.md
├── LICENSE.txt
├── README.md
├── esbuild.js
├── eslint.config.mjs
├── htmx.catalog.json            # generated VS Code runtime asset
├── justfile
├── package-lock.json
├── package.json                 # VS Code manifest and Node project
├── .pre-commit-config.yaml      # repository-wide hooks
├── tsconfig.json
└── zensical.toml
```

Generated assets stay beside the extension because they are packaged into the VSIX. The Python
project owns their generation, but the extension owns their final paths.

## File moves

| Current path                                   | New path or action                                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `htmx_tools/`                                  | `tools/src/htmx_django_intellisense/`; update imports from `htmx_tools` to `htmx_django_intellisense` |
| `tests/*.py`                                   | `tools/tests/`                                                                                        |
| `tests/test_extension_manifest.py`             | `tools/tests/test_extension_contract.py`                                                              |
| `.python-version`                              | Regenerate as `tools/.python-version` with Python 3.14                                                |
| `pyproject.toml`                               | Regenerate as `tools/pyproject.toml`, then restore project metadata and tool settings                 |
| `uv.lock`                                      | Regenerate as `tools/uv.lock`                                                                         |
| `ruff.toml`                                    | Merge into `[tool.ruff]` tables in `tools/pyproject.toml`                                             |
| `ty.toml`                                      | Delete; replace with `[tool.pyrefly]` in `tools/pyproject.toml`                                       |
| `design-qa.md`                                 | Move to `docs/operations/design-qa.md` if it remains useful                                           |
| `demo-1.png`, `demo-2.png`                     | Do not transfer unless they are referenced again; the old `htmx-tags` repository preserves them       |
| Extension, docs, snippets, images, and scripts | Keep their current root-relative locations                                                            |

Keep both lockfiles committed. Do not transfer `node_modules/`, `.venv/`, `.cache/`, `out/`,
`dist/`, `site/`, `.vscode-test/`, or `*.vsix` files.

## Create the new repository from scratch

Start the new repository at commit 0 — a fresh `git init` whose first commit is the reorganized
project. Do **not** import the old commit history or tags. Create the empty GitHub repository, take
a copy of the current working tree **without** its `.git` directory (and without build artifacts,
`node_modules/`, and virtual environments), perform the `tools/` reorganization, then make the
initial commit:

```bash
# from a clean copy of the project files (no .git, no build artifacts / venvs)
git init
git branch -M main
git remote add origin https://github.com/difegam/htmx-django-intellisense.git
# reorganize into tools/, update imports and config as described below, then:
git add -A
git commit -m "Initial commit: htmx-django-intellisense"
git push -u origin main
```

Nothing carries over from the old repository: commit history, tags, issues, pull requests, Actions
run history, Pages settings, and repository secrets all start empty and must be recreated as needed.
The old `htmx-tags` repository remains the historical archive/reference. Leave it unarchived until
the new repository passes CI, builds documentation, and packages a working VSIX.

## Initialize the Python application

Run `uv init` from the repository root before moving the existing Python files. `--vcs none`
prevents a nested Git repository. `--app --package` is explicit so the command behaves correctly
with uv versions from before and after uv 0.12.

```bash
uv init --app --package --build-backend uv --python 3.14 \
    --name htmx-django-intellisense --vcs none tools
```

Move the existing Python modules into the generated `tools/src/htmx_django_intellisense/` package and
update their imports. Keep the existing executable name for compatibility:

```toml
[project]
name = "htmx-django-intellisense"
requires-python = ">=3.14"

[project.scripts]
htmx-tools = "htmx_django_intellisense.cli:app"
```

The `cli:app` target works because the cyclopts `App` is callable with no arguments and falls back
to `sys.argv`; cyclopts docs suggest a zero-argument `__main__:main` wrapper as an alternative, but
no change is required here.

Keep the `[build-system]` block generated by uv. This switches the build backend from the current
`hatchling` to `uv_build`: drop the old `[tool.hatch.build.targets.wheel] packages = ["htmx_tools"]`
configuration rather than carrying it over. `uv_build` auto-discovers `src/htmx_django_intellisense` from the
src layout, so no explicit package list is needed. This project is an application even though its
implementation is importable for tests; do not add `py.typed` or publish a library API.
Keep the generated `tools/README.md` as the package readme and document only the CLI commands and
their repository-root working-directory requirement there.

### Dependencies

Add fresh current versions instead of copying the old lower bounds. This replaces `ty` with
Pyrefly and regenerates `tools/uv.lock` for Python 3.14.

```bash
uv add --project tools packaging pydantic httpx2 cyclopts
uv add --project tools --dev prek pyrefly pytest ruff
uv add --project tools --group docs zensical
uv lock --project tools --upgrade
```

`httpx2` ([Pydantic's maintained continuation of httpx](https://httpx2.pydantic.dev/), import name
`httpx2`, currently `2.9.1`) is **already** the HTTP client — `http.py` does `import httpx2`. The
`uv add` line above simply re-adds it with a version floor; this is not a switch away from `httpx`,
and no import changes are required. Only the `htmx_tools` → `htmx_django_intellisense` package rename touches
imports.

Put the Python tool configuration in `tools/pyproject.toml` rather than creating separate Ruff,
Pytest, and Pyrefly files:

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-q"

[tool.ruff]
line-length = 100
indent-width = 4
target-version = "py314"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "PTH"]
fixable = ["ALL"]

[tool.ruff.format]
quote-style = "double"
indent-style = "space"

[tool.ruff.lint.per-file-ignores]
"src/htmx_django_intellisense/catalog.py" = ["E501"]

[tool.pyrefly]
project-includes = ["src", "tests"]
python-version = "3.14"
```

Pyrefly automatically recognizes the `src/` import root, so do not hard-code a virtual-environment
or site-packages path. Add `meta.pyrefly` to `.vscode/extensions.json`; keep the Python, Ruff,
ESLint, and Django extension recommendations.

### Repository-relative generator paths

The current snippet generator derives the repository root from `__file__`. That will be wrong after
moving into a `src/` layout. Keep the simpler repository-root command contract:

- Define default input and output paths relative to the current working directory.
- Run generator commands from the repository root.
- Keep `htmx.catalog.json`, `snippets/django-htmx.json`, and
    `docs/reference/snippets.md` as committed generated outputs.
- Keep `snippets/django-htmx.source.json` as the only hand-edited snippet source.

Do not add a repository-discovery helper or configuration file unless the CLI later needs to run
outside this repository.

## Update commands and CI

Because the Python project moves under `tools/`, select it explicitly while keeping the process
working directory at the repository root.

Use these command shapes in `package.json`, `justfile`, `AGENTS.md`, and workflows:

```bash
uv sync --project tools --frozen --all-groups
uv run --project tools ruff check tools
uv run --project tools ruff format --check tools
uv run --project tools pyrefly check --config tools/pyproject.toml
uv run --project tools pytest -c tools/pyproject.toml tools/tests
uv run --project tools htmx-tools build-data
uv run --project tools htmx-tools build-snippets
uv run --project tools htmx-tools check-pins
uv run --project tools --group docs zensical build --clean --strict
```

The current `package.json` scripts use `uv --cache-dir .cache/uv run htmx-tools …`. Rewrite
`build-data`, `build-snippets`, `check-snippets`, and the `test` script's `pytest` invocation to
`uv run --project tools …`. Decide whether to keep the `.cache/uv` cache dir; if kept, place the
`--cache-dir` flag before `run` (`uv --cache-dir .cache/uv run --project tools …`).

Update `prek.toml` hook commands to match the moved project: point the Ruff hooks at
`tools/pyproject.toml` (or drop `--config=./ruff.toml` and let Ruff auto-discover the merged
`[tool.ruff]` tables), and add `--project tools` to the local `uv run pytest` hook.

Update `.github/workflows/ci.yml` and `.github/workflows/docs.yml` as follows:

- Bump the pinned actions to current majors: `actions/checkout@v7`, `actions/setup-node@v7`,
    `actions/setup-python@v5`, and `astral-sh/setup-uv@v9`. The existing `ci.yml` uses
    `astral-sh/setup-uv@v4` and `docs.yml` hard-pins uv `0.11.7`; both must move to the 3.14 target
    and the `tools/` layout. Note that `setup-uv` (≥ v8) no longer publishes floating major/minor
    tags — pin a full version (`astral-sh/setup-uv@v9.0.0`) or, preferably, a commit SHA.
- Set up Python 3.14.
- Use `tools/uv.lock` as the uv cache dependency file.
- Sync the `tools` project with `--frozen --all-groups`.
- Run Ruff, Pyrefly, and Pytest before regenerating artifacts.
- Regenerate all three committed outputs and fail on drift:

```bash
git diff --exit-code -- \
    htmx.catalog.json \
    snippets/django-htmx.json \
    docs/reference/snippets.md
```

- Continue running TypeScript linting, type checking, unit tests, Extension Host tests, and VSIX
    packaging from the repository root.
- Keep the HTMX pin check authenticated with `GITHUB_TOKEN`.

Update `.vscodeignore` to exclude `tools/**` from the VSIX and **remove stale entries**: the
current file still lists `build-data.py` and `build-snippets.py` (which no longer exist — that logic
moved into the Python package) plus the now-relocated `htmx_tools/**`, `pyproject.toml`, `uv.lock`,
`ruff.toml`, and `ty.toml`. Confirm the excluded set matches the post-migration paths. Keep
`dist/extension.js`, `htmx.catalog.json`, `snippets/django-htmx.json`, README, license, and
Marketplace images included.

## Upgrade Node dependencies

Upgrade compatible Node dependency versions and regenerate `package-lock.json`:

```bash
npm update
npm outdated
```

Review major upgrades individually rather than applying every `latest` tag at once:

- Keep `@types/vscode` aligned with the minimum `engines.vscode` version. Do not compile against a
    newer VS Code API unless the manifest minimum is raised deliberately.
- Keep the Extension Host test version aligned with that minimum VS Code version.
- Upgrade TypeScript and `@typescript-eslint/*` together only when their supported-version ranges
    overlap.
- Accept a major `@vscode/test-electron` upgrade only after the pinned Extension Host test passes.

Commit `package.json` and `package-lock.json` together after the full verification sequence below.

## Naming conventions

- Project name — Git repository, Python distribution, and VS Code extension `name`:
    `htmx-django-intellisense`.
- VS Code extension Marketplace identity: `difegam.htmx-django-intellisense`.
- Python import package: `htmx_django_intellisense`.
- Existing CLI command (unchanged for compatibility): `htmx-tools`.
- Python modules and tests: `snake_case.py` and `test_*.py`.
- TypeScript modules: retain the existing `camelCase.ts` convention and `*.test.ts` suffix.
- Canonical data inputs: `*.source.json`; generated runtime files omit `.source`.
- Generated files must start with a generated-file comment when their format permits comments.
- Use lowercase directory names and standard tool filenames; do not invent wrapper directories.

## Update repository metadata

Replace old repository URLs in `package.json`, `README.md`, `zensical.toml`, documentation, release
instructions, and badges. Keep the `publisher` field as `difegam` and set the extension `name` to
`htmx-django-intellisense`, giving a Marketplace identity of `difegam.htmx-django-intellisense`. See
the [extension identity caveat](#decision) above before renaming — this orphans the existing
`difegam.htmx-tags-django` listing.

The extension `version` (currently `0.2.0`) and Python distribution `version` (currently `0.1.1`) are
out of sync. Pick a single deliberate version for the first published build; the extension `version`
is what `vsce publish` ships. The extension is licensed **Apache-2.0** (`LICENSE.txt`); keep that
consistent wherever license text is referenced.

Rewrite `AGENTS.md` around the new boundary:

- VS Code extension and runtime assets live at the root.
- Python generation code and tests live under `tools/`.
- Generator commands run from the root with `uv run --project tools`.
- Python 3.14, Pyrefly, both lockfiles, generated-file drift, and VSIX exclusions are required checks.

## Publish via GitHub Actions to the Visual Studio Marketplace and Open VSX Registry

Follow the official [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
guide for the VS Marketplace and the [Open VSX wiki](https://github.com/eclipse-openvsx/openvsx/wiki/Publishing-Extensions)
for Open VSX; the flow below is the GitHub Actions shape for this repository.

Publish with **Microsoft Entra workload identity federation** (`vsce publish --azure-credential`,
vsce ≥ 2.26.1) as the primary path. Personal Access Tokens are being retired: new **global** Azure
DevOps PATs have been blocked since 2026-03-15, and **all** global PATs are decommissioned on
2026-12-01. Do not build the workflow around a PAT.

### One-time account and Entra setup

1. Create an Azure DevOps organization if you do not have one, and sign in with the Microsoft account
    you want associated with publishing.
1. Create a publisher at the [Visual Studio Marketplace publisher management page](https://marketplace.visualstudio.com/manage):
    - **ID**: `difegam` — the immutable identifier used in extension URLs. It cannot be changed once
        created, and must match the `publisher` field in `package.json`.
    - **Name**: the display name shown in Marketplace listings.
1. Set up [secure automated publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#secure-automated-publishing-to-visual-studio-marketplace)
    with Microsoft Entra ID:
    - Create a user-assigned managed identity (or Entra app registration) in Azure and record its
        **Client ID** and **Tenant ID**.
    - Add a **federated credential** trusting this GitHub repository's Actions OIDC (subject scoped
        to the release environment/branch).
    - In the Marketplace publisher management page, add the identity's resource ID as a member with
        the **Contributor** role.
1. Verify locally with `npx vsce login difegam` (or `--azure-credential` in a signed-in session) and
    confirm the extension identity is `difegam.htmx-django-intellisense`.

> **PAT fallback (until 2026-12-01).** If you must use a PAT temporarily, create a
> **single-organization** PAT (not "All accessible organizations", which is a global PAT and can no
> longer be created) with **Custom defined → Marketplace → Manage** scope, store it as the `VSCE_PAT`
> secret, and publish with `npx vsce publish -p $VSCE_PAT`. Migrate to `--azure-credential` before
> the cutoff.

### One-time Open VSX setup

1. Create an [Eclipse account](https://accounts.eclipse.org/user/register), filling in the same
    GitHub username you use to log in to open-vsx.org.
1. Log in to [open-vsx.org](https://open-vsx.org) with GitHub, link the Eclipse account on the
    Profile page, and sign the Eclipse Foundation Publisher Agreement.
1. Generate an access token on the [Access Tokens](https://open-vsx.org/user-settings/tokens) page —
    one per environment, and the value is shown only once.
1. Create the namespace once; it must match the `publisher` field:
    `npx ovsx create-namespace difegam -p <token>`.
1. Store the token as a GitHub secret named `OVSX_PAT`.

The same `.vsix` publishes to both registries; the Open VSX listing appears at
`open-vsx.org/extension/difegam/htmx-django-intellisense`.

### Store secrets and variables in GitHub

With Entra workload identity federation there is **no Marketplace secret to store** — the workflow
authenticates via OIDC. Add the managed identity's **Client ID** and **Tenant ID** as repository
variables (or secrets), and store the Open VSX token as the `OVSX_PAT` secret under **Settings →
Secrets and variables → Actions**. Only add `VSCE_PAT` if you are using the temporary PAT fallback.
Never commit any token.

### `publish.yml`

Triggered on GitHub release creation (`on: release: types: [created]`), so the tag and release notes
already exist before publishing. The job mirrors the validation sequence in the
[Verification and archive checklist](#verification-and-archive-checklist), then publishes:

```yaml
name: Publish Extension

on:
  release:
    types: [created]

permissions:
  contents: read
  id-token: write   # required for Entra workload identity federation

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v7

      - name: Setup Node.js
        uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.14'

      - name: Setup uv
        uses: astral-sh/setup-uv@v9.0.0       # pin a full version or SHA; no floating @v9 tag

      - name: Azure login (Entra workload identity federation)
        uses: azure/login@v2
        with:
          client-id: ${{ vars.AZURE_CLIENT_ID }}
          tenant-id: ${{ vars.AZURE_TENANT_ID }}
          allow-no-subscriptions: true

      - name: Install Node dependencies
        run: npm ci

      - name: Install Python dependencies
        run: uv sync --project tools --frozen --all-groups

      - name: Lint and type-check
        run: |
          npm run lint
          npm run check-types
          uv run --project tools ruff check tools
          uv run --project tools ruff format --check tools

      - name: Test
        run: |
          uv run --project tools pytest -c tools/pyproject.toml tools/tests
          npm run test:unit

      - name: Verify generated artifacts are current
        run: |
          npm run build-data
          npm run build-snippets
          git diff --exit-code -- \
              htmx.catalog.json \
              snippets/django-htmx.json \
              docs/reference/snippets.md

      - name: Publish to Marketplace
        run: npx vsce publish --azure-credential

      - name: Package VSIX
        run: npm run package

      - name: Publish to Open VSX
        run: npx ovsx publish htmx-django-intellisense-*.vsix -p ${{ 
          secrets.OVSX_PAT }}
```

`vsce publish --azure-credential` authenticates via the Entra identity federated above; there is no
`VSCE_PAT` to rotate. (If you fall back to a PAT, use `npx vsce publish -p ${{ secrets.VSCE_PAT }}`
instead and remove the `azure/login` step and `id-token: write` permission.) `vsce publish` in a git
repository normally auto-increments the version and creates a version commit and tag; on the release
trigger the tag already exists, so it publishes the current `package.json` version. The same VSIX is
then published to Open VSX. Update the version and create the GitHub release as part of the normal
[release process](release.md), which should defer its manual `npx vsce publish` step to this
workflow. Manual `npx vsce publish --azure-credential` remains the rollback and fallback path. The maintained [HaaLeo/publish-vscode-extension](https://github.com/HaaLeo/publish-vscode-extension)
action is an alternative that publishes to both registries in a single step.

## Verification and archive checklist

Run from the repository root:

```bash
npm ci
uv sync --project tools --frozen --all-groups
npm run lint
npm run check-types
uv run --project tools ruff check tools
uv run --project tools ruff format --check tools
uv run --project tools pyrefly check --config tools/pyproject.toml
uv run --project tools pytest -c tools/pyproject.toml tools/tests
npm run build-data
npm run build-snippets
git diff --exit-code -- htmx.catalog.json snippets/django-htmx.json docs/reference/snippets.md
npm run test:unit
npm run test:extension
uv run --project tools --group docs zensical build --clean --strict
npm run package
npx vsce ls --tree
uv build --project tools
```

Confirm that the VSIX contains the bundled extension and runtime JSON assets but no `tools/`,
Python environment, tests, source maps, or Node development dependencies.

Archive the old repository only after:

1. the new default branch is pushed;
1. CI and documentation deployment pass in the new repository;
1. a VSIX built from the new repository passes the smoke test;
1. Marketplace and documentation links point to the new repository; and
1. the old README links readers to `difegam/htmx-django-intellisense`.

## References

- [uv: Creating projects](https://docs.astral.sh/uv/concepts/projects/init/)
- [VS Code: Extension anatomy](https://code.visualstudio.com/api/get-started/extension-anatomy)
- [VS Code: Bundling extensions](https://code.visualstudio.com/api/working-with-extensions/bundling-extension)
- [VS Code: Testing extensions](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Pyrefly: Installation and CI](https://pyrefly.org/en/docs/installation/)
- [Pyrefly: Configuration](https://pyrefly.org/en/docs/configuration/)
- [Pyrefly: IDE installation](https://pyrefly.org/en/docs/IDE/)
