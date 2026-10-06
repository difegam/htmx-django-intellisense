# External snippet bodies implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dedicated Django template files the development source for every
snippet body while preserving the generated VS Code snippet JSON and extension runtime.

**Architecture:** Metadata keeps its single ordered JSON catalog and names each body
with `body_file`. The Python generator resolves those files into the existing
`SnippetEntry.body: list[str]` representation before all semantic validation and
rendering. The VSIX packages only the generated snippet JSON.

**Tech Stack:** Python 3.14, Pydantic, pytest, JSON, Django template and HTML files,
VS Code extension packaging.

**Spec:** `docs/superpowers/specs/2026-10-06-external-snippet-bodies-design.md`

## Global constraints

- Every current snippet uses the required `body_file` metadata field. Do not support
    inline `body` in the source schema.
- Store template files below `snippets/bodies/` with a `.html` extension and UTF-8
    content.
- Reject paths outside `snippets/bodies/`, missing or unreadable files, unsupported
    extensions, whitespace-only files, duplicate body-file references, and unreferenced
    template files.
- Preserve blank lines in resolved bodies and remove only one trailing final newline.
- Run all existing TextMate, CSRF, security, ordering, and HTMX compatibility checks
    against resolved `body: list[str]` entries.
- Keep `snippets/django-htmx.json` as the extension's sole runtime snippet file and
    exclude source JSON plus template bodies from the VSIX.

## Review focus

- Metadata without `body_file` must fail source validation. Task 1 adds a focused
    schema test.
- A path with `../` or an absolute path must not read outside the bodies directory.
    Task 1 adds parameterized resolver tests.
- A valid template may include empty lines and a final newline. Task 1 verifies the
    exact resolved list of lines.
- A renamed, missing, duplicate, or orphaned template must fail before generated
    output is written. Tasks 1 and 2 cover each case.
- The packaged extension must not retain an alternate authoring copy of snippets.
    Task 3 asserts the ignore rules and generated runtime shape.

---

## File structure

- Modify: `tools/src/htmx_django_intellisense/models.py` to add the source-only
    metadata model while retaining the resolved semantic model.
- Modify: `tools/src/htmx_django_intellisense/snippets.py` to resolve safe body files,
    detect body-directory consistency, and render from resolved entries.
- Modify: `tools/tests/test_build_snippets.py` for source-schema, resolver, migration,
    and generated-output tests.
- Modify: `snippets/django-htmx.source.json` to replace each `body` array with its
    `body_file` reference.
- Create: `snippets/bodies/*.html`, one template file for each of the 26 current
    snippet prefixes.
- Modify: `snippets/django-htmx.json` and `docs/reference/snippets.md` by running the
    generator, not by editing them directly.
- Modify: `.vscodeignore` and `tools/tests/test_extension_contract.py` so source
    templates stay out of the VSIX.
- Modify: `docs/tutorials/first-contribution.md` to document metadata plus templates.

### Task 1: Add source models and safe body resolution

**Files:**

- Modify: `tools/src/htmx_django_intellisense/models.py:60-177`
- Modify: `tools/src/htmx_django_intellisense/snippets.py:15-164`
- Test: `tools/tests/test_build_snippets.py`

**Interfaces:**

- Consumes: a JSON array of source metadata dictionaries and a source JSON `Path`.

- Produces: `SourceSnippetEntry`, with the current metadata fields plus required
    `body_file: str`; existing `SnippetEntry`, which always retains `body: list[str]`;
    `resolve_body_file(body_file: str, *, source_dir: Path) -> list[str]`; and
    `resolve_catalog(catalog: list[dict[str, Any]], *, source_path: Path) -> list[dict[str, Any]]`.

- Compatibility: `load_catalog(path: Path = SOURCE_FILE) -> list[dict[str, Any]]`
    returns resolved dictionaries so downstream validation, rendering, and current tests
    consume `body` exactly as before.

