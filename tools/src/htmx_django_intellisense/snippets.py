"""Validate and generate Django HTMX snippets and their documentation."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from htmx_django_intellisense.models import (
    CATEGORIES,
    CLASSIFICATIONS,
    SnippetEntry,
    SourceSnippetEntry,
    snippet_preview,
    validate_source,
)

ROOT = Path(__file__).resolve().parents[3]
SOURCE_FILE = ROOT / "snippets" / "django-htmx.source.json"
BODIES_DIR = SOURCE_FILE.parent / "bodies"
SNIPPET_FILE = ROOT / "snippets" / "django-htmx.json"
DOCS_FILE = ROOT / "docs" / "reference" / "snippets.md"

__all__ = [
    "BODIES_DIR",
    "CATEGORIES",
    "CLASSIFICATIONS",
    "DOCS_FILE",
    "SNIPPET_FILE",
    "SOURCE_FILE",
    "generated_outputs",
    "load_catalog",
    "render_docs",
    "render_snippets",
    "resolve_body_file",
    "resolve_catalog",
    "snippet_preview",
    "sync_outputs",
    "validate_catalog",
]


def load_catalog(path: Path = SOURCE_FILE) -> list[dict[str, Any]]:
    """Load source metadata and resolve its snippet body files."""
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("catalog root must be an array")
    if not all(isinstance(entry, dict) for entry in data):
        raise ValueError("every catalog entry must be an object")
    return resolve_catalog(data, source_path=path)


def _describe_error(exc: ValidationError, label: str) -> str:
    errors = exc.errors()
    missing = sorted(str(err["loc"][-1]) for err in errors if err["type"] == "missing")
    extra = sorted(str(err["loc"][-1]) for err in errors if err["type"] == "extra_forbidden")
    other = []
    for error in errors:
        if error["type"] in {"missing", "extra_forbidden"}:
            continue
        location = ".".join(str(part) for part in error["loc"])
        other.append(f"{location} {error['msg']}".strip())

    details = []
    if missing:
        details.append(f"missing {', '.join(missing)}")
    if extra:
        details.append(f"unexpected {', '.join(extra)}")
    if details:
        return f"{label}: invalid fields ({'; '.join(details)})"
    if other:
        return f"{label}: {other[0]}"
    return f"{label}: {exc}"


def resolve_body_file(body_file: str, *, source_dir: Path) -> list[str]:
    """Read one safe, non-empty HTML snippet body file."""
    bodies_dir = (source_dir / "bodies").resolve()
    candidate = (source_dir / body_file).resolve()

    if candidate.suffix != ".html":
        raise ValueError("body file must use the .html extension")
    try:
        candidate.relative_to(bodies_dir)
    except ValueError as exc:
        raise ValueError("body file must be inside the bodies directory") from exc

    try:
        content = candidate.read_text(encoding="utf-8")
    except OSError as exc:
        raise ValueError(f"cannot read body file {body_file}: {exc}") from exc

    if not content.strip():
        raise ValueError(f"body file {body_file} must contain content")
    return content.removesuffix("\n").splitlines()


def resolve_catalog(catalog: list[dict[str, Any]], *, source_path: Path) -> list[dict[str, Any]]:
    """Resolve validated source metadata into semantic snippet entries."""
    source_entries: list[SourceSnippetEntry] = []
    body_files: dict[str, str] = {}
    for index, raw in enumerate(catalog, start=1):
        label = raw.get("prefix") or raw.get("name") or f"entry {index}"
        try:
            entry = SourceSnippetEntry.model_validate(raw)
        except ValidationError as exc:
            raise ValueError(_describe_error(exc, label)) from exc
        if entry.body_file in body_files:
            raise ValueError(
                f"{entry.prefix}: body file {entry.body_file} is already referenced by "
                f"{body_files[entry.body_file]}"
            )
        body_files[entry.body_file] = entry.prefix
        source_entries.append(entry)

    resolved: list[dict[str, Any]] = []
    source_dir = source_path.parent
    referenced_files: set[Path] = set()
    for entry in source_entries:
        try:
            body = resolve_body_file(entry.body_file, source_dir=source_dir)
        except ValueError as exc:
            raise ValueError(f"{entry.prefix}: {exc}") from exc
        referenced_files.add((source_dir / entry.body_file).resolve())
        resolved.append({**entry.model_dump(exclude={"body_file"}), "body": body})

    bodies_dir = (source_dir / "bodies").resolve()
    orphaned_files = sorted(path.resolve() for path in bodies_dir.rglob("*.html") if path.is_file())
    unreferenced_files = [path for path in orphaned_files if path not in referenced_files]
    if unreferenced_files:
        names = ", ".join(path.name for path in unreferenced_files)
        raise ValueError(f"unreferenced snippet body files: {names}")

    return resolved


def validate_catalog(catalog: list[dict[str, Any]]) -> None:
    """Reject malformed, unsafe, duplicate, or unstably ordered entries."""
    if not catalog:
        raise ValueError("catalog must contain at least one entry")

    entries: list[SnippetEntry] = []
    for index, raw in enumerate(catalog, start=1):
        label = raw.get("prefix") or raw.get("name") or f"entry {index}"
        try:
            entries.append(SnippetEntry.model_validate(raw))
        except ValidationError as exc:
            raise ValueError(_describe_error(exc, label)) from exc

    validate_source(entries)


def render_snippets(catalog: list[dict[str, Any]]) -> str:
    """Render the VS Code snippet contribution without documentation metadata."""
    snippets = {
        entry["name"]: {
            "prefix": entry["prefix"],
            "description": entry["description"],
            "body": entry["body"],
        }
        for entry in catalog
    }
    return json.dumps(snippets, ensure_ascii=False, indent=2) + "\n"


def render_docs(catalog: list[dict[str, Any]]) -> str:
    """Render the browsable snippet and example reference."""
    lines = [
        "<!-- Generated by `htmx-tools build-snippets`; edit snippets/django-htmx.source.json. -->",
        "",
        "# Snippets and Examples",
        "",
        "The extension contributes secure Django-first HTMX patterns for `django-html` documents.",
        "Type a prefix to insert the snippet, then move through its editable placeholders.",
        "",
        "Mutating forms include Django's CSRF token. The examples use HTMX syntax shared by",
        "the supported HTMX 2 and HTMX 4 catalogs.",
        "See [Core Django response contracts](../how-to/django-response-contracts.md) for",
        "matching view and response examples.",
        "",
        "## Prefixes",
        "",
        "| Prefix | Classification | Description |",
        "| --- | --- | --- |",
    ]
    lines.extend(
        f"| `{entry['prefix']}` | {CLASSIFICATIONS[entry['classification']]} | "
        f"{entry['description']} |"
        for entry in catalog
    )

    for category in CATEGORIES:
        lines.extend(("", f"## {category}"))
        for entry in catalog:
            if entry["category"] != category:
                continue
            lines.extend(
                (
                    "",
                    f"### `{entry['prefix']}`",
                    "",
                    entry["description"] + ".",
                    "",
                    f"**Classification:** {CLASSIFICATIONS[entry['classification']]}",
                    "",
                    "```django",
                    snippet_preview(entry["body"]),
                    "```",
                    "",
                    f"**Endpoint or context:** {entry['usage']}",
                )
            )

    return "\n".join(lines) + "\n"


def generated_outputs(
    source_path: Path = SOURCE_FILE,
    snippet_path: Path = SNIPPET_FILE,
    docs_path: Path = DOCS_FILE,
) -> dict[Path, str]:
    """Load and validate the source before rendering either output."""
    catalog = load_catalog(source_path)
    validate_catalog(catalog)
    return {
        snippet_path: render_snippets(catalog),
        docs_path: render_docs(catalog),
    }


def sync_outputs(outputs: dict[Path, str], *, check: bool) -> list[Path]:
    """Write changed outputs, or return stale paths without writing in check mode."""
    stale = [
        path
        for path, content in outputs.items()
        if not path.exists() or path.read_text(encoding="utf-8") != content
    ]
    if not check:
        for path in stale:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(outputs[path], encoding="utf-8")
    return stale
