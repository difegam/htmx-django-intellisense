# External Django template files for snippet bodies

## Purpose

Move every Django HTMX snippet body out of the development metadata JSON and into a
dedicated Django template file. Contributors should be able to edit snippet markup
with normal HTML and Django template tooling while the packaged extension keeps its
existing VS Code snippet representation and runtime behavior.

## Scope

This change affects the snippet authoring format, Python generator, tests, package
exclusions, and contributor documentation. It does not change the VS Code extension
runtime, its snippet contribution declaration, or the generated snippet JSON schema.

## Source layout

The source catalog remains `snippets/django-htmx.source.json`, preserving its order,
categories, descriptions, classifications, prefixes, and usage text. Every entry uses
one required `body_file` field:

```json
{
  "name": "HTMX Search",
  "prefix": "htmx-search",
  "category": "Requests and forms",
  "classification": "common",
  "description": "Debounced Django HTMX search input",
  "body_file": "bodies/htmx-search.html",
  "usage": "The search view reads the input value and returns the current result-list fragment."
}
```

Every current snippet body migrates to `snippets/bodies/<prefix>.html`. The source
schema does not retain an inline `body` alternative. One authoring format avoids a
lasting choice between escaped JSON and template files.

## Resolution and validation

`build-snippets` parses source metadata into a source entry, then resolves each
`body_file` to a separate internal entry with the existing `body: list[str]` field.
All current semantic validators and renderers consume only resolved entries.

```text
django-htmx.source.json + snippets/bodies/*.html
                    |
                    v
        source validation and safe resolution
                    |
                    v
            resolved snippet entries
                    |
                    v
 current semantic validation and renderers
                    |
                    v
django-htmx.json + docs/reference/snippets.md
```

Resolution accepts UTF-8 `.html` files located beneath `snippets/bodies/`. It rejects
absolute paths, traversal outside that directory, other extensions, unreadable files,
missing files, and whitespace-only files. Error messages identify the snippet prefix
and relevant file path. The resolver removes only a final newline before splitting
into lines, so template files may contain blank lines. Each body file must be
referenced exactly once; unreferenced and duplicate references fail the build.

The resolved body preserves the current validation rules for TextMate placeholders,
CSRF-safe mutations, prohibited active content, unique names and prefixes, stable
category order, and HTMX 2/4 compatibility. Documentation previews continue to use
the current placeholder-expansion helper.

## Generated and packaged artifacts

The generated `snippets/django-htmx.json` remains the standard VS Code snippet file:
each entry has `prefix`, `description`, and the fully inlined `body` array. The
extension continues to contribute that file directly. It never reads authoring files
at activation or embeds them in the JavaScript bundle.

`docs/reference/snippets.md` remains generated from the same resolved entries.
`npm run build-snippets` updates both committed outputs and `npm run check-snippets`
continues to fail when either is stale.

The VSIX excludes `snippets/django-htmx.source.json` and `snippets/bodies/**`.
Only the generated runtime JSON is packaged.

## Tests and documentation

Tests will cover successful resolution, generated-output stability, missing files,
directory traversal, unsupported file extensions, unreadable or empty files, blank
lines, duplicate references, and unreferenced body files. Existing semantic and
runtime-shape tests will run against the resolved catalog and remain in place.

The contribution guide will describe the metadata file and body directory, use
`body_file` in its example, and retain the build and drift-check commands. Packaging
tests will assert that authoring template files are excluded from the VSIX.

## Success criteria

- Every current snippet has one readable `.html` body source.
- Rebuilding produces the same runtime snippet behavior and a valid documentation
    reference.
- Invalid or incomplete source layouts fail before generated files change.
- The published VSIX contains no snippet authoring metadata or template bodies.
