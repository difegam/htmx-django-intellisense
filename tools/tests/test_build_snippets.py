"""Tests for the generated Django HTMX snippet library."""

from __future__ import annotations

import json
import re
from pathlib import Path

import pytest

from htmx_django_intellisense import snippets as _snippets_module

ROOT = _snippets_module.ROOT
EXPECTED_PREFIXES = [
    "htmx-autosave",
    "htmx-toggle",
    "htmx-soft-delete-undo",
    "htmx-field-check",
    "htmx-autocomplete",
    "htmx-get",
    "htmx-post",
    "htmx-delete",
    "htmx-search",
    "htmx-pagination",
    "htmx-load-more",
    "htmx-filter-sort",
    "htmx-form-validation",
    "htmx-file-upload",
    "htmx-bulk-actions",
    "htmx-dependent-dropdown",
    "htmx-status-form",
    "htmx-infinite",
    "htmx-poll",
    "htmx-lazy",
    "htmx-boost-nav",
    "htmx-progress",
    "htmx-click-to-edit",
    "htmx-table-row",
    "htmx-dialog",
    "htmx-modal",
    "htmx-tabs",
    "htmx-morph",
    "htmx-oob-swap",
    "htmx-toast",
    "htmx-partial-response",
    "partialdef",
    "partialdef-inline",
    "partial",
]
EXPECTED_CLASSIFICATIONS = {
    "common": {
        "htmx-get",
        "htmx-post",
        "htmx-delete",
        "htmx-search",
        "htmx-pagination",
        "htmx-load-more",
        "htmx-form-validation",
        "htmx-infinite",
        "htmx-lazy",
        "htmx-click-to-edit",
        "htmx-oob-swap",
    },
    "curated": {
        "htmx-status-form",
        "htmx-filter-sort",
        "htmx-autosave",
        "htmx-toggle",
        "htmx-soft-delete-undo",
        "htmx-field-check",
        "htmx-autocomplete",
        "htmx-morph",
        "htmx-partial-response",
        "htmx-file-upload",
        "htmx-bulk-actions",
        "htmx-dependent-dropdown",
        "htmx-poll",
        "htmx-boost-nav",
        "htmx-progress",
        "htmx-table-row",
        "htmx-dialog",
        "htmx-modal",
        "htmx-tabs",
        "htmx-toast",
    },
    "django-6": {"partialdef", "partialdef-inline", "partial"},
}


def _load_build_snippets_module():
    return _snippets_module


def _entry(**overrides):
    entry = {
        "name": "Safe GET",
        "prefix": "htmx-safe-get",
        "category": "Requests and forms",
        "classification": "common",
        "description": "Load safe content",
        "body": ["<button hx-get=\"{% url 'safe-view' %}\">Load</button>"],
        "usage": "The view returns HTML.",
        "htmx_versions": ["2", "4"],
        "django_versions": ["4.2+"],
        "request_kind": "none",
        "context_variables": [],
        "response_contract": "",
        "security_notes": [],
        "accessibility_notes": [],
        "related_snippets": [],
    }
    entry.update(overrides)
    return entry


def _source_entry(**overrides):
    entry = {
        "name": "Safe GET",
        "prefix": "htmx-safe-get",
        "category": "Requests and forms",
        "classification": "common",
        "description": "Load safe content",
        "body_file": "bodies/safe-get.html",
        "usage": "The view returns HTML.",
    }
    entry.update(overrides)
    return entry


def _write_source_catalog(tmp_path: Path, entries: list[dict]) -> tuple[Path, Path]:
    source_path = tmp_path / "django-htmx.source.json"
    bodies_dir = tmp_path / "bodies"
    bodies_dir.mkdir()
    source_path.write_text(json.dumps(entries), encoding="utf-8")
    return source_path, bodies_dir


def test_load_catalog_resolves_body_files_and_preserves_blank_lines(tmp_path: Path) -> None:
    module = _load_build_snippets_module()
    source_path, bodies_dir = _write_source_catalog(tmp_path, [_source_entry()])
    (bodies_dir / "safe-get.html").write_text(
        "<button>Load</button>\n\n</button>\n", encoding="utf-8"
    )

    assert module.load_catalog(source_path) == [
        {
            **_entry(),
            "body": ["<button>Load</button>", "", "</button>"],
        }
    ]


