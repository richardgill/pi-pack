import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, test } from "vite-plus/test";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

const run = (command: string, args: string[]) => spawnSync(command, args, { encoding: "utf8" });

const expectSuccess = (result: ReturnType<typeof run>) => {
  expect(result.status, result.stdout + result.stderr).toBe(0);
};

test("published bin runs built CLI", () => {
  expectSuccess(run("npm", ["run", "build"]));

  const result = run(process.execPath, ["bin/pi-pack.cjs", "--version"]);

  expectSuccess(result);
  expect(result.stdout.trim()).toBe(packageJson.version);
});
