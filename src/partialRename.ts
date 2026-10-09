import {
  partialSpansByName,
  scanDocument,
  scanTemplatePartialReferences,
  type ScanResult,
} from "./scanner.js";

export interface PartialSourceFile {
  path: string;
  languageId: "django-html" | "python";
  text: string;
}

export interface PartialUsage {
  path: string;
  start: number;
  end: number;
  kind: "definition" | "reference";
}

export type PartialTarget =
  { selfPath: string; templateName?: undefined } | { templateName: string; selfPath?: undefined };

export type PartialUsagePlan =
  { kind: "ok"; targetPath: string; spans: PartialUsage[] } | { kind: "error"; message: string };

export function normalizeTemplateName(templateName: string): string {
  return templateName.replace(/\\/g, "/").replace(/^(\.\/)+/, "");
}

function matchesTemplate(path: string, templateName: string): boolean {
  const normalized = normalizeTemplateName(templateName);
  return path === normalized || path.endsWith(`/${normalized}`);
}

/**
 * Collects every usage of a Django partial across the supplied files, or explains why a
 * rename must be refused. Pure so the duplicate and ambiguity rules can be unit tested.
 */
export function planPartialUsages(
  files: readonly PartialSourceFile[],
  target: PartialTarget,
  name: string,
  newName?: string,
): PartialUsagePlan {
  const scans = new Map<string, ScanResult>();
  const scanOf = (file: PartialSourceFile): ScanResult => {
    let scan = scans.get(file.path);
    if (scan === undefined) {
      scan = scanDocument(file.text);
      scans.set(file.path, scan);
    }
    return scan;
  };
  const templates = files.filter((file) => file.languageId === "django-html");
  const defines = (file: PartialSourceFile, partial: string): number =>
    scanOf(file).partialDefinitions.filter((definition) => definition.name === partial).length;

  const definingPaths = (templateName: string): string[] =>
    templates
      .filter((file) => matchesTemplate(file.path, templateName) && defines(file, name) > 0)
      .map((file) => file.path);

  let targetPath: string;
  if (target.selfPath !== undefined) {
    targetPath = target.selfPath;
  } else {
    const defining = definingPaths(target.templateName);
    if (defining.length > 1) {
      return {
        kind: "error",
        message: `Partial '${name}' is defined in more than one template. Rename is ambiguous.`,
      };
    }
    if (defining[0] === undefined) {
      return { kind: "error", message: `No definition of partial '${name}' was found.` };
    }
    targetPath = defining[0];
  }

  const targetFile = templates.find((file) => file.path === targetPath);
  if (targetFile === undefined || defines(targetFile, name) === 0) {
    return { kind: "error", message: `No definition of partial '${name}' was found.` };
  }
  if (defines(targetFile, name) > 1) {
    return {
      kind: "error",
      message: `Partial '${name}' is defined more than once in this template. Fix the duplicate first.`,
    };
  }
  if (newName !== undefined && defines(targetFile, newName) > 0) {
    return { kind: "error", message: `Partial '${newName}' is already defined in this template.` };
  }

  const spans: PartialUsage[] = partialSpansByName(scanOf(targetFile), name).map((span) => ({
    path: targetPath,
    start: span.start,
    end: span.end,
    kind: span.kind,
  }));
  for (const file of files) {
    for (const reference of scanTemplatePartialReferences(file.text, file.languageId)) {
      if (reference.name !== name || !matchesTemplate(targetPath, reference.templateName)) {
        continue;
      }
      if (definingPaths(reference.templateName).length > 1) {
        return {
          kind: "error",
          message: `Partial '${name}' is defined in more than one template. Rename is ambiguous.`,
        };
      }
      spans.push({ path: file.path, start: reference.nameStart, end: reference.nameEnd, kind: "reference" });
    }
  }
  return { kind: "ok", targetPath, spans };
}