def test_load_catalog_removes_only_one_final_newline(tmp_path: Path) -> None:
    module = _load_build_snippets_module()
    source_path, bodies_dir = _write_source_catalog(tmp_path, [_source_entry()])
    (bodies_dir / "safe-get.html").write_text("<button>Load</button>\n\n\n", encoding="utf-8")

    assert module.load_catalog(source_path)[0]["body"] == ["<button>Load</button>", "", ""]


def test_load_catalog_requires_body_file_and_rejects_inline_bodies(tmp_path: Path) -> None:
    module = _load_build_snippets_module()
    source_path, _ = _write_source_catalog(tmp_path, [_source_entry(body_file=None)])

    with pytest.raises(ValueError, match="body_file"):
        module.load_catalog(source_path)

    source_path.write_text(
        json.dumps([_source_entry(body=["<button>Load</button>"])]), encoding="utf-8"
    )

    with pytest.raises(ValueError, match="body"):
        module.load_catalog(source_path)


@pytest.mark.parametrize(
    "body_file",
    [
        "../outside.html",
        "absolute",
        "bodies/safe-get.txt",
        "bodies/missing.html",
    ],
)
def test_load_catalog_rejects_unsafe_or_missing_body_files(tmp_path: Path, body_file: str) -> None:
    module = _load_build_snippets_module()
    if body_file == "absolute":
        body_file = str(tmp_path / "outside.html")
    source_path, bodies_dir = _write_source_catalog(tmp_path, [_source_entry(body_file=body_file)])
    (bodies_dir / "safe-get.txt").write_text("<button>Load</button>\n", encoding="utf-8")

    with pytest.raises(ValueError, match="htmx-safe-get"):
        module.load_catalog(source_path)


def test_load_catalog_rejects_absolute_body_paths_inside_bodies(tmp_path: Path) -> None:
    module = _load_build_snippets_module()
    source_path, bodies_dir = _write_source_catalog(tmp_path, [_source_entry()])
    body_path = bodies_dir / "safe-get.html"
    body_path.write_text("<button>Load</button>\n", encoding="utf-8")
    source_path.write_text(
        json.dumps([_source_entry(body_file=str(body_path))]),
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="htmx-safe-get"):
        module.load_catalog(source_path)


