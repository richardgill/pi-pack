import { expect, test } from "vite-plus/test";
import { run } from "@stricli/core";
import { app } from "~/app";
import { buildContext } from "~/context";

test("pi-pack install command runs", async () => {
  const context = buildContext(process, process.cwd());
  await expect(
    run(
      app,
      [
        "install",
        "npm:@pi-pack/example@1.0.0",
        "--path",
        "extensions/example",
        "--name",
        "example",
        "--force",
      ],
      context,
    ),
  ).resolves.toBeUndefined();
});
