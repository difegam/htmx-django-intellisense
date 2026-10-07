# Django hypermedia pattern library design

## Purpose

Expand the Django HTMX snippet catalog from individual HTMX mechanics into
dependency-free application patterns. The extension should help Django teams
build common server-rendered interactions without custom JavaScript,
SSE/WebSocket infrastructure, or HTMX extensions.

The catalog is not a claim that HTMX replaces every browser-side interaction.
It covers state that belongs in a Django view, form, model, session, or URL.

## Goals

- Add eight application-level recipes: pagination, load more, autosave,
    toggle, filter and sort, soft delete with undo, field check, and
    autocomplete.
- Improve `htmx-search` with `hx-sync="this:replace"`.
- Support ordinary Django 4.2+ templates through `_partials/` and `{% include %}` while preserving the existing Django 6 partial snippets.
- Keep the core catalog dependency-free, CSRF-safe, and progressively
    enhanced.
- Generate reference documentation that states compatibility, request and
    response contracts, required context, accessibility notes, and related
    recipes.

## Non-goals

- Do not add snippets that need custom JavaScript, inline event handlers,
    scripts, HTMX extensions, SSE, WebSockets, or third-party browser
    libraries.
- Do not create a runtime dependency resolver or a second snippets
    contribution.
- Do not add a Django example application solely to test documentation.
- Do not infer a project's installed Django or HTMX version at runtime.

## Catalog architecture

The repository retains one source catalog and one VS Code snippets file.

```text
snippets/django-htmx.source.json
  -> Pydantic validation and core safety policy
  -> snippets/django-htmx.json
  -> docs/reference/snippets.md
```

`snippets/django-htmx.json` remains a normal VS Code contribution. Each entry
contains only `prefix`, `description`, and `body` at runtime.

The source entry model gains documentation-only metadata. The metadata records
the supported HTMX versions, Django baseline, request kind, required template
context, fragment/response contract, security and accessibility notes, and
related snippets. Defaults make existing core entries valid until their
metadata is filled in deliberately.

The core policy remains strict. It rejects script elements, inline event
handlers, `hx-on`, JavaScript URLs and expressions, remote executable
resources, `hx-ext`, SSE, and WebSocket attributes. Mutating controls remain
POST forms with a matching native `action`, `hx-post`, and Django CSRF token.

## Compatibility rules

Every recipe labelled compatible with HTMX 2 and 4 must put its request,
target, and swap attributes directly on the requesting element. HTMX 4 makes
attribute inheritance explicit, while HTMX 2 inherited these attributes by
default. Recipes cannot rely on a parent `hx-target`, `hx-swap`, `hx-include`,
or related attribute.

GET filter and sort forms use explicit `hx-include="this"`. HTMX 4 does not
automatically send enclosing form values for `hx-get`, so this preserves the
intended query contract across supported versions.

Existing HTMX 4-only snippets remain available but are labelled as such in
generated documentation. Shared recipes avoid HTMX 4 extensions, H2-only
events, H2-only attributes, and request/response behavior that requires a
global compatibility configuration.

The implementation will review the upstream [HTMX 4 guidance](https://raw.githubusercontent.com/bigskysoftware/htmx/v4.0.0/dist/skills/htmx-guidance.md)
and [HTMX 2 to 4 upgrade guide](https://raw.githubusercontent.com/bigskysoftware/htmx/v4.0.0/dist/skills/htmx-upgrade-from-htmx2.md)
when authoring and checking each recipe.

## Recipes and response contracts

| Prefix                  | Request                                          | Response contract                                                         |
| ----------------------- | ------------------------------------------------ | ------------------------------------------------------------------------- |
| `htmx-search`           | Debounced GET with stale-request replacement     | Replace the results fragment.                                             |
| `htmx-pagination`       | GET link with a canonical query URL              | Replace the stable results root and push the URL.                         |
| `htmx-load-more`        | GET link from a replaceable sentinel             | Return result items followed by the next sentinel.                        |
| `htmx-autosave`         | Debounced CSRF-safe POST form                    | Replace a live save-status element with server-confirmed state.           |
| `htmx-toggle`           | CSRF-safe POST form                              | Replace the enclosing stateful item with canonical markup.                |
| `htmx-filter-sort`      | GET form with explicit inclusion of its controls | Replace the stable results root and push the resulting URL.               |
| `htmx-soft-delete-undo` | CSRF-safe POST delete and POST undo forms        | Replace an item with a server-authorized undo tombstone, then restore it. |
| `htmx-field-check`      | Debounced, side-effect-free GET                  | Replace the field status element.                                         |
| `htmx-autocomplete`     | Debounced GET from an input                      | Replace a native `datalist` with bounded server suggestions.              |

All requests retain a native fallback. GET recipes provide real `href` values
or a normal form action. Mutation recipes use ordinary POST forms. Django
remains authoritative for validation and durable state.

For URLs that render a page or an HTMX fragment, normal navigation receives a
full page and HTMX requests receive the documented fragment root. Views vary
on `HX-Request`. A fragment used with `hx-swap="outerHTML"` returns an element
with the same stable selector as the target.

Bound form errors return the complete bound form or status fragment. Permission
and unexpected server failures use normal Django error handling rather than
client-side recovery scripts. Multi-region updates continue to use the
existing OOB-swap guidance where appropriate.

## Documentation

Generated snippets documentation will render source metadata beside each
snippet. It will describe version support, request type, required context,
response shape, fallback behavior, security notes, accessibility notes, and
related recipes.

Two hand-written guides complete the generated reference:

- A Django 4.2+ fragment guide that uses a full page plus reusable
    `_partials/*.html` templates.
- A pattern-boundaries guide that recommends URL state for navigation, Django
    forms for validation, server-owned durable state, explicit fragment roots,
    native browser controls for local interaction, and polling before
    infrastructure-heavy realtime approaches.

The documentation navigation and compatibility material will link to these
guides and clearly label HTMX 4-only recipes.

## Validation and tests

The generator test suite will add coverage for the metadata schema and
per-recipe contracts. Tests will check:

- Exact prefix and classification inventories.
- Generated runtime shape and generated-document drift.
- Existing dependency and executable-content bans.
- POST form, action, and CSRF requirements.
- Direct request, target, and swap declarations for shared HTMX 2/4 entries.
- `hx-include="this"` on the filter/sort GET form.
- `hx-sync="this:replace"` on search and other race-prone input recipes.
- Native fallback links/forms, stable `outerHTML` roots, and required live
    status elements.

The extension-host test updates the expected snippet count and expands every
contributed snippet to catch invalid VS Code tab stops. Documentation builds
remain strict. The complete repository verification command remains the final
gate.

## Files expected to change

- `snippets/django-htmx.source.json`
- `snippets/django-htmx.json` (generated)
- `tools/src/htmx_django_intellisense/models.py`
- `tools/src/htmx_django_intellisense/snippets.py`
- `tools/tests/test_build_snippets.py`
- `src/test/suite/index.ts`
- `docs/reference/snippets.md` (generated)
- Documentation guides and navigation files required for the new material

## Delivery order

1. Add metadata support and the tests that define the core policy.
1. Update search and add GET-based list patterns.
1. Add POST-based state patterns and input-assistance patterns.
1. Generate the snippets reference and write the fragment and boundary guides.
1. Run the repository verification checklist, including catalog and snippets
    drift checks, extension-host tests, documentation build, packaging, and
    Python package build.