def test_load_catalog_rejects_empty_unreadable_duplicate_and_orphaned_body_files(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    module = _load_build_snippets_module()
    source_path, bodies_dir = _write_source_catalog(tmp_path, [_source_entry()])
    body_path = bodies_dir / "safe-get.html"
    body_path.write_text(" \n\n", encoding="utf-8")

    with pytest.raises(ValueError, match="htmx-safe-get"):
        module.load_catalog(source_path)

    body_path.write_text("<button>Load</button>\n", encoding="utf-8")
    original_read_text = Path.read_text

    def unreadable_read_text(path: Path, *args, **kwargs):
        if path == body_path:
            raise OSError("permission denied")
        return original_read_text(path, *args, **kwargs)

    monkeypatch.setattr(Path, "read_text", unreadable_read_text)
    with pytest.raises(ValueError, match="permission denied"):
        module.load_catalog(source_path)
    monkeypatch.undo()

    source_path.write_text(
        json.dumps(
            [
                _source_entry(),
                _source_entry(
                    name="Second",
                    prefix="htmx-second",
                    body_file="bodies/./safe-get.html",
                ),
            ]
        ),
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match=re.escape("safe-get.html")):
        module.load_catalog(source_path)

    source_path.write_text(json.dumps([_source_entry()]), encoding="utf-8")
    (bodies_dir / "orphan.html").write_text("<p>Orphan</p>\n", encoding="utf-8")
    with pytest.raises(ValueError, match=re.escape("orphan.html")):
        module.load_catalog(source_path)


def test_source_catalog_uses_body_files_that_match_runtime_bodies() -> None:
    source_catalog = json.loads(
        (ROOT / "snippets" / "django-htmx.source.json").read_text(encoding="utf-8")
    )
    runtime_catalog = json.loads(
        (ROOT / "snippets" / "django-htmx.json").read_text(encoding="utf-8")
    )

    assert [entry["prefix"] for entry in source_catalog] == EXPECTED_PREFIXES
    assert all("body_file" in entry and "body" not in entry for entry in source_catalog)
    assert len({entry["body_file"] for entry in source_catalog}) == len(source_catalog)
    for entry in source_catalog:
        body_file = ROOT / "snippets" / entry["body_file"]
        assert (
            body_file.read_text(encoding="utf-8").removesuffix("\n").split("\n")
            == runtime_catalog[entry["name"]]["body"]
        )


def test_committed_catalog_has_exact_expected_prefixes() -> None:
    module = _load_build_snippets_module()
    catalog = module.load_catalog()
    module.validate_catalog(catalog)
    assert [entry["prefix"] for entry in catalog] == EXPECTED_PREFIXES


def test_committed_catalog_has_expected_classifications_and_unique_bodies() -> None:
    module = _load_build_snippets_module()
    catalog = module.load_catalog()
    assert {
        classification: {
            entry["prefix"] for entry in catalog if entry["classification"] == classification
        }
        for classification in module.CLASSIFICATIONS
    } == EXPECTED_CLASSIFICATIONS
    assert len({tuple(entry["body"]) for entry in catalog}) == len(catalog)


def test_snippets_use_only_attributes_shared_by_htmx_2_and_4() -> None:
    module = _load_build_snippets_module()
    catalog = module.load_catalog()
    htmx_catalog = json.loads((ROOT / "htmx.catalog.json").read_text(encoding="utf-8"))
    attributes = {entry["name"]: entry for entry in htmx_catalog["attributes"]}
    used_attributes = {
        match.group(1)
        for entry in catalog
        for line in entry["body"]
        for match in re.finditer(r"\b(hx-[a-z0-9-]+)\s*=", line)
    }
    assert used_attributes
    assert {
        name: attributes.get(name, {}).get("versions")
        for name in used_attributes
        if attributes.get(name, {}).get("versions") != ["2", "4"]
    } == {}
    assert not {name for name in used_attributes if attributes[name].get("deprecated")}


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"description": ""}, "description must be a non-empty string"),
        ({"prefix": "not-an-htmx-prefix"}, "invalid prefix"),
        ({"category": "Unknown"}, "unknown category"),
        ({"classification": "Unknown"}, "unknown classification"),
        ({"body": []}, "body must be a non-empty array"),
        ({"extra": "value"}, "unexpected extra"),
    ],
)
def test_catalog_schema_is_validated(overrides: dict, message: str) -> None:
    module = _load_build_snippets_module()
    with pytest.raises(ValueError, match=message):
        module.validate_catalog([_entry(**overrides)])


def test_snippet_metadata_is_validated_and_rendered() -> None:
    module = _load_build_snippets_module()
    entry = _entry(
        htmx_versions=["2", "4"],
        django_versions=["4.2+"],
        request_kind="GET",
        context_variables=["page_obj"],
        response_contract="Return the results root.",
        security_notes=["GET requests are side-effect free."],
        accessibility_notes=["Keep the native link fallback."],
        related_snippets=["htmx-second"],
    )
    related = _entry(name="Second", prefix="htmx-second")

    module.validate_catalog([entry, related])
    assert set(json.loads(module.render_snippets([entry]))["Safe GET"]) == {
        "prefix",
        "description",
        "body",
    }

    docs = module.render_docs([entry, related])
    assert "**HTMX versions:** 2, 4" in docs
    assert "**Django versions:** 4.2+" in docs
    assert "**Request kind:** GET" in docs
    assert "page_obj" in docs
    assert "Return the results root." in docs
    assert "GET requests are side-effect free." in docs
    assert "Keep the native link fallback." in docs
    assert "[`htmx-second`](#htmx-second)" in docs

    with pytest.raises(ValueError, match="unknown HTMX version"):
        module.validate_catalog([_entry(htmx_versions=["3"])])
    with pytest.raises(ValueError, match="django_versions"):
        module.validate_catalog([_entry(django_versions=[""])])
    with pytest.raises(ValueError, match="Input should be"):
        module.validate_catalog([_entry(request_kind="PATCH")])
    with pytest.raises(ValueError, match="unknown related snippet"):
        module.validate_catalog([_entry(related_snippets=["htmx-missing"])])
    with pytest.raises(ValueError, match="may not relate to itself"):
        module.validate_catalog([_entry(related_snippets=["htmx-safe-get"])])


