# htmx-django-intellisense Python tooling

This package provides the developer tooling used by the `htmx-django-intellisense` VS Code extension.
It is not a runtime dependency of the extension.

All commands assume the current working directory is the repository root.

## Commands

```bash
uv run --project tools htmx-tools build-data
```

Regenerate `htmx.catalog.json` from the pinned HTMX 2/4 upstream tags.

```bash
uv run --project tools htmx-tools build-snippets
```

Validate `snippets/django-htmx.source.json` and regenerate `snippets/django-htmx.json` and `docs/reference/snippets.md`.

```bash
uv run --project tools htmx-tools build-snippets --check
```

Fail if the generated snippet outputs are stale.

```bash
uv run --project tools htmx-tools check-pins
```

Verify the pinned HTMX tags in `tools/src/htmx_django_intellisense/catalog.py` are still current upstream.
