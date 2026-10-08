# Django hypermedia pattern library implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship dependency-free, Django-first HTMX application-pattern snippets and the documentation that explains their request, response, security, and compatibility contracts.

**Architecture:** Keep one validated source catalog that produces the existing VS Code snippets contribution and generated reference page. Add documentation metadata to `SnippetEntry`, but keep the runtime contribution to `prefix`, `description`, and `body`. Add only recipes that work with ordinary Django 4.2+ templates and explicit HTMX 2/4 attributes.

**Tech Stack:** TypeScript VS Code extension, Python 3.14, Pydantic, pytest, generated JSON and Markdown, Zensical.

**Spec:** `docs/superpowers/specs/2026-10-07-django-hypermedia-pattern-library-design.md`

## Global constraints

- Use ordinary Django 4.2+ `\_partials/` templates and `{% include %}` for the new general patterns. Keep the current Django 6 partial snippets separate.
- Do not add custom JavaScript, inline event handlers, scripts, HTMX extensions, SSE, WebSockets, or third-party browser libraries.
- Preserve the core policy that rejects executable markup and requires matching `method="post"`, `action`, `hx-post`, and `{% csrf_token %}` for mutations.
- Recipes labelled HTMX 2/4 must put request, target, and swap attributes on the requesting element. Do not depend on inherited HTMX configuration.
- The filter/sort GET form must declare `hx-include="this"`.
- Review the pinned upstream HTMX 4 guidance and HTMX 2-to-4 upgrade guide while authoring and checking recipe attributes.
- Regenerate `snippets/django-htmx.json` and `docs/reference/snippets.md`. Do not edit either generated file by hand.

## Review focus

- Invalid or misspelled source metadata must fail validation before it reaches generated documentation. Task 1 adds metadata-schema failure tests.
- A GET filter form must send its own controls in HTMX 4. Task 2 asserts `hx-include="this"` on `htmx-filter-sort`.
- Debounced requests must not render stale results or save status. Tasks 2 and 3 assert `hx-sync="this:replace"` on every affected recipe.
- Mutation snippets must still be usable as normal HTML forms and retain CSRF protection. Task 3 asserts matching POST fallback contracts.
- Each generated snippet must expand cleanly in VS Code after the catalog grows. Task 4 updates the extension-host count and keeps the expansion loop as the regression test.

## File structure

- `tools/src/htmx_django_intellisense/models.py`: source-entry metadata fields and validation.
- `tools/src/htmx_django_intellisense/snippets.py`: generated documentation sections for metadata; runtime JSON stays unchanged.
- `snippets/django-htmx.source.json`: source of the search improvement and eight new recipes.
- `tools/tests/test_build_snippets.py`: schema, portability, security, metadata-rendering, and per-recipe contract tests.
- `src/test/suite/index.ts`: expected contributed-snippet count while retaining expansion coverage.
- `docs/how-to/django-fragment-patterns.md`: Django 4.2+ full-page and `\_partials/` response guide.
- `docs/explanation/hypermedia-patterns.md`: limits for server-backed HTMX patterns.
- `docs/how-to/index.md`, `docs/explanation/index.md`, `docs/index.md`, `docs/explanation/compatibility.md`, and `zensical.toml`: navigation and compatibility links.

### Task 1: Add metadata to the core snippet source model

**Files:**

- Modify: `tools/src/htmx_django_intellisense/models.py`
- Modify: `tools/src/htmx_django_intellisense/snippets.py`
- Modify: `tools/tests/test_build_snippets.py`
- Generated: `docs/reference/snippets.md`

**Interfaces:**

- Produces: `SnippetEntry` fields `htmx_versions: list\[Literal["2", "4"]\]`, `django_versions: list[str]`, `request_kind: Literal["GET", "POST", "mixed", "response", "none"]`, `context_variables: list[str]`, `response_contract: str`, `security_notes: list[str]`, `accessibility_notes: list[str]`, and `related_snippets: list[str]`.

- Produces: generated docs with compatibility and non-empty metadata. `render_snippets()` remains unchanged.

- Consumes: existing source fields and `usage`; defaults keep existing entries valid.

- [ ] **Step 1: Write failing metadata-schema and rendering tests**

In `tools/tests/test_build_snippets.py`, add a valid `\_entry()` fixture with metadata. Assert unsupported HTMX versions, blank Django versions, invalid `request_kind`, unknown related prefixes, and self-relations raise `ValueError`. Assert `render_snippets()` still emits only `prefix`, `description`, and `body`; assert `render_docs()` emits each populated metadata section.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `uv run --project tools pytest -c tools/pyproject.toml tools/tests/test_build_snippets.py -q`

