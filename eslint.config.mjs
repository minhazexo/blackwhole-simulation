import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Flat config (ESLint 9). Replaces .eslintrc.json, which was removed
 * alongside `next lint` in the Next 16 upgrade.
 */
const config = [
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Transitional: the Next 16 preset ships react-hooks v7
      // (compiler-era) rules that flag deliberate pre-existing patterns
      // (mutable physics refs, init-on-mount effects). Warn, don't fail —
      // same bar as the old `next lint` setup. Tighten separately.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "prefer-const": "warn",
      "no-console": "warn",
      "react/self-closing-comp": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "max-params": ["warn", 4],
      "import/no-anonymous-default-export": "warn",
      "@typescript-eslint/no-var-requires": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/no-unsafe-function-type": "warn",
    },
  },
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "node_modules/**",
      "public/wasm/**",
      // Agent Manager worktrees are separate checkouts; linting them
      // duplicates every warning and roughly doubles hook runtime.
      ".kilo/**",
      ".playwright-mcp/**",
    ],
  },
];

export default config;
