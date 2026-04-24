import { expect, test } from "vite-plus/test";
import { run } from "@stricli/core";
import { app } from "~/app";
import { buildContext } from "~/context";

test("pi-pack root command runs", async () => {
  const context = buildContext(process, process.cwd());
  await expect(run(app, [], context)).resolves.toBeUndefined();
});
