/**
 * Expands `{a,b}` groups into separate patterns. VS Code's glob matcher does not support
 * nested braces, so user `files.exclude` patterns are flattened before being combined into
 * the single `{...}` group that `workspace.findFiles` accepts.
 */
export function expandBraces(pattern: string): string[] {
  const open = pattern.indexOf("{");
  if (open === -1) {
    return [pattern];
  }
  let depth = 0;
  let close = -1;
  const commas: number[] = [];
  for (let index = open; index < pattern.length; index++) {
    const character = pattern[index];
    if (character === "{") {
      depth++;
    } else if (character === "}") {
      depth--;
      if (depth === 0) {
        close = index;
        break;
      }
    } else if (character === "," && depth === 1) {
      commas.push(index);
    }
  }
  if (close === -1) {
    return [pattern];
  }
  const prefix = pattern.slice(0, open);
  const suffix = pattern.slice(close + 1);
  const bounds = [open, ...commas, close];
  const alternatives = bounds
    .slice(0, -1)
    .map((start, position) => pattern.slice(start + 1, bounds[position + 1]));
  return alternatives.flatMap((alternative) => expandBraces(`${prefix}${alternative}${suffix}`));
}

/** Escapes glob metacharacters (including the brace-group comma) in one literal path segment. */
export function escapeGlobSegment(value: string): string {
  return value.replace(/[?*[\]{},]/g, (character) => {
    if (character === "[") {
      return "[[]";
    }
    if (character === "]") {
      return "[]]";
    }
    return `[${character}]`;
  });
}

/**
 * Combines glob patterns into the one string `findFiles` takes as its `exclude`. `literals`
 * are already-escaped patterns and are never brace-expanded.
 */
export function buildExcludeGlob(
  patterns: Iterable<string>,
  literals: Iterable<string> = [],
): string | undefined {
  const flattened = new Set([...[...patterns].flatMap(expandBraces), ...literals]);
  if (flattened.size === 0) {
    return undefined;
  }
  return flattened.size === 1 ? [...flattened][0] : `{${[...flattened].join(",")}}`;
}

/** Directories that never hold project templates, even when the user does not exclude them. */
export const DEFAULT_SOURCE_EXCLUDES: readonly string[] = [
  "**/node_modules",
  "**/.git",
  "**/.venv",
  "**/venv",
  "**/site-packages",
  "**/__pycache__",
  "**/.tox",
  "**/.nox",
];
