import assert from "node:assert/strict";
import test from "node:test";

import {
  partialSpansByName,
  scanDocument,
  scanTemplatePartialReferences,
  tagAtOffset,
  templateNameReferenceAtOffset,
  templatePartialReferenceAtOffset,
} from "../scanner.js";

test("scanner reads multiline HTMX attributes and Django expressions", () => {
  const scan = scanDocument(
    `<button\n  hx-get="{% url 'items' %}"\n  data-hx-target='#results'\n  hx-on::after-request="done()">Go</button>`,
  );
  assert.deepEqual(
    scan.attributes.map((attribute) => [attribute.name, attribute.value]),
    [
      ["hx-get", "{% url 'items' %}"],
      ["data-hx-target", "#results"],
      ["hx-on::after-request", "done()"],
    ],
  );
});

test("scanner ignores comments, scripts, styles, and verbatim blocks", () => {
  const scan = scanDocument(`
<!-- <div hx-bad="x"> -->
<script>const template = '<div hx-script="x">';</script>
<style>.x[data-value="hx-style"] { color: red; }</style>
{% verbatim %}<div hx-verbatim="x">{% endverbatim %}
<div hx-get="/ok"></div>`);
  assert.deepEqual(
    scan.attributes.map((attribute) => attribute.name),
    ["hx-get"],
  );
});

test("scanner handles incomplete quoted values without leaving the tag", () => {
  const scan = scanDocument(`<div hx-trigger="keyup changed delay:300ms`);
  assert.equal(scan.attributes[0]?.name, "hx-trigger");
  assert.equal(scan.attributes[0]?.value, "keyup changed delay:300ms");
  assert.equal(scan.attributes[0]?.valueClosed, false);
});

test("tag lookup excludes the position after a closed tag", () => {
  const closed = scanDocument("<div>");
  const incomplete = scanDocument("<div");
  assert.equal(tagAtOffset(closed, 5), undefined);
  assert.equal(tagAtOffset(incomplete, 4)?.name, "div");
});

test("scanner finds same-file Django partial definitions and references", () => {
  const scan = scanDocument(`
{% partialdef card inline %}<article></article>{% endpartialdef %}
{% partial card %}
{% comment %}{% partial hidden %}{% endcomment %}`);
  assert.deepEqual(
    scan.partialDefinitions.map(({ name, inline }) => ({ name, inline })),
    [{ name: "card", inline: true }],
  );
  assert.deepEqual(
    scan.partialReferences.map(({ name }) => name),
    ["card"],
  );
});

test("scanner ignores partial-looking text inside script and style blocks", () => {
  const scan = scanDocument(`
{% partialdef card inline %}<article></article>{% endpartialdef %}
<script>const t = "{% partial missing %}";</script>
<style>/* {% partial hidden %} */</style>
{% partial card %}`);
  assert.deepEqual(
    scan.partialDefinitions.map(({ name }) => name),
    ["card"],
  );
  assert.deepEqual(
    scan.partialReferences.map(({ name }) => name),
    ["card"],
  );
});

test("partialSpansByName collects the definition and every same-name reference", () => {
  const text = `😀{% partialdef card %}<article></article>{% endpartialdef %}\n{% partial card %}\n{% partial card %}\n{% partial other %}`;
  const spans = partialSpansByName(scanDocument(text), "card");
  assert.equal(spans.filter((span) => span.kind === "definition").length, 1);
  assert.equal(spans.filter((span) => span.kind === "reference").length, 2);
  for (const span of spans) {
    assert.equal(text.slice(span.start, span.end), "card");
  }
});

test("scanner finds static Django include partial references", () => {
  const text = `
{% include "cards/item.html#result-card" with item=item %}
{% include template_name %}
{% comment %}{% include "hidden.html#hidden" %}{% endcomment %}`;
  const references = scanTemplatePartialReferences(text, "django-html");
  assert.deepEqual(
    references.map(({ templateName, name }) => ({ templateName, name })),
    [{ templateName: "cards/item.html", name: "result-card" }],
  );
  assert.equal(
    templatePartialReferenceAtOffset(text, "django-html", references[0]!.nameStart)?.name,
    "result-card",
  );
});