def test_malformed_json_and_snippet_placeholders_are_rejected(tmp_path: Path) -> None:
    module = _load_build_snippets_module()
    source = tmp_path / "broken.json"
    source.write_text("{", encoding="utf-8")
    with pytest.raises(json.JSONDecodeError):
        module.load_catalog(source)
    with pytest.raises(ValueError, match="malformed or unsupported placeholder"):
        module.validate_catalog([_entry(body=["<div>${1:unfinished</div>"])])


def test_names_and_prefixes_must_be_unique() -> None:
    module = _load_build_snippets_module()
    with pytest.raises(ValueError, match="duplicate name"):
        module.validate_catalog([_entry(), _entry(prefix="htmx-second")])
    with pytest.raises(ValueError, match="duplicate prefix"):
        module.validate_catalog([_entry(), _entry(name="Second")])


def test_categories_must_keep_documented_order() -> None:
    module = _load_build_snippets_module()
    with pytest.raises(ValueError, match="category order is not stable"):
        module.validate_catalog(
            [
                _entry(category="Loading and navigation"),
                _entry(
                    name="Second",
                    prefix="htmx-second",
                    category="Requests and forms",
                ),
            ]
        )


def test_mutating_forms_require_csrf() -> None:
    module = _load_build_snippets_module()
    with pytest.raises(ValueError, match="mutating forms must include"):
        module.validate_catalog([_entry(body=['<form hx-post="/unsafe"></form>'])])

    module.validate_catalog(
        [
            _entry(
                body=[
                    '<form method="post" action="{% url \'safe-view\' %}"',
                    "      hx-post=\"{% url 'safe-view' %}\">",
                    "{% csrf_token %}",
                    "</form>",
                ]
            )
        ]
    )

    with pytest.raises(ValueError, match="all mutating controls must be inside forms"):
        module.validate_catalog(
            [
                _entry(
                    body=[
                        '<form method="post" action="/save" hx-post="/save">',
                        "{% csrf_token %}",
                        "</form>",
                        '<button hx-post="/delete">Delete</button>',
                    ]
                )
            ]
        )

    module.validate_catalog(
        [
            _entry(
                body=[
                    '<form method="post" action="/save?next=>ok" hx-post="/save?next=>ok">',
                    "{% csrf_token %}",
                    "</form>",
                ]
            )
        ]
    )

    with pytest.raises(ValueError, match="POST method and action"):
        module.validate_catalog(
            [
                _entry(
                    body=[
                        "<form hx-post=\"{% url 'safe-view' %}\">",
                        "{% csrf_token %}",
                        "</form>",
                    ]
                )
            ]
        )
    with pytest.raises(ValueError, match="must use a CSRF-safe hx-post form"):
        module.validate_catalog(
            [
                _entry(
                    body=[
                        '<form method="post" action="/delete" hx-delete="/delete">',
                        "{% csrf_token %}",
                        "</form>",
                    ]
                )
            ]
        )
    with pytest.raises(ValueError, match="action and hx-post must match"):
        module.validate_catalog(
            [
                _entry(
                    body=[
                        '<form method="post" action="/first" hx-post="/second">',
                        "{% csrf_token %}",
                        "</form>",
                    ]
                )
            ]
        )


