import { expect, test } from "vite-plus/test";
import { parsePiPackCommand } from "./pi-pack";

const parseCases = [
  {
    name: "parses a command without args",
    input: "pi-pack",
    expected: [],
  },
  {
    name: "parses plain command args",
    input: "pi-pack create files",
    expected: ["create", "files"],
  },
  {
    name: "ignores extra whitespace",
    input: " pi-pack  create   files ",
    expected: ["create", "files"],
  },
];

parseCases.forEach(({ name, input, expected }) => {
  test(name, () => {
    expect(parsePiPackCommand(input)).toEqual(expected);
  });
});

test("rejects a different command", () => {
  expect(() => parsePiPackCommand("other create files")).toThrow("Expected pi-pack command");
});
