![HTMX Django IntelliSense](images/marketplace-banner.jpg)

# HTMX Django IntelliSense

Write HTMX faster in VS Code with offline completions, hover documentation,
diagnostics, quick fixes, snippets, and Django 6 template partial support.

[Install from the Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=difegam.htmx-django-intellisense) · [Install from Open VSX](https://open-vsx.org/extension/difegam/htmx-django-intellisense)

<p align="center">
  <a href="https://github.com/difegam/htmx-django-intellisense/blob/main/LICENSE.txt">
    <img src="https://img.shields.io/badge/license-Apache%202.0-0C4B33" alt="License">
  </a>
  <img src="https://img.shields.io/badge/HTMX-2%20%2F%204-0C4B33" alt="HTMX 2 / 4">
  <br>
  <a href="https://marketplace.visualstudio.com/items?itemName=difegam.htmx-django-intellisense">
    <img src="https://img.shields.io/badge/VS%20Marketplace-v0.1.0-0C4B33" alt="VS Marketplace Version">
  </a>
  <a href="https://open-vsx.org/extension/difegam/htmx-django-intellisense">
    <img src="https://img.shields.io/badge/Open%20VSX-v0.1.0-0C4B33" alt="Open VSX Version">
  </a>
</p>

## Highlights

- Complete `hx-*` attributes and documented values in HTML and Django templates.
- Get context-aware suggestions for swaps, targets, triggers, encodings, methods, and HTMX 4 modifiers.
- Hover for concise documentation, version availability, and official HTMX links.
- Catch HTMX typos and invalid documented values with one-click quick fixes.
- Complete, navigate, rename, and find references for Django 6 template partials.
- Insert Django-ready GET, CSRF-safe POST, delete, search, infinite-scroll, and partial snippets.
- Work entirely offline: the extension reads its committed catalog and makes no runtime network requests.

## Installation

Install **HTMX Django IntelliSense** from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=difegam.htmx-django-intellisense) or [Open VSX](https://open-vsx.org/extension/difegam/htmx-django-intellisense) when the listings are published.

Until then, install a local VSIX from a checkout:

```bash
npm install
npm run package
code --install-extension htmx-django-intellisense-*.vsix --force
```

Django template support requires the [Django extension](https://marketplace.visualstudio.com/items?itemName=batisteo.vscode-django), which VS Code installs as an extension dependency. Open an `html` or `django-html` template and type `hx-` to verify activation.

## Documentation

Read the [full documentation](https://difegam.github.io/htmx-django-intellisense/) for installation, HTMX authoring, Django partials, configuration, testing, packaging, and release guidance.

- [Install and verify the extension](docs/start-here/installation.md)
- [Create your first HTMX template](docs/start-here/first-template.md)
- [Author HTMX attributes](docs/how-to/author-htmx.md)
- [Use Django template partials](docs/how-to/django-partials.md)
- [Configure completion and compatibility](docs/how-to/configuration.md)
- [Browse snippets](docs/reference/snippets.md)

## Features

### Completions and hover documentation

Type `hx-` in HTML or Django HTML to see version-aware attributes, aliases,
dynamic syntax, and Django-ready snippets.

![HTMX attribute completion in VS Code](images/attribute-completions.gif)

Values are suggested for the attribute you are editing. `hx-swap`,
`hx-trigger`, and `hx-target` provide documented strategies, events, and
modifier fragments in context.

![HTMX value completion in VS Code](images/context-aware-values.gif)

Hover a recognized `hx-*` or `data-hx-*` attribute for its purpose, supported
HTMX versions, suggested values, and official documentation links.

![HTMX hover documentation in VS Code](images/hover-documentation.gif)

### Diagnostics and quick fixes

The extension identifies misspelled HTMX attributes, deprecated attributes,
invalid documented values, and unknown Django partials. Each diagnostic
includes a quick fix from the `Ctrl/Cmd+.` lightbulb.

![HTMX and Django diagnostics](images/diagnostics.png)

### Django template partials

Definitions in the current template are offered after `{% partial `:

```django
{% partialdef result_card inline %}
  <article id="result-{{ result.pk }}">{{ result.title }}</article>
{% endpartialdef %}

{% partial result_card %}
```

Go to Definition, Peek Definition, Find All References, and Rename Symbol
work with local partials. Static cross-template references also complete and
navigate from Django includes and common Python APIs:

```django
{% include "results.html#result_card" %}
```

```python
return render(request, "results.html#result_card", context)
```

![Django partial completion](images/partials.png)

See the [Django partials guide](docs/how-to/django-partials.md) for lookup
rules, diagnostics, and cross-template behavior.

### Django snippets

Type a snippet prefix in a `django-html` document to insert a secure,
Django-ready HTMX pattern. See the [snippet and example catalog](docs/reference/snippets.md)
for every prefix and its generated output.

## Compatibility and settings

The committed catalog covers HTMX `2.0.10` and `4.0.0-beta6`.
`compatible` mode is the default and accepts their union. Choose `2` or `4`
to surface cross-version syntax as hints.

| Setting                       | Default      | Purpose                                        |
| ----------------------------- | ------------ | ---------------------------------------------- |
| `htmxDjango.enableCompletion` | `true`       | Enable HTMX and Django partial completions.    |
| `htmxDjango.enableHover`      | `true`       | Enable HTMX and partial hover information.     |
| `htmxDjango.enableValidation` | `true`       | Enable HTMX and same-file partial diagnostics. |
| `htmxDjango.version`          | `compatible` | Use `compatible`, `2`, or `4`.                 |

See the [configuration guide](docs/how-to/configuration.md) and [settings reference](docs/reference/settings.md) for details.

## Contributing

This repository contains the TypeScript VS Code extension and a Python toolchain
under `tools/` that generates the offline HTMX catalog and snippets.

Set up both toolchains with [uv](https://github.com/astral-sh/uv) and npm:

```bash
just init
```

Run the complete local verification checklist:

```bash
just verify
```

Useful focused commands:

```bash
npm test
npm run test:extension
npm run package
```

After changing catalog inputs or snippet sources, regenerate the committed
artifacts with `npm run build-data` or `npm run build-snippets`. See the
[first contribution guide](docs/tutorials/first-contribution.md) and
[CI and packaging guide](docs/operations/ci-and-packaging.md) for the full
workflow.

## License

Licensed under Apache 2.0. Maintained independently at
[difegam/htmx-django-intellisense](https://github.com/difegam/htmx-django-intellisense).
