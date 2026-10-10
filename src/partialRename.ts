import {
  partialSpansByName,
  scanPartials,
  scanTemplatePartialReferences,
  type PartialNameSpan,
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

export type PartialUsagePlan = { kind: "ok"; spans: PartialUsage[] } | { kind: "error"; message: string };

export function normalizeTemplateName(templateName: string): string {
  return templateName.replace(/\\/g, "/").replace(/^(\.\/)+/, "");
}

/** Rejects absolute paths, `..` segments, and names without a file part. */
export function isResolvableTemplateName(normalized: string): boolean {
  const parts = normalized.split("/");
  return parts.at(-1) !== "" && !normalized.startsWith("/") && !parts.includes("..");
}

export function matchesTemplate(path: string, templateName: string): boolean {
  const normalized = normalizeTemplateName(templateName);
  return path === normalized || path.endsWith(`/${normalized}`);
}

type PartialScan = ReturnType<typeof scanPartials>;

function createScanCache(): (file: PartialSourceFile) => PartialScan {
  const scans = new Map<string, PartialScan>();
  return (file) => {
    let scan = scans.get(file.path);
    if (scan === undefined) {
      scan = scanPartials(file.text);
      scans.set(file.path, scan);
    }
    return scan;
  };
}

function toUsage(path: string, span: PartialNameSpan): PartialUsage {
  return { path, start: span.start, end: span.end, kind: span.kind };
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
  const scanOf = createScanCache();
  const templates = files.filter((file) => file.languageId === "django-html");
  const definitionsOf = (file: PartialSourceFile, partial: string) =>
    scanOf(file).partialDefinitions.filter((definition) => definition.name === partial);

  const definingPathsByTemplate = new Map<string, string[]>();
  const definingPaths = (templateName: string): string[] => {
    const normalized = normalizeTemplateName(templateName);
    let paths = definingPathsByTemplate.get(normalized);
    if (paths === undefined) {
      paths = templates
        .filter((file) => matchesTemplate(file.path, normalized) && definitionsOf(file, name).length > 0)
        .map((file) => file.path);
      definingPathsByTemplate.set(normalized, paths);
    }
    return paths;
  };

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
  // A self target may legitimately lack a definition yet (typo, work in progress); its
  // local uses are still renamed. Only a template with no use at all has nothing to rename.
  const local = targetFile === undefined ? [] : partialSpansByName(scanOf(targetFile), name);
  if (targetFile === undefined || local.length === 0) {
    return { kind: "error", message: `No definition of partial '${name}' was found.` };
  }
  const definitions = definitionsOf(targetFile, name);
  if (definitions.length > 1) {
    return {
      kind: "error",
      message: `Partial '${name}' is defined more than once in this template. Fix the duplicate first.`,
    };
  }
  if (newName !== undefined && definitionsOf(targetFile, newName).length > 0) {
    return { kind: "error", message: `Partial '${newName}' is already defined in this template.` };
  }

  const spans: PartialUsage[] = local.map((span) => toUsage(targetPath, span));
  const endName = definitions[0]?.endName;
  if (endName !== undefined) {
    spans.push(toUsage(targetPath, { ...endName, kind: "definition" }));
  }
  // Without a definition, references to a matching template path may resolve to a
  // different template, so an orphan rename must stay within the selected file.
  if (definitions.length === 0) {
    return { kind: "ok", spans };
  }
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
  return { kind: "ok", spans };
}

/**
 * Every usage of a partial for Find All References. Unlike a rename plan it never refuses:
 * duplicate, ambiguous, or missing definitions still list whatever uses exist.
 */
export function collectPartialReferences(
  files: readonly PartialSourceFile[],
  target: PartialTarget,
  name: string,
): PartialUsage[] {
  const spans: PartialUsage[] = [];
  const definingPaths: string[] = [];
  const scanOf = createScanCache();
  for (const file of files) {
    if (file.languageId !== "django-html") {
      continue;
    }
    const isTarget =
      target.selfPath !== undefined
        ? file.path === target.selfPath
        : matchesTemplate(file.path, target.templateName);
    if (!isTarget) {
      continue;
    }
    const own = partialSpansByName(scanOf(file), name).filter((span) => span.kind === "definition");
    if (own.length > 0) {
      definingPaths.push(file.path);
      spans.push(...own.map((span) => toUsage(file.path, span)));
    }
  }
  for (const file of files) {
    const local =
      definingPaths.includes(file.path) || file.path === target.selfPath
        ? partialSpansByName(scanOf(file), name).filter((span) => span.kind === "reference")
        : [];
    spans.push(...local.map((span) => toUsage(file.path, span)));
    for (const reference of scanTemplatePartialReferences(file.text, file.languageId)) {
      if (reference.name !== name) {
        continue;
      }
      const matches =
        definingPaths.length > 0
          ? definingPaths.some((path) => matchesTemplate(path, reference.templateName))
          : target.selfPath !== undefined
            ? matchesTemplate(target.selfPath, reference.templateName)
            : target.templateName !== undefined &&
              normalizeTemplateName(reference.templateName) === normalizeTemplateName(target.templateName);
      if (matches) {
        spans.push({
          path: file.path,
          start: reference.nameStart,
          end: reference.nameEnd,
          kind: "reference",
        });
      }
    }
  }
  return spans;
}

/** Converts string offsets to line/character without opening a document. */
export function createLineIndex(text: string): (offset: number) => { line: number; character: number } {
  const starts = [0];
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === "\n" || (character === "\r" && text[index + 1] !== "\n")) {
      starts.push(index + 1);
    }
  }
  return (offset) => {
    let low = 0;
    let high = starts.length - 1;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if ((starts[middle] ?? 0) <= offset) {
        low = middle;
      } else {
        high = middle - 1;
      }
    }
    return { line: low, character: offset - (starts[low] ?? 0) };
  };
}