@pytest.mark.parametrize(
    ("body", "message"),
    [
        (["<script>alert(1)</script>"], "script elements"),
        (['<button onclick="submit()">Save</button>'], "inline event handlers"),
        (['<button hx-on:click="submit()">Save</button>'], "hx-on handlers"),
        (['<a href="javascript:alert(1)">Open</a>'], "javascript URLs"),
        (['<div hx-vals="js:{value: event.target.value}"></div>'], "evaluated js"),
        (['<iframe src="https://example.com/widget"></iframe>'], "remote executable"),
        (['<main hx-ext="preload"></main>'], "extension declarations"),
        (['<div hx-sse="connect:/events"></div>'], "SSE or WebSocket"),
        (['<div hx-ws="connect:/socket"></div>'], "SSE or WebSocket"),
    ],
)
def test_unsafe_snippet_constructs_are_rejected(body: list[str], message: str) -> None:
    module = _load_build_snippets_module()
    with pytest.raises(ValueError, match=message):
        module.validate_catalog([_entry(body=body)])


def test_generated_outputs_match_committed_files() -> None:
    module = _load_build_snippets_module()
    outputs = module.generated_outputs()
    assert outputs == module.generated_outputs()
    assert all(path.read_text(encoding="utf-8") == content for path, content in outputs.items())
    assert "${" not in outputs[module.DOCS_FILE]


def test_portable_pattern_regressions() -> None:
    module = _load_build_snippets_module()
    catalog = {entry["prefix"]: entry for entry in module.load_catalog()}

    search = "\n".join(catalog["htmx-search"]["body"])
    assert "input changed delay:" in search
    assert ", search" in search
    assert 'hx-sync="this:replace"' in search

    pagination = "\n".join(catalog["htmx-pagination"]["body"])
    assert "href=" in pagination
    assert "hx-get=" in pagination
    assert 'hx-target="#${1:results}"' in pagination
    assert 'hx-swap="outerHTML"' in pagination
    assert 'hx-push-url="true"' in pagination

    load_more = "\n".join(catalog["htmx-load-more"]["body"])
    assert "href=" in load_more
    assert 'hx-target="closest li"' in load_more
    assert 'hx-swap="outerHTML"' in load_more

    filter_sort = "\n".join(catalog["htmx-filter-sort"]["body"])
    assert 'method="get"' in filter_sort
    assert "action=" in filter_sort
    assert "hx-get=" in filter_sort
    assert 'hx-include="this"' in filter_sort
    assert 'hx-sync="this:replace"' in filter_sort
    assert 'hx-target="#${2:results}"' in filter_sort
    assert 'hx-push-url="true"' in filter_sort

    autosave = "\n".join(catalog["htmx-autosave"]["body"])
    assert 'method="post"' in autosave
    assert "hx-post=" in autosave
    assert "{% csrf_token %}" in autosave
    assert "input changed delay:" in autosave
    assert 'hx-sync="this:replace"' in autosave
    assert 'aria-live="polite"' in autosave

    for prefix in ("htmx-toggle", "htmx-soft-delete-undo"):
        body = "\n".join(catalog[prefix]["body"])
        assert 'method="post"' in body
        assert "{% csrf_token %}" in body
        assert 'hx-target="closest article"' in body
        assert 'hx-swap="outerHTML"' in body

    field_check = "\n".join(catalog["htmx-field-check"]["body"])
    assert "hx-get=" in field_check
    assert "hx-post=" not in field_check
    assert 'hx-sync="this:replace"' in field_check
    assert 'aria-live="polite"' in field_check

    autocomplete = "\n".join(catalog["htmx-autocomplete"]["body"])
    assert "hx-get=" in autocomplete
    assert 'hx-sync="this:replace"' in autocomplete
    assert "<datalist" in autocomplete

    validation = "\n".join(catalog["htmx-form-validation"]["body"])
    assert 'hx-target="this"' in validation
    assert 'hx-swap="outerHTML"' in validation
    assert "HTTP 200" in catalog["htmx-form-validation"]["usage"]

    infinite = "\n".join(catalog["htmx-infinite"]["body"])
    assert "page_obj.has_next" in infinite
    assert 'hx-swap="outerHTML"' in infinite
    assert "afterend" not in infinite

    boost = catalog["htmx-boost-nav"]["body"]
    assert "hx-" not in boost[0]
    assert {
        "hx-boost",
        "hx-target",
        "hx-select",
        "hx-swap",
        "hx-push-url",
    } <= set(re.findall(r"\b(hx-[a-z0-9-]+)=", "\n".join(boost)))
    assert re.search(r"<a\b[^>]*>\$\{4:Home}</a>", "\n".join(boost), re.S)

    upload = "\n".join(catalog["htmx-file-upload"]["body"])
    assert 'method="post"' in upload
    assert upload.count("multipart/form-data") == 2
    assert "request.FILES" in catalog["htmx-file-upload"]["usage"]

    tabs = "\n".join(catalog["htmx-tabs"]["body"])
    assert 'hx-target="#${1:tabs}"' in tabs
    assert 'hx-swap="outerHTML"' in tabs


