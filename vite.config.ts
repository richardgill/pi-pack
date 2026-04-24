import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const version = process.env["PI_PACK_VERSION"] ?? packageJson.version ?? "0.0.0";

export default defineConfig({
  resolve: {
    alias: {
      "~": srcDir,
    },
  },
  test: {
    include: ["src/**/*.{unit,e2e}.test.ts"],
  },
  lint: {
    ignorePatterns: ["dist/**", "node_modules/**", "coverage/**", "e2e/tmp/**", "overlay/**"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    ignorePatterns: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "e2e/tmp/**",
      "overlay/**",
      "**/*.md",
    ],
    singleQuote: false,
    sortPackageJson: true,
  },
  staged: {
    "*.{js,ts,cjs,mjs,d.cts,d.mts,jsx,tsx,json,jsonc}": "vp check --fix",
  },
  pack: {
    entry: ["src/cli.ts"],
    outDir: "dist",
    format: ["esm"],
    platform: "node",
    target: "node22",
    dts: false,
    clean: true,
    minify: true,
    sourcemap: true,
    define: {
      "process.env.PI_PACK_VERSION": JSON.stringify(version),
    },
  },
});
