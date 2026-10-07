# Hypermedia Patterns

The snippet library is intentionally Django-first: the server owns state and
returns HTML fragments. HTMX adds request and replacement behavior to normal
links and forms; it does not create a second client-side state layer.

## The request/response loop

```text
link or form
  -> Django URL + query/body + CSRF
  -> view validates and authorizes
  -> view renders the target fragment
  -> HTMX swaps the explicit target
```

Every shared recipe makes the target and swap explicit. This keeps snippets
portable between HTMX 2 and HTMX 4, where relying on inherited attributes or
implicit form inclusion can change behavior.

## Fragment boundaries

Prefer one stable root element per replaceable fragment. A response for
`hx-target="closest article" hx-swap="outerHTML"` should render that article
root again. For a list, return the list or results container named by the
request. Keep full-page shells, navigation, and reusable `_partials/` includes
separate from mutation responses.

## Security and accessibility boundaries

Mutations use native POST forms with matching `action` and `hx-post` values and
an explicit CSRF token. Authorization belongs in the Django view; a snippet is
not a permission boundary. The catalog rejects scripts, inline handlers,
extension declarations, SSE, WebSockets, and evaluated JavaScript so that
recipes remain inspectable and dependency-free.

Use semantic controls, labels, `aria-pressed` for boolean toggles, and
`aria-live="polite"` for status updates. Server-rendered state is the source of
truth after every swap.

## Version portability

The shared recipes use core attributes available in HTMX 2 and HTMX 4. They do
not rely on extension scripts. HTMX 4 guidance makes request targets and
inheritance more explicit and changes error-response defaults, so the library
uses explicit `hx-target`/`hx-swap` pairs and an HTTP 200 invalid-form contract.
For version-specific syntax, use the catalog and [Compatibility](compatibility.md)
rather than adapting a shared recipe by guesswork.