Expected: FAIL because the model rejects new fields or generated docs omit the metadata.

- [ ] **Step 3: Extend the model and documentation renderer**

In `models.py`, add the interfaces listed above, reject empty metadata strings, and validate related prefixes only after duplicate checks. In `snippets.py`, add concise labelled blocks for compatibility, request kind, context, response contract, security, accessibility, and related snippets. Related prefixes link to generated section anchors.

- [ ] **Step 4: Verify and commit the metadata foundation**

Run: `uv run --project tools pytest -c tools/pyproject.toml tools/tests/test_build_snippets.py -q && npm run build-snippets && npm run check-snippets`

Expected: PASS. Runtime JSON still has only standard VS Code fields.

```bash
git add tools/src/htmx_django_intellisense/models.py tools/src/htmx_django_intellisense/snippets.py tools/tests/test_build_snippets.py docs/reference/snippets.md
git commit -m "feat: add snippet documentation metadata"
```

### Task 2: Add explicit GET navigation and query-state patterns

**Files:**

- Modify: `snippets/django-htmx.source.json`
- Modify: `tools/tests/test_build_snippets.py`
- Generated: `snippets/django-htmx.json`
- Generated: `docs/reference/snippets.md`

**Interfaces:**

- Produces: `htmx-pagination`, `htmx-load-more`, and `htmx-filter-sort` marked HTMX 2/4 and Django 4.2+.

- Produces: `htmx-search` with `hx-sync="this:replace"` and complete metadata.

- Consumes: Task 1 metadata fields and existing category ordering.

- [ ] **Step 1: Write failing portable-GET contract tests**

Add the four prefixes to expected inventory. Assert pagination has a real `href`, direct `hx-get`, `hx-target`, `hx-swap="outerHTML"`, and `hx-push-url="true"`. Assert load-more has a native link and replaces its sentinel. Assert filter/sort has a GET action, direct `hx-get`, `hx-include="this"`, `hx-sync="this:replace"`, a stable target, and URL push. Assert search synchronizes requests.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `uv run --project tools pytest -c tools/pyproject.toml tools/tests/test_build_snippets.py -q`

Expected: FAIL because the prefixes are absent and search is not synchronized.

- [ ] **Step 3: Add source entries and metadata**

Update `snippets/django-htmx.source.json` in category order. Put request, target, and swap attributes on each requesting link or form. Use escaped braces in TextMate placeholders that include Django expressions. Document `page_obj`, canonical query parameters, stable fragment roots, and the full-page/fragment contract.

- [ ] **Step 4: Regenerate, verify, and commit**

Run: `npm run build-snippets && uv run --project tools pytest -c tools/pyproject.toml tools/tests/test_build_snippets.py -q && npm run check-snippets`

Expected: PASS. Generated snippets contain only standard VS Code fields and all GET patterns retain native navigation.

```bash
git add snippets/django-htmx.source.json snippets/django-htmx.json docs/reference/snippets.md tools/tests/test_build_snippets.py
git commit -m "feat: add Django HTMX query patterns"
```

### Task 3: Add server-state and input-assistance patterns

**Files:**

- Modify: `snippets/django-htmx.source.json`
- Modify: `tools/tests/test_build_snippets.py`
- Generated: `snippets/django-htmx.json`
- Generated: `docs/reference/snippets.md`

**Interfaces:**

- Produces: `htmx-autosave`, `htmx-toggle`, `htmx-soft-delete-undo`, `htmx-field-check`, and `htmx-autocomplete`.

- Consumes: Task 1 metadata and the existing core mutation validator.

- [ ] **Step 1: Write failing state and input-assistance contract tests**

Add the five prefixes to inventory expectations. Assert autosave has a POST form with matching `action` and `hx-post`, CSRF token, debounced `input changed`, `hx-sync="this:replace"`, and an `aria-live` status target. Assert toggle and delete/undo are CSRF-safe POST forms with direct `closest article` and `outerHTML`. Assert field check is debounced GET-only with a live status element. Assert autocomplete is debounced GET-only with `hx-sync` and a `datalist` target.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `uv run --project tools pytest -c tools/pyproject.toml tools/tests/test_build_snippets.py -q`

Expected: FAIL because the source entries are absent.

- [ ] **Step 3: Add source entries and metadata**