- [ ] **Step 1: Write failing schema and resolver tests in `tools/tests/test_build_snippets.py`**

    Add a temporary source JSON and `bodies/valid.html` fixture. Assert that
    `load_catalog(source)` returns the template as `body`, including an empty middle
    line. Assert that source metadata with `body` or without `body_file` fails with a
    clear field error. Add parameterized tests for `../outside.html`, an absolute path,
    `bodies/valid.txt`, a missing file, and whitespace-only content. Mock `Path.read_text`
    to raise `OSError` for the unreadable-file case. Assert duplicate references and an
    extra unreferenced `.html` file fail with their snippet prefix or file name.

- [ ] **Step 2: Run the new resolver tests to verify they fail**

    Run: `uv run --project tools pytest -c tools/pyproject.toml tools/tests/test_build_snippets.py -k 'body_file or resolver or orphan' -q`

    Expected: FAIL because the source model and resolver do not exist.

- [ ] **Step 3: Implement source validation and resolution in `models.py` and `snippets.py`**

    Define `SourceSnippetEntry` with `ConfigDict(extra="forbid")` and required
    `body_file`. Keep `SnippetEntry` as the resolved model and change its body check to
    allow empty strings while requiring at least one non-whitespace line. Implement the
    two interfaces above. Resolve paths relative to `source_path.parent`, require their
    resolved location to be beneath `source_path.parent / "bodies"`, require `.html`,
    read UTF-8, remove one final newline, and split with `splitlines()`. Before resolving
    bodies, reject duplicate `body_file` values; after resolving, compare the referenced
    files with `bodies_dir.rglob("*.html")` and reject unreferenced files. Wrap source
    and resolution failures with the prefix that owns the entry.

- [ ] **Step 4: Run the resolver tests to verify they pass**

    Run: `uv run --project tools pytest -c tools/pyproject.toml tools/tests/test_build_snippets.py -k 'body_file or resolver or orphan' -q`

    Expected: PASS.

- [ ] **Step 5: Commit the resolver change**

    ```bash
    git add tools/src/htmx_django_intellisense/models.py tools/src/htmx_django_intellisense/snippets.py tools/tests/test_build_snippets.py
    git commit -m "feat: resolve snippet template bodies"
    ```

### Task 2: Migrate the complete snippet catalog and regenerate outputs

**Files:**

- Modify: `snippets/django-htmx.source.json`
- Create: `snippets/bodies/htmx-get.html`, `snippets/bodies/htmx-post.html`,
    `snippets/bodies/htmx-delete.html`, `snippets/bodies/htmx-search.html`, and one
    matching `.html` file for every other current prefix
- Modify: `tools/tests/test_build_snippets.py`
- Generated: `snippets/django-htmx.json`
- Generated: `docs/reference/snippets.md`

**Interfaces:**

- Consumes: Task 1's resolved `load_catalog()` output and existing catalog metadata.

- Produces: one referenced template per prefix and unchanged generated runtime records
    with only `prefix`, `description`, and `body`.

- [ ] **Step 1: Write a failing migration-integrity test in `tools/tests/test_build_snippets.py`**

    Parse the raw source JSON and assert each entry has exactly the existing metadata
    fields plus `body_file`, no `body`, and a unique file reference. For every entry,
    compare the template's `rstrip("\n").splitlines()` result with the `body` of the
    generated runtime record keyed by snippet name. Assert the existing 26 prefixes are
    still present.

- [ ] **Step 2: Run the migration-integrity test to verify it fails**

    Run: `uv run --project tools pytest -c tools/pyproject.toml tools/tests/test_build_snippets.py -k migration_integrity -q`

    Expected: FAIL because source entries still have inline `body` arrays.

- [ ] **Step 3: Replace inline bodies with body-file references and create template files**

    Move each current array line verbatim into `snippets/bodies/<prefix>.html`, retaining
    order, indentation, TextMate placeholders, Django tags, and blank lines. Replace
    each source `body` key with `body_file: "bodies/<prefix>.html"`. Do not change
    metadata, markup semantics, prefixes, or descriptions during the migration.

- [ ] **Step 4: Regenerate the committed artifacts**

    Run: `npm run build-snippets`

    Expected: `snippets/django-htmx.json` retains its current runtime schema and
    `docs/reference/snippets.md` is regenerated from resolved template text.

