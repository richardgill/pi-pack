import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { beforeAll, expect, test } from "vite-plus/test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const piPackBin = packageJson.bin["pi-pack"];

const run = (command: string, args: string[]) => spawnSync(command, args, { encoding: "utf8" });

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

test("CLI exits non-zero when a command fails", () => {
  const result = run(process.execPath, [piPackBin, "upgrade", "does-not-exist"]);

  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("does-not-exist");
});
