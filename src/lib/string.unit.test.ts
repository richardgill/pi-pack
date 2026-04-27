import { expect, test } from "vite-plus/test";
import { capitalize, toPascalCase } from "./string";

// Cases taken from es-toolkit's pascalCase spec.
// https://github.com/toss/es-toolkit/blob/main/src/string/pascalCase.spec.ts
const pascalCaseCases = [
  {
    name: "splits on whitespace",
    input: "some whitespace",
    expected: "SomeWhitespace",
  },
  {
    name: "splits on hyphen",
    input: "hyphen-text",
    expected: "HyphenText",
  },
  {
    name: "lowercases acronyms",
    input: "HTTPRequest",
    expected: "HttpRequest",
  },
  {
    name: "trims leading and trailing whitespace",
    input: "    leading and trailing whitespace    ",
    expected: "LeadingAndTrailingWhitespace",
  },
  {
    name: "strips special characters",
    input: "special@characters!",
    expected: "SpecialCharacters",
  },
  {
    name: "preserves an already pascal-cased input",
    input: "PascalCase",
    expected: "PascalCase",
  },
  {
    name: "returns empty string for empty input",
    input: "",
    expected: "",
  },
  {
    name: "handles screaming snake case",
    input: "FOO_BAR",
    expected: "FooBar",
  },
];

pascalCaseCases.forEach(({ name, input, expected }) => {
  test(`toPascalCase ${name}`, () => {
    expect(toPascalCase(input)).toBe(expected);
  });
});

// Cases taken from es-toolkit's capitalize spec.
// https://github.com/toss/es-toolkit/blob/main/src/string/capitalize.spec.ts
const capitalizeCases = [
  {
    name: "uppercases the first character",
    input: "fred",
    expected: "Fred",
  },
  {
    name: "lowercases the remaining characters",
    input: "FRED",
    expected: "Fred",
  },
  {
    name: "preserves special characters",
    input: "special@characters!",
    expected: "Special@characters!",
  },
  {
    name: "preserves hyphens",
    input: "hyphen-text",
    expected: "Hyphen-text",
  },
  {
    name: "leaves leading whitespace as-is",
    input: " fred",
    expected: " fred",
  },
  {
    name: "preserves an already capitalized input",
    input: "Fred",
    expected: "Fred",
  },
  {
    name: "returns empty string for empty input",
    input: "",
    expected: "",
  },
];

capitalizeCases.forEach(({ name, input, expected }) => {
  test(`capitalize ${name}`, () => {
    expect(capitalize(input)).toBe(expected);
  });
});