- [ ] **Step 5: Run the migration-integrity and generator tests**

    Run: `uv run --project tools pytest -c tools/pyproject.toml tools/tests/test_build_snippets.py -q && npm run check-snippets`

    Expected: PASS, with no stale generated files.

- [ ] **Step 6: Commit the migration and generated artifacts**

    ```bash
    git add snippets/django-htmx.source.json snippets/bodies snippets/django-htmx.json docs/reference/snippets.md tools/tests/test_build_snippets.py
    git commit -m "feat: author snippet bodies as templates"
    ```

### Task 3: Exclude authoring templates and document the contributor workflow

**Files:**

- Modify: `.vscodeignore:37`
- Modify: `tools/tests/test_extension_contract.py:61-65`
- Modify: `docs/tutorials/first-contribution.md:30-96`

**Interfaces:**

- Consumes: the source layout produced by Task 2 and the current VS Code snippet
    contribution pointing to `./snippets/django-htmx.json`.

- Produces: a VSIX exclusion for `snippets/bodies/**`, a package contract test, and
    contributor instructions that name metadata and body files as the editable sources.

- [ ] **Step 1: Write failing packaging and documentation tests**

    Extend `test_snippet_build_sources_are_excluded_from_vsix` to require
    `snippets/bodies/**`. Add a focused documentation test that asserts the contribution
    guide contains `body_file`, `snippets/bodies/`, `npm run build-snippets`, and
    `npm run check-snippets`.

- [ ] **Step 2: Run those tests to verify they fail**

    Run: `uv run --project tools pytest -c tools/pyproject.toml tools/tests/test_extension_contract.py -k 'snippet_build_sources or contribution_guide' -q`

    Expected: FAIL because body templates are not excluded and the guide lacks the new
    source format.

- [ ] **Step 3: Update package exclusions and the contribution guide**

    Add `snippets/bodies/**` to `.vscodeignore`. In the contributor guide, change the
    source table and add-snippet example to use `body_file`, explain that template markup
    lives in the named `.html` file, and retain the generator and drift-check workflow.
    Do not change the runtime `contributes.snippets` declaration.

- [ ] **Step 4: Run focused packaging, documentation, and full snippet checks**

    Run: `uv run --project tools pytest -c tools/pyproject.toml tools/tests/test_extension_contract.py tools/tests/test_build_snippets.py -q && npm run check-snippets`

    Expected: PASS.

- [ ] **Step 5: Commit packaging and documentation changes**

    ```bash
    git add .vscodeignore tools/tests/test_extension_contract.py docs/tutorials/first-contribution.md
    git commit -m "docs: explain snippet template sources"
    ```

### Task 4: Verify the shipped and generated artifacts

**Files:**

- Verify: all files changed by Tasks 1 through 3

**Interfaces:**

- Consumes: the completed generator, migrated source catalog, package rules, and
    contributor documentation.

- Produces: evidence that linting, types, tests, generation, packaging, and the
    VSIX file list meet the repository's definition of done.

- [ ] **Step 1: Run the repository verification checklist**

    Run: `just verify`

    Expected: PASS, including generated-artifact checks, Python and TypeScript checks,
    extension-host tests, smoke test, documentation build, VSIX packaging, and Python
    package build.

- [ ] **Step 2: Inspect generated-artifact and package state**

    Run: `git diff --exit-code -- snippets/django-htmx.json docs/reference/snippets.md && npx vsce ls --tree`

    Expected: generated artifacts are current, `snippets/django-htmx.json` is listed,
    and neither `snippets/django-htmx.source.json` nor `snippets/bodies/` is listed.

- [ ] **Step 3: Commit any verification-only formatting changes**

    If formatter hooks change tracked files, inspect the diff, stage only those changes,
    and commit with a message that names the formatter result. Otherwise, make no commit.

## Self-review

The plan maps every spec requirement to a task: strict source schema and safe
resolution are Task 1; complete migration and stable outputs are Task 2; package
exclusion and contributor guidance are Task 3; repository-wide verification is Task
4\. All Review Focus cases are assigned to a test step. The interfaces use one
`body_file` spelling throughout, preserve `load_catalog()` as the resolved-data
boundary, and leave generated runtime data unchanged.
