import assert from "node:assert/strict";

import * as vscode from "vscode";

function labelOf(item: vscode.CompletionItem): string {
  return typeof item.label === "string" ? item.label : item.label.label;
}

/**
 * Smoke test for the installed VSIX: the extension must be discoverable, activate
 * cleanly, and serve at least one HTMX completion from its bundled catalog.
 */
export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension("difegam.htmx-django-intellisense");
  assert.ok(extension, "packaged extension is installed and discoverable");
  await extension.activate();

  const document = await vscode.workspace.openTextDocument({ language: "html", content: "<div hx" });
  const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
    "vscode.executeCompletionItemProvider",
    document.uri,
    new vscode.Position(0, 7),
  );
  assert.ok(
    completions.items.some((item) => labelOf(item) === "hx-get"),
    "packaged extension provides the hx-get completion",
  );
}
