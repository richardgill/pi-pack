import { spawnSync, type SpawnSyncOptionsWithStringEncoding } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, expect, test } from "vite-plus/test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const piPackBin = packageJson.bin["pi-pack"];
const readmePath = path.resolve("README.md");

type RunOptions = Omit<SpawnSyncOptionsWithStringEncoding, "encoding">;

const run = (command: string, args: string[], options: RunOptions = {}) =>
  spawnSync(command, args, { ...options, encoding: "utf8" });

const expectSuccess = (result: ReturnType<typeof run>) => {
  expect(result.status, result.stdout + result.stderr).toBe(0);
};

beforeAll(() => {
  expectSuccess(run("npm", ["run", "build"]));
});

test("published bin runs built CLI", () => {
  const result = run(process.execPath, [piPackBin, "--version"]);

  expectSuccess(result);
  expect(result.stdout.trim()).toBe(packageJson.version);
});

test("AI agent runs print a README path hint", () => {
  const result = run(process.execPath, [piPackBin, "--version"], {
    env: { ...process.env, AI_AGENT: "1" },
  });

  expectSuccess(result);
  expect(result.stdout.trim()).toBe(packageJson.version);
  expect(result.stderr).toBe(`Hint: You can read ${readmePath} to understand how pi-pack works.\n`);
});

test("CLI exits non-zero when a command fails", () => {
  const result = run(process.execPath, [piPackBin, "upgrade", "does-not-exist"]);

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("does-not-exist");
});
