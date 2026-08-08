# Changelog

All notable changes to the HTMX Django IntelliSense extension are documented here.
The project follows [Keep a Changelog](https://keepachangelog.com/) conventions and adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Prettier for TypeScript/JavaScript/JSON formatting (`npm run format` / `format:check`), a pre-commit hook, and a CI `format:check` gate.
- Knip dead-code analysis (`npm run knip`, config in `knip.json`) wired into CI and `just verify`.
- Unit-test coverage reporting via Node's built-in runner (`npm run test:coverage`, `--experimental-test-coverage`).
- Type-aware ESLint rules (`no-floating-promises`, `no-misused-promises`, `await-thenable`, `switch-exhaustiveness-check`).
- Stricter TypeScript compiler options (`noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `useUnknownInCatchVariables`).
- Packaged-VSIX smoke test (`npm run test:smoke`) that installs the built `.vsix` into a clean profile and asserts activation.
- Extension-host CI matrix over the `1.90.2` minimum and `stable` VS Code (`VSCODE_TEST_VERSION`).
- GitHub-native security automation: Dependabot, CodeQL, and Dependency Review workflows.
- HTMX pin staleness guard in CI (`uv run --project tools htmx-tools check-pins`) that fails when the pinned upstream tags drift from the latest `bigskysoftware/htmx` git tags.
- `extensionKind: ["workspace"]` so the extension can access workspace files under SSH/remote/Dev Containers.
- `.vscode/launch.json` "Run Extension" config for F5-attach debugging.

### Changed

- HTMX 4 pin bumped from `4.0.0-beta5` to `4.0.0-beta6`; catalog regenerated.
- Catalog attribute and `hx-disinherit` completion lists are memoized per version mode, reducing per-keystroke allocation.
- `vscode.workspace.findFiles` now caps at 2000 matches to avoid runaway completion latency on large monorepos.
- TypeScript compile is incremental (`tsBuildInfoFile` under `out/`); iterative `npm run test:unit` rebuilds faster.
- `preview: true` declared in `package.json` Marketplace metadata pending the 1.0 cut.

## [0.2.0] — 2026-08-05

### Added

- Catalog covers both HTMX `2.0.10` and `4.0.0-beta6` with `compatible` default mode accepting their union.
- Per-version diagnostic hints when an attribute or value is exclusive to HTMX 2 or 4.
- `DocumentCompletionItemProvider` with deferred documentation resolution via `resolveCompletionItem`.
- Value completions for `hx-swap`, `hx-trigger`, `hx-target`, `hx-ext`, `hx-sync`, `hx-params`, `hx-disinherit`, and `hx-swap-oob` aware of their syntactic segments.
- Django 6 partial IntelliSense: same-file and cross-template completion, Go-to-Definition, hover, Find References, Rename, duplicate/unknown diagnostics, and quick fixes.
- Cross-template partial scanning from `{% include "name.html#partial" %}` and common Python view calls (`render`, `render_to_string`, `get_template`, `select_template`, `TemplateResponse`).
- Quick-fix suggestions for unknown attributes, invalid values, deprecated attributes, and unknown partials.
- Django HTMX snippet library covering GET, POST, DELETE, search, infinite scroll, dependent dropdown, bulk actions, file upload, out-of-band swaps, accessible toasts, and partial definitions.
- Offline-by-design: packaged catalog with no runtime network requests.

## [0.1.1] — initial Marketplace publish

- Started from `otovo/htmx-tags` (plain HTMX tag completion); this release added the Django partial toolchain and HTMX `4.0.0-beta5` catalog layer, the point at which the project's scope diverged.
