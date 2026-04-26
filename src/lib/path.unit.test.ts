import { expect, test } from "vite-plus/test";
import { assertSafePathSegment, assertSafeRelativePath } from "./path";

type AssertCase = {
  name: string;
  input: string;
  expected: { ok: true } | { ok: false; error: string };
};

const segmentCases: AssertCase[] = [
  { name: "accepts plain segment", input: "files", expected: { ok: true } },
  { name: "accepts hyphenated segment", input: "pi-preset", expected: { ok: true } },
  { name: "accepts segment with space", input: "rich files", expected: { ok: true } },
  { name: "accepts segment with extension", input: "config.json", expected: { ok: true } },
  {
    name: "rejects parent traversal",
    input: "../files",
    expected: { ok: false, error: "Name must be a single filesystem path segment: ../files." },
  },
  {
    name: "rejects empty string",
    input: "",
    expected: { ok: false, error: "Name must be a single filesystem path segment: ." },
  },
  {
    name: "rejects current directory",
    input: ".",
    expected: { ok: false, error: "Name must be a single filesystem path segment: .." },
  },
  {
    name: "rejects colon",
    input: "has:colon",
    expected: { ok: false, error: "Name must be a single filesystem path segment: has:colon." },
  },
  {
    name: "rejects question mark",
    input: "has?question",
    expected: { ok: false, error: "Name must be a single filesystem path segment: has?question." },
  },
  {
    name: "rejects trailing dot",
    input: "trailing.",
    expected: { ok: false, error: "Name must be a single filesystem path segment: trailing.." },
  },
  {
    name: "rejects trailing space",
    input: "trailing ",
    expected: { ok: false, error: "Name must be a single filesystem path segment: trailing ." },
  },
  {
    name: "rejects Windows reserved CON",
    input: "CON",
    expected: { ok: false, error: "Name must be a single filesystem path segment: CON." },
  },
  {
    name: "rejects Windows reserved nul.txt",
    input: "nul.txt",
    expected: { ok: false, error: "Name must be a single filesystem path segment: nul.txt." },
  },
  {
    name: "rejects Windows reserved LPT³.log",
    input: "LPT³.log",
    expected: { ok: false, error: "Name must be a single filesystem path segment: LPT³.log." },
  },
];

segmentCases.forEach(({ name, input, expected }) => {
  test(`assertSafePathSegment ${name}`, () => {
    if (expected.ok) {
      expect(() => assertSafePathSegment(input, "Name")).not.toThrow();
    } else {
      expect(() => assertSafePathSegment(input, "Name")).toThrow(expected.error);
    }
  });
});

const relativePathCases: AssertCase[] = [
  { name: "accepts single nested folder", input: "extensions", expected: { ok: true } },
  { name: "accepts nested folders", input: "packages/extensions", expected: { ok: true } },
  {
    name: "rejects parent traversal at root",
    input: "../extensions",
    expected: {
      ok: false,
      error: "Extensions folder must be a safe relative path: ../extensions.",
    },
  },
  {
    name: "rejects absolute path",
    input: "/tmp/extensions",
    expected: {
      ok: false,
      error: "Extensions folder must be a safe relative path: /tmp/extensions.",
    },
  },
  {
    name: "rejects parent traversal in middle",
    input: "packages/../extensions",
    expected: {
      ok: false,
      error: "Extensions folder must be a safe relative path: packages/../extensions.",
    },
  },
  {
    name: "rejects unsafe nested Windows reserved name",
    input: "packages/NUL/config.json",
    expected: {
      ok: false,
      error: "Extensions folder must be a safe relative path: packages/NUL/config.json.",
    },
  },
  {
    name: "rejects unsafe nested colon segment",
    input: "packages/C:/config.json",
    expected: {
      ok: false,
      error: "Extensions folder must be a safe relative path: packages/C:/config.json.",
    },
  },
];

relativePathCases.forEach(({ name, input, expected }) => {
  test(`assertSafeRelativePath ${name}`, () => {
    if (expected.ok) {
      expect(() => assertSafeRelativePath(input, "Extensions folder")).not.toThrow();
    } else {
      expect(() => assertSafeRelativePath(input, "Extensions folder")).toThrow(expected.error);
    }
  });
});
