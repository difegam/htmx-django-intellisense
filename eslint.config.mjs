import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["out/**", "dist/**", ".vscode-test/**", "node_modules/**"],
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "warn",
      // Async-safety rules: providers, the file scanner, and command handlers are
      // heavily asynchronous, so a dropped Promise is a real runtime bug here.
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/switch-exhaustiveness-check": [
        "error",
        { considerDefaultExhaustiveForUnions: true },
      ],
    },
  },
  {
    // node:test's `test()` returns a promise the runner awaits itself, so the
    // top-level test registrations are not genuinely floating.
    files: ["src/test/**/*.ts"],
    rules: {
      "@typescript-eslint/no-floating-promises": "off",
    },
  },
];
