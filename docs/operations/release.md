# Release

Release a version only after the committed catalog, source, docs, and VSIX have been reviewed together.

## Prepare

1. Update the extension version in `package.json`.
1. Decide whether the pinned HTMX 2/4 release constants in `tools/src/htmx_django_intellisense/catalog.py` need an update.
1. Regenerate the catalog if generator logic, source versions, or catalog metadata changed.
1. Update user-visible docs and release notes for changed behavior.

## Validate

```bash
just verify
```

Sideload the generated VSIX and smoke test the completion, hover, diagnostic, and Django partial paths described in [CI and Packaging](ci-and-packaging.md).

## Publish

Publishing is triggered by **publishing a GitHub release**. The
`.github/workflows/publish.yml` workflow (`on: release`) packages the extension and
publishes it to both the Visual Studio Marketplace (`vsce publish --azure-credential`)
and Open VSX (`ovsx publish`). Pushing a tag alone does not publish.

1. Tag the release commit and push the tag:

   ```bash
   git tag v<version>
   git push --tags
   ```

1. Create the corresponding GitHub release from that tag with release notes. Publishing
   the release starts the workflow.

If you must publish manually, use `npx vsce publish` for the Marketplace and
`npx ovsx publish htmx-django-intellisense-*.vsix -p "$OVSX_PAT"` for Open VSX.

## Rollback

If a published artifact is unacceptable, restore the previous known-good catalog and source state, increment the patch version, rerun the complete validation set, and publish a corrective release with an explicit rollback note.
