import assert from "node:assert/strict";
import test from "node:test";

import { buildExcludeGlob, expandBraces } from "../globs.js";

test("expandBraces flattens nested and sequential groups", () => {
  assert.deepEqual(expandBraces("**/*.{min.js,map}"), ["**/*.min.js", "**/*.map"]);
  assert.deepEqual(expandBraces("a/{b,c/{d,e}}"), ["a/b", "a/c/d", "a/c/e"]);
  assert.deepEqual(expandBraces("plain"), ["plain"]);
  assert.deepEqual(expandBraces("broken{a,b"), ["broken{a,b"]);
});

test("buildExcludeGlob yields a single flat group", () => {
  assert.equal(buildExcludeGlob([]), undefined);
  assert.equal(buildExcludeGlob(["**/a"]), "**/a");
  assert.equal(buildExcludeGlob(["**/a", "**/*.{x,y}"]), "{**/a,**/*.x,**/*.y}");
});
