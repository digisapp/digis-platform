import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // Prevent unused variables (warn, not error, to avoid breaking builds)
      "no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      // Prevent missing dependencies in useEffect/useMemo/useCallback
      "react-hooks/exhaustive-deps": "warn",
      // Prevent using img instead of next/image
      "@next/next/no-img-element": "warn",
      // Downgrade unescaped entities - doesn't affect functionality
      "react/no-unescaped-entities": "warn",
    },
  },
  {
    ignores: ["node_modules/", ".next/", "drizzle/"],
  },
];

export default eslintConfig;
