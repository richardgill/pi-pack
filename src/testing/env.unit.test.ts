import { expect, test } from "vite-plus/test";
import { withEnvVar } from "./env";

test("withEnvVar restores a previous value", async () => {
  process.env["PI_PACK_TEST_ENV"] = "before";

  await withEnvVar("PI_PACK_TEST_ENV", "during", async () => {
    expect(process.env["PI_PACK_TEST_ENV"]).toBe("during");
  });

  expect(process.env["PI_PACK_TEST_ENV"]).toBe("before");
  delete process.env["PI_PACK_TEST_ENV"];
});

test("withEnvVar removes missing previous values", async () => {
  delete process.env["PI_PACK_TEST_ENV"];

  await withEnvVar("PI_PACK_TEST_ENV", "during", async () => {
    expect(process.env["PI_PACK_TEST_ENV"]).toBe("during");
  });

  expect(process.env["PI_PACK_TEST_ENV"]).toBeUndefined();
});
