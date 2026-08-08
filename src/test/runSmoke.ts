import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  downloadAndUnzipVSCode,
  resolveCliArgsFromVSCodeExecutablePath,
  runTests,
} from "@vscode/test-electron";

/**
 * Locate the packaged extension artifact. Prefers an explicit VSIX_PATH, otherwise
 * picks the newest `*.vsix` in the project root (produced by `npm run package`).
 */
function locateVsix(root: string): string {
  const explicit = process.env.VSIX_PATH;
  if (explicit !== undefined && explicit !== "") {
    return path.resolve(explicit);
  }
  const candidates = readdirSync(root)
    .filter((name) => name.endsWith(".vsix"))
    .sort((left, right) => compareVsix(left, right, root));
  const latest = candidates[0];
  if (latest === undefined) {
    throw new Error("No .vsix found in the project root; run `npm run package` before the smoke test");
  }
  return path.join(root, latest);
}

function compareVsix(left: string, right: string, root: string): number {
  const leftVersion = vsixVersion(left);
  const rightVersion = vsixVersion(right);
  if (leftVersion !== undefined && rightVersion !== undefined) {
    return (
      rightVersion[0] - leftVersion[0] ||
      rightVersion[1] - leftVersion[1] ||
      rightVersion[2] - leftVersion[2] ||
      statSync(path.join(root, right)).mtimeMs - statSync(path.join(root, left)).mtimeMs
    );
  }
  if (leftVersion !== undefined || rightVersion !== undefined) {
    return leftVersion === undefined ? 1 : -1;
  }
  return statSync(path.join(root, right)).mtimeMs - statSync(path.join(root, left)).mtimeMs;
}

function vsixVersion(name: string): readonly [number, number, number] | undefined {
  const match = /-(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?\.vsix$/.exec(name);
  if (match === null || match[1] === undefined || match[2] === undefined || match[3] === undefined) {
    return undefined;
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * Creates a throwaway no-op "host" extension. runTests requires an
 * extensionDevelopmentPath, but we want the *installed* VSIX (loaded from
 * --extensions-dir) under test rather than the dev source, so this host stays empty.
 */
function createHostExtension(): string {
  const hostDir = mkdtempSync(path.join(tmpdir(), "htmx-smoke-host-"));
  writeFileSync(
    path.join(hostDir, "package.json"),
    JSON.stringify({
      name: "htmx-smoke-host",
      version: "0.0.0",
      engines: { vscode: "^1.90.0" },
      main: "./extension.js",
    }),
  );
  writeFileSync(path.join(hostDir, "extension.js"), "exports.activate = () => {};\n");
  return hostDir;
}

/**
 * Installs the built VSIX into a throwaway VS Code profile and runs a minimal
 * activation suite against it. Unlike runTest.ts this deliberately omits
 * extensionDevelopmentPath so the *packaged* artifact is exercised, catching
 * `.vscodeignore` / bundle-path / entrypoint mistakes that source tests miss.
 */
async function main(): Promise<void> {
  const root = path.resolve(__dirname, "../..");
  const extensionTestsPath = path.resolve(__dirname, "smoke/index");
  const vsix = locateVsix(root);
  const vscodeExecutablePath = await downloadAndUnzipVSCode(process.env.VSCODE_TEST_VERSION ?? "stable");
  const [cliPath, ...cliArgs] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
  if (cliPath === undefined) {
    throw new Error("Unable to resolve the VS Code CLI path from the smoke runtime");
  }
  const extensionsDir = mkdtempSync(path.join(tmpdir(), "htmx-smoke-ext-"));
  const userDataDir = mkdtempSync(path.join(tmpdir(), "htmx-smoke-user-"));
  const hostDir = createHostExtension();
  const profileArgs = ["--extensions-dir", extensionsDir, "--user-data-dir", userDataDir];
  for (const target of ["batisteo.vscode-django", vsix]) {
    const install = spawnSync(
      cliPath,
      [...cliArgs, ...profileArgs, "--install-extension", target, "--force"],
      { stdio: "inherit" },
    );
    if (install.status !== 0) {
      throw new Error(`Unable to install ${target} into the smoke runtime`);
    }
  }
  try {
    await runTests({
      extensionDevelopmentPath: hostDir,
      extensionTestsPath,
      vscodeExecutablePath,
      launchArgs: profileArgs,
    });
  } finally {
    rmSync(extensionsDir, { recursive: true, force: true });
    rmSync(userDataDir, { recursive: true, force: true });
    rmSync(hostDir, { recursive: true, force: true });
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
