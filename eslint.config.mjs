import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Intentional patterns: closing menus on navigation and loading data when inputs change.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "next-env.d.ts", "reports/**"]),
]);
