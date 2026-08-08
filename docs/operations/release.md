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

Publishing is triggered by **publishing a non-draft, non-prerelease GitHub release**.
The `.github/workflows/publish.yml` workflow checks that the release tag version
matches `package.json`, runs the complete verification gate, packages one VSIX, and
publishes that same artifact to both the Visual Studio Marketplace and Open VSX.
Pushing a tag alone does not publish, and creating or publishing a prerelease does not
publish to either registry.

1. Tag the release commit and push the tag:

    ```bash
    git tag v<version>
    git push origin v<version>
    ```

1. Create and publish the corresponding non-draft, non-prerelease GitHub release from
    that tag with release notes. The tag version must match `package.json`. Publishing
    the release starts the workflow.

If you must publish manually, package the VSIX first, then use the locked local CLIs
for the Marketplace and Open VSX:

```bash
npm run package
npm exec --offline -- vsce publish
OVSX_PAT="$OVSX_PAT" npm exec --offline -- ovsx publish htmx-django-intellisense-*.vsix
```

## Rollback

If a published artifact is unacceptable, restore the previous known-good catalog and source state, increment the patch version, rerun the complete validation set, and publish a corrective release with an explicit rollback note.
