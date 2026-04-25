import { expect, test } from "vite-plus/test";
import { toPascalCase } from "./string";

test("toPascalCase joins separated words", () => {
  expect(toPascalCase("my-extension_name 2")).toBe("MyExtensionName2");
});

test("toPascalCase falls back for empty input", () => {
  expect(toPascalCase("")).toBe("Extension");
});