def test_core_django_contracts_are_portable() -> None:
    contracts = (ROOT / "docs" / "how-to" / "django-response-contracts.md").read_text(
        encoding="utf-8"
    )
    assert '@vary_on_headers("HX-Request")' in contracts
    assert 'request.headers.get("HX-Request")' in contracts
    assert "HTTP 200" in contracts
    assert "request.FILES" in contracts
    assert all(
        header in contracts for header in ("HX-Retarget", "HX-Reswap", "HX-Redirect", "HX-Trigger")
    )
    assert "HX-Trigger-After-Swap" in contracts
    assert "intentionally excluded" in contracts

    fragments = (ROOT / "docs" / "how-to" / "django-fragment-patterns.md").read_text(
        encoding="utf-8"
    )
    assert all(
        prefix in fragments
        for prefix in (
            "htmx-pagination",
            "htmx-autosave",
            "htmx-toggle",
            "htmx-soft-delete-undo",
            "htmx-field-check",
            "htmx-autocomplete",
        )
    )
    assert 'hx-include="this"' in fragments

    boundaries = (ROOT / "docs" / "explanation" / "hypermedia-patterns.md").read_text(
        encoding="utf-8"
    )
    assert "HTTP 200" in boundaries
    assert "SSE" in boundaries
    assert "WebSockets" in boundaries


def test_check_mode_reports_stale_files_without_writing(tmp_path: Path) -> None:
    module = _load_build_snippets_module()
    stale_file = tmp_path / "stale.txt"
    missing_file = tmp_path / "missing.txt"
    stale_file.write_text("old\n", encoding="utf-8")

    stale = module.sync_outputs({stale_file: "new\n", missing_file: "created\n"}, check=True)

    assert stale == [stale_file, missing_file]
    assert stale_file.read_text(encoding="utf-8") == "old\n"
    assert not missing_file.exists()


def test_write_mode_updates_only_stale_files(tmp_path: Path) -> None:
    module = _load_build_snippets_module()
    current_file = tmp_path / "current.txt"
    stale_file = tmp_path / "nested" / "stale.txt"
    current_file.write_text("current\n", encoding="utf-8")

    stale = module.sync_outputs({current_file: "current\n", stale_file: "new\n"}, check=False)

    assert stale == [stale_file]
    assert stale_file.read_text(encoding="utf-8") == "new\n"


def test_snippet_preview_unescapes_placeholder_braces() -> None:
    module = _load_build_snippets_module()
    body = ['<div hx-get="${1:?page={{ page_obj.next_page_number \\}\\}}">']
    assert module.snippet_preview(body) == '<div hx-get="?page={{ page_obj.next_page_number }}">'


def test_runtime_snippet_shape_contains_only_vscode_fields() -> None:
    data = json.loads((ROOT / "snippets" / "django-htmx.json").read_text(encoding="utf-8"))
    assert [entry["prefix"] for entry in data.values()] == EXPECTED_PREFIXES
    assert all(set(entry) == {"prefix", "description", "body"} for entry in data.values())


def test_editing_recipes_target_the_container_without_implicit_inheritance() -> None:
    entries = {entry["prefix"]: entry for entry in _snippets_module.load_catalog()}
    for prefix, target in (
        ("htmx-click-to-edit", "closest article"),
        ("htmx-table-row", "closest tr"),
    ):
        markup = "\n".join(entries[prefix]["body"])
        button = re.search(r"<button\b(?P<attributes>[^>]*)>", markup, re.S)
        assert button is not None
        assert f'hx-target="{target}"' in button["attributes"]
        assert 'hx-swap="outerHTML"' in button["attributes"]
