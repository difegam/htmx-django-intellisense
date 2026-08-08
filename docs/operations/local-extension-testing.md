# Local Extension Testing

Test the extension in your local VS Code before opening a pull request or publishing.

## Install dependencies

Run from the repository root:

```bash
npm install
uv sync --project tools --frozen --all-groups
```

This matches the `just init` recipe and installs the Node toolchain, the VS Code extension build tools, and the locked Python generator environment.

## Run the automated checks

The fastest way to verify logic is the command set used in CI:

```bash
npm run lint
npm run check-types
npm run test:unit
npm run test:extension
```

- `npm run lint` runs ESLint over the TypeScript source.
- `npm run check-types` runs `tsc --noEmit`.
- `npm run test:unit` compiles the source and runs the Node unit tests in `out/test/*.test.js`.
- `npm run test:extension` compiles, bundles `dist/extension.js`, downloads VS Code 1.90.2, installs the `batisteo.vscode-django` dependency, and runs the extension-host smoke suite.

To run the full test surface, including Python generator tests and snippet validation:

```bash
npm test
```

This also runs `check-snippets` and `pytest` under `tools/`.

## Debug interactively with F5

For day-to-day development, run the extension inside a real Extension Development Host:

1. Open the repository in VS Code.
1. Press **F5** (or choose **Run → Start Debugging**).
1. Select the launch configuration named **"Run Extension (F5)"**.

The existing `.vscode/launch.json` configuration loads the workspace at `${workspaceFolder}/examples` in a new VS Code window with your local extension activated. You can set breakpoints in the TypeScript source, inspect variables, and watch the **Output** panel while the extension runs.

```json
{
  "name": "Run Extension (F5)",
  "type": "extensionHost",
  "request": "launch",
  "args": [
    "--extensionDevelopmentPath=${workspaceFolder}",
    "${workspaceFolder}/examples"
  ],
  "outFiles": [
    "${workspaceFolder}/out/**/*.js"
  ],
  "preLaunchTask": "npm: compile"
}
```

Use this mode to iterate on activation, completions, hover, diagnostics, and Django partial behavior.

## Test the packaged VSIX

A packaged VSIX is the artifact users install. Test it locally to catch missing files, packaging errors, or behavior that only works in the source tree:

```bash
npm run package
npx vsce ls --tree
code --install-extension htmx-django-intellisense-*.vsix --force
```

Open the `examples/` workspace (or any HTML/Django template project) and run through this smoke checklist:

1. Open an `HTML` file and type `<div hx` — confirm `hx-get`, `hx-post`, and other attributes appear.
1. Type `<div data-hx` — confirm `data-hx-get` aliases appear.
1. Hover a known attribute such as `hx-get` — confirm documentation, version badges, and HTMX doc links appear.
1. Hover an ordinary HTML attribute such as `class` — confirm no HTMX hover text appears.
1. Type a misspelled attribute such as `hx-methd` — confirm a diagnostic appears.
1. Press `Ctrl/Cmd+.` on the diagnostic — confirm quick fixes such as "Replace with 'hx-method'" and "Replace with 'data-hx-method'" are offered.
1. Open a `django-html` file with `{% partialdef card inline %}` and `{% partial card %}` — confirm completion and go-to-definition work for local partials.
1. Try the partial rename with `F2` — confirm both the definition and the call update.

## Inspect extension output

When something behaves differently than expected, open **Output → HTMX Django IntelliSense** in the host VS Code window. The channel logs activation events, catalog loading, and runtime errors.

Common local-testing issues:

- **No completions or hover:** confirm the document language mode is **HTML** or **Django HTML**. For Django templates, install and enable `batisteo.vscode-django`, then reload the window.
- **Django partials do not resolve:** confirm the Django extension is installed and the file is recognized as `django-html`.
- **Extension does not activate:** check the Output panel for a catalog-load error. If `htmx.catalog.json` is missing from the VSIX, reinstall the extension or rebuild with `npm run package`.

## When you are done

After local testing passes, run the full CI verification checklist before pushing:

```bash
just verify
```
