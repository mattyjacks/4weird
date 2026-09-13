import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "api-key-manager/**",
      "**/src-tauri/target/**",
      "old-v1/**",
    ],
  },
  ...nextVitals,
  ...nextTs,
];

export default eslintConfig;
