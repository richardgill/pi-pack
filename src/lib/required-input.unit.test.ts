import { expect, test } from "vite-plus/test";
import { formatMissingRequiredInputs } from "./required-input";

test("formatMissingRequiredInputs lists every missing input", () => {
  expect(formatMissingRequiredInputs(["<name>", "--yes"])).toBe(
    "Missing required non-interactive input:\n- <name>\n- --yes",
  );
});
