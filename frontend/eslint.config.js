import module from "node:module";

// TypeScript 7.0 (native Go compiler) handles `tsc` builds and type-checking, while
// `typescript-eslint` currently relies on the JS compiler API shipped in Microsoft's
// official `@typescript/typescript6` side-by-side package.
if (typeof module.registerHooks === "function") {
  module.registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier === "typescript" || specifier.startsWith("typescript/")) {
        return nextResolve(specifier.replace(/^typescript\b/, "@typescript/typescript6"), context);
      }
      return nextResolve(specifier, context);
    }
  });
} else {
  const originalResolveFilename = module._resolveFilename;
  module._resolveFilename = function resolveTs6(request, parent, isMain, options) {
    const rewritten =
      request === "typescript" || request.startsWith("typescript/")
        ? request.replace(/^typescript\b/, "@typescript/typescript6")
        : request;
    return originalResolveFilename.call(this, rewritten, parent, isMain, options);
  };
}

const { default: js } = await import("@eslint/js");
const { default: eslintConfigPrettier } = await import("eslint-config-prettier");
const { default: reactHooks } = await import("eslint-plugin-react-hooks");
const { default: reactRefresh } = await import("eslint-plugin-react-refresh");
const { default: globals } = await import("globals");
const { default: tseslint } = await import("typescript-eslint");

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, eslintConfigPrettier],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
          allowExportNames: ["useI18n", "htmlLangFor", "intlLocaleFor", "useNotifications", "useTurnstile"]
        }
      ]
    }
  }
);
