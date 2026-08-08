set shell := ["bash", "-cu"]

[doc("List all available recipes")]
default:
    @just --list

[doc("Install Node and Python tooling and install prek hooks")]
init:
    npm install
    uv sync --project tools --frozen --all-groups
    uv run --project tools prek install --hook-type pre-commit --hook-type pre-push

[doc("Remove temporary files and caches")]
clean:
    rm -rf .venv .pytest_cache .ruff_cache .pyrefly_cache .coverage htmlcov out site .vscode-test dist
    find . -type d -name "__pycache__" -exec rm -rf {} +

[doc("Recreate project toolchain from scratch")]
fresh: clean init

[doc("Run Python linter and formatter")]
[group("code-quality")]
lint:
    uv run --project tools ruff check --fix --show-fixes
    uv run --project tools ruff format

[doc("Regenerate htmx.catalog.json from pinned upstream HTMX docs")]
build-data:
    uv run --project tools htmx-tools build-data

[doc("Validate and generate Django HTMX snippets and their documentation")]
build-snippets:
    uv run --project tools htmx-tools build-snippets

[doc("Verify the pinned HTMX tags in tools/src/htmx_django_intellisense/catalog.py are still current upstream")]
check-pins:
    uv run --project tools htmx-tools check-pins

[doc("Run the full CI verification checklist (assumes deps are installed)")]
[group("ci")]
verify:
    npm run lint
    npm run check-types
    uv run --project tools ruff check tools
    uv run --project tools ruff format --check tools
    uv run --project tools pyrefly check --config tools/pyproject.toml
    uv run --project tools pytest -c tools/pyproject.toml tools/tests
    npm run test:unit
    npm run build-data
    npm run build-snippets
    git diff --exit-code -- htmx.catalog.json snippets/django-htmx.json docs/reference/snippets.md
    uv run --project tools htmx-tools check-pins
    npm run test:extension
    uv run --project tools --group docs zensical build --clean --strict
    npm run package
    npx vsce ls --tree
    uv build --project tools

[doc("Run all local checks")]
check: lint test
    uv run --project tools prek run --all-files

[doc("Run tests")]
test:
    npm test

[doc("Run the VS Code extension-host smoke tests")]
test-extension:
    npm run test:extension

[doc("Regenerate Marketplace and documentation demo assets")]
demo-assets:
    npm run capture-screenshots

[doc("Format documentation files")]
[group("docs")]
docs-format:
    uvx --with mdformat-ruff --with mdformat-gfm --with mdformat-web --with "mdformat-mkdocs[recommended]" mdformat docs

[doc("build docs and fail on any warning")]
[group("docs")]
docs-strict:
    uv run --project tools --group docs zensical build --clean --strict

[doc("serve docs locally with hot reload")]
[group("docs")]
docs:
    @echo 'Serving docs on http://localhost:1031'
    uv run --project tools --group docs zensical serve -a localhost:1031

[doc("build docs site to site/")]
[group("docs")]
docs-build:
    uv run --project tools --group docs zensical build --clean
