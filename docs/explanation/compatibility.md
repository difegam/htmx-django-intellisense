# Compatibility

The extension supports the HTMX 2 and HTMX 4 catalog union while allowing an editor to prefer one major version.

## Version modes

| `htmxDjango.version`   | Completion     | Validation                    |
| ---------------------- | -------------- | ----------------------------- |
| `compatible` (default) | HTMX 2/4 union | No version warnings.          |
| `2`                    | HTMX 2 entries | HTMX 4-only syntax is a hint. |
| `4`                    | HTMX 4 entries | HTMX 2-only syntax is a hint. |

Explicit version hints are not errors: existing templates remain editable while a team migrates between versions.

## Aliases and dynamic names

`data-hx-*` aliases resolve to their canonical `hx-*` entry for hover and diagnostics. Attribute completion shows the aliased form only after a `data-` or `data-hx` prefix, avoiding two default lists.

The catalog also recognizes these documented dynamic forms and their `data-hx-*` equivalents:

- `hx-on:<event>` and `hx-on::<event>`
- response-target names such as `hx-target-error`, `hx-target-404`, and `hx-target-4*`
- HTMX 4 status names such as `hx-status:422` and `hx-status:5xx`
- HTMX 4 modifiers including `:inherited` and `:append` where supported

## Literal validation

The extension validates only documented closed sets, such as `hx-boost`, `hx-encoding`, and `hx-method`. It offers documented values for `hx-swap`, `hx-target`, and `hx-trigger` without treating their richer syntaxes as invalid. Django expressions embedded in values are left untouched.

## HTMX 4.0 release support

The offline catalog is pinned to **HTMX 4.0.0**, alongside HTMX 2.0.10. Select
`htmxDjango.version: "4"` while migrating. The default remains `compatible`.

This release adds `hx-query`, `hx-action`, `hx-morph-skip`, and
`hx-morph-skip-children`; `hx-method` accepts `query`. Completions cover
`hx-config` request options, `hx-status:CODE` overrides, `outerSync`,
`focusScroll`, `showTarget`, `scrollTarget`, `strip`, and `swapEmpty`.
HTMX 4 trigger suggestions include `prevent`, `stop`, `halt`, `capture`,
`passive`, and intersection options. Config completion offers HCON key/value
syntax; JSON values remain editable without HCON suggestions.

### Migration review

- Inheritance is explicit: use `hx-target:inherited`, or put configuration
    directly on the requesting element. Shared CSRF headers also need explicit
    inheritance. `hx-config:append` adds local request configuration.
- Rename old `hx-disable` to `hx-ignore` before renaming `hx-disabled-elt`
    to `hx-disable`; their meanings would otherwise collide.
- Use `hx-config` instead of `hx-request`, and `hx-action` instead of the
    earlier beta `hx-url`. HTMX 4 removed `hx-ext`, `hx-inherit`,
    `hx-disinherit`, `hx-params`, `hx-vars`, `hx-history`, and core `hx-prompt`.
- Lifecycle events now use names such as `hx-on::before:request` and
    `hx-on::after:swap`. The HTMX 2 completion uses `before-request`; compatible mode uses a neutral event placeholder.
- Error responses swap by default except 204/304. Define `hx-status:422`
    for validation and `hx-status:5xx="swap:none"` where appropriate.
- History restoration requests full pages; review server response selection,
    caching and `Vary` headers. Request headers include `HX-Request-Type` and
    `HX-Source`; `HX-Target` now carries `tagName#id`.
- Quote trigger selectors containing whitespace. Swap scroll targets use
    separate keys, for example `show:top showTarget:#results`.
- `hx-preload` and `hx-pending` require their corresponding extension scripts.
    Recognizing their attributes does not load those extensions.

The new `htmx-status-form`, `htmx-morph`, and `htmx-partial-response` snippets
are labeled HTMX 4. Static VS Code snippets are available in every version
mode. `<hx-partial>` is an HTMX response element, separate from Django's
`{% partialdef %}` template tags.

### Improvements evaluated

Included in this release: mode-correct modifiers and event examples, config
and status completion, explicit request targets in existing editing recipes,
and focused HTMX 4 snippets. These reuse the offline catalog and existing
providers without runtime dependencies.

Good follow-ups are lifecycle-event name completion, migration quick fixes
with value conversion, and dedicated extension catalogs for SSE, WebSockets,
and `hx-live`. A full migration rewrite needs context: a blind `hx-disable`
rename or CSRF-header rewrite can change application behavior. Automatic
version detection and custom `metaCharacter` support also need a documented
configuration strategy. They are not part of this release.

Sources: [HTMX 4 changes](https://four.htmx.org/docs/whats-new-in-htmx-4),
[migration guide](https://four.htmx.org/docs#migrating-from-htmx-2x-to-4x),
and the [pinned 4.0.0 source](https://github.com/bigskysoftware/htmx/tree/v4.0.0).