test("scanner finds template partials in supported Python call arguments", () => {
  const text = `
render(request, "authors.html#card")
django.shortcuts.render(request, template_name='authors.html#detail')
loader.render_to_string(template_name="authors.html#row")
loader.get_template(r"shared\\\\authors.html#summary")
select_template(["authors.html#compact", "fallback.html#compact"])
TemplateResponse(request, template="authors.html#page")`;
  assert.deepEqual(
    scanTemplatePartialReferences(text, "python").map(({ templateName, name }) => [templateName, name]),
    [
      ["authors.html", "card"],
      ["authors.html", "detail"],
      ["authors.html", "row"],
      ["shared\\authors.html", "summary"],
      ["authors.html", "compact"],
      ["fallback.html", "compact"],
      ["authors.html", "page"],
    ],
  );
});

test("scanner rejects dynamic, concatenated, commented, misplaced, and incomplete Python references", () => {
  const text = `
# render(request, "hidden.html#hidden")
render("wrong-position.html#wrong", context)
render(request, f"{template}.html#dynamic")
render(request, b"bytes.html#bytes")
render(request, "joined.html#" + name)
render(request, "implicit.html#" "joined")
render(request, "formatted.html#partial".format())
render(request, "unterminated.html#partial)`;
  assert.deepEqual(scanTemplatePartialReferences(text, "python"), []);
});

test("template partial references expose the template-name span", () => {
  const html = `{% include "cards/item.html#result-card" %}`;
  const [htmlRef] = scanTemplatePartialReferences(html, "django-html");
  assert.equal(html.slice(htmlRef!.templateNameStart, htmlRef!.templateNameEnd), "cards/item.html");

  const py = `render(request, 'authors.html#card')\nget_template(r"a/b.html#row")`;
  assert.deepEqual(
    scanTemplatePartialReferences(py, "python").map((ref) =>
      py.slice(ref.templateNameStart, ref.templateNameEnd),
    ),
    ["authors.html", "a/b.html"],
  );
});

test("template-name lookup finds the reference under the cursor", () => {
  const html = `{% include "cards/item.html#result-card" %}`;
  const offset = html.indexOf("item");
  assert.equal(templatePartialReferenceAtOffset(html, "django-html", offset), undefined);
  assert.equal(templateNameReferenceAtOffset(html, "django-html", offset)?.name, "result-card");
});

test("scanner finds class-based view template_name partials", () => {
  const text = `
class ResultsView(TemplateView):
    template_name = "results.html#result_card"
    other = "ignored.html#nope"

urlpatterns = [
    path("a/", TemplateView.as_view(template_name="results.html#row")),
    path("b/", TemplateView.as_view(template_name=f"{x}.html#dyn")),
]
class Dynamic(TemplateView):
    template_name = "base.html#a" if flag else "other.html#b"
    template_name = "x.html#c" + suffix
`;
  assert.deepEqual(
    scanTemplatePartialReferences(text, "python").map(({ templateName, name }) => [templateName, name]),
    [
      ["results.html", "result_card"],
      ["results.html", "row"],
    ],
  );
});

test("template_name partial is found before a decorator and with an annotation", async () => {
  const { scanTemplatePartialReferences } = await import("../scanner.js");
  const decorated = `class V(TemplateView):\n    template_name = "a.html#card"\n\n    @method_decorator(x)\n    def dispatch(self): pass\n`;
  assert.equal(scanTemplatePartialReferences(decorated, "python")[0]?.name, "card");
  const annotated = `class V(TemplateView):\n    template_name: str = "a.html#card"\n    x = 1\n`;
  assert.equal(scanTemplatePartialReferences(annotated, "python")[0]?.name, "card");
});

test("partialAtOffset matches the name in the end tag", async () => {
  const { partialAtOffset, scanDocument } = await import("../scanner.js");
  const text = "{% partialdef card %}x{% endpartialdef card %}";
  const scan = scanDocument(text);
  assert.equal(partialAtOffset(scan, text.lastIndexOf("card") + 1)?.name, "card");
});

test("template_name partial is found when the next statement starts on a new line", async () => {
  const { scanTemplatePartialReferences } = await import("../scanner.js");
  for (const next of ["if DEBUG:\n    pass", '"""doc"""', "for a in b:\n    pass", "not_used = 1"]) {
    const text = `template_name = "c.html#row"\n${next}\n`;
    assert.equal(scanTemplatePartialReferences(text, "python")[0]?.name, "row", next);
  }
  const ternary = `template_name = "c.html#row" if flag else "d.html#x"\n`;
  assert.equal(scanTemplatePartialReferences(ternary, "python").length, 0);
  const concatenated = `template_name = "c.html#row" "tail"\n`;
  assert.equal(scanTemplatePartialReferences(concatenated, "python").length, 0);
});
