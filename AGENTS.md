# AGENTS.md

Two toolchains in one repo: a TypeScript VS Code extension (`src/`) and its runtime assets live at the repository root, while the Python generator (`tools/src/htmx_django_intellisense/`) lives under `tools/` and is used only to produce the offline HTMX catalog and snippets the extension consumes.

## Commands

Run from repo root. `just` recipes wrap the same commands.

- Install: `just init` — runs `npm install`, `uv sync --project tools --frozen --all-groups`, and installs the prek git hooks (`prek install --hook-type pre-commit --hook-type pre-push`). Run this after cloning: a checkout without the hooks installed has **no** local safety net, so lint/type/test regressions only surface in CI. (Manual equivalent: `npm install` then `uv sync --project tools --frozen --all-groups`.)
- Lint TS: `npm run lint` (eslint) · `npm run check-types` (tsc --noEmit)
- Format TS/JS/JSON: `npm run format` (prettier --write) · `npm run format:check` (CI gate). Prettier owns formatting; ESLint owns correctness. Markdown is formatted by mdformat and Python by ruff (see `.prettierignore`).
- Dead code: `npm run knip` (unused files/exports/deps; config in `knip.json`)
- Lint Python: `uv run --project tools ruff check tools` · `uv run --project tools ruff format --check tools`
- Type-check Python: `uv run --project tools pyrefly check --config tools/pyproject.toml`
- Full test: `npm test` (runs `npm run test:unit`, `check-snippets`, and `uv run --project tools pytest -c tools/pyproject.toml tools/tests`)
- TS unit only: `npm run test:unit` (compiles first, then `node --test out/test/*.test.js`)
- TS unit + coverage: `npm run test:coverage` (adds `--experimental-test-coverage`; CI reports this, no threshold gate yet)
- Python only: `uv run --project tools pytest -c tools/pyproject.toml tools/tests`
- Single Python test: `uv run --project tools pytest -c tools/pyproject.toml tools/tests/test_build_data.py::test_name -q`
- Extension-host tests: `npm run test:extension` — downloads VS Code (`VSCODE_TEST_VERSION`, default `1.90.2`), installs `batisteo.vscode-django`, runs `src/test/suite/index.ts`. On Linux CI uses `xvfb-run -a`; locally on macOS no wrapper needed. CI runs this as a matrix over the `1.90.2` minimum and `stable`.
- Packaged-VSIX smoke test: `npm run test:smoke` — compiles, packages, installs the `.vsix` into a throwaway profile, and asserts activation + one completion via `src/test/smoke/index.ts`. Override the download with `VSCODE_TEST_VERSION=1.90.2` to reuse the cached build.
- Compile (no test): `npm run compile`
- Package VSIX: `npm run package`

## Catalog regeneration (the non-obvious trap)

`htmx.catalog.json` is committed and is the extension's offline data source — it is NOT generated at runtime. Pinned upstream HTMX versions: `2.0.10` and `4.0.0-beta6` (constants in `tools/src/htmx_django_intellisense/catalog.py`).

Regenerate with `npm run build-data` (= `uv run --project tools htmx-tools build-data`). CI fails if `git diff --exit-code -- htmx.catalog.json` shows drift, so after changing `tools/src/htmx_django_intellisense/catalog.py` or its inputs, regenerate AND commit the catalog together.

CI also runs `uv run --project tools htmx-tools check-pins` (or `just check-pins`) to fail when the pinned tags drift from the latest `bigskysoftware/htmx` git tags. Fix a pin-staleness failure by bumping `DEFAULT_HTMX_V*_VERSION` in `tools/src/htmx_django_intellisense/catalog.py`, regenerating the catalog, and committing both together — the check queries the public GitHub `/tags` endpoint, so unauthenticated rate limits apply.

## CI order (match this locally before pushing)

`npm run lint` → `npm run format:check` → `npm run check-types` → `npm run knip` → `uv run --project tools ruff check tools` + `uv run --project tools ruff format --check tools` → `uv run --project tools pyrefly check --config tools/pyproject.toml` → `uv run --project tools pytest -c tools/pyproject.toml tools/tests` → `npm run test:coverage` → `npm run build-data` (then verify catalog diff is clean) → `npm run build-snippets` (then verify `snippets/django-htmx.json` and `docs/reference/snippets.md` diffs are clean) → `uv run --project tools --group docs zensical build --clean --strict` → `uv run --project tools htmx-tools check-pins` → `npm run package` → `npx vsce ls --tree` → `uv build --project tools`. Separate CI jobs run the extension-host tests (`npm run test:extension`, matrix over VS Code `1.90.2`/`stable`) and the packaged-VSIX smoke test (`npm run test:smoke`).

## Match CI locally

Before pushing, run the full CI checklist — this is the definition of done, not optional:

```bash
just verify
```

This assumes dependencies are already installed (`just init`). It runs linting, type-checking, Python checks, all tests, artifact drift checks, extension-host tests, docs build, VSIX packaging, and the Python package build.

- **Never rely on TS tests alone.** `npm test` (and `just verify`) also run the Python contract tests in `tools/tests/`, which assert the extension manifest. Skipping them is how manifest/test drift reaches CI.
- **package.json ↔ tests are coupled.** Any change to `package.json` `contributes` (settings keys, command IDs) must be mirrored in `tools/tests/test_extension_contract.py` and `src/test/suite/index.ts`; run `npm test` after such a change.
- The prek hooks enforce a subset automatically once installed: pre-commit runs Ruff, mdformat, Prettier, Pyrefly, ESLint, and pytest; pre-push adds `check-types`, `test:unit`, and `knip`. They do **not** replace `just verify` (which also covers extension-host, smoke, docs, and packaging).

## Layout & boundaries

- `src/` — TypeScript extension source; wired entry is `src/extension.ts` (`package.json` `main` -> `dist/extension.js` after bundle). Do not edit `out/` or `dist/` — they are compiled/bundled.
- `src/test/*.test.ts` are unit tests run by `node --test`; `src/test/suite/index.ts` is the extension-host suite; `src/test/runTest.ts` bootstraps VS Code + a throwaway workspace.
- `tools/src/htmx_django_intellisense/`, `tools/tests/` — Python dev tooling only. Python is excluded from the VSIX via `.vscodeignore`; never add runtime Python deps to the extension.
- `snippets/django-htmx.json` — packaged snippets, contributed via `package.json` `contributes.snippets`. The only hand-edited source is `snippets/django-htmx.source.json`.
- `docs/` → built to `site/` via `zensical` (`just docs`, `just docs-build`, `just docs-strict`). Docs deploy on push to `main` via `.github/workflows/docs.yml`.
- `images/` — Marketplace/demo assets.

## Python env notes

- Python 3.14 (`tools/.python-version`), managed by `uv`.
- `tools/pyproject.toml` hosts Ruff, Pytest, and Pyrefly configuration; no separate `ruff.toml` or `ty.toml`.
- `tools/src/htmx_django_intellisense/catalog.py` is exempt from E501 in Ruff (`per-file-ignores`).
