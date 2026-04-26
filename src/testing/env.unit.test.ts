import { expect, test } from "vite-plus/test";
import { withEnvVar } from "./env";

type WithEnvVarCase = {
  name: string;
  before: string | undefined;
  expectedAfter: string | undefined;
};

const cases: WithEnvVarCase[] = [
  {
    name: "restores a previous value",
    before: "before",
    expectedAfter: "before",
  },
  {
    name: "removes missing previous values",
    before: undefined,
    expectedAfter: undefined,
  },
];

cases.forEach(({ name, before, expectedAfter }) => {
  test(`withEnvVar ${name}`, async () => {
    if (before === undefined) {
      delete process.env["PI_PACK_TEST_ENV"];
    } else {
      process.env["PI_PACK_TEST_ENV"] = before;
    }

    await withEnvVar("PI_PACK_TEST_ENV", "during", async () => {
      expect(process.env["PI_PACK_TEST_ENV"]).toBe("during");
    });

    expect(process.env["PI_PACK_TEST_ENV"]).toBe(expectedAfter);
    delete process.env["PI_PACK_TEST_ENV"];
  });
});