Use standard Django POST forms for every mutation. The soft-delete contract describes a server-authorized tombstone and undo POST, never a browser-side timer. Field-check states that its endpoint is side-effect-free and must not put sensitive values in a query string. Autocomplete uses a native `datalist` with bounded server suggestions.

- [ ] **Step 4: Regenerate, verify, and commit**

Run: `npm run build-snippets && uv run --project tools pytest -c tools/pyproject.toml tools/tests/test_build_snippets.py -q && npm run check-snippets`

Expected: PASS. Existing mutation safety checks apply to every new write pattern.

```bash
git add snippets/django-htmx.source.json snippets/django-htmx.json docs/reference/snippets.md tools/tests/test_build_snippets.py
git commit -m "feat: add Django HTMX state patterns"
```

### Task 4: Document fragment contracts and catalogue boundaries

**Files:**

- Create: `docs/how-to/django-fragment-patterns.md`
- Create: `docs/explanation/hypermedia-patterns.md`
- Modify: `docs/how-to/index.md`
- Modify: `docs/explanation/index.md`
- Modify: `docs/index.md`
- Modify: `docs/explanation/compatibility.md`
- Modify: `zensical.toml`
- Modify: `tools/tests/test_build_snippets.py`
- Modify: `src/test/suite/index.ts`

**Interfaces:**

- Produces: discoverable guides for Django 4.2+ full-page plus `\_partials/` responses and for core-catalog limits.

- Produces: extension-host coverage for 34 generated snippets.

- Consumes: generated metadata and the existing response-contract guide.

- [ ] **Step 1: Write failing documentation and extension-host assertions**

Extend the portable-contract documentation test to require the new guides and statements about `\_partials/`, `Vary: HX-Request`, server-owned state, native fallbacks, polling, and exclusion of scripts/SSE/WebSockets. Change the expected snippet count in `src/test/suite/index.ts` from 26 to 34 while preserving the loop that expands every snippet.

- [ ] **Step 2: Run the focused checks to verify failure**

Run: `uv run --project tools pytest -c tools/pyproject.toml tools/tests/test_build_snippets.py -q && npm run test:unit`

Expected: the Python test fails until the guides exist. The extension-host count is verified in the next step.

- [ ] **Step 3: Write guides and register navigation**

The how-to guide covers full pages versus `\_partials/` fragments, stable outer roots, `Vary: HX-Request`, canonical GET URLs, and POST response replacement. The explanation guide maps URL state, Django forms, durable server state, native controls, OOB updates, and polling to the new recipes. State that client scripting, HTMX extensions, SSE, and WebSockets are outside the core catalog. Link both guides from the docs indexes and `zensical.toml`. Update compatibility guidance to state that shared recipes use explicit attributes and that HTMX 4-only snippets are labelled in generated docs.

- [ ] **Step 4: Run docs, generator, and extension-host checks**

Run: `npm run build-snippets && npm run check-snippets && uv run --project tools pytest -c tools/pyproject.toml tools/tests/test_build_snippets.py -q && npm run test:extension && uv run --project tools --group docs zensical build --clean --strict`

Expected: PASS. The installed extension expands all 34 snippets without unresolved tab stops.

- [ ] **Step 5: Commit the documentation and integration checks**

```bash
git add docs/how-to/django-fragment-patterns.md docs/explanation/hypermedia-patterns.md docs/how-to/index.md docs/explanation/index.md docs/index.md docs/explanation/compatibility.md zensical.toml tools/tests/test_build_snippets.py src/test/suite/index.ts snippets/django-htmx.json docs/reference/snippets.md
git commit -m "docs: explain Django hypermedia patterns"
```

### Task 5: Run the repository release gate

**Files:**

- Verify: repository-wide generated artifacts and package outputs.

**Interfaces:**

- Consumes: all previous tasks.

- Produces: evidence that the catalog, docs, extension artifact, and Python package meet the repository's CI definition of done.

- [ ] **Step 1: Run the full verification checklist**

Run: `just verify`

Expected: PASS. Linting, formatting, type checks, unit tests, snippets/catalog drift checks, extension-host tests, docs build, VSIX packaging, and Python package build all complete.

- [ ] **Step 2: Confirm generated artifacts are clean**

Run: `git diff --exit-code -- snippets/django-htmx.json docs/reference/snippets.md && git status --short`

Expected: no generated-artifact drift. Do not stage unrelated user work.

- [ ] **Step 3: Commit only intentional verification output**

If verification creates a legitimate tracked artifact, inspect it and create a focused commit. Otherwise do not create an empty commit.
