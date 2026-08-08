# First Contribution

Make a small extension change and verify both its pure logic and its VS Code integration.

## Set up the workspace

```bash
just init
```

`just init` installs the Node and Python toolchains and the prek git hooks
(`pre-commit` and `pre-push`). The hooks run Ruff, Prettier, mdformat, Pyrefly, ESLint,
and the Python tests on commit, and `check-types`, TypeScript unit tests, and `knip` on
push — so most regressions surface before you open a pull request. Without this step your
clone has no local safety net.

The manual equivalent, if you are not using `just`:

```bash
npm install
uv sync --project tools --frozen --all-groups
uv run --project tools prek install --hook-type pre-commit --hook-type pre-push
```

## Choose the source of truth

| Change                                     | Primary location                                                        |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| Attribute or version metadata              | `tools/src/htmx_django_intellisense/catalog.py` and `htmx.catalog.json` |
| Name parsing or Django partial recognition | `src/scanner.ts`                                                        |
| Resolution rules                           | `src/catalog.ts`                                                        |
| Validation behavior                        | `src/diagnostics.ts`                                                    |
| VS Code provider behavior                  | `src/extension.ts`                                                      |
| Django snippet                             | `snippets/django-htmx.source.json`                                      |

Add or update the focused Node or Python test that fails before the change. Regenerate the HTMX
catalog only when its generator inputs or metadata change. Run `npm run build-snippets` after a
snippet source change; it updates the packaged JSON and reference page together.

## Add a snippet

Edit `snippets/django-htmx.source.json`, not the generated
`snippets/django-htmx.json` or `docs/reference/snippets.md` files. Each source
entry has these fields:

```json
{
  "name": "HTMX Refresh",
  "prefix": "htmx-refresh",
  "category": "Requests and forms",
  "classification": "common",
  "description": "Refresh a Django fragment with HTMX",
  "body": [
    "<button type=\"button\" hx-get=\"{% url '${1:refresh-view}' %}\" hx-target=\"#${2:content}\" hx-swap=\"${3:innerHTML}\">${4:Refresh}</button>"
  ],
  "usage": "The view returns the fragment that replaces the selected target."
}
```

The validator requires:

| Field                     | Rules                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`                    | Non-empty and unique across the catalog.                                                                                                               |
| `prefix`                  | Lowercase `htmx-...` words separated by hyphens, or one of the Django partial prefixes (`partialdef`, `partialdef-inline`, `partial`); must be unique. |
| `category`                | One of `Requests and forms`, `Loading and navigation`, `Editing and UI`, `Server responses`, or `Django partials`. Keep entries in that order.         |
| `classification`          | One of `common`, `curated`, or `django-6`. Entries in `Django partials` must use `django-6`; other entries must not.                                   |
| `description` and `usage` | Non-empty strings. Use `description` for the catalog summary and `usage` for the expected view or template response.                                   |
| `body`                    | A non-empty array of non-empty strings containing the Django/HTML template to insert.                                                                  |

Use VS Code snippet placeholders in the body: `${1:default}` creates an editable
tab stop with a default value, `$0` marks the final cursor position, and repeated
numbers reuse the same value. Keep the markup compatible with both supported HTMX
catalogs; the snippet test suite rejects deprecated or version-specific attributes.

Mutating snippets must use a CSRF-safe Django form. Put every `hx-post`, `hx-put`,
or `hx-patch` control inside a form with `method="post"`, a matching `action` and
`hx-post`, and `{% csrf_token %}`. Delete actions also use this POST pattern.
The validator rejects scripts, inline event handlers, `hx-on`, JavaScript URLs or
expressions, remote executable embeds, `hx-ext`, SSE, and WebSocket attributes.

After editing the source:

1. Run the generator:

    ```bash
    npm run build-snippets
    ```

1. Review the generated entry in `snippets/django-htmx.json` and the rendered example in
    [Snippets and Examples](../reference/snippets.md).

1. Confirm the generated files are current:

    ```bash
    npm run check-snippets
    ```

    `npm test` also runs this check and the Python generator tests.

## Verify

```bash
npm run lint
npm run check-types
npm test
npm run test:extension
npm run package
```

`npm test` runs TypeScript unit tests and Python generator/manifest tests. `npm run test:extension` launches extension-host smoke tests for both supported language modes. Packaging confirms the installed artifact contains runtime files, catalog, snippets, and presentation assets rather than source and docs.

For a complete walkthrough of F5 debugging, VSIX sideloading, and troubleshooting, see [Local Extension Testing](../operations/local-extension-testing.md).

## Refresh demo assets

After a UI or UX change, regenerate the committed Marketplace and documentation demos:

```bash
npm run capture-screenshots
```

The command captures real extension-host states, rewrites `images/diagnostics.png`, `images/partials.png`, and the three animated feature GIFs, then mirrors each file under `docs/assets/images/`. It never changes the hand-designed extension icon or Marketplace banner. GIF generation uses `ffmpeg` when available, with a macOS ImageIO fallback.

## Review catalog changes

```bash
npm run build-data
git diff -- htmx.catalog.json
```

Commit catalog and generator changes together. The CI workflow repeats regeneration and fails if it produces a diff.
