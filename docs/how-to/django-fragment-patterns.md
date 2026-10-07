# Django Fragment Patterns

Use the snippets as starting points for server-rendered fragments. Each recipe
keeps the request contract visible in the template: a real Django `action`, a
matching HTMX request attribute, an explicit target and swap, and a response
that renders the replacement fragment.

## Query-driven views

Use `htmx-search`, `htmx-filter-sort`, and `htmx-pagination` for GET requests.
Keep filters in a form and use `hx-include="this"` so the query controls are
submitted with the request. Return the results fragment, not a full page, when
the request is an HTMX request.

```django
<form method="get" action="{% url 'item-list' %}"
      hx-get="{% url 'item-list' %}" hx-include="this"
      hx-target="#results" hx-swap="outerHTML"
      hx-sync="this:replace">
  <input name="q" type="search" placeholder="Search">
  <select name="ordering">
    <option value="name">Name</option>
    <option value="-created_at">Newest</option>
  </select>
  <button type="submit">Apply</button>
</form>
<section id="results">{% include "items/_partials/results.html" %}</section>
```

Pagination links should use the same results target and return the same root
element. “Load more” can instead replace the triggering list item with the next
page link; this avoids client-side accumulation logic.

## Server-authoritative mutations

Use `htmx-autosave`, `htmx-toggle`, and `htmx-soft-delete-undo` for POST forms.
Include `{% csrf_token %}` and keep the native `action` and `hx-post` values in
sync. The view should authorize the mutation, then return the exact element
named by `hx-target`.

For validation failures, return the bound form or status fragment with HTTP
200\. That response contract behaves consistently in HTMX 2 and HTMX 4.

## Validation and suggestions

`htmx-field-check` is a GET-only field probe. `htmx-autocomplete` targets a
`datalist` fragment. Debounce and `hx-sync="this:replace"` keep stale responses
from winning when the user types quickly. Use `aria-live="polite"` for status
messages and keep the input's accessible label in the surrounding template.

## Partials and response roots

Place reusable fragments in ordinary Django `_partials/` includes, for example
`items/_partials/results.html` or `items/_partials/item.html`. Django 6
`{% partialdef %}` remains supported; choose one convention per project and
make the returned root stable so `outerHTML` replacements remain predictable.

See [Django Response Contracts](django-response-contracts.md) for view code,
CSRF, uploads, response headers, and out-of-band fragments.
