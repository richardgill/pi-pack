import { expect, test } from "vite-plus/test";
import { run } from "@stricli/core";
import { app } from "~/app";
import { buildContext } from "~/context";

test("pi-pack update command runs with --all", async () => {
  const context = buildContext(process, process.cwd());
  await expect(run(app, ["update", "--all"], context)).resolves.toBeUndefined();
});

test("pi-pack update command runs with a name", async () => {
  const context = buildContext(process, process.cwd());
  await expect(run(app, ["update", "example"], context)).resolves.toBeUndefined();
});
