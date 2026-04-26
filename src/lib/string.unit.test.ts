import { expect, test } from "vite-plus/test";
import { toPascalCase } from "./string";

const cases = [
  {
    name: "joins separated words",
    input: "my-extension_name 2",
    expected: "MyExtensionName2",
  },
  {
    name: "falls back for empty input",
    input: "",
    expected: "Extension",
  },
];

cases.forEach(({ name, input, expected }) => {
  test(`toPascalCase ${name}`, () => {
    expect(toPascalCase(input)).toBe(expected);
  });
});
