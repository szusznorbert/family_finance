import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/.next/**", "apps/api/src/generated/**", "**/node_modules/**"],
  },
  {
    files: ["apps/api/**/*.{ts,tsx,mts}", "packages/shared/src/**/*.{ts,tsx}"],
    extends: tseslint.configs.recommended,
  },
);
