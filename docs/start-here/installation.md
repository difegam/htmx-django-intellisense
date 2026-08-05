# Installation

Install HTMX Django IntelliSense in VS Code and verify that it activates for your template type.

## Marketplace installation

1. Open **Extensions** in VS Code (`Ctrl/Cmd+Shift+X`).
1. Search for **HTMX Django IntelliSense**.
1. Install `difegam.htmx-django-intellisense`.

The Marketplace listing is available at <https://marketplace.visualstudio.com/items?itemName=difegam.htmx-django-intellisense>.

## Django templates

The extension activates for `html` and `django-html`. Django template support requires the [Django extension](https://marketplace.visualstudio.com/items?itemName=batisteo.vscode-django), declared as an extension dependency.

After installing it, open a template and confirm that the language indicator in the VS Code status bar is **Django HTML**.

## Verify

Create or open an HTML file and place the cursor inside the element, right after `button`:

```html
<button>
</button>
```

VS Code should offer HTMX attribute names. Select `hx-get`; the completion inserts an empty quoted value unless an assignment already exists. Hover a recognized `hx-*` attribute to see a concise description, version availability, and official HTMX documentation links.

!!! tip "Packaged build"

    Contributors can install a locally packaged file with `code --install-extension htmx-django-intellisense-*.vsix --force` after running `npm run package`.

## Next step

Follow [First Template](first-template.md) for a Django URL-backed request and a same-file partial.
