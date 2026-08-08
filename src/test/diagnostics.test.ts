import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { CatalogIndex, type CatalogData } from "../catalog.js";
import { analyzeDocument } from "../diagnostics.js";

const catalog = new CatalogIndex(
  JSON.parse(readFileSync(path.resolve(__dirname, "../../htmx.catalog.json"), "utf8")) as CatalogData,
);

test("compatible mode accepts issue regressions and unrelated attributes", () => {
  const text = `<div class="x" hx-target-4*="#errors" data-hx-target-error="#errors" hx-confirm:inherited="Sure?" hx-status:422="target:#errors"></div>`;
  assert.deepEqual(analyzeDocument(text, "html", catalog, "compatible"), []);
});

test("unknown attributes and closed invalid values warn", () => {
  const issues = analyzeDocument(
    `<form hx-methd="post" hx-method="trace"></form>`,
    "html",
    catalog,
    "compatible",
  );
  assert.deepEqual(
    issues.map((issue) => issue.code),
    ["unknown-attribute", "invalid-value"],
  );
});

test("strict values preserve catalog spelling and tolerate missing value lists", () => {
  const strictValuesCatalog = new CatalogIndex({
    schemaVersion: 2,
    generatedFrom: { htmx2: "test", htmx4: "test" },
    attributes: [
      {
        name: "hx-swap",
        description: "Test attribute",
        versions: ["2", "4"],
        documentation: {},
        categories: {},
        values: [
          { name: "innerHTML", description: "Replace contents" },
          { name: "outerHTML", description: "Replace element" },
        ],
        strictValues: true,
      },
      {
        name: "hx-test",
        description: "Test attribute",
        versions: ["2", "4"],
        documentation: {},
        categories: {},
        values: undefined,
        strictValues: true,
      },
    ],
    patterns: [],
  });
  const issues = analyzeDocument(`<div hx-swap="innerhtmlx"></div>`, "html", strictValuesCatalog, "compatible");
  assert.match(issues[0]?.message ?? "", /Expected innerHTML, outerHTML/);
  assert.deepEqual(analyzeDocument(`<div hx-test="anything"></div>`, "html", strictValuesCatalog, "compatible"), []);
});

test("incomplete attribute prefixes do not warn while typing", () => {
  assert.deepEqual(analyzeDocument(`<div hx- data-hx->`, "html", catalog, "compatible"), []);
});

test("incomplete quoted values are not validated while typing", () => {
  assert.deepEqual(analyzeDocument(`<form hx-method="po></form>`, "html", catalog, "compatible"), []);
});

test("Django expressions bypass literal validation", () => {
  assert.deepEqual(
    analyzeDocument(`<form hx-method="{{ request_method }}"></form>`, "django-html", catalog, "4"),
    [],
  );
});

test("explicit version mode emits hints while compatible mode stays quiet", () => {
  const text = `<div hx-status=""></div>`;
  assert.deepEqual(analyzeDocument(text, "html", catalog, "compatible"), []);
  assert.equal(analyzeDocument(text, "html", catalog, "2")[0]?.code, "version-mismatch");
  assert.equal(analyzeDocument(text, "html", catalog, "2")[0]?.severity, "hint");
});

test("Django partial duplicates and unknown references warn", () => {
  const issues = analyzeDocument(
    `{% partialdef card %}{% endpartialdef %}{% partialdef card inline %}{% endpartialdef %}{% partial missing %}`,
    "django-html",
    catalog,
    "compatible",
  );
  assert.deepEqual(
    issues.map((issue) => issue.code),
    ["duplicate-partial", "unknown-partial"],
  );
});
