import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test } from "vite-plus/test";
import { expectFileTree } from "~/testing/fs";
import { withTempDir } from "~/testing/temp-dir";

test("expectFileTree asserts directories, files, contents, json, and missing paths", async () => {
  await withTempDir(({ cwd }) => {
    mkdirSync(path.join(cwd, "src"), { recursive: true });
    writeFileSync(path.join(cwd, "src/file.ts"), "export const value = 1;\n", "utf8");
    writeFileSync(path.join(cwd, "README.md"), "hello pi-pack\n", "utf8");
    writeFileSync(path.join(cwd, "package.json"), '{"name":"files","private":true}\n', "utf8");

    expectFileTree(cwd, {
      dirs: ["src"],
      files: {
        "src/file.ts": /value = 1/,
        "README.md": { contains: "hello", notContains: "goodbye" },
        "package.json": { json: { name: "files" } },
      },
      missing: ["missing.ts"],
    });
  });
});
