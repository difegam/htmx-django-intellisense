import assert from "node:assert/strict";
import test from "node:test";

import { normalizeTemplateName, planPartialUsages, type PartialSourceFile } from "../partialRename.js";

const results: PartialSourceFile = {
  path: "/w/app/templates/results.html",
  languageId: "django-html",
  text: `{% partialdef result_card inline %}x{% endpartialdef %}\n{% partial result_card %}`,
};
const page: PartialSourceFile = {
  path: "/w/app/templates/page.html",
  languageId: "django-html",
  text: `{% include "results.html#result_card" %}\n{% include "results.html#other" %}`,
};
const view: PartialSourceFile = {
  path: "/w/app/views.py",
  languageId: "python",
  text: `render(request, "results.html#result_card")\nclass V(TemplateView):\n    template_name = "results.html#result_card"\n`,
};

function slices(plan: ReturnType<typeof planPartialUsages>, files: PartialSourceFile[]): string[] {
  assert.equal(plan.kind, "ok");
  if (plan.kind !== "ok") {
    return [];
  }
  return plan.spans.map(
    (span) =>
      `${span.kind}:${files.find((file) => file.path === span.path)!.text.slice(span.start, span.end)}`,
  );
}

test("normalizeTemplateName strips leading ./ and converts backslashes", () => {
  assert.equal(normalizeTemplateName(".\\a\\b.html"), "a/b.html");
});

test("usages from a same-file target span definition, partial tags, includes, and Python", () => {
  const files = [results, page, view];
  const plan = planPartialUsages(files, { selfPath: results.path }, "result_card");
  assert.deepEqual(slices(plan, files), [
    "definition:result_card",
    "reference:result_card",
    "reference:result_card",
    "reference:result_card",
    "reference:result_card",
  ]);
});

test("usages from a template-name target resolve by suffix and ignore other partials", () => {
  const files = [results, page, view];
  const plan = planPartialUsages(files, { templateName: "results.html" }, "other");
  assert.equal(plan.kind, "error");
});

test("a duplicate definition in the target file refuses", () => {
  const dup = {
    ...results,
    text: `{% partialdef a %}{% endpartialdef %}{% partialdef a %}{% endpartialdef %}`,
  };
  const plan = planPartialUsages([dup], { selfPath: dup.path }, "a");
  assert.deepEqual(plan, {
    kind: "error",
    message: "Partial 'a' is defined more than once in this template. Fix the duplicate first.",
  });
});

test("the same partial defined in several matching files refuses", () => {
  const other = { ...results, path: "/w/other/templates/results.html" };
  const plan = planPartialUsages([results, other, page], { templateName: "results.html" }, "result_card");
  assert.equal(plan.kind, "error");
  assert.match((plan as { message: string }).message, /more than one template/);
});

test("a reference whose template also matches another defining file refuses", () => {
  const nested = { ...results, path: "/w/lib/shared/results.html" };
  const plan = planPartialUsages([results, nested, page], { selfPath: results.path }, "result_card");
  assert.equal(plan.kind, "error");
});

test("a missing definition refuses", () => {
  const plan = planPartialUsages([page], { templateName: "results.html" }, "result_card");
  assert.deepEqual(plan, { kind: "error", message: "No definition of partial 'result_card' was found." });
});

test("renaming onto a name already defined in the target refuses", () => {
  const taken = { ...results, text: results.text + `{% partialdef row %}{% endpartialdef %}` };
  const plan = planPartialUsages([taken], { selfPath: taken.path }, "result_card", "row");
  assert.deepEqual(plan, { kind: "error", message: "Partial 'row' is already defined in this template." });
});
