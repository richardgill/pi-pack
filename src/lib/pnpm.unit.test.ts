import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vite-plus/test";
import { resolvePnpmBin } from "~/lib/pnpm";

test("resolvePnpmBin resolves the bundled pnpm binary", () => {
  const binPath = resolvePnpmBin();

  expect(path.basename(binPath)).toBe("pnpm.cjs");
  expect(existsSync(binPath)).toBe(true);
  expect(readFileSync(binPath, "utf8")).toContain("#!/usr/bin/env node");
});
